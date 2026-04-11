// Command handler — processes bot commands from channel messages and terminal input

import { stopApi } from './api.js';
import * as config from './config.js';
import { prompt } from './ai.js';
import { isFromTerminal, hasPermission } from './authentication.js';
import { addKickedUser, removeKickedUser } from './kickedusers.js';
import { banMember, unbanMember } from './interactions.js';
import { addBannedUser, removeBannedUser } from './bannedusers.js';
import { shutdown, restart } from './exit.js';
import { addFilteredWord, removeFilteredWord } from './filter.js';
import { addTask, removeTask, listTasks, enableTask, disableTask, runTaskNow, parseInterval, stopScheduler, parseTaskAdd } from './scheduler.js';
import { getServerStats, recordCommandRun } from './serverstats.js';
import { terminalOutput } from './terminal.js';
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
    execute: async ({ message }) => {
      await message.reply('Exiting...');
      await shutdown('exit command');
    },
  },
  restart: {
    description: 'Restarts the bot from terminal.',
    terminalOnly: true,
    execute: async ({ message }) => {
      await message.reply('Restarting...');
      await restart('restart command');
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
  kick: {
    description: 'Adds one or more user IDs to the kick list.',
    permission: 'ModerateMembers',
    usage: `${prefix}kick <userId> [userId2 ...]`,
    execute: async ({ message, command, logger }) => {
      if (!command.args.length) {
        await message.reply(`Usage: ${prefix}kick <userId> [userId2 ...]`);
        return;
      }
      const results = await Promise.all(
        command.args.map((userId) => addKickedUser(userId).then(() => userId))
      );
      await message.reply(`Kicked ${results.length} user(s): ${results.map((id) => `\`${id}\``).join(', ')}`);
    },
  },
  unkick: {
    description: 'Removes a user ID from the kick list.',
    permission: 'ModerateMembers',
    usage: `${prefix}unkick <userId>`,
    execute: async ({ message, command, logger }) => {
      const userId = command.args[0];
      if (!userId) {
        await message.reply(`Usage: ${prefix}unkick <userId>`);
        return;
      }
      const removed = await removeKickedUser(userId);
      if (removed) {
        await message.reply(`User \`${userId}\` has been removed from the kick list.`);
      } else {
        await message.reply(`User \`${userId}\` is not on the kick list.`);
      }
    },
  },
  ban: {
    description: 'Bans one or more user IDs from the server.',
    permission: 'BanMembers',
    usage: `${prefix}ban <userId> [userId2 ...] [reason: <text>]`,
    execute: async ({ message, command, logger }) => {
      if (!command.args.length) {
        await message.reply(`Usage: ${prefix}ban <userId> [userId2 ...] [reason: <text>]`);
        return;
      }

      // Split args: user IDs stop at the first "reason:" token
      const reasonIndex = command.args.findIndex((a) => a.toLowerCase() === 'reason:');
      const userIds = reasonIndex === -1 ? command.args : command.args.slice(0, reasonIndex);
      const reason = reasonIndex !== -1 ? command.args.slice(reasonIndex + 1).join(' ') : null;

      if (!userIds.length) {
        await message.reply(`Usage: ${prefix}ban <userId> [userId2 ...] [reason: <text>]`);
        return;
      }

      const results = await Promise.all(
        userIds.map(async (userId) => {
          const ok = await addBannedUser(userId);
          return { userId, ok };
        })
      );
      const succeeded = results.filter((r) => r.ok !== false).map((r) => `\`${r.userId}\``);
      const failed    = results.filter((r) => r.ok === false).map((r) => `\`${r.userId}\``);

      const parts = [];
      if (succeeded.length) parts.push(`Banned ${succeeded.length} user(s): ${succeeded.join(', ')}`);
      if (failed.length)    parts.push(`Failed to ban: ${failed.join(', ')}`);
      if (reason)           parts.push(`Reason: ${reason}`);

      if (succeeded.length) await logger.info(`Banned ${succeeded.join(', ')} by ${message.author.tag}${reason ? `: ${reason}` : ''}`);
      await message.reply(parts.join('\n'));
    },
  },
  unban: {
    description: 'Unbans one or more user IDs from the server.',
    permission: 'BanMembers',
    usage: `${prefix}unban <userId> [userId2 ...] [reason: <text>]`,
    execute: async ({ message, command, logger }) => {
      if (!command.args.length) {
        await message.reply(`Usage: ${prefix}unban <userId> [userId2 ...] [reason: <text>]`);
        return;
      }

      const reasonIndex = command.args.findIndex((a) => a.toLowerCase() === 'reason:');
      const userIds = reasonIndex === -1 ? command.args : command.args.slice(0, reasonIndex);
      const reason = reasonIndex !== -1 ? command.args.slice(reasonIndex + 1).join(' ') : null;

      if (!userIds.length) {
        await message.reply(`Usage: ${prefix}unban <userId> [userId2 ...] [reason: <text>]`);
        return;
      }

      const results = await Promise.all(
        userIds.map(async (userId) => {
          const ok = await removeBannedUser(userId);
          if (ok !== false) await unbanMember(userId, reason);
          return { userId, ok };
        })
      );
      const succeeded = results.filter((r) => r.ok !== false).map((r) => `\`${r.userId}\``);
      const failed    = results.filter((r) => r.ok === false).map((r) => `\`${r.userId}\``);

      const parts = [];
      if (succeeded.length) parts.push(`Unbanned ${succeeded.length} user(s): ${succeeded.join(', ')}`);
      if (failed.length)    parts.push(`Failed to unban: ${failed.join(', ')}`);
      if (reason)           parts.push(`Reason: ${reason}`);

      if (succeeded.length) await logger.info(`Unbanned ${succeeded.join(', ')} by ${message.author.tag}${reason ? `: ${reason}` : ''}`);
      await message.reply(parts.join('\n'));
    },
  },
  stats: {
    description: 'Displays server statistics.',
    permission: 'ModerateMembers',
    execute: async ({ message }) => {
      const { messages, newUsers, commandsRun, filteredMessages, ticketsCreated, ticketsResolved, bannedUsersKicked, usersLeft, roleCounts } = getServerStats();
      const roleLines = Object.entries(roleCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([role, count]) => `  ${role}: ${count}`)
        .join('\n');
      const roleSection = roleLines ? `\nRole Counts:\n${roleLines}` : '';
      await message.reply(
        `**Server Stats**\n` +
        `Messages logged: ${messages}\n` +
        `Commands run: ${commandsRun}\n` +
        `New users joined: ${newUsers}\n` +
        `Users left: ${usersLeft}\n` +
        `Filtered messages: ${filteredMessages}\n` +
        `Tickets created: ${ticketsCreated}\n` +
        `Tickets resolved: ${ticketsResolved}\n` +
        `Banned users kicked: ${bannedUsersKicked}` +
        roleSection
      );
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
  task: {
    description: 'Manages scheduled tasks.',
    permission: 'ModerateMembers',
    usage: `${prefix}task <list|add|remove|enable|disable|run>`,
    execute: async ({ message, command, logger }) => {
      const sub = command.args[0];

      // !task  or  !task list
      if (!sub || sub === 'list') {
        const tasks = listTasks();
        if (!tasks.length) {
          await message.reply('No scheduled tasks.');
          return;
        }
        const lines = tasks.map((t) =>
          t.system
            ? `\`${t.id}\` [system] ${t.mode} \`${t.timing}\``
            : `\`${t.id}\` [${t.enabled ? 'on' : 'off'}] ${t.mode} \`${t.timing}\` → #${t.channelName} — last run: ${t.lastRun ?? 'never'}`
        );
        await replyLongMessage(message, `**Scheduled Tasks**\n${lines.join('\n')}`);
        return;
      }

      // !task add <id> interval <duration> <channel> <message...>
      // !task add <id> cron <m> <h> <dom> <mon> <dow> <channel> <message...>
      if (sub === 'add') {
        const result = parseTaskAdd(command.args.slice(1));

        if (!result.ok) {
          if (result.reason === 'missing_id_mode') {
            await message.reply(
              `Usage:\n` +
              `\`${prefix}task add <id> interval <duration> <channel> <message>\`\n` +
              `\`${prefix}task add <id> cron <m h dom mon dow> <channel> <message>\`\n` +
              `Duration examples: \`30s\`, \`5m\`, \`2h\`, \`1d\`, \`1w\`\n` +
              `Cron example: \`0 9 * * 1\` (every Monday at 9:00)`
            );
          } else if (result.reason === 'missing_interval_args') {
            await message.reply(`Usage: \`${prefix}task add <id> interval <duration> <channel> <message>\``);
          } else if (result.reason === 'invalid_interval') {
            await message.reply(`Invalid duration \`${result.timing}\`. Use a format like \`5m\`, \`1h\`, \`2d\`.`);
          } else if (result.reason === 'missing_cron_args') {
            await message.reply(`Usage: \`${prefix}task add <id> cron <m> <h> <dom> <mon> <dow> <channel> <message>\``);
          } else if (result.reason === 'unknown_mode') {
            await message.reply(`Unknown mode \`${result.mode}\`. Use \`interval\` or \`cron\`.`);
          }
          return;
        }

        if (listTasks().some((t) => t.id === result.task.id)) {
          await message.reply(`A task with id \`${result.task.id}\` already exists. Remove it first.`);
          return;
        }

        await addTask(result.task, logger);
        await message.reply(`Added task \`${result.task.id}\` (${result.task.mode}: \`${result.task.timing}\`) → #${result.task.channelName}.`);
        return;
      }

      // !task remove <id>
      if (sub === 'remove') {
        const id = command.args[1];
        if (!id) {
          await message.reply(`Usage: \`${prefix}task remove <id>\``);
          return;
        }
        const removed = await removeTask(id, logger);
        await message.reply(removed ? `Removed task \`${id}\`.` : `No task found with id \`${id}\`.`);
        return;
      }

      // !task enable <id>
      if (sub === 'enable') {
        const id = command.args[1];
        if (!id) {
          await message.reply(`Usage: \`${prefix}task enable <id>\``);
          return;
        }
        const ok = await enableTask(id, logger);
        await message.reply(ok ? `Enabled task \`${id}\`.` : `No task found with id \`${id}\`.`);
        return;
      }

      // !task disable <id>
      if (sub === 'disable') {
        const id = command.args[1];
        if (!id) {
          await message.reply(`Usage: \`${prefix}task disable <id>\``);
          return;
        }
        const ok = await disableTask(id, logger);
        await message.reply(ok ? `Disabled task \`${id}\`.` : `No task found with id \`${id}\`.`);
        return;
      }

      // !task run <id>
      if (sub === 'run') {
        const id = command.args[1];
        if (!id) {
          await message.reply(`Usage: \`${prefix}task run <id>\``);
          return;
        }
        const ok = await runTaskNow(id, logger);
        await message.reply(ok ? `Triggered task \`${id}\`.` : `No task found with id \`${id}\`.`);
        return;
      }

      await message.reply(
        `Unknown subcommand \`${sub}\`. Use \`list\`, \`add\`, \`remove\`, \`enable\`, \`disable\`, or \`run\`.`
      );
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
    await recordCommandRun();
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
