// Banned user list management
// Loads and persists a list of banned Discord user IDs

import path from 'path';
import fs from 'fs';
import * as config from './config.js';
import { checkDirExists, createDir, checkFileExists, createFile } from './io.js';

const bannedListFilePath = path.join(config.bannedListPath, config.bannedListFile);

let bannedIds = new Set();

// Load banned IDs from disk into memory
export async function loadBannedList(logger) {
  try {
    if (!(await checkDirExists(config.bannedListPath))) {
      await createDir(config.bannedListPath);
    }
    if (!(await checkFileExists(bannedListFilePath))) {
      await createFile(bannedListFilePath, JSON.stringify([], null, 2));
    }
    const raw = await fs.promises.readFile(bannedListFilePath, 'utf8');
    bannedIds = new Set(JSON.parse(raw));
    if (logger) await logger.info(`Loaded banned list: ${bannedIds.size} entries`);
  } catch (error) {
    if (logger) await logger.error(`Failed to load banned list: ${error.message || error}`);
  }
}

// Add a user ID to the banned list, persist it, and kick from guild if present
export async function addBannedUser(userId, logger, guild) {
  bannedIds.add(userId);
  try {
    await createFile(bannedListFilePath, JSON.stringify([...bannedIds], null, 2));
    if (logger) await logger.info(`Added user ${userId} to banned list`);
  } catch (error) {
    if (logger) await logger.error(`Failed to save banned list: ${error.message || error}`);
  }

  if (guild) {
    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member) {
        await member.kick('Added to banned list');
        if (logger) await logger.warn(`Kicked ${member.user.tag} (${userId}) after being added to banned list`);
      }
    } catch (error) {
      if (logger) await logger.error(`Failed to kick user ${userId} from guild: ${error.message || error}`);
    }
  }
}

// Remove a user ID from the banned list and persist it
export async function removeBannedUser(userId, logger) {
  if (!bannedIds.has(userId)) return false;
  bannedIds.delete(userId);
  try {
    await createFile(bannedListFilePath, JSON.stringify([...bannedIds], null, 2));
    if (logger) await logger.info(`Removed user ${userId} from banned list`);
  } catch (error) {
    if (logger) await logger.error(`Failed to save banned list: ${error.message || error}`);
  }
  return true;
}

// Check if a user ID is banned
export function isBanned(userId) {
  return bannedIds.has(userId);
}
