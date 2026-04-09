// API server — exposes bot data over HTTP for the panel

import { createServer } from 'http';
import * as fsp from 'fs/promises';
import * as config from './config.js';
import { ensureDir, loadJson, writeJson, joinPath, resolvePath } from './io.js';
import { deleteTicket } from './ticket.js';

const PORT = process.env.API_PORT || 3001;
const PANEL_ORIGIN = process.env.PANEL_ORIGIN || 'http://localhost:5173';

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
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

async function writeEnvField(key, value) {
  let src = await readEnvFile();
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  src = re.test(src) ? src.replace(re, line) : src + (src.endsWith('\n') || src === '' ? '' : '\n') + line + '\n';
  await fsp.writeFile(ENV_PATH, src, 'utf8');
}

async function handleRequest(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
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
      const normalized = word.toLowerCase().trim();
      const words = await loadJson(paths.filteredWords, []);
      if (words.includes(normalized)) return json(res, 409, { error: 'Word already exists' });
      words.push(normalized);
      await writeJson(paths.filteredWords, words);
      return json(res, 201, { word: normalized });
    }

    // DELETE /filter/:word
    if (route.startsWith('/filter/') && method === 'DELETE') {
      const word = decodeURIComponent(route.slice('/filter/'.length)).toLowerCase().trim();
      const words = await loadJson(paths.filteredWords, []);
      const next = words.filter((w) => w !== word);
      if (next.length === words.length) return json(res, 404, { error: 'Word not found' });
      await writeJson(paths.filteredWords, next);
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
      const ok = await deleteTicket(id, { info: () => {}, error: () => {} });
      if (!ok) return json(res, 404, { error: 'Ticket not found' });
      res.writeHead(204); res.end();
      return;
    }

    // GET /logs?date=YYYY-MM-DD  (defaults to today)
    if (route === '/logs' && method === 'GET') {
      const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json(res, 400, { error: 'Invalid date' });
      const logPath = resolvePath(joinPath(config.logsPath, `${date}.log`));
      try {
        const raw = await fsp.readFile(logPath, 'utf8');
        const lines = raw.trim().split('\n').filter(Boolean).map((line) => {
          const m = line.match(/^\[(.+?)\] \[(.+?)\] (.+)$/);
          return m ? { timestamp: m[1], level: m[2], message: m[3] } : { timestamp: '', level: 'INFO', message: line };
        });
        return json(res, 200, lines);
      } catch {
        return json(res, 200, []);
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
      const ids = await loadJson(paths.bannedList, []);
      if (ids.includes(userId)) return json(res, 409, { error: 'User already banned' });
      ids.push(userId);
      await writeJson(paths.bannedList, ids);
      return json(res, 201, { userId });
    }

    // DELETE /banned/:userId
    if (route.startsWith('/banned/') && method === 'DELETE') {
      const userId = decodeURIComponent(route.slice('/banned/'.length)).trim();
      const ids = await loadJson(paths.bannedList, []);
      const next = ids.filter((id) => id !== userId);
      if (next.length === ids.length) return json(res, 404, { error: 'User not found' });
      await writeJson(paths.bannedList, next);
      return json(res, 200, { userId });
    }

    // GET /config
    if (route === '/config' && method === 'GET') {
      return json(res, 200, {
        commandPrefix:    config.commandPrefix,
        enableConsole:    config.enableConsole,
        enableFileLogging:config.enableFileLogging,
        chatChannel:      config.chatChannel,
        moderatorChannel: config.moderatorChannel,
        ticketChannel:    config.ticketChannel,
        welcomeChannel:   config.welcomeChannel,
        moderatorRole:    config.moderatorRole,
        trustedRole:      config.trustedRole,
        enableFiltering:  config.enableFiltering,
        ollamaModel:      config.ollamaModel,
        enableTickets:    config.enableTickets,
      });
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
      for (const [field, value] of Object.entries(fields)) {
        await writeEnvField(CONFIG_FIELDS[field], String(value));
      }
      return json(res, 200, { restart: true });
    }

    json(res, 404, { error: 'Not found' });
  } catch (error) {
    json(res, 500, { error: error.message || 'Internal server error' });
  }
}

let server = null;

export async function startApi(logger) {
  await ensureDirs();
  server = createServer(handleRequest);
  await new Promise((resolve) => server.listen(PORT, resolve));
  if (logger) await logger.info(`API server listening on http://localhost:${PORT}`);
}

export function stopApi(logger) {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.close(async () => {
      if (logger) await logger.info('API server stopped');
      server = null;
      resolve();
    });
  });
}
