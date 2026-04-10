// API server — exposes bot data over HTTP for the panel

import { createServer } from 'http';
import * as fsp from 'fs/promises';
import * as config from './config.js';
import { restart } from './exit.js';
import { ensureDir, loadJson, writeJson, joinPath, resolvePath } from './io.js';
import { listTextChannels, listVoiceChannels } from './interactions.js';
import { deleteTicket } from './ticket.js';
import { listSchedules, addSchedule, removeSchedule, enableSchedule, disableSchedule, runScheduleNow, parseInterval } from './scheduler.js';

const PORT = process.env.API_PORT || 3001;
const PANEL_ORIGIN = process.env.PANEL_ORIGIN || 'http://localhost:5173';
const API_TOKEN = process.env.API_TOKEN || null;

let _logger = null;

const paths = {
  bannedList:    joinPath(config.bannedListPath,    config.bannedListFile),
  filteredWords: joinPath(config.filteredWordsDir,  config.filteredWordsFile),
  serverStats:   joinPath(config.serverStatsPath,   config.serverStatsFile),
};

async function ensureDirs() {
  await ensureDir(config.bannedListPath);
  await ensureDir(config.filteredWordsDir);
  await ensureDir(config.serverStatsPath);
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', PANEL_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function readBody(req, maxBytes = 65_536) {
  return new Promise((resolve, reject) => {
    let raw = '', size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) return reject(new Error('Request body too large'));
      raw += chunk;
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// Configuration — maps panel field names to env var names (token excluded)
const CONFIG_FIELDS = {
  commandPrefix:    'COMMAND_PREFIX',
  enableConsole:    'ENABLE_CONSOLE',
  enableFileLogging:'ENABLE_FILE_LOGGING',
  chatChannel:      'CHAT_CHANNEL',
  moderatorChannel: 'MODERATOR_CHANNEL',
  ticketChannel:    'TICKET_CHANNEL',
  welcomeChannel:   'WELCOME_CHANNEL',
  moderatorRole:    'MODERATOR_ROLE',
  trustedRole:      'TRUSTED_ROLE',
  enableFiltering:  'ENABLE_FILTERING',
  ollamaModel:      'OLLAMA_MODEL',
  enableTickets:    'ENABLE_TICKETS',
};

const ENV_PATH = resolvePath(joinPath(process.cwd(), '.env'));

async function readEnvFile() {
  try { return await fsp.readFile(ENV_PATH, 'utf8'); }
  catch { return ''; }
}

async function writeEnvFields(updates) {
  let src = await readEnvFile();
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    src = re.test(src) ? src.replace(re, line) : src + (src.endsWith('\n') || src === '' ? '' : '\n') + line + '\n';
  }
  await fsp.writeFile(ENV_PATH, src, 'utf8');
}

async function handleRequest(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (API_TOKEN && req.headers.authorization !== `Bearer ${API_TOKEN}`) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = url.pathname;
  const method = req.method;

  try {
    // GET /stats
    if (route === '/stats' && method === 'GET') {
      const stats = await loadJson(paths.serverStats, { messages: 0, newUsers: 0 });
      return json(res, 200, stats);
    }

    // GET /stats/history?days=N  (default 30, max 365)
    if (route === '/stats/history' && method === 'GET') {
      const daysParam = parseInt(url.searchParams.get('days') ?? '30', 10);
      const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 365) : 30;
      const historyDir = resolvePath(joinPath(config.serverStatsPath, 'stats-history'));
      try {
        const files = await fsp.readdir(historyDir);
        const snapshots = await Promise.all(
          files
            .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
            .sort()
            .slice(-days)
            .map(async (f) => {
              const data = await fsp.readFile(joinPath(historyDir, f), 'utf8');
              return JSON.parse(data);
            })
        );
        return json(res, 200, snapshots);
      } catch {
        return json(res, 200, []);
      }
    }

    // GET /filter
    if (route === '/filter' && method === 'GET') {
      const words = await loadJson(paths.filteredWords, []);
      return json(res, 200, words);
    }

    // POST /filter  { word: string }
    if (route === '/filter' && method === 'POST') {
      const { word } = await readBody(req);
      if (!word || typeof word !== 'string') return json(res, 400, { error: 'Missing word' });
      if (word.length > 200) return json(res, 400, { error: 'Word exceeds maximum length of 200' });
      const normalized = word.toLowerCase().trim();
      const words = await loadJson(paths.filteredWords, []);
      if (words.includes(normalized)) return json(res, 409, { error: 'Word already exists' });
      words.push(normalized);
      await writeJson(paths.filteredWords, words);
      if (_logger) await _logger.info(`API: added filtered word "${normalized}"`);
      return json(res, 201, { word: normalized });
    }

    // DELETE /filter/:word
    if (route.startsWith('/filter/') && method === 'DELETE') {
      const word = decodeURIComponent(route.slice('/filter/'.length)).toLowerCase().trim();
      const words = await loadJson(paths.filteredWords, []);
      const next = words.filter((w) => w !== word);
      if (next.length === words.length) return json(res, 404, { error: 'Word not found' });
      await writeJson(paths.filteredWords, next);
      if (_logger) await _logger.info(`API: removed filtered word "${word}"`);
      return json(res, 200, { word });
    }

    // GET /tickets
    if (route === '/tickets' && method === 'GET') {
      try {
        const dir = resolvePath(config.ticketDirectoryPath);
        const files = await fsp.readdir(dir);
        const tickets = await Promise.all(
          files
            .filter((f) => f.endsWith('.json'))
            .sort((a, b) => b.localeCompare(a))
            .map(async (f) => {
              const data = await fsp.readFile(joinPath(dir, f), 'utf8');
              return { file: f, ...JSON.parse(data) };
            })
        );
        return json(res, 200, tickets);
      } catch {
        return json(res, 200, []);
      }
    }

    // DELETE /tickets/:id
    if (route.startsWith('/tickets/') && method === 'DELETE') {
      const id = decodeURIComponent(route.slice('/tickets/'.length));
      if (!id) return json(res, 400, { error: 'Missing ticket id' });
      const ok = await deleteTicket(id);
      if (!ok) return json(res, 404, { error: 'Ticket not found' });
      res.writeHead(204); res.end();
      return;
    }

    // GET /logs?date=YYYY-MM-DD&limit=N&offset=N  (defaults to today, no limit)
    if (route === '/logs' && method === 'GET') {
      const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json(res, 400, { error: 'Invalid date' });
      const limitParam  = parseInt(url.searchParams.get('limit')  ?? '0', 10);
      const offsetParam = parseInt(url.searchParams.get('offset') ?? '0', 10);
      const limit  = Number.isFinite(limitParam)  && limitParam  > 0 ? limitParam  : 0;
      const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;
      const logPath = resolvePath(joinPath(config.logsPath, `${date}.log`));
      try {
        const raw = await fsp.readFile(logPath, 'utf8');
        let lines = raw.trim().split('\n').filter(Boolean).map((line) => {
          const m = line.match(/^\[(.+?)\] \[(.+?)\] (.+)$/);
          return m ? { timestamp: m[1], level: m[2], message: m[3] } : { timestamp: '', level: 'INFO', message: line };
        });
        const total = lines.length;
        if (offset) lines = lines.slice(offset);
        if (limit)  lines = lines.slice(0, limit);
        return json(res, 200, { total, offset, lines });
      } catch {
        return json(res, 200, { total: 0, offset: 0, lines: [] });
      }
    }

    // GET /banned
    if (route === '/banned' && method === 'GET') {
      const ids = await loadJson(paths.bannedList, []);
      return json(res, 200, ids);
    }

    // POST /banned  { userId: string }
    if (route === '/banned' && method === 'POST') {
      const { userId } = await readBody(req);
      if (!userId || typeof userId !== 'string') return json(res, 400, { error: 'Missing userId' });
      if (userId.length > 50) return json(res, 400, { error: 'userId exceeds maximum length of 50' });
      const ids = await loadJson(paths.bannedList, []);
      if (ids.includes(userId)) return json(res, 409, { error: 'User already banned' });
      ids.push(userId);
      await writeJson(paths.bannedList, ids);
      if (_logger) await _logger.info(`API: added ${userId} to banned list`);
      return json(res, 201, { userId });
    }

    // DELETE /banned/:userId
    if (route.startsWith('/banned/') && method === 'DELETE') {
      const userId = decodeURIComponent(route.slice('/banned/'.length)).trim();
      const ids = await loadJson(paths.bannedList, []);
      const next = ids.filter((id) => id !== userId);
      if (next.length === ids.length) return json(res, 404, { error: 'User not found' });
      await writeJson(paths.bannedList, next);
      if (_logger) await _logger.info(`API: removed ${userId} from banned list`);
      return json(res, 200, { userId });
    }

    // GET /config
    if (route === '/config' && method === 'GET') {
      return json(res, 200, Object.fromEntries(
        Object.keys(CONFIG_FIELDS).map((k) => [k, config[k]])
      ));
    }

    // POST /config  { fields: { [key]: value } }
    if (route === '/config' && method === 'POST') {
      const body = await readBody(req);
      const { fields } = body;
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
        return json(res, 400, { error: 'Expected { fields: { ... } }' });
      }
      const unknown = Object.keys(fields).filter((k) => !Object.hasOwn(CONFIG_FIELDS, k));
      if (unknown.length) return json(res, 400, { error: `Unknown fields: ${unknown.join(', ')}` });
      const updates = Object.fromEntries(
        Object.entries(fields).map(([field, value]) => [CONFIG_FIELDS[field], String(value)])
      );
      await writeEnvFields(updates);
      if (_logger) await _logger.info(`API: updated config fields: ${Object.keys(fields).join(', ')}`);
      json(res, 200, { restart: true });
      setImmediate(() => restart('config updated via panel'));
      return;
    }

    // GET /schedules
    if (route === '/schedules' && method === 'GET') {
      return json(res, 200, listSchedules());
    }

    // POST /schedules  { id, mode, timing, channelName, payload, enabled }
    if (route === '/schedules' && method === 'POST') {
      const body = await readBody(req);
      const { id, mode, timing, channelName, payload, enabled = true } = body;
      if (!id || typeof id !== 'string' || !/^[\w-]+$/.test(id)) return json(res, 400, { error: 'Invalid or missing id' });
      if (id.length > 100) return json(res, 400, { error: 'id exceeds maximum length of 100' });
      if (mode !== 'interval' && mode !== 'cron') return json(res, 400, { error: 'mode must be interval or cron' });
      if (!timing || typeof timing !== 'string') return json(res, 400, { error: 'Missing timing' });
      if (mode === 'interval' && !parseInterval(timing)) return json(res, 400, { error: 'Invalid interval timing' });
      if (!channelName || typeof channelName !== 'string') return json(res, 400, { error: 'Missing channelName' });
      if (!payload || typeof payload !== 'string') return json(res, 400, { error: 'Missing payload' });
      if (payload.length > 2000) return json(res, 400, { error: 'payload exceeds 2000 characters' });
      if (listSchedules().some((t) => t.id === id)) return json(res, 409, { error: 'Schedule id already exists' });
      const task = { id, mode, timing, channelName, payload, enabled: Boolean(enabled), lastRun: null };
      await addSchedule(task, _logger);
      return json(res, 201, task);
    }

    // DELETE /schedules/:id
    if (route.startsWith('/schedules/') && !route.slice('/schedules/'.length).includes('/') && method === 'DELETE') {
      const id = decodeURIComponent(route.slice('/schedules/'.length));
      if (!id) return json(res, 400, { error: 'Missing id' });
      const ok = await removeSchedule(id, _logger);
      if (!ok) return json(res, 404, { error: 'Schedule not found' });
      res.writeHead(204); res.end();
      return;
    }

    // POST /schedules/:id/enable
    if (route.match(/^\/schedules\/[^/]+\/enable$/) && method === 'POST') {
      const id = decodeURIComponent(route.split('/')[2]);
      const ok = await enableSchedule(id, _logger);
      if (!ok) return json(res, 404, { error: 'Schedule not found' });
      return json(res, 200, { id, enabled: true });
    }

    // POST /schedules/:id/disable
    if (route.match(/^\/schedules\/[^/]+\/disable$/) && method === 'POST') {
      const id = decodeURIComponent(route.split('/')[2]);
      const ok = await disableSchedule(id, _logger);
      if (!ok) return json(res, 404, { error: 'Schedule not found' });
      return json(res, 200, { id, enabled: false });
    }

    // POST /schedules/:id/run
    if (route.match(/^\/schedules\/[^/]+\/run$/) && method === 'POST') {
      const id = decodeURIComponent(route.split('/')[2]);
      const ok = await runScheduleNow(id, _logger);
      if (!ok) return json(res, 404, { error: 'Schedule not found' });
      return json(res, 200, { id, triggered: true });
    }

    // GET /channels
    if (route === '/channels' && method === 'GET') {
      return json(res, 200, {
        text: listTextChannels(),
        voice: listVoiceChannels(),
      });
    }

    json(res, 404, { error: 'Not found' });
  } catch (error) {
    json(res, 500, { error: error.message || 'Internal server error' });
  }
}

let server = null;

export async function startApi(logger) {
  _logger = logger;
  await ensureDirs();
  if (!API_TOKEN && logger) await logger.warn('API_TOKEN is not set — all API endpoints are unauthenticated');
  server = createServer(handleRequest);
  server.requestTimeout = 10_000;
  await new Promise((resolve) => server.listen(PORT, resolve));
  if (logger) await logger.info(`API server listening on http://localhost:${PORT}`);
}

export function stopApi(logger) {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.closeAllConnections();
    server.close(async () => {
      if (logger) await logger.info('API server stopped');
      server = null;
      resolve();
    });
  });
}
