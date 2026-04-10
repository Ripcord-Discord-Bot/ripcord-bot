// Interactions — utility functions for Discord guild operations

import { ChannelType, PermissionFlagsBits } from 'discord.js';

let _client = null;
let _logger = null;

export function setupInteractions(client, logger) {
  _client = client;
  _logger = logger;
}

// Returns the first guild the bot is in, or null
function getGuild() {
  return _client?.guilds.cache.first() ?? null;
}

// Find a text channel by name, or null
export function findTextChannel(name) {
  const guild = getGuild();
  if (!guild) return null;
  return guild.channels.cache.find((ch) => ch.name === name && ch.isTextBased()) ?? null;
}

// Find a voice channel by name, or null
export function findVoiceChannel(name) {
  const guild = getGuild();
  if (!guild) return null;
  return (
    guild.channels.cache.find(
      (ch) => ch.name === name && ch.type === ChannelType.GuildVoice
    ) ?? null
  );
}

// Find a category by name, or null
export function findCategory(name) {
  const guild = getGuild();
  if (!guild) return null;
  return (
    guild.channels.cache.find(
      (ch) => ch.name === name && ch.type === ChannelType.GuildCategory
    ) ?? null
  );
}

// Returns an array of all text channels in the guild
export function listTextChannels() {
  const guild = getGuild();
  if (!guild) return [];
  return guild.channels.cache
    .filter((ch) => ch.isTextBased())
    .map((ch) => ({ id: ch.id, name: ch.name, categoryId: ch.parentId ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Returns an array of all voice channels in the guild
export function listVoiceChannels() {
  const guild = getGuild();
  if (!guild) return [];
  return guild.channels.cache
    .filter((ch) => ch.type === ChannelType.GuildVoice)
    .map((ch) => ({ id: ch.id, name: ch.name, categoryId: ch.parentId ?? null, userLimit: ch.userLimit }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Send a message to a channel by name. Returns the sent message or null.
export async function sendToChannel(channelName, content) {
  const channel = findTextChannel(channelName);
  if (!channel) {
    if (_logger) await _logger.warn(`Interactions: text channel #${channelName} not found`);
    return null;
  }
  try {
    return await channel.send(content);
  } catch (error) {
    if (_logger) await _logger.error(`Interactions: failed to send to #${channelName}: ${error.message || error}`);
    return null;
  }
}

// Create a text channel. Returns the new channel or null if it already exists / on error.
export async function createTextChannel(name, options = {}) {
  const guild = getGuild();
  if (!guild) return null;

  const existing = findTextChannel(name);
  if (existing) {
    if (_logger) await _logger.warn(`Interactions: text channel #${name} already exists`);
    return existing;
  }

  try {
    const channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: options.categoryId ?? null,
      topic: options.topic ?? null,
      reason: options.reason ?? null,
      permissionOverwrites: options.permissionOverwrites ?? [],
    });
    if (_logger) await _logger.info(`Interactions: created text channel #${name}`);
    return channel;
  } catch (error) {
    if (_logger) await _logger.error(`Interactions: failed to create text channel #${name}: ${error.message || error}`);
    return null;
  }
}

// Create a voice channel. Returns the new channel or null if it already exists / on error.
export async function createVoiceChannel(name, options = {}) {
  const guild = getGuild();
  if (!guild) return null;

  const existing = findVoiceChannel(name);
  if (existing) {
    if (_logger) await _logger.warn(`Interactions: voice channel #${name} already exists`);
    return existing;
  }

  try {
    const channel = await guild.channels.create({
      name,
      type: ChannelType.GuildVoice,
      parent: options.categoryId ?? null,
      userLimit: options.userLimit ?? 0,
      bitrate: options.bitrate ?? 64000,
      reason: options.reason ?? null,
      permissionOverwrites: options.permissionOverwrites ?? [],
    });
    if (_logger) await _logger.info(`Interactions: created voice channel #${name}`);
    return channel;
  } catch (error) {
    if (_logger) await _logger.error(`Interactions: failed to create voice channel #${name}: ${error.message || error}`);
    return null;
  }
}

// Create a category. Returns the new category or null if it already exists / on error.
export async function createCategory(name, options = {}) {
  const guild = getGuild();
  if (!guild) return null;

  const existing = findCategory(name);
  if (existing) {
    if (_logger) await _logger.warn(`Interactions: category "${name}" already exists`);
    return existing;
  }

  try {
    const category = await guild.channels.create({
      name,
      type: ChannelType.GuildCategory,
      reason: options.reason ?? null,
      permissionOverwrites: options.permissionOverwrites ?? [],
    });
    if (_logger) await _logger.info(`Interactions: created category "${name}"`);
    return category;
  } catch (error) {
    if (_logger) await _logger.error(`Interactions: failed to create category "${name}": ${error.message || error}`);
    return null;
  }
}

// Delete a channel by name (text or voice). Returns true on success, false otherwise.
export async function deleteChannel(name, reason = null) {
  const guild = getGuild();
  if (!guild) return false;

  const channel =
    guild.channels.cache.find((ch) => ch.name === name) ?? null;

  if (!channel) {
    if (_logger) await _logger.warn(`Interactions: channel #${name} not found for deletion`);
    return false;
  }

  try {
    await channel.delete(reason);
    if (_logger) await _logger.info(`Interactions: deleted channel #${name}`);
    return true;
  } catch (error) {
    if (_logger) await _logger.error(`Interactions: failed to delete channel #${name}: ${error.message || error}`);
    return false;
  }
}

// Find a member by ID or username, or null
export async function findMember(identifier) {
  const guild = getGuild();
  if (!guild) return null;

  // Try cache by ID first
  const byId = guild.members.cache.get(identifier);
  if (byId) return byId;

  // Try fetch by ID
  try {
    return await guild.members.fetch(identifier);
  } catch {
    // Not found by ID — try by username
    return (
      guild.members.cache.find(
        (m) => m.user.username === identifier || m.user.tag === identifier
      ) ?? null
    );
  }
}

// Send a direct message to a user by ID or username. Returns the message or null.
export async function sendDM(userIdentifier, content) {
  const member = await findMember(userIdentifier);
  if (!member) {
    if (_logger) await _logger.warn(`Interactions: member "${userIdentifier}" not found for DM`);
    return null;
  }
  try {
    const msg = await member.send(content);
    if (_logger) await _logger.info(`Interactions: sent DM to ${member.user.tag}`);
    return msg;
  } catch (error) {
    if (_logger) await _logger.error(`Interactions: failed to send DM to ${member.user.tag}: ${error.message || error}`);
    return null;
  }
}

// Kick a guild member by ID or username. Returns true on success, false otherwise.
export async function kickMember(userId, reason = null) {
  const member = await findMember(userId);
  if (!member) {
    if (_logger) await _logger.warn(`Interactions: member ${userId} not found for kick`);
    return false;
  }
  try {
    await member.kick(reason);
    if (_logger) await _logger.info(`Interactions: kicked ${member.user.tag} (${userId})${reason ? `: ${reason}` : ''}`);
    return true;
  } catch (error) {
    if (_logger) await _logger.error(`Interactions: failed to kick ${userId}: ${error.message || error}`);
    return false;
  }
}

// Set permission overwrites on a channel for a role or user.
// target: role or member object; allow/deny: arrays of PermissionFlagsBits values
export async function setChannelPermissions(channelName, target, { allow = [], deny = [] } = {}) {  const channel = findTextChannel(channelName) ?? findVoiceChannel(channelName);
  if (!channel) {
    if (_logger) await _logger.warn(`Interactions: channel #${channelName} not found for permission update`);
    return false;
  }
  try {
    await channel.permissionOverwrites.edit(target, {
      ...(allow.length ? Object.fromEntries(allow.map((p) => [p, true])) : {}),
      ...(deny.length ? Object.fromEntries(deny.map((p) => [p, false])) : {}),
    });
    if (_logger) await _logger.info(`Interactions: updated permissions on #${channelName}`);
    return true;
  } catch (error) {
    if (_logger) await _logger.error(`Interactions: failed to update permissions on #${channelName}: ${error.message || error}`);
    return false;
  }
}

export { PermissionFlagsBits };
