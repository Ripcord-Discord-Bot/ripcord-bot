import { commandPrefix } from './config.js';
import { addFilteredWord } from './filter.js';
const prefix = commandPrefix;

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

async function handleCommand(message, logger, allowNoPrefix = false, shutdown = null) {
  const command = parseCommand(message, allowNoPrefix);
  if (!command) return false;

  const isTerminal = message.author?.tag === 'terminal';
  logger.info(`Command received: ${command.name} from ${message.author.tag}`);

  switch (command.name) {
    case 'ping':
      await message.reply('Pong!');
      break;
    case 'echo':
      await message.reply(command.args.join(' ') || 'Nothing to echo.');
      break;
    case 'exit':
      if (!isTerminal) {
        logger.warn(`Attempted terminal-only command from non-terminal source from ${message.author.tag}: ${command.name}`);
        break;
      }
      await message.reply('Exiting...');
      if (shutdown) shutdown();
      else process.exit(0);
      break;
    case 'addfilter':
      if (!message.member?.permissions.has('ModerateMembers')) {
        logger.warn(`Attempted unauthorized command from ${message.author.tag}: ${command.name}`);
        break;
      }
      if (!command.args.length) {
        await message.reply(`Usage: ${prefix}addfilter <word>`);
        break;
      }
      const word = command.args.join(' ');
      const added = addFilteredWord(word);
      if (added) {
        logger.info(`Added filtered word "${word}" by ${message.author.tag}`);
        await message.reply(`Added "${word}" to filtered words.`);
      } else {
        await message.reply(`"${word}" is already in the filtered words list.`);
      }
      break;
    default:
      logger.error(`Unknown command: ${command.name} from ${message.author.tag}`);
      await message.reply(`Unknown command: ${command.name}`);
  }

  return true;
}

async function handleTerminalInput(input, logger, shutdown = null) {
  const trimmed = input.trim();
  if (!trimmed) return false;

  const message = {
    content: trimmed,
    author: { tag: 'terminal' },
    reply: async (response) => logger.terminalOutput(response),
  };

  return handleCommand(message, logger, true, shutdown);
}

export {
  handleCommand,
  handleTerminalInput,
};
