// Auto Kicker — Saves and checks Discord user IDs that should be auto-kicked

import { Events } from 'discord.js';
import * as config from './config.js';
import { ensureDir, loadJson, writeJson, joinPath } from './io.js';
import { kickMember } from './interactions.js';
import { recordKickedUser } from './serverstats.js';

const kickListFilePath = joinPath(config.autoKickerPath, config.autoKickerFile);

let _logger = null;
let kickedIds = new Set();

// Load the kick list from disk, initialise the logger, and register the join handler.
export async function setupAutoKicker(client, logger) {
  _logger = logger;
  try {
    await ensureDir(config.autoKickerPath);
    kickedIds = new Set(await loadJson(kickListFilePath, []));
    if (_logger) await _logger.info(`Loaded kick list: ${kickedIds.size} entries`);
  } catch (error) {
    if (_logger) await _logger.error(`Failed to load kick list: ${error.message || error}`);
  }

  client.on(Events.GuildMemberAdd, async (member) => {
    if (!isKicked(member.id)) return;
    try {
      await member.kick('User is on the autokick list');
      if (_logger) await _logger.warn(`Autokicked ${member.user.tag} (${member.id}) on join`);
      await recordKickedUser();
    } catch (error) {
      if (_logger) await _logger.error(`Failed to autokick ${member.user.tag}: ${error.message || error}`);
    }
  });
}

// Add a user to the kick list, persist to disk, and kick from the guild.
export async function addKickedUser(userId) {
  kickedIds.add(userId);
  try {
    await writeJson(kickListFilePath, [...kickedIds]);
    if (_logger) await _logger.info(`Added user ${userId} to kick list`);
  } catch (error) {
    if (_logger) await _logger.error(`Failed to save kick list: ${error.message || error}`);
  }

  await kickMember(userId, 'Added to kick list');
}

// Remove a user from the kick list and persist to disk. Returns false if not found.
export async function removeKickedUser(userId) {
  if (!kickedIds.has(userId)) return false;
  kickedIds.delete(userId);
  try {
    await writeJson(kickListFilePath, [...kickedIds]);
    if (_logger) await _logger.info(`Removed user ${userId} from kick list`);
  } catch (error) {
    if (_logger) await _logger.error(`Failed to save kick list: ${error.message || error}`);
  }
  return true;
}

// Check if a user ID is in the kick list.
export function isKicked(userId) {
  return kickedIds.has(userId);
}

// Return a snapshot of the current kick list.
export function getKickedUsers() {
  return [...kickedIds];
}
