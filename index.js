// Load environment variables from .env file
import 'dotenv/config.js';
import { Client, GatewayIntentBits, Events, Partials } from 'discord.js';
import * as config from './config.js';
import logger from './logger.js';
import * as commands from './commands.js';
import filter from './filter.js';
import { createTicket } from './ticket.js';
import { setupTerminal, setupSigintHandler } from './terminal.js';
import { loadServerStats, recordMessage, recordNewUser } from './serverstats.js';
import { setupRoleEvents } from './roles.js';
import { loadBannedList, isBanned } from './bannedlist.js';

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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

await logger.info('Starting Ripcord Bot...');

// Set up terminal interface when bot is ready
client.once(Events.ClientReady, async (ready) => {
  await logger.info(`Logged in as ${ready.user.tag}`);
  await loadServerStats(logger);
  await loadBannedList(logger);
  await setupRoleEvents(client, logger);
  setupTerminal(commands.handleTerminalInput, logger);
  setupSigintHandler();
});

// Handle all incoming messages
client.on(Events.MessageCreate, async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  await logger.info(`Message from ${message.author.tag} in ${message.guild?.name || 'DM'}: ${message.content}`);
  await recordMessage(logger);

  // Check message for filtered content first
  const filtered = config.enableFiltering && (await filter.checkAndModerate(message, logger));
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

// Log role changes on members
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  const addedRoles = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
  const removedRoles = oldMember.roles.cache.filter((r) => !newMember.roles.cache.has(r.id));

  for (const role of addedRoles.values()) {
    await logger.info(`Role "${role.name}" awarded to ${newMember.user.tag}`);
  }
  for (const role of removedRoles.values()) {
    await logger.info(`Role "${role.name}" removed from ${newMember.user.tag}`);
  }
});

// Connect to Discord
client.login(token).catch(async (error) => {
  await logger.error(`Login failed: ${error.message || error}`);
  process.exit(1);
});
