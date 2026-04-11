// API server — exposes bot data over HTTP for the panel

import { createServer } from 'http';
import * as config from './config.js';
import { restart } from './exit.js';
import { addKickedUser, removeKickedUser, isKicked, getKickedUsers } from './kickedusers.js';
import { addBannedUser, removeBannedUser, isBanned, getBannedUsers } from './bannedusers.js';
import { addFilteredWord, removeFilteredWord, getFilteredWords } from './filter.js';
import { listTextChannels, listVoiceChannels, listCategories } from './interactions.js';
import { getInvites, createInvite, deleteInvite } from './invites.js';
import { readLogs } from './logger.js';
import { listTasks, addTask, removeTask, enableTask, disableTask, runTaskNow, parseInterval } from './scheduler.js';
import { getServerStats, getStatsHistory } from './serverstats.js';
import { listTickets, deleteTicket } from './ticket.js';

const PORT = process.env.API_PORT || 3001;
const PANEL_ORIGIN = process.env.PANEL_ORIGIN || 'http://localhost:5173';
const API_TOKEN = process.env.API_TOKEN || null;

let _logger = null;

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
  enableOnboarding: 'ENABLE_ONBOARDING',
};

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
      return json(res, 200, getServerStats());
    }

    // GET /stats/history?days=N  (default 30, max 365)
    if (route === '/stats/history' && method === 'GET') {
      const daysParam = parseInt(url.searchParams.get('days') ?? '30', 10);
      const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;
      return json(res, 200, await getStatsHistory(days));
    }

    // GET /filter
    if (route === '/filter' && method === 'GET') {
      return json(res, 200, getFilteredWords());
    }

    // POST /filter  { word: string }
    if (route === '/filter' && method === 'POST') {
      const { word } = await readBody(req);
      if (!word || typeof word !== 'string') return json(res, 400, { error: 'Missing word' });
      if (word.length > 200) return json(res, 400, { error: 'Word exceeds maximum length of 200' });
      const normalized = word.toLowerCase().trim();
      const added = await addFilteredWord(normalized);
      if (!added) return json(res, 409, { error: 'Word already exists' });
      if (_logger) await _logger.info(`API: added filtered word "${normalized}"`);
      return json(res, 201, { word: normalized });
    }

    // DELETE /filter/:word
    if (route.startsWith('/filter/') && method === 'DELETE') {
      const word = decodeURIComponent(route.slice('/filter/'.length)).toLowerCase().trim();
      const removed = await removeFilteredWord(word);
      if (!removed) return json(res, 404, { error: 'Word not found' });
      if (_logger) await _logger.info(`API: removed filtered word "${word}"`);
      return json(res, 200, { word });
    }

    // GET /tickets
    if (route === '/tickets' && method === 'GET') {
      return json(res, 200, await listTickets());
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
      return json(res, 200, await readLogs(date, limit, offset));
    }

    // GET /autokicker
    if (route === '/autokicker' && method === 'GET') {
      return json(res, 200, getKickedUsers());
    }

    // POST /autokicker  { userId: string }
    if (route === '/autokicker' && method === 'POST') {
      const { userId } = await readBody(req);
      if (!userId || typeof userId !== 'string') return json(res, 400, { error: 'Missing userId' });
      if (userId.length > 50) return json(res, 400, { error: 'userId exceeds maximum length of 50' });
      if (isKicked(userId)) return json(res, 409, { error: 'User already in kick list' });
      await addKickedUser(userId);
      if (_logger) await _logger.info(`API: added ${userId} to kick list`);
      return json(res, 201, { userId });
    }

    // DELETE /autokicker/:userId
    if (route.startsWith('/autokicker/') && method === 'DELETE') {
      const userId = decodeURIComponent(route.slice('/autokicker/'.length)).trim();
      const removed = await removeKickedUser(userId);
      if (!removed) return json(res, 404, { error: 'User not found' });
      if (_logger) await _logger.info(`API: removed ${userId} from kick list`);
      return json(res, 200, { userId });
    }

    // GET /bannedusers
    if (route === '/bannedusers' && method === 'GET') {
      return json(res, 200, getBannedUsers());
    }

    // POST /bannedusers  { userId: string }
    if (route === '/bannedusers' && method === 'POST') {
      const { userId } = await readBody(req);
      if (!userId || typeof userId !== 'string') return json(res, 400, { error: 'Missing userId' });
      if (userId.length > 50) return json(res, 400, { error: 'userId exceeds maximum length of 50' });
      if (isBanned(userId)) return json(res, 409, { error: 'User already in ban list' });
      await addBannedUser(userId);
      if (_logger) await _logger.info(`API: added ${userId} to ban list`);
      return json(res, 201, { userId });
    }

    // DELETE /bannedusers/:userId
    if (route.startsWith('/bannedusers/') && method === 'DELETE') {
      const userId = decodeURIComponent(route.slice('/bannedusers/'.length)).trim();
      const removed = await removeBannedUser(userId);
      if (!removed) return json(res, 404, { error: 'User not found' });
      if (_logger) await _logger.info(`API: removed ${userId} from ban list`);
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
      await config.writeEnvFields(updates);
      if (_logger) await _logger.info(`API: updated config fields: ${Object.keys(fields).join(', ')}`);
      json(res, 200, { restart: true });
      setImmediate(() => restart('config updated via panel'));
      return;
    }

    // GET /schedules
    if (route === '/schedules' && method === 'GET') {
      return json(res, 200, listTasks());
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
      if (listTasks().some((t) => t.id === id)) return json(res, 409, { error: 'Schedule id already exists' });
      const task = { id, mode, timing, channelName, payload, enabled: Boolean(enabled), lastRun: null };
      await addTask(task, _logger);
      return json(res, 201, task);
    }

    // DELETE /schedules/:id
    if (route.startsWith('/schedules/') && !route.slice('/schedules/'.length).includes('/') && method === 'DELETE') {
      const id = decodeURIComponent(route.slice('/schedules/'.length));
      if (!id) return json(res, 400, { error: 'Missing id' });
      const ok = await removeTask(id, _logger);
      if (!ok) return json(res, 404, { error: 'Schedule not found' });
      res.writeHead(204); res.end();
      return;
    }

    // POST /schedules/:id/enable
    if (route.match(/^\/schedules\/[^/]+\/enable$/) && method === 'POST') {
      const id = decodeURIComponent(route.split('/')[2]);
      const ok = await enableTask(id, _logger);
      if (!ok) return json(res, 404, { error: 'Schedule not found' });
      return json(res, 200, { id, enabled: true });
    }

    // POST /schedules/:id/disable
    if (route.match(/^\/schedules\/[^/]+\/disable$/) && method === 'POST') {
      const id = decodeURIComponent(route.split('/')[2]);
      const ok = await disableTask(id, _logger);
      if (!ok) return json(res, 404, { error: 'Schedule not found' });
      return json(res, 200, { id, enabled: false });
    }

    // POST /schedules/:id/run
    if (route.match(/^\/schedules\/[^/]+\/run$/) && method === 'POST') {
      const id = decodeURIComponent(route.split('/')[2]);
      const ok = await runTaskNow(id, _logger);
      if (!ok) return json(res, 404, { error: 'Schedule not found' });
      return json(res, 200, { id, triggered: true });
    }

    // GET /channels
    if (route === '/channels' && method === 'GET') {
      return json(res, 200, {
        text: listTextChannels(),
        voice: listVoiceChannels(),
        categories: listCategories(),
      });
    }

    // GET /invites
    if (route === '/invites' && method === 'GET') {
      return json(res, 200, getInvites());
    }

    // POST /invites { channelId, maxUses, maxAge, reason }
    if (route === '/invites' && method === 'POST') {
      const body = await readBody(req);
      try {
        const invite = await createInvite(body || {});
        if (_logger) await _logger.info(`API: created invite ${invite.code} for channel ${invite.channelId}`);
        return json(res, 201, invite);
      } catch (error) {
        return json(res, 400, { error: error.message || 'Failed to create invite' });
      }
    }

    // DELETE /invites/:code
    if (route.startsWith('/invites/') && method === 'DELETE') {
      const code = decodeURIComponent(route.slice('/invites/'.length)).trim();
      try {
        await deleteInvite(code);
        if (_logger) await _logger.info(`API: deleted invite ${code}`);
        return res.writeHead(204).end();
      } catch (error) {
        return json(res, 400, { error: error.message || 'Failed to delete invite' });
      }
    }

    json(res, 404, { error: 'Not found' });
  } catch (error) {
    json(res, 500, { error: error.message || 'Internal server error' });
  }
}

let server = null;

export async function setupApi(logger) {
  _logger = logger;
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
