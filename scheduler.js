// Scheduler — runs tasks (channel messages or internal callbacks) on intervals or cron schedules

import { loadJson, writeJson, joinPath } from './io.js';
import * as config from './config.js';
import { recordTaskRun } from './serverstats.js';
import { sendToChannel } from './interactions.js';

// --- Cron matching ---

function matchesCronField(val, field) {
  if (field === '*') return true;
  if (field.includes(',')) return field.split(',').some((p) => matchesCronField(val, p.trim()));
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2), 10);
    return step > 0 && val % step === 0;
  }
  if (field.includes('-')) {
    const [lo, hi] = field.split('-').map(Number);
    return val >= lo && val <= hi;
  }
  return val === parseInt(field, 10);
}

function matchesCron(expr, date) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [mF, hF, domF, monF, dowF] = parts;
  return (
    matchesCronField(date.getMinutes(), mF) &&
    matchesCronField(date.getHours(), hF) &&
    matchesCronField(date.getDate(), domF) &&
    matchesCronField(date.getMonth() + 1, monF) &&
    matchesCronField(date.getDay(), dowF)
  );
}

// --- Interval parsing ---

// Accepts: 30s, 5m, 2h, 1d, 1w
function parseInterval(str) {
  const match = String(str).match(/^(\d+)(s|m|h|d|w)$/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  const units = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
  return n * units[match[2]];
}

// --- Module state ---

const _schedulesFilePath = joinPath(config.schedulesPath, config.schedulesFile);

let _client = null;
let _logger = null;
let _schedules = new Map(); // id → task
const _timers = new Map();
let _cronHandle = null;

// System tasks — internal callbacks registered in code, never persisted
const _systemTasks = new Map(); // id → { timing, mode, fn, _lastCronKey }

async function persistSchedules() {
  // Strip runtime-only fields before writing
  const toWrite = [..._schedules.values()].map(({ _lastCronKey, ...rest }) => rest);
  await writeJson(_schedulesFilePath, toWrite);
}

// --- Task execution ---

async function runTask(task) {
  try {
    const sent = await sendToChannel(task.channelName, task.payload);
    if (!sent) return;
    task.lastRun = new Date().toISOString();
    await persistSchedules();
    await recordTaskRun();
    await _logger.info(`Scheduler: ran task "${task.id}"`);
  } catch (error) {
    await _logger.error(`Scheduler: error running task "${task.id}": ${error.message || error}`);
  }
}

// --- Timer management ---

function startTimer(task) {
  if (task.mode !== 'interval') return;
  const ms = parseInterval(task.timing);
  if (!ms) return;
  const handle = setInterval(() => runTask(task), ms);
  _timers.set(task.id, handle);
}

function stopTimer(id) {
  const handle = _timers.get(id);
  if (handle !== undefined) {
    clearInterval(handle);
    _timers.delete(id);
  }
}

function checkCronSchedules() {
  const now = new Date();
  // Deduplicate per minute so back-to-back ticks don't double-fire
  const minuteKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
  for (const task of _schedules.values()) {
    if (!task.enabled || task.mode !== 'cron') continue;
    if (task._lastCronKey === minuteKey) continue;
    if (matchesCron(task.timing, now)) {
      task._lastCronKey = minuteKey;
      runTask(task); // fire-and-forget; errors are logged inside runTask
    }
  }
  for (const [id, sys] of _systemTasks) {
    if (sys.mode !== 'cron') continue;
    if (sys._lastCronKey === minuteKey) continue;
    if (matchesCron(sys.timing, now)) {
      sys._lastCronKey = minuteKey;
      Promise.resolve(sys.fn()).catch((err) =>
        _logger.error(`Scheduler: system task "${id}" failed: ${err.message || err}`)
      );
    }
  }
}

// --- Public API ---

async function startScheduler(client, logger) {
  _client = client;
  _logger = logger;
  const loaded = await loadJson(_schedulesFilePath, []);
  _schedules = new Map(loaded.map((t) => [t.id, t]));

  for (const task of _schedules.values()) {
    if (task.enabled && task.mode === 'interval') {
      startTimer(task);
    }
  }

  // Align the cron poll to the next full minute boundary
  const msUntilNextMinute = 60_000 - (Date.now() % 60_000);
  setTimeout(() => {
    checkCronSchedules();
    _cronHandle = setInterval(checkCronSchedules, 60_000);
  }, msUntilNextMinute);

  await logger.info(`Scheduler started with ${_schedules.size} task(s).`);
}

function stopScheduler() {
  for (const id of [..._timers.keys()]) stopTimer(id);
  _systemTasks.clear();
  if (_cronHandle !== null) {
    clearInterval(_cronHandle);
    _cronHandle = null;
  }
}

// Register a code-level system task (callback, not persisted, not user-manageable)
// mode: 'cron' | 'interval'   timing: cron expr or duration string
function registerSystemTask(id, mode, timing, fn) {
  if (mode === 'interval') {
    const ms = parseInterval(timing);
    if (!ms) throw new Error(`Invalid interval timing "${timing}" for system task "${id}"`);
    const handle = setInterval(() =>
      Promise.resolve(fn()).catch((err) =>
        _logger.error(`Scheduler: system task "${id}" failed: ${err.message || err}`)
      ), ms
    );
    _timers.set(id, handle);
  }
  _systemTasks.set(id, { timing, mode, fn, _lastCronKey: null });
}

function listSchedules() {
  const userTasks = [..._schedules.values()].map(({ _lastCronKey, ...rest }) => rest);
  const systemTasks = [..._systemTasks.entries()].map(([id, { timing, mode }]) => ({
    id,
    mode,
    timing,
    enabled: true,
    system: true,
  }));
  return [...userTasks, ...systemTasks];
}

async function addSchedule(task, logger) {
  _schedules.set(task.id, task);
  if (task.enabled && task.mode === 'interval') startTimer(task);
  await persistSchedules();
  await logger.info(`Scheduler: added task "${task.id}"`);
}

async function removeSchedule(id, logger) {
  if (!_schedules.has(id)) return false;
  stopTimer(id);
  _schedules.delete(id);
  await persistSchedules();
  await logger.info(`Scheduler: removed task "${id}"`);
  return true;
}

async function enableSchedule(id, logger) {
  const task = _schedules.get(id);
  if (!task) return false;
  task.enabled = true;
  if (task.mode === 'interval' && !_timers.has(id)) startTimer(task);
  await persistSchedules();
  await logger.info(`Scheduler: enabled task "${id}"`);
  return true;
}

async function disableSchedule(id, logger) {
  const task = _schedules.get(id);
  if (!task) return false;
  task.enabled = false;
  stopTimer(id);
  await persistSchedules();
  await logger.info(`Scheduler: disabled task "${id}"`);
  return true;
}

async function runScheduleNow(id, logger) {
  const sys = _systemTasks.get(id);
  if (sys) {
    await Promise.resolve(sys.fn()).catch((err) =>
      _logger?.error(`Scheduler: system task "${id}" failed: ${err.message || err}`)
    );
    return true;
  }
  const task = _schedules.get(id);
  if (!task) return false;
  await runTask(task);
  return true;
}

// Parse args for `schedule add` from a command argument list (post-subcommand).
// args: [id, mode, ...rest]
// Returns { ok: true, task } or { ok: false, reason, ...context }
function parseScheduleAdd(args) {
  const id = args[0];
  const mode = args[1];

  if (!id || !mode) return { ok: false, reason: 'missing_id_mode' };

  let timing, channelName, payload;

  if (mode === 'interval') {
    timing = args[2];
    channelName = args[3];
    payload = args.slice(4).join(' ');
    if (!timing || !channelName || !payload) return { ok: false, reason: 'missing_interval_args' };
    if (!parseInterval(timing)) return { ok: false, reason: 'invalid_interval', timing };
  } else if (mode === 'cron') {
    timing = args.slice(2, 7).join(' ');
    channelName = args[7];
    payload = args.slice(8).join(' ');
    if (args.slice(2, 7).length < 5 || !channelName || !payload) return { ok: false, reason: 'missing_cron_args' };
  } else {
    return { ok: false, reason: 'unknown_mode', mode };
  }

  return {
    ok: true,
    task: {
      id,
      channelName,
      payload,
      mode,
      timing,
      enabled: true,
      createdAt: new Date().toISOString(),
      lastRun: null,
    },
  };
}

export {
  startScheduler,
  stopScheduler,
  registerSystemTask,
  listSchedules,
  addSchedule,
  removeSchedule,
  enableSchedule,
  disableSchedule,
  runScheduleNow,
  parseInterval,
  parseScheduleAdd,
};
