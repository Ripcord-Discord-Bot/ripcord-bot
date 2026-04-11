// Set the system channel for the guild by channel ID
// Requires: Bot must have MANAGE_GUILD permission
export async function setSystemChannel(channelId) {
  const guild = getGuild();
  if (!guild) throw new Error('No guild available');
  const channel = guild.channels.cache.get(channelId);
  if (!channel) throw new Error('Channel not found');
  // Patch the guild's systemChannelId
  await guild.setSystemChannel(channel, 'Set by bot command');
  return guild.systemChannelId === channelId;
}
// Interactions — utility functions for Discord guild operations

import { ChannelType, PermissionFlagsBits } from 'discord.js';

let _client = null;
let _logger = null;

export function setupInteractions(client, logger) {
  _client = client;
  _logger = logger;
}

// Returns the first guild the bot is in, or null
export function getGuild() {
  return _client?.guilds.cache.first() ?? null;
}

// Find a text channel by name. Returns the channel or null.
export function findTextChannel(name) {
  const guild = getGuild();
  if (!guild) return null;
  return guild.channels.cache.find((ch) => ch.name === name && ch.isTextBased()) ?? null;
}

// Find a voice channel by name. Returns the channel or null.
export function findVoiceChannel(name) {
  const guild = getGuild();
  if (!guild) return null;
  return guild.channels.cache.find((ch) => ch.name === name && ch.type === ChannelType.GuildVoice) ?? null;
}

// Find a category by name. Returns the category or null.
export function findCategory(name) {
  const guild = getGuild();
  if (!guild) return null;
  return guild.channels.cache.find((ch) => ch.name === name && ch.type === ChannelType.GuildCategory) ?? null;
}

// List all text channels in the guild, sorted by name.
export function listTextChannels() {
  const guild = getGuild();
  if (!guild) return [];
  return guild.channels.cache
    .filter((ch) => ch.isTextBased())
    .map((ch) => ({ id: ch.id, name: ch.name, categoryId: ch.parentId ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// List all voice channels in the guild, sorted by name.
export function listVoiceChannels() {
  const guild = getGuild();
  if (!guild) return [];
  return guild.channels.cache
    .filter((ch) => ch.type === ChannelType.GuildVoice)
    .map((ch) => ({ id: ch.id, name: ch.name, categoryId: ch.parentId ?? null, userLimit: ch.userLimit }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// List all categories in the guild, sorted by name.
export function listCategories() {
  const guild = getGuild();
  if (!guild) return [];
  return guild.channels.cache
    .filter((ch) => ch.type === ChannelType.GuildCategory)
    .map((ch) => ({ id: ch.id, name: ch.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Returns the current member count for the guild, or 0 if unavailable.
export function getGuildMemberCount() {
  return getGuild()?.memberCount ?? 0;
}

// Send a message to a text channel by name. Returns the sent message, or null on failure.
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

// Create a text channel. Returns the new channel, or the existing one if already present.
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

// Create a voice channel. Returns the new channel, or the existing one if already present.
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

// Create a category. Returns the new category, or the existing one if already present.
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

// Move channels into a category by name. Returns the number of channels successfully moved.
export async function moveChannelsToCategory(channelNames, categoryName) {
  const category = findCategory(categoryName);
  if (!category) {
    if (_logger) await _logger.warn(`Interactions: category "${categoryName}" not found`);
    return 0;
  }

  let moved = 0;
  for (const name of channelNames) {
    const channel = findTextChannel(name) ?? findVoiceChannel(name);
    if (!channel) {
      if (_logger) await _logger.warn(`Interactions: channel "${name}" not found for move`);
      continue;
    }
    try {
      await channel.setParent(category.id, { lockPermissions: false });
      moved++;
    } catch (error) {
      if (_logger) await _logger.error(`Interactions: failed to move "${name}" to category "${categoryName}": ${error.message || error}`);
    }
  }

  if (_logger) await _logger.info(`Interactions: moved ${moved} channel(s) to category "${categoryName}"`);
  return moved;
}

// Delete a channel by name (text or voice). Returns true on success.
export async function deleteChannel(name, reason = null) {
  const channel = findTextChannel(name) ?? findVoiceChannel(name);

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

// Delete a category by name. Returns true on success.
export async function deleteCategory(name, reason = null) {
  const category = findCategory(name);

  if (!category) {
    if (_logger) await _logger.warn(`Interactions: category "${name}" not found for deletion`);
    return false;
  }

  try {
    await category.delete(reason);
    if (_logger) await _logger.info(`Interactions: deleted category "${name}"`);
    return true;
  } catch (error) {
    if (_logger) await _logger.error(`Interactions: failed to delete category "${name}": ${error.message || error}`);
    return false;
  }
}

// Rename a category. Returns true on success.
export async function renameCategory(name, newName) {
  const category = findCategory(name);
  if (!category) {
    if (_logger) await _logger.warn(`Interactions: category "${name}" not found for rename`);
    return false;
  }
  try {
    await category.setName(newName);
    if (_logger) await _logger.info(`Interactions: renamed category "${name}" to "${newName}"`);
    return true;
  } catch (error) {
    if (_logger) await _logger.error(`Interactions: failed to rename category "${name}": ${error.message || error}`);
    return false;
  }
}

// Find a guild member by ID, username, or tag. Returns the member or null.
export async function findMember(identifier) {
  const guild = getGuild();
  if (!guild) return null;

  // Try cache by ID, then fetch by ID, then fall back to username/tag search
  const byId = guild.members.cache.get(identifier);
  if (byId) return byId;

  try {
    return await guild.members.fetch(identifier);
  } catch {
    return guild.members.cache.find(
      (m) => m.user.username === identifier || m.user.tag === identifier
    ) ?? null;
  }
}

// Send a direct message to a member by ID, username, or tag. Returns the message, or null on failure.
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

// Kick a guild member by ID, username, or tag. Returns true on success.
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

// Ban a member from the guild by user ID. Returns true on success.
export async function banMember(userId, reason = null, deleteMessageSeconds = 0) {
  const guild = getGuild();
  if (!guild) {
    if (_logger) await _logger.warn(`Interactions: no guild available for ban`);
    return false;
  }
  try {
    await guild.members.ban(userId, { reason, deleteMessageSeconds });
    if (_logger) await _logger.info(`Interactions: banned ${userId}${reason ? `: ${reason}` : ''}`);
    return true;
  } catch (error) {
    if (_logger) await _logger.error(`Interactions: failed to ban ${userId}: ${error.message || error}`);
    return false;
  }
}

// Unban a user from the guild by user ID. Returns true on success.
export async function unbanMember(userId, reason = null) {
  const guild = getGuild();
  if (!guild) {
    if (_logger) await _logger.warn(`Interactions: no guild available for unban`);
    return false;
  }
  try {
    await guild.members.unban(userId, reason);
    if (_logger) await _logger.info(`Interactions: unbanned ${userId}${reason ? `: ${reason}` : ''}`);
    return true;
  } catch (error) {
    if (_logger) await _logger.error(`Interactions: failed to unban ${userId}: ${error.message || error}`);
    return false;
  }
}

// Find a role by name. Returns the role or null.
export function findRole(name) {
  const guild = getGuild();
  return guild?.roles.cache.find((r) => r.name === name) ?? null;
}

// Create a role. Returns the new role, or the existing one if already present.
export async function createRole(name, options = {}) {
  const guild = getGuild();
  if (!guild) return null;

  const existing = findRole(name);
  if (existing) {
    if (_logger) await _logger.warn(`Interactions: role "${name}" already exists`);
    return existing;
  }

  try {
    const role = await guild.roles.create({
      name,
      ...(options.color != null ? { colors: options.color } : {}),
      hoist: options.hoist ?? false,
      mentionable: options.mentionable ?? false,
      reason: options.reason ?? null,
    });
    if (_logger) await _logger.info(`Interactions: created role "${name}"`);
    return role;
  } catch (error) {
    if (_logger) await _logger.error(`Interactions: failed to create role "${name}": ${error.message || error}`);
    return null;
  }
}

// List all deletable roles (excludes @everyone and managed/integration roles).
export function listRoles() {
  const guild = getGuild();
  if (!guild) return [];
  return guild.roles.cache
    .filter((r) => r.name !== '@everyone' && !r.managed)
    .map((r) => ({ id: r.id, name: r.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Delete a role by its Discord ID. Returns true on success.
export async function deleteRoleById(id, reason = null) {
  const guild = getGuild();
  if (!guild) return false;
  const role = guild.roles.cache.get(id);
  if (!role) {
    if (_logger) await _logger.warn(`Interactions: role ${id} not found for deletion`);
    return false;
  }
  try {
    const name = role.name;
    await role.delete(reason);
    if (_logger) await _logger.info(`Interactions: deleted role "${name}" (${id})`);
    return true;
  } catch (error) {
    if (_logger) await _logger.error(`Interactions: failed to delete role ${id}: ${error.message || error}`);
    return false;
  }
}

// Shared helper for addRole/removeRole.
async function _modifyRole(member, roleName, action) {
  const role = findRole(roleName);
  if (!role) {
    if (_logger) await _logger.warn(`Interactions: role "${roleName}" not found`);
    return false;
  }
  try {
    await member.roles[action](role);
    const verb = action === 'add' ? 'added' : 'removed';
    const prep = action === 'add' ? 'to' : 'from';
    if (_logger) await _logger.info(`Interactions: ${verb} role "${roleName}" ${prep} ${member.user.tag}`);
    return true;
  } catch (error) {
    const verb = action === 'add' ? 'add' : 'remove';
    if (_logger) await _logger.error(`Interactions: failed to ${verb} role "${roleName}" for ${member.user.tag}: ${error.message || error}`);
    return false;
  }
}

// Add a named role to a member. Returns true on success.
export async function addRole(member, roleName) {
  return _modifyRole(member, roleName, 'add');
}

// Remove a named role from a member. Returns true on success.
export async function removeRole(member, roleName) {
  return _modifyRole(member, roleName, 'remove');
}

// Delete all messages in a text channel by name. Returns total messages deleted.
// Uses bulkDelete for recent messages (< 14 days) and individual delete for older ones.
export async function clearChannel(name) {
  const channel = findTextChannel(name);
  if (!channel) {
    if (_logger) await _logger.warn(`Interactions: channel #${name} not found for clearing`);
    return 0;
  }
  let totalDeleted = 0;
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  try {
    let fetched;
    do {
      fetched = await channel.messages.fetch({ limit: 100 });
      if (fetched.size === 0) break;
      const recent = fetched.filter((m) => m.createdTimestamp > twoWeeksAgo);
      const old = fetched.filter((m) => m.createdTimestamp <= twoWeeksAgo);
      if (recent.size >= 2) {
        await channel.bulkDelete(recent);
      } else {
        for (const m of recent.values()) {
          try { await m.delete(); } catch {}
        }
      }
      for (const m of old.values()) {
        try { await m.delete(); } catch {}
      }
      totalDeleted += fetched.size;
    } while (fetched.size === 100);
  } catch (error) {
    if (_logger) await _logger.error(`Interactions: failed to clear #${name}: ${error.message || error}`);
  }
  if (_logger) await _logger.info(`Interactions: cleared ${totalDeleted} messages from #${name}`);
  return totalDeleted;
}

// Rename a category by its Discord ID. Returns true on success.
export async function renameCategoryById(id, newName) {
  const guild = getGuild();
  if (!guild) return false;
  const category = guild.channels.cache.get(id);
  if (!category) {
    if (_logger) await _logger.warn(`Interactions: category ${id} not found for rename`);
    return false;
  }
  try {
    await category.setName(newName);
    if (_logger) await _logger.info(`Interactions: renamed category to "${newName}" (${id})`);
    return true;
  } catch (error) {
    if (_logger) await _logger.error(`Interactions: failed to rename category ${id}: ${error.message || error}`);
    return false;
  }
}

// Delete a channel or category by its Discord ID. Returns true on success.
export async function deleteChannelById(id, reason = null) {
  const guild = getGuild();
  if (!guild) return false;
  const channel = guild.channels.cache.get(id);
  if (!channel) {
    if (_logger) await _logger.warn(`Interactions: channel/category ${id} not found for deletion`);
    return false;
  }
  try {
    const label = channel.type === ChannelType.GuildCategory ? `category "${channel.name}"` : `channel #${channel.name}`;
    await channel.delete(reason);
    if (_logger) await _logger.info(`Interactions: deleted ${label} (${id})`);
    return true;
  } catch (error) {
    if (_logger) await _logger.error(`Interactions: failed to delete ${id}: ${error.message || error}`);
    return false;
  }
}

// Set permission overwrites on a channel for a role or user.
// allow/deny: arrays of PermissionFlagsBits values. Returns true on success.
export async function setChannelPermissions(channelName, target, { allow = [], deny = [] } = {}) {
  const channel = findTextChannel(channelName) ?? findVoiceChannel(channelName);
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
