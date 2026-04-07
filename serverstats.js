// Server statistics tracking for message counts and new user joins
// Persists stats to a JSON file in the data directory

import * as config from './config.js';
import { ensureDir, checkFileExists, readJson, writeJson, joinPath } from './io.js';

const statsFilePath = joinPath(config.serverStatsPath, config.serverStatsFile);

// In-memory stats object
let stats = {
  messages: 0,
  newUsers: 0,
};

// Ensure the data directory and stats file exist, loading existing stats if present
export async function loadServerStats(logger) {
  try {
    await ensureDir(config.serverStatsPath);

    if (await checkFileExists(statsFilePath)) {
      stats = await readJson(statsFilePath);
      if (logger) await logger.info('Loaded server stats from file');
    } else {
      await writeJson(statsFilePath, stats);
      if (logger) await logger.info('Initialized new server stats file');
    }
  } catch (error) {
    if (logger) await logger.error(`Failed to load server stats: ${error.message || error}`);
  }
}

// Persist current in-memory stats to disk
async function saveServerStats(logger) {
  try {
    await writeJson(statsFilePath, stats);
  } catch (error) {
    if (logger) await logger.error(`Failed to save server stats: ${error.message || error}`);
  }
}

// Increment message count and persist
export async function recordMessage(logger) {
  stats.messages += 1;
  await saveServerStats(logger);
}

// Increment new user count and persist
export async function recordNewUser(logger) {
  stats.newUsers += 1;
  await saveServerStats(logger);
}

// Returns a snapshot of the current in-memory stats
export function getServerStats() {
  return { ...stats };
}
