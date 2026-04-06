import { join } from 'path';

export const commandPrefix = '!';

export const enableConsole = true;

export const enableFileLogging = true;
export const logsPath = join(import.meta.dirname, 'logs');

export const enableFiltering = true;
export const filteredWordsDir = join(import.meta.dirname, 'data');

export const ollamaModel = 'mistral';

export const enableTickets = true;
export const ticketDirectoryPath = join(import.meta.dirname, 'tickets');
