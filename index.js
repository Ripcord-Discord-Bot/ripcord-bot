// Entry point — initializes the Discord client and registers event handlers

import { Client, GatewayIntentBits, Events, Partials } from 'discord.js';

import { startApi, stopApi } from './api.js';
import { setupAudit } from './audit.js';
import { loadBannedList, isBanned } from './bannedlist.js';
import * as commands from './commands.js';
import * as config from './config.js';
import { setupExit } from './exit.js';
import { checkAndModerate, initFilter } from './filter.js';
import { setupInteractions } from './interactions.js';
import logger from './logger.js';
import { setupRoleEvents } from './roles.js';
import { startScheduler, registerSystemTask } from './scheduler.js';
import { loadServerStats, recordMessage, recordNewUser, recordBannedUserKicked, recordUserLeft, setRoleCounts, snapshotDaily } from './serverstats.js';
import { setupTerminal } from './terminal.js';
import { createTicket, setupTickets } from './ticket.js';

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

async function seedRoleCounts(guild) {
  const members = await guild.members.fetch();
  const counts = {};
  for (const member of members.values()) {
    for (const role of member.roles.cache.values()) {
      if (role.name === '@everyone') continue;
      counts[role.name] = (counts[role.name] || 0) + 1;
    }
  }
  await setRoleCounts(counts);
}

// Bot Setup
client.once(Events.ClientReady, async (ready) => {
  await logger.info(`Logged in as ${ready.user.tag}`);
  await loadServerStats(logger);
  await loadBannedList(logger);
  await initFilter(logger);
  setupTickets(logger);
  setupInteractions(client, logger);
  await setupRoleEvents(client, logger);
  setupAudit(client, logger);
  setupExit(logger);
  setupTerminal(commands.handleTerminalInput, logger);

  // Seed role counts from live guild data on startup
  const guild = client.guilds.cache.first();
  if (guild) await seedRoleCounts(guild);

  await startApi(logger);
  await startScheduler(client, logger);

  // Snapshot stats at midnight via the scheduler
  registerSystemTask('stats-daily-snapshot', 'cron', '0 0 * * *', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await snapshotDaily(yesterday.toISOString().slice(0, 10));
  });
});

// Handle all incoming messages
client.on(Events.MessageCreate, async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  await recordMessage();

  // Check message for filtered content first
  const filtered = config.enableFiltering && (await checkAndModerate(message));
  if (filtered) return;

  // Create ticket if message is in issues channel
  await createTicket(message);

  // Process user commands
  await commands.handleCommand(message, logger);
});

// Track new members joining
client.on(Events.GuildMemberAdd, async (member) => {
  if (isBanned(member.id)) {
    try {
      await member.kick('User is on the banned list');
      await logger.warn(`Kicked banned user ${member.user.tag} (${member.id})`);
      await recordBannedUserKicked();
    } catch (error) {
      await logger.error(`Failed to kick banned user ${member.user.tag}: ${error.message || error}`);
    }
    return;
  }

  await recordNewUser();

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
  await recordUserLeft();
});

// Connect to Discord
client.login(config.token).catch(async (error) => {
  await logger.error(`Login failed: ${error.message || error}`);
  await stopApi(logger);
  process.exit(1);
});
