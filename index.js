// Load environment variables from .env file
import 'dotenv/config.js';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import * as config from './config.js';
import logger from './logger.js';
import * as commands from './commands.js';
import filter from './filter.js';
import { createTicket } from './ticket.js';
import { setupTerminal, setupSigintHandler } from './terminal.js';

// Verify bot token is available
const token = process.env.DISCORD_TOKEN;
if (!token) {
  (async () => {
    await logger.error('Missing DISCORD_TOKEN in .env');
    process.exit(1);
  })();
}

// Create Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

await logger.info('Starting Ripcord Bot...');

// Set up terminal interface when bot is ready
client.once(Events.ClientReady, async (ready) => {
  await logger.info(`Logged in as ${ready.user.tag}`);
  setupTerminal(commands.handleTerminalInput, logger);
  setupSigintHandler();
});

// Handle all incoming messages
client.on(Events.MessageCreate, async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  await logger.info(`Message from ${message.author.tag} in ${message.guild?.name || 'DM'}: ${message.content}`);

  // Check message for filtered content first
  const filtered = config.enableFiltering && (await filter.checkAndModerate(message, logger));
  if (filtered) return;

  // Create ticket if message is in issues channel
  await createTicket(message, logger);

  // Process user commands
  await commands.handleCommand(message, logger);
});

// Connect to Discord
client.login(token).catch(async (error) => {
  await logger.error(`Login failed: ${error.message || error}`);
  process.exit(1);
});
