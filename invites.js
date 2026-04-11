// Invites — create and track Discord server invite links

import { getGuild } from './interactions.js';
import { ensureDir, loadJson, writeJson, joinPath } from './io.js';
import * as config from './config.js';

const invitesFilePath = joinPath(config.invitesPath, config.invitesFile);

let invites = [];

// --- Internal helpers ---
let cachedInvites = new Map();
function setCachedInvites(invitesCollection) {
  cachedInvites = new Map(invitesCollection.map(inv => [inv.code, inv.uses]));
}
async function refreshCachedInvites(guild, logger) {
  try {
    const invites = await guild.invites.fetch();
    setCachedInvites(invites);
  } catch (e) {
    if (logger) await logger.warn?.(`Invites: failed to cache invites: ${e.message || e}`);
  }
}

// Loads invites from disk and sets up invite use tracking if client is provided
export async function setupInvites(client = null, logger = null) {
  await ensureDir(config.invitesPath);
  invites = await loadJson(invitesFilePath, []);

  if (!client) return;
  const { Events } = await import('discord.js');

  client.once(Events.ClientReady, async () => {
    const guild = client.guilds.cache.first();
    if (guild) await refreshCachedInvites(guild, logger);
  });

  client.on('guildMemberAdd', async (member) => {
    const guild = member.guild;
    let newInvites;
    try {
      newInvites = await guild.invites.fetch();
    } catch (e) {
      if (logger) await logger.warn?.(`Invites: failed to fetch invites on member join: ${e.message || e}`);
      return;
    }
    for (const invite of newInvites.values()) {
      const prevUses = cachedInvites.get(invite.code) || 0;
      if (invite.uses > prevUses) {
        await recordInviteUse(invite.code);
        if (logger) await logger.info?.(`Invites: ${invite.code} used by ${member.user.tag}`);
      }
    }
    setCachedInvites(newInvites);
  });

  client.on('inviteCreate', (invite) => {
    cachedInvites.set(invite.code, invite.uses);
  });
  client.on('inviteDelete', (invite) => {
    cachedInvites.delete(invite.code);
  });
}

// Create a new invite link for a channel (default: system channel)
export async function createInvite({ channelId, maxUses = 0, maxAge = 0, reason = '' } = {}) {
  const guild = getGuild();
  if (!guild) throw new Error('No guild available');
  // Treat empty string, null, or undefined as 'no channel', use system channel
  const channel = channelId ? guild.channels.cache.get(channelId) : guild.systemChannel;
  if (!channel) throw new Error('Channel not found or no system channel set');
  const invite = await channel.createInvite({ maxUses, maxAge, reason });
  const inviteData = {
    code: invite.code,
    url: invite.url,
    channelId: channel.id,
    createdAt: new Date().toISOString(),
    maxUses: invite.maxUses,
    maxAge: invite.maxAge,
    reason,
    uses: 0,
  };
  invites.push(inviteData);
  await writeJson(invitesFilePath, invites);
  return inviteData;
}

// Get all tracked invites
export function getInvites() {
  return [...invites];
}

// Track invite uses (call on invite use event)
export async function recordInviteUse(code) {
  const idx = invites.findIndex((i) => i.code === code);
  if (idx !== -1) {
    invites[idx].uses = (invites[idx].uses || 0) + 1;
    await writeJson(invitesFilePath, invites);
  }
}

// Delete an invite link from Discord and remove from tracking
export async function deleteInvite(code) {
  const guild = getGuild();
  if (!guild) throw new Error('No guild available');
  // Try to fetch the invite from Discord
  let inviteObj;
  try {
    inviteObj = await guild.invites.fetch(code);
  } catch (e) {
    // Invite may already be deleted
    inviteObj = null;
  }
  if (inviteObj) {
    await inviteObj.delete('Deleted via bot');
  }
  // Remove from tracking
  invites = invites.filter((i) => i.code !== code);
  await writeJson(invitesFilePath, invites);
}
