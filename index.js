require('dotenv').config();
const readline = require('readline');
const { Client, GatewayIntentBits, Events } = require('discord.js');
const config = require('./config');
const logger = require('./logger');
const commands = require('./commands');
const filter = require('./filter').default;

const token = process.env.DISCORD_TOKEN;
if (!token) {
  logger.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (ready) => {
  logger.info(`Logged in as ${ready.user.tag}`);
  setupTerminalInput();
});

function setupTerminalInput() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'ripcord > ',
  });

  logger.setPromptInterface(rl);
  rl.prompt();

  rl.on('line', async (line) => {
    const handled = await commands.handleTerminalInput(line, logger, shutdown);
    if (!handled) {
      logger.warn(`Command not recognized in terminal input: ${line}`);
    }
    rl.prompt();
  });

  return rl;
}

function shutdown() {
  logger.info('Exiting...');
  process.exit(0);
}

process.on('SIGINT', shutdown);

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  logger.info(`Message from ${message.author.tag} in ${message.guild?.name || 'DM'}: ${message.content}`);

  const filtered = config.enableFiltering && (await filter.checkAndModerate(message, logger));
  if (filtered) return;

  await commands.handleCommand(message, logger);
});

client.login(token).catch((error) => {
  logger.error(`Login failed: ${error.message || error}`);
  process.exit(1);
});
