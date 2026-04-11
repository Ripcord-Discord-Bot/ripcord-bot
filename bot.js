// Entry point — initializes the Discord client and registers event handlers

import { Client, GatewayIntentBits, Events, Partials } from 'discord.js';

import { setupApi, stopApi } from './api.js';
import { setupAudit } from './audit.js';
import { setupAutoKicker } from './kickedusers.js';
import { setupBannedUsers } from './bannedusers.js';
import * as commands from './commands.js';
import * as config from './config.js';
import { setupExit } from './exit.js';
import { checkAndModerate, setupFilter } from './filter.js';
import { setupInteractions } from './interactions.js';
import logger from './logger.js';

import { setupOnboarding, cleanupOnboarding } from './onboarding.js';
import { setupScheduler, registerSystemTask } from './scheduler.js';
import { setupServerStats, snapshot, saveServerStats, updateCategoryTitle } from './serverstats.js';
import { setupTerminal } from './terminal.js';
import { createTicket, setupTickets } from './ticket.js';
import { setupInvites } from './invites.js';

await logger.info('Starting Ripcord Bot...');

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

// Bot Setup
client.once(Events.ClientReady, async (ready) => {
  await logger.info(`Logged in as ${ready.user.tag}`);
  await setupServerStats(client, logger);
  await setupAutoKicker(client, logger);
  await setupBannedUsers(client, logger);
  await setupFilter(logger);
  await setupInvites(client, logger);
  setupTickets(logger);
  setupInteractions(client, logger);
  await updateCategoryTitle(config.textChannelsCategory);
  if (config.enableOnboarding) await setupOnboarding(client, logger);
  else await cleanupOnboarding(logger);
  setupAudit(client, logger);
  setupExit(logger);
  await setupTerminal(commands.handleTerminalInput, logger);

  await setupApi(logger);
  await setupScheduler(client, logger);

  // Flush stats to disk every minute
  registerSystemTask('stats-flush', 'interval', '1m', saveServerStats);

  // Update category title with member count every hour
  registerSystemTask('update-category-title', 'interval', '1h', () => updateCategoryTitle(config.textChannelsCategory));

  // Snapshot stats at midnight via the scheduler
  registerSystemTask('daily-snapshot', 'cron', '0 0 * * *', snapshot);
});

// Handle all incoming messages
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const filtered = config.enableFiltering && (await checkAndModerate(message));
  if (filtered) return;

  await createTicket(message);
  await commands.handleCommand(message, logger);
});

// Connect to Discord
client.login(config.token).catch(async (error) => {
  await logger.error(`Login failed: ${error.message || error}`);
  await stopApi(logger);
  process.exit(1);
});
