// Banned user list — Saves and checks banned Discord user IDs

import * as config from './config.js';
import { ensureDir, loadJson, writeJson, joinPath } from './io.js';
import { kickMember } from './interactions.js';

const bannedListFilePath = joinPath(config.bannedListPath, config.bannedListFile);

let _logger = null;
let bannedIds = new Set();

// Load the banned list from disk and initialise the logger.
export async function loadBannedList(logger) {
  _logger = logger;
  try {
    await ensureDir(config.bannedListPath);
    bannedIds = new Set(await loadJson(bannedListFilePath, []));
    if (_logger) await _logger.info(`Loaded banned list: ${bannedIds.size} entries`);
  } catch (error) {
    if (_logger) await _logger.error(`Failed to load banned list: ${error.message || error}`);
  }
}

// Add a user to the banned set, persist to disk, and kick from the guild.
export async function addBannedUser(userId) {
  bannedIds.add(userId);
  try {
    await writeJson(bannedListFilePath, [...bannedIds]);
    if (_logger) await _logger.info(`Added user ${userId} to banned list`);
  } catch (error) {
    if (_logger) await _logger.error(`Failed to save banned list: ${error.message || error}`);
  }

  await kickMember(userId, 'Added to banned list');
}

// Remove a user from the banned set and persist to disk. Returns false if not found.
export async function removeBannedUser(userId) {
  if (!bannedIds.has(userId)) return false;
  bannedIds.delete(userId);
  try {
    await writeJson(bannedListFilePath, [...bannedIds]);
    if (_logger) await _logger.info(`Removed user ${userId} from banned list`);
  } catch (error) {
    if (_logger) await _logger.error(`Failed to save banned list: ${error.message || error}`);
  }
  return true;
}

// Check if a user ID is in the banned set.
export function isBanned(userId) {
  return bannedIds.has(userId);
}
