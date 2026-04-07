// Server statistics — tracks and persists message and new user counts

import * as config from './config.js';
import { ensureDir, checkFileExists, readJson, writeJson, joinPath } from './io.js';

const statsFilePath = joinPath(config.serverStatsPath, config.serverStatsFile);

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

export function getServerStats() {
  return { ...stats };
}
