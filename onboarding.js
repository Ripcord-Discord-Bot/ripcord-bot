// Onboarding — welcome DM, server rules posting, and reaction-based role assignment

import { Events } from 'discord.js';
import * as config from './config.js';
import { ensureDir, loadJson, writeJson, checkFileExists, deleteFile, joinPath } from './io.js';
import { findTextChannel, findMember, addRole } from './interactions.js';
import { sendToChannel } from './interactions.js';
import { recordRoleAssigned } from './serverstats.js';

const THUMBSUP = '👍';
const rulesFilePath = joinPath(config.serverRulesIdPath, config.serverRulesIdFile);

let _logger = null;
let rulesMessageId = null;

async function loadRulesMessageId() {
  try {
    await ensureDir(config.serverRulesIdPath);
    const data = await loadJson(rulesFilePath, null);
    if (data) {
      rulesMessageId = data.messageId ?? null;
      if (_logger) await _logger.info(`Loaded rules message ID: ${rulesMessageId}`);
    }
  } catch (error) {
    if (_logger) await _logger.error(`Failed to load rules message ID: ${error.message || error}`);
  }
}

async function saveRulesMessageId(id) {
  try {
    await writeJson(rulesFilePath, { messageId: id });
    rulesMessageId = id;
  } catch (error) {
    if (_logger) await _logger.error(`Failed to save rules message ID: ${error.message || error}`);
  }
}

async function postRulesMessage() {
  const rulesMsg = await sendToChannel(
    config.welcomeChannel,
    '**Server Rules** 📋\n\n' +
    '1. Be respectful to all members\n' +
    '2. No spam or advertising\n' +
    '3. Keep conversations appropriate\n' +
    '4. Follow Discord\'s Terms of Service\n\n' +
    `React with ${THUMBSUP} below to accept the rules and gain access.`
  );

  if (!rulesMsg) {
    if (_logger) await _logger.error(`Welcome channel #${config.welcomeChannel} not found`);
    return;
  }

  await rulesMsg.react(THUMBSUP);
  await saveRulesMessageId(rulesMsg.id);
  if (_logger) await _logger.info(`Posted rules message in #${config.welcomeChannel} (ID: ${rulesMsg.id})`);
}

async function verifyRulesMessage() {
  if (!rulesMessageId) return false;
  try {
    const channel = findTextChannel(config.welcomeChannel);
    if (!channel) return false;
    await channel.messages.fetch(rulesMessageId);
    return true;
  } catch {
    if (_logger) await _logger.warn('Saved rules message no longer exists, will repost.');
    rulesMessageId = null;
    return false;
  }
}

export async function setupOnboarding(client, logger) {
  _logger = logger;

  await loadRulesMessageId();

  const guild = client.guilds.cache.first();
  if (guild) {
    const exists = await verifyRulesMessage();
    if (!exists) await postRulesMessage();
  }

  // Assign Trusted role when a member reacts 👍 to the rules message
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (reaction.partial) {
      try { await reaction.fetch(); } catch { return; }
    }
    if (user.partial) {
      try { await user.fetch(); } catch { return; }
    }
    if (user.bot) return;
    if (!rulesMessageId || reaction.message.id !== rulesMessageId) return;
    if (reaction.emoji.name !== THUMBSUP) return;

    const member = await findMember(user.id);
    if (!member) return;

    const role = member.guild.roles.cache.find((r) => r.name === config.trustedRole);
    if (!role) {
      if (_logger) await _logger.error(`Trusted role "${config.trustedRole}" not found`);
      return;
    }
    if (member.roles.cache.has(role.id)) return;

    await addRole(member, config.trustedRole);
    await recordRoleAssigned(config.trustedRole);
  });
}

// Delete the rules message from Discord and remove the persisted ID file.
// Called when onboarding is disabled so stale state is cleaned up.
export async function cleanupOnboarding(logger) {
  if (logger) _logger = logger;

  // Try to delete the rules message from Discord
  const savedId = await loadJson(rulesFilePath, null).then((d) => d?.messageId ?? null).catch(() => null);
  if (savedId) {
    try {
      const channel = findTextChannel(config.welcomeChannel);
      if (channel) {
        const msg = await channel.messages.fetch(savedId).catch(() => null);
        if (msg) {
          await msg.delete();
          if (_logger) await _logger.info('Onboarding: deleted rules message from Discord');
        }
      }
    } catch (error) {
      if (_logger) await _logger.warn(`Onboarding: could not delete rules message: ${error.message || error}`);
    }
  }

  // Remove the persisted ID file
  if (await checkFileExists(rulesFilePath)) {
    await deleteFile(rulesFilePath);
    if (_logger) await _logger.info('Onboarding: deleted rules message ID file');
  }

  rulesMessageId = null;
}

// Send a welcome DM to a new member with onboarding instructions.
export async function onboardMember(member) {
  try {
    await member.send(
      `👋 Welcome to **${member.guild.name}**!\n\nHead to #${config.welcomeChannel} and react with 👍 on the server rules to gain access.`
    );
    if (_logger) await _logger.info(`Sent onboarding DM to ${member.user.tag}`);
  } catch {
    if (_logger) await _logger.warn(`Could not DM onboarding message to ${member.user.tag}`);
  }
}
