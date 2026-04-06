// Ticket system for handling messages posted in the issues channel
// Automatically creates ticket files for messages in the issues channel

import path from 'path';
import * as config from './config.js';
import { isFromChannel } from './authentication.js';
import { checkDirExists, createDir, createFile } from './io.js';

// Get the directory name of the current module
const ticketsDir = config.ticketDirectoryPath;

// Check if message was sent in issues channel and create a ticket file
// Parameters:
//   message - Discord message object
//   logger - Logger instance for logging
// Returns: Boolean - true if ticket was created, false otherwise
async function createTicket(message, logger) {
  // Check if tickets are enabled
  if (!config.enableTickets) {
    return false;
  }

  // Check if message is in the issues channel
  if (!isFromChannel(message, 'issues')) {
    return false;
  }

  try {
    // Create tickets directory if it doesn't exist
    if (!(await checkDirExists(ticketsDir))) {
      await createDir(ticketsDir);
      await logger.info('Created tickets directory');
    }

    // Generate ticket filename with timestamp and message ID
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const ticketFileName = `ticket-${message.author.username}-${timestamp}-${message.id}.json`;
    const ticketPath = path.join(ticketsDir, ticketFileName);

    // Build ticket object with metadata and message content
    const ticket = {
      author: {
        username: message.author.username,
        discriminator: message.author.discriminator,
        id: message.author.id,
        tag: `${message.author.username}#${message.author.discriminator}`,
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
        createdAt: message.createdAt?.toISOString() ?? new Date().toISOString(),
      },
      attachments: message.attachments.map((att) => ({
        id: att.id,
        name: att.name,
        url: att.url,
        contentType: att.contentType,
        size: att.size,
      })),
      created: new Date().toISOString(),
    };

    // Write the ticket file as JSON
    await createFile(ticketPath, JSON.stringify(ticket, null, 2));
    await logger.info(`Created ticket: ${ticketFileName}`);

    return true;
  } catch (error) {
    await logger.error(`Failed to create ticket: ${error.message || error}`);
    return false;
  }
}

export { createTicket };
