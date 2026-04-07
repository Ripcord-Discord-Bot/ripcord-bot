// Command handler — processes bot commands from channel messages and terminal input

import { stopApi } from './api.js';
import * as config from './config.js';
import { prompt } from './ai.js';
import { isFromTerminal, hasPermission } from './authentication.js';
import { addBannedUser, removeBannedUser } from './bannedlist.js';
import { addFilteredWord, removeFilteredWord } from './filter.js';
import { getServerStats } from './serverstats.js';
import { shutdown, terminalOutput } from './terminal.js';
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
      await logger.info('Exiting...');
      await message.reply('Exiting...');
      shutdown(() => stopApi(logger));
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
      const added = await addFilteredWord(word);
      if (added) {
        await logger.info(`Added filtered word "${word}" by ${message.author.tag}`);
        await message.reply(`Added "${word}" to filtered words.`);
      } else {
        await message.reply(`"${word}" is already in the filtered words list.`);
      }
    },
  },
  removefilter: {
    description: 'Removes a word from the filter list.',
    permission: 'ModerateMembers',
    usage: `${prefix}removefilter <word>`,
    execute: async ({ message, command, logger }) => {
      if (!command.args.length) {
        await message.reply(`Usage: ${prefix}removefilter <word>`);
        return;
      }
      const word = command.args.join(' ');
      const removed = await removeFilteredWord(word);
      if (removed) {
        await logger.info(`Removed filtered word "${word}" by ${message.author.tag}`);
        await message.reply(`Removed "${word}" from filtered words.`);
      } else {
        await message.reply(`"${word}" is not in the filtered words list.`);
      }
    },
  },
  ban: {
    description: 'Adds one or more user IDs to the banned list.',
    permission: 'ModerateMembers',
    usage: `${prefix}ban <userId> [userId2 ...]`,
    execute: async ({ message, command, logger }) => {
      if (!command.args.length) {
        await message.reply(`Usage: ${prefix}ban <userId> [userId2 ...]`);
        return;
      }
      const results = await Promise.all(
        command.args.map((userId) => addBannedUser(userId, logger, message.guild).then(() => userId))
      );
      await message.reply(`Banned ${results.length} user(s): ${results.map((id) => `\`${id}\``).join(', ')}`);
    },
  },
  unban: {
    description: 'Removes a user ID from the banned list.',
    permission: 'ModerateMembers',
    usage: `${prefix}unban <userId>`,
    execute: async ({ message, command, logger }) => {
      const userId = command.args[0];
      if (!userId) {
        await message.reply(`Usage: ${prefix}unban <userId>`);
        return;
      }
      const removed = await removeBannedUser(userId, logger);
      if (removed) {
        await message.reply(`User \`${userId}\` has been removed from the banned list.`);
      } else {
        await message.reply(`User \`${userId}\` is not on the banned list.`);
      }
    },
  },
  stats: {
    description: 'Displays server statistics.',
    permission: 'ModerateMembers',
    execute: async ({ message }) => {
      const { messages, newUsers } = getServerStats();
      await message.reply(`**Server Stats**\nMessages logged: ${messages}\nNew users joined: ${newUsers}`);
    },
  },
  help: {
    description: 'Lists all available commands.',
    execute: async ({ message, isTerminal }) => {
      const isMod = isTerminal || (message.member && message.member.permissions.has('ModerateMembers'));
      const lines = ['**Available Commands**\n'];
      for (const [name, cmd] of Object.entries(commands)) {
        if (cmd.terminalOnly && !isTerminal) continue;
        if (cmd.permission && !isMod) continue;
        const usage = cmd.usage || `${prefix}${name}`;
        const perm = cmd.terminalOnly ? ' *(terminal only)*' : cmd.permission ? ' *(moderators only)*' : '';
        lines.push(`\`${usage}\` — ${cmd.description}${perm}`);
      }
      await replyLongMessage(message, lines.join('\n'));
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
      await logger.info(`AI question from ${message.author.tag}: ${question}`);
      await message.channel.sendTyping();

      try {
        const response = await prompt([{ role: 'user', content: question }], logger);
        if (!response) {
          await message.reply('Sorry, I could not generate a response. Please try again later.');
          logger.error(`Failed to get AI response for question: ${question}`);
          return;
        }

        await replyLongMessage(message, response);
        await logger.info(`AI response sent to ${message.author.tag}`);
      } catch (error) {
        await message.reply('An error occurred while processing your question.');
        await logger.error(`Error in ask command: ${error.message || error}`);
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
  await logger.info(`Command received: ${command.name} from ${message.author.tag}`);

  const commandDef = commands[command.name];
  if (!commandDef) {
    await logger.error(`Unknown command: ${command.name} from ${message.author.tag}`);
    await message.reply(`Unknown command: ${command.name}`);
    return true;
  }

  if (commandDef.terminalOnly && !isTerminal) {
    await logger.warn(`Attempted terminal-only command from non-terminal source from ${message.author.tag}: ${command.name}`);
    return true;
  }

  if (commandDef.permission && !isTerminal && !hasPermission(message, commandDef.permission)) {
    await logger.warn(`Attempted unauthorized command from ${message.author.tag}: ${command.name}`);
    return true;
  }

  try {
    await commandDef.execute({ message, command, logger, isTerminal });
  } catch (error) {
    await logger.error(`Error executing command ${command.name}: ${error.message || error}`);
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
