// Ticket system — creates and persists support tickets from Discord messages

import { randomUUID } from 'crypto';
import { readdir } from 'fs/promises';
import { ensureDir, writeJson, joinPath, deleteFile, readJson } from './io.js';
import * as config from './config.js';
import { isFromChannel } from './authentication.js';
import { suggestTicketAction } from './ai.js';
import { recordTicketCreated, recordTicketResolved } from './serverstats.js';

const ticketsDir = config.ticketDirectoryPath;

async function createTicket(message, logger) {
  if (!config.enableTickets) return false;
  if (!isFromChannel(message, config.ticketChannel)) return false;

  try {
    await ensureDir(ticketsDir);

    const now = new Date().toISOString();
    const tag = `${message.author.username}#${message.author.discriminator}`;
    const createdAt = message.createdAt?.toISOString() ?? now;
    const date = now.slice(0, 10);
    const time = now.slice(11, 19).replace(/:/g, '-');
    const shortId = message.id.slice(-4);
    const ticketFileName = `${date}_${time}_${message.author.username}_${shortId}.json`;
    const ticketPath = joinPath(ticketsDir, ticketFileName);

    const ticket = {
      id: randomUUID(),
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

    await writeJson(ticketPath, ticket);
    await logger.info(`Created ticket: ${ticketFileName}`);
    await recordTicketCreated(logger);
    return true;
  } catch (error) {
    await logger.error(`Failed to create ticket: ${error.message || error}`);
    return false;
  }
}

async function deleteTicket(fileNameOrId, logger) {
  try {
    let fileName = fileNameOrId;

    if (!fileNameOrId.endsWith('.json')) {
      const files = await readdir(ticketsDir);
      let found = null;
      for (const f of files) {
        if (!f.endsWith('.json')) continue;
        const data = await readJson(joinPath(ticketsDir, f));
        if (data?.id === fileNameOrId) { found = f; break; }
      }
      if (!found) {
        await logger.error(`deleteTicket: no ticket found with id ${fileNameOrId}`);
        return false;
      }
      fileName = found;
    }

    const ticketPath = joinPath(ticketsDir, fileName);
    await deleteFile(ticketPath);
    await logger.info(`Deleted ticket: ${fileName}`);
    await recordTicketResolved(logger);
    return true;
  } catch (error) {
    await logger.error(`Failed to delete ticket: ${error.message || error}`);
    return false;
  }
}

export { createTicket, deleteTicket };
