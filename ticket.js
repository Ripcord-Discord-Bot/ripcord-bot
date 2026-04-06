// Ticket system for handling messages posted in the issues channel
// Automatically creates ticket files for messages in the issues channel

import path from 'path';
import * as config from './config.js';
import { isFromChannel } from './authentication.js';
import { checkDirExists, createDir, createFile } from './io.js';
import { suggestTicketAction } from './ai.js';

// Get the directory name of the current module
const ticketsDir = config.ticketDirectoryPath;

// Check if message was sent in issues channel and create a ticket file
// Parameters:
//   message - Discord message object
//   logger - Logger instance for logging
// Returns: Boolean - true if ticket was created, false otherwise
async function createTicket(message, logger) {
  if (!config.enableTickets) return false;
  if (!isFromChannel(message, config.ticketChannel)) return false;

  try {
    if (!(await checkDirExists(ticketsDir))) {
      await createDir(ticketsDir);
      await logger.info('Created tickets directory');
    }

    const now = new Date().toISOString();
    const tag = `${message.author.username}#${message.author.discriminator}`;
    const createdAt = message.createdAt?.toISOString() ?? now;
    const date = now.slice(0, 10);
    const time = now.slice(11, 19).replace(/:/g, '-');
    const shortId = message.id.slice(-4);
    const ticketFileName = `${date}_${time}_${message.author.username}_${shortId}.json`;
    const ticketPath = path.join(ticketsDir, ticketFileName);

    const ticket = {
      author: {
        username: message.author.username,
        id: message.author.id,
        tag,
      },
      channel: {
        id: message.channel.id,
        name: message.channel.name,
      },
      server: {
        id: message.guild?.id ?? null,
        name: message.guild?.name ?? null,
      },
      message: {
        id: message.id,
        content: message.content,
        url: message.url,
        createdAt,
      },
      attachments: message.attachments.map((att) => ({
        id: att.id,
        name: att.name,
        url: att.url,
        contentType: att.contentType,
        size: att.size,
      })),
      created: now,
      moderatorSuggestion: null,
    };

    ticket.moderatorSuggestion = (await suggestTicketAction(ticket, logger)) ?? null;

    await createFile(ticketPath, JSON.stringify(ticket, null, 2));
    await logger.info(`Created ticket: ${ticketFileName}`);
    return true;
  } catch (error) {
    await logger.error(`Failed to create ticket: ${error.message || error}`);
    return false;
  }
}

export { createTicket };
