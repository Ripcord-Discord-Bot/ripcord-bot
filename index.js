// Entry point — initializes the Discord client and registers event handlers

import { Client, GatewayIntentBits, Events, Partials } from 'discord.js';

import { startApi, stopApi } from './api.js';
import { setupAudit } from './audit.js';
import { loadBannedList, isBanned } from './bannedlist.js';
import * as commands from './commands.js';
import * as config from './config.js';
import { checkAndModerate, initFilter } from './filter.js';
import logger from './logger.js';
import { setupRoleEvents } from './roles.js';
import { loadServerStats, recordMessage, recordNewUser, recordBannedUserKicked, recordUserLeft, setRoleCounts, snapshotDaily } from './serverstats.js';
import { setupTerminal, setupSigintHandler } from './terminal.js';
import { createTicket } from './ticket.js';

// Verify bot token is available
if (!config.token) {
  await logger.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

// Create Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

await logger.info('Starting Ripcord Bot...');

// Set up terminal interface when bot is ready
client.once(Events.ClientReady, async (ready) => {
  await logger.info(`Logged in as ${ready.user.tag}`);
  await loadServerStats(logger);
  await loadBannedList(logger);
  await initFilter();
  await setupRoleEvents(client, logger);
  setupAudit(client, logger);
  setupTerminal(commands.handleTerminalInput, logger);
  setupSigintHandler();

  // Seed role counts from live guild data on startup
  const guild = client.guilds.cache.first();
  if (guild) {
    const members = await guild.members.fetch();
    const counts = {};
    for (const member of members.values()) {
      for (const role of member.roles.cache.values()) {
        if (role.name === '@everyone') continue;
        counts[role.name] = (counts[role.name] || 0) + 1;
      }
    }
    await setRoleCounts(counts, logger);
  }

  await startApi(logger);

  // Snapshot stats at midnight — poll every minute, write when the date rolls over
  let _snapshotDate = new Date().toISOString().slice(0, 10);
  setInterval(async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== _snapshotDate) {
      await snapshotDaily(_snapshotDate, logger);
      _snapshotDate = today;
    }
  }, 60_000);
});

// Handle all incoming messages
client.on(Events.MessageCreate, async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  await recordMessage(logger);

  // Check message for filtered content first
  const filtered = config.enableFiltering && (await checkAndModerate(message, logger));
  if (filtered) return;

  // Create ticket if message is in issues channel
  await createTicket(message, logger);

  // Process user commands
  await commands.handleCommand(message, logger);
});

// Track new members joining
client.on(Events.GuildMemberAdd, async (member) => {
  if (isBanned(member.id)) {
    try {
      await member.kick('User is on the banned list');
      await logger.warn(`Kicked banned user ${member.user.tag} (${member.id})`);
      await recordBannedUserKicked(logger);
    } catch (error) {
      await logger.error(`Failed to kick banned user ${member.user.tag}: ${error.message || error}`);
    }
    return;
  }

  await recordNewUser(logger);

  // DM onboarding instructions to new members
  try {
    await member.send(
      `👋 Welcome to **${member.guild.name}**!\n\nHead to #${config.welcomeChannel} and react with 👍 on the server rules to gain access.`
    );
    await logger.info(`Sent onboarding DM to ${member.user.tag}`);
  } catch {
    await logger.warn(`Could not DM onboarding message to ${member.user.tag}`);
  }
});

// Track members leaving
client.on(Events.GuildMemberRemove, async (member) => {
  await recordUserLeft(logger);
});

// Connect to Discord
client.login(config.token).catch(async (error) => {
  await logger.error(`Login failed: ${error.message || error}`);
  await stopApi(logger);
  process.exit(1);
});
