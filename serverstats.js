// Server statistics tracking for message counts and new user joins
// Persists stats to a JSON file in the data directory

import path from 'path';
import * as config from './config.js';
import { checkDirExists, createDir, checkFileExists, createFile } from './io.js';

const statsFilePath = path.join(config.serverStatsPath, config.serverStatsFile);

// In-memory stats object
let stats = {
  messages: 0,
  newUsers: 0,
};

// Ensure the data directory and stats file exist, loading existing stats if present
export async function loadServerStats(logger) {
  try {
    if (!(await checkDirExists(config.serverStatsPath))) {
      await createDir(config.serverStatsPath);
      if (logger) await logger.info('Created data directory for server stats');
    }

    if (await checkFileExists(statsFilePath)) {
      const raw = await import('fs').then((fs) =>
        fs.promises.readFile(statsFilePath, 'utf8')
      );
      stats = JSON.parse(raw);
      if (logger) await logger.info('Loaded server stats from file');
    } else {
      await createFile(statsFilePath, JSON.stringify(stats, null, 2));
      if (logger) await logger.info('Initialized new server stats file');
    }
  } catch (error) {
    if (logger) await logger.error(`Failed to load server stats: ${error.message || error}`);
  }
}

// Persist current in-memory stats to disk
async function saveServerStats(logger) {
  try {
    await createFile(statsFilePath, JSON.stringify(stats, null, 2));
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
