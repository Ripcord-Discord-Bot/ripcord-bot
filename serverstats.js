// Server statistics — tracks and persists message and new user counts

import * as config from './config.js';
import { ensureDir, checkFileExists, readJson, writeJson, joinPath } from './io.js';

const statsFilePath = joinPath(config.serverStatsPath, config.serverStatsFile);

let stats = {
  messages: 0,
  newUsers: 0,
  commandsRun: 0,
  filteredMessages: 0,
  ticketsCreated: 0,
  ticketsResolved: 0,
  bannedUsersKicked: 0,
  usersLeft: 0,
  roleCounts: {},
};

// Ensure the data directory and stats file exist, loading existing stats if present
export async function loadServerStats(logger) {
  try {
    await ensureDir(config.serverStatsPath);

    if (await checkFileExists(statsFilePath)) {
      const loaded = await readJson(statsFilePath);
      stats = { ...stats, ...loaded };
      if (logger) await logger.info('Loaded server stats from file');
    } else {
      await writeJson(statsFilePath, stats);
      if (logger) await logger.info('Initialized new server stats file');
    }
  } catch (error) {
    if (logger) await logger.error(`Failed to load server stats: ${error.message || error}`);
  }
}

async function saveServerStats(logger) {
  try {
    await writeJson(statsFilePath, stats);
  } catch (error) {
    if (logger) await logger.error(`Failed to save server stats: ${error.message || error}`);
  }
}

export async function recordMessage(logger) {
  stats.messages += 1;
  await saveServerStats(logger);
}

export async function recordNewUser(logger) {
  stats.newUsers += 1;
  await saveServerStats(logger);
}

export async function recordCommandRun(logger) {
  stats.commandsRun += 1;
  await saveServerStats(logger);
}

export async function recordFilteredMessage(logger) {
  stats.filteredMessages += 1;
  await saveServerStats(logger);
}

export async function recordTicketCreated(logger) {
  stats.ticketsCreated += 1;
  await saveServerStats(logger);
}

export async function recordTicketResolved(logger) {
  stats.ticketsResolved += 1;
  await saveServerStats(logger);
}

export async function recordBannedUserKicked(logger) {
  stats.bannedUsersKicked += 1;
  await saveServerStats(logger);
}

export async function recordUserLeft(logger) {
  stats.usersLeft += 1;
  await saveServerStats(logger);
}

// Replace the full role counts map (called on bot ready from live guild data)
export async function setRoleCounts(counts, logger) {
  stats.roleCounts = { ...counts };
  await saveServerStats(logger);
}

// Increment a single role's count (called when a role is assigned)
export async function recordRoleAssigned(roleName, logger) {
  stats.roleCounts[roleName] = (stats.roleCounts[roleName] || 0) + 1;
  await saveServerStats(logger);
}

export function getServerStats() {
  return { ...stats, roleCounts: { ...stats.roleCounts } };
}

// Write a snapshot of current counters to data/stats-history/<date>.json.
// Called with the date that just ended (yesterday) so the file is always
// labelled with the day the data belongs to.
export async function snapshotDaily(date, logger) {
  try {
    const historyDir = joinPath(config.serverStatsPath, 'stats-history');
    await ensureDir(historyDir);
    const filePath = joinPath(historyDir, `${date}.json`);
    await writeJson(filePath, { date, ...stats });
    if (logger) await logger.info(`Snapshotted stats for ${date}`);
  } catch (error) {
    if (logger) await logger.error(`Failed to snapshot stats: ${error.message || error}`);
  }
}
