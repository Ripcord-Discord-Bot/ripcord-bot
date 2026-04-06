import path from 'path';

export const commandPrefix = process.env.COMMAND_PREFIX || '!';
export const enableConsole = process.env.ENABLE_CONSOLE === 'false' ? false : true;
export const enableFileLogging = process.env.ENABLE_FILE_LOGGING === 'false' ? false : true;
export const logsPath = process.env.LOGS_PATH || path.resolve(process.cwd(), 'logs');
export const enableFiltering = process.env.ENABLE_FILTERING === 'false' ? false : true;
export const filteredWordsDir = process.env.FILTERED_WORDS_DIR || path.resolve(process.cwd(), 'data');
export const ollamaModel = process.env.OLLAMA_MODEL || 'mistral';
export const enableTickets = process.env.ENABLE_TICKETS === 'false' ? false : true;
export const ticketDirectoryPath = process.env.TICKET_DIRECTORY_PATH || path.resolve(process.cwd(), 'tickets');
