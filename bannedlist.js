// Banned user list — Saves and checks banned Discord user IDs

import * as config from './config.js';
import { ensureDir, loadJson, writeJson, joinPath } from './io.js';

const bannedListFilePath = joinPath(config.bannedListPath, config.bannedListFile);

let bannedIds = new Set();

export async function loadBannedList(logger) {
  try {
    await ensureDir(config.bannedListPath);
    bannedIds = new Set(await loadJson(bannedListFilePath, []));
    if (logger) await logger.info(`Loaded banned list: ${bannedIds.size} entries`);
  } catch (error) {
    if (logger) await logger.error(`Failed to load banned list: ${error.message || error}`);
  }
}

// Adds user to banned set, persists, and kicks from the guild if they are currently a member
export async function addBannedUser(userId, logger, guild) {
  bannedIds.add(userId);
  try {
    await writeJson(bannedListFilePath, [...bannedIds]);
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

export async function removeBannedUser(userId, logger) {
  if (!bannedIds.has(userId)) return false;
  bannedIds.delete(userId);
  try {
    await writeJson(bannedListFilePath, [...bannedIds]);
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
