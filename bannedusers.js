// Banned Users — Saves and checks Discord user IDs that should be auto-banned on join

import { Events } from 'discord.js';
import * as config from './config.js';
import { ensureDir, loadJson, writeJson, joinPath } from './io.js';
import { banMember } from './interactions.js';
import { recordKickedUser } from './serverstats.js';

const banListFilePath = joinPath(config.bannedUsersPath, config.bannedUsersFile);

let _logger = null;
let bannedIds = new Set();

// Load the ban list from disk, initialise the logger, and register the join handler.
export async function setupBannedUsers(client, logger) {
  _logger = logger;
  try {
    await ensureDir(config.bannedUsersPath);
    bannedIds = new Set(await loadJson(banListFilePath, []));
    if (_logger) await _logger.info(`Loaded ban list: ${bannedIds.size} entries`);
  } catch (error) {
    if (_logger) await _logger.error(`Failed to load ban list: ${error.message || error}`);
  }

  client.on(Events.GuildMemberAdd, async (member) => {
    if (!isBanned(member.id)) return;
    try {
      await member.ban({ reason: 'User is on the auto-ban list' });
      if (_logger) await _logger.warn(`Auto-banned ${member.user.tag} (${member.id}) on join`);
      await recordKickedUser();
    } catch (error) {
      if (_logger) await _logger.error(`Failed to auto-ban ${member.user.tag}: ${error.message || error}`);
    }
  });
}

// Add a user to the ban list, persist to disk, and ban from the guild.
export async function addBannedUser(userId) {
  bannedIds.add(userId);
  try {
    await writeJson(banListFilePath, [...bannedIds]);
    if (_logger) await _logger.info(`Added user ${userId} to ban list`);
  } catch (error) {
    if (_logger) await _logger.error(`Failed to save ban list: ${error.message || error}`);
  }

  try {
    await banMember(userId, 'Added to ban list');
  } catch (error) {
    if (_logger) await _logger.error(`Failed to ban user ${userId}: ${error.message || error}`);
  }
}

// Remove a user from the ban list and persist to disk. Returns false if not found.
export async function removeBannedUser(userId) {
  if (!bannedIds.has(userId)) {
    return false;
  }
  bannedIds.delete(userId);
  try {
    await writeJson(banListFilePath, [...bannedIds]);
    if (_logger) await _logger.info(`Removed user ${userId} from ban list`);
  } catch (error) {
    if (_logger) await _logger.error(`Failed to save ban list: ${error.message || error}`);
  }
  return true;
}

// Check if a user ID is in the ban list.
export function isBanned(userId) {
  return bannedIds.has(userId);
}

// Return a snapshot of the current ban list.
export function getBannedUsers() {
  return [...bannedIds];
}
