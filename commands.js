// Import config and filter functions
import * as config from './config.js';
import { addFilteredWord } from './filter.js';
import { prompt } from './ai.js';
import { shutdown, terminalOutput } from './terminal.js';
import { isFromTerminal, hasPermission } from './authentication.js';
const prefix = config.commandPrefix;

function replyLongMessage(message, text) {
  if (text.length <= 1900) {
    return message.reply(text);
  }

  const chunks = text.match(/[\s\S]{1,1900}/g) || [];
  return Promise.all(chunks.map((chunk) => message.reply(chunk)));
}

const commands = {
  ping: {
    description: 'Responds with Pong!',
    execute: async ({ message }) => {
      await message.reply('Pong!');
    },
  },
  echo: {
    description: 'Echoes back provided text.',
    execute: async ({ message, command }) => {
      await message.reply(command.args.join(' ') || 'Nothing to echo.');
    },
  },
  exit: {
    description: 'Shuts down the bot from terminal.',
    terminalOnly: true,
    execute: async ({ message, logger }) => {
      logger.info('Exiting...');
      await message.reply('Exiting...');
      shutdown();
    },
  },
  addfilter: {
    description: 'Adds a word to the filter list.',
    permission: 'ModerateMembers',
    usage: `${prefix}addfilter <word>`,
    execute: async ({ message, command, logger }) => {
      if (!command.args.length) {
        await message.reply(`Usage: ${prefix}addfilter <word>`);
        return;
      }

      const word = command.args.join(' ');
      const added = addFilteredWord(word);
      if (added) {
        logger.info(`Added filtered word "${word}" by ${message.author.tag}`);
        await message.reply(`Added "${word}" to filtered words.`);
      } else {
        await message.reply(`"${word}" is already in the filtered words list.`);
      }
    },
  },
  ask: {
    description: 'Asks the AI a question.',
    usage: `${prefix}ask <question>`,
    execute: async ({ message, command, logger }) => {
      if (!command.args.length) {
        await message.reply(`Usage: ${prefix}ask <question>`);
        return;
      }

      const question = command.args.join(' ');
      logger.info(`AI question from ${message.author.tag}: ${question}`);
      await message.channel.sendTyping();

      try {
        const response = await prompt([{ role: 'user', content: question }], logger);
        if (!response) {
          await message.reply('Sorry, I could not generate a response. Please try again later.');
          logger.error(`Failed to get AI response for question: ${question}`);
          return;
        }

        await replyLongMessage(message, response);
        logger.info(`AI response sent to ${message.author.tag}`);
      } catch (error) {
        await message.reply('An error occurred while processing your question.');
        logger.error(`Error in ask command: ${error.message || error}`);
      }
    },
  },
};

// Parse a message into a command object with name and arguments
function parseCommand(message, allowNoPrefix = false) {
  const raw = message.content.trim();
  if (!raw) return null;

  let withoutPrefix = null;
  if (raw.startsWith(prefix)) {
    withoutPrefix = raw.slice(prefix.length).trim();
  } else if (allowNoPrefix) {
    withoutPrefix = raw;
  }

  if (!withoutPrefix) return null;

  const parts = withoutPrefix.split(/\s+/);
  return {
    name: parts[0].toLowerCase(),
    args: parts.slice(1),
  };
}

// Handle a command from Discord or terminal
async function handleCommand(message, logger, allowNoPrefix = false) {
  const command = parseCommand(message, allowNoPrefix);
  if (!command) return false;

  const isTerminal = isFromTerminal(message);
  logger.info(`Command received: ${command.name} from ${message.author.tag}`);

  const commandDef = commands[command.name];
  if (!commandDef) {
    logger.error(`Unknown command: ${command.name} from ${message.author.tag}`);
    await message.reply(`Unknown command: ${command.name}`);
    return true;
  }

  if (commandDef.terminalOnly && !isTerminal) {
    logger.warn(`Attempted terminal-only command from non-terminal source from ${message.author.tag}: ${command.name}`);
    return true;
  }

  if (commandDef.permission && !isTerminal && !hasPermission(message, commandDef.permission)) {
    logger.warn(`Attempted unauthorized command from ${message.author.tag}: ${command.name}`);
    return true;
  }

  try {
    await commandDef.execute({ message, command, logger, isTerminal });
  } catch (error) {
    logger.error(`Error executing command ${command.name}: ${error.message || error}`);
    await message.reply('An error occurred while executing the command.');
  }

  return true;
}

// Handle terminal input by converting it to a message object
async function handleTerminalInput(input, logger) {
  const trimmed = input.trim();
  if (!trimmed) return false;

  // Create a mock message object for terminal input
  const message = {
    content: trimmed,
    author: { tag: 'terminal' },
    channel: {
      sendTyping: async () => {},
    },
    reply: async (response) => terminalOutput(response),
  };

  // Process as command without requiring prefix
  return handleCommand(message, logger, true);
}

export {
  handleCommand,
  handleTerminalInput,
};
