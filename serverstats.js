// Server statistics — tracks and persists message and new user counts

import * as config from './config.js';
import { ensureDir, checkFileExists, readJson, writeJson, joinPath } from './io.js';

const statsFilePath = joinPath(config.serverStatsPath, config.serverStatsFile);

let _logger = null;

let stats = {
  messages: 0,
  newUsers: 0,
  commandsRun: 0,
  filteredMessages: 0,
  ticketsCreated: 0,
  ticketsResolved: 0,
  bannedUsersKicked: 0,
  usersLeft: 0,
  tasksRun: 0,
  roleCounts: {},
};

// Ensure the data directory and stats file exist, loading existing stats if present
export async function loadServerStats(logger) {
  _logger = logger;
  try {
    await ensureDir(config.serverStatsPath);

    if (await checkFileExists(statsFilePath)) {
      const loaded = await readJson(statsFilePath);
      stats = { ...stats, ...loaded };
      if (_logger) await _logger.info('Loaded server stats from file');
    } else {
      await writeJson(statsFilePath, stats);
      if (_logger) await _logger.info('Initialized new server stats file');
    }
  } catch (error) {
    if (_logger) await _logger.error(`Failed to load server stats: ${error.message || error}`);
  }
}

async function saveServerStats() {
  try {
    await writeJson(statsFilePath, stats);
  } catch (error) {
    if (_logger) await _logger.error(`Failed to save server stats: ${error.message || error}`);
  }
}

export async function recordMessage() {
  stats.messages += 1;
  await saveServerStats();
}

export async function recordNewUser() {
  stats.newUsers += 1;
  await saveServerStats();
}

export async function recordCommandRun() {
  stats.commandsRun += 1;
  await saveServerStats();
}

export async function recordFilteredMessage() {
  stats.filteredMessages += 1;
  await saveServerStats();
}

export async function recordTicketCreated() {
  stats.ticketsCreated += 1;
  await saveServerStats();
}

export async function recordTicketResolved() {
  stats.ticketsResolved += 1;
  await saveServerStats();
}

export async function recordBannedUserKicked() {
  stats.bannedUsersKicked += 1;
  await saveServerStats();
}

export async function recordUserLeft() {
  stats.usersLeft += 1;
  await saveServerStats();
}

export async function recordTaskRun() {
  stats.tasksRun += 1;
  await saveServerStats();
}

// Replace the full role counts map (called on bot ready from live guild data)
export async function setRoleCounts(counts) {
  stats.roleCounts = { ...counts };
  await saveServerStats();
}

// Increment a single role's count (called when a role is assigned)
export async function recordRoleAssigned(roleName) {
  stats.roleCounts[roleName] = (stats.roleCounts[roleName] || 0) + 1;
  await saveServerStats();
}

export function getServerStats() {
  return { ...stats, roleCounts: { ...stats.roleCounts } };
}

// Write a snapshot of current counters to data/stats-history/<date>.json.
// Called with the date that just ended (yesterday) so the file is always
// labelled with the day the data belongs to.
export async function snapshotDaily(date) {
  try {
    const historyDir = joinPath(config.serverStatsPath, 'stats-history');
    await ensureDir(historyDir);
    const filePath = joinPath(historyDir, `${date}.json`);
    await writeJson(filePath, { date, stats: getServerStats() });
    if (_logger) await _logger.info(`Snapshotted stats for ${date}`);
  } catch (error) {
    if (_logger) await _logger.error(`Failed to snapshot stats: ${error.message || error}`);
  }
}
