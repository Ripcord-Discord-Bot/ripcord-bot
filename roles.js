// Role management and onboarding via reaction-based role assignment
// Handles welcome messages, server rules, and Trusted role assignment

import path from 'path';
import fs from 'fs';
import { Events } from 'discord.js';
import * as config from './config.js';
import { checkDirExists, createDir, checkFileExists, createFile } from './io.js';

const THUMBSUP = '👍';
const rulesFilePath = path.join(config.serverRulesIdPath, config.serverRulesIdFile);

let rulesMessageId = null;

async function loadRulesMessageId(logger) {
  try {
    if (!(await checkDirExists(config.serverRulesIdPath))) {
      await createDir(config.serverRulesIdPath);
    }
    if (await checkFileExists(rulesFilePath)) {
      const raw = await fs.promises.readFile(rulesFilePath, 'utf8');
      const data = JSON.parse(raw);
      rulesMessageId = data.messageId ?? null;
      if (logger) await logger.info(`Loaded rules message ID: ${rulesMessageId}`);
    }
  } catch (error) {
    if (logger) await logger.error(`Failed to load rules message ID: ${error.message || error}`);
  }
}

async function saveRulesMessageId(id, logger) {
  try {
    await createFile(rulesFilePath, JSON.stringify({ messageId: id }, null, 2));
    rulesMessageId = id;
  } catch (error) {
    if (logger) await logger.error(`Failed to save rules message ID: ${error.message || error}`);
  }
}

// Post rules message to the welcome channel and save its ID
async function postRulesMessage(guild, logger) {
  const channel = guild.channels.cache.find((ch) => ch.name === config.welcomeChannel);
  if (!channel) {
    if (logger) await logger.error(`Welcome channel #${config.welcomeChannel} not found`);
    return;
  }

  const rulesMsg = await channel.send(
    '**Server Rules** 📋\n\n' +
    '1. Be respectful to all members\n' +
    '2. No spam or advertising\n' +
    '3. Keep conversations appropriate\n' +
    '4. Follow Discord\'s Terms of Service\n\n' +
    `React with ${THUMBSUP} below to accept the rules and gain access.`
  );

  await rulesMsg.react(THUMBSUP);
  await saveRulesMessageId(rulesMsg.id, logger);
  if (logger) await logger.info(`Posted rules message in #${config.welcomeChannel} (ID: ${rulesMsg.id})`);
}

// Verify the saved rules message still exists in Discord
async function verifyRulesMessage(guild, logger) {
  if (!rulesMessageId) return false;
  try {
    const channel = guild.channels.cache.find((ch) => ch.name === config.welcomeChannel);
    if (!channel) return false;
    await channel.messages.fetch(rulesMessageId);
    return true;
  } catch {
    if (logger) await logger.warn('Saved rules message no longer exists, will repost.');
    rulesMessageId = null;
    return false;
  }
}

// Register all role-related event listeners and ensure the rules message exists
export async function setupRoleEvents(client, logger) {
  await loadRulesMessageId(logger);

  const guild = client.guilds.cache.first();
  if (guild) {
    const exists = await verifyRulesMessage(guild, logger);
    if (!exists) {
      await postRulesMessage(guild, logger);
    }
  }

  // Award Trusted role when a user reacts thumbsup to the rules message
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    // Fetch partial objects before using them
    if (reaction.partial) {
      try { await reaction.fetch(); } catch { return; }
    }
    if (user.partial) {
      try { await user.fetch(); } catch { return; }
    }
    if (user.bot) return;
    if (!rulesMessageId || reaction.message.id !== rulesMessageId) return;
    if (reaction.emoji.name !== THUMBSUP) return;

    try {
      const guild = reaction.message.guild;
      if (!guild) return;

      const member = await guild.members.fetch(user.id);
      const trusted = guild.roles.cache.find((r) => r.name === config.trustedRole);

      if (!trusted) {
        if (logger) await logger.error(`Trusted role "${config.trustedRole}" not found`);
        return;
      }

      if (member.roles.cache.has(trusted.id)) return;

      await member.roles.add(trusted);
    } catch (error) {
      if (logger) await logger.error(`Failed to assign role to ${user.tag}: ${error.message || error}`);
    }
  });
}
