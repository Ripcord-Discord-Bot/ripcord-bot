import path from 'path';


// Configuration constants loaded from environment variables with defaults, to ensure valid values are always present
export const commandPrefix = process.env.COMMAND_PREFIX || '!';
export const enableConsole = process.env.ENABLE_CONSOLE === 'false' ? false : true;
export const enableFileLogging = process.env.ENABLE_FILE_LOGGING === 'false' ? false : true;
export const logsPath = process.env.LOGS_PATH || path.resolve(process.cwd(), 'logs');
export const enableFiltering = process.env.ENABLE_FILTERING === 'false' ? false : true;
export const filteredWordsDir = process.env.FILTERED_WORDS_DIR || path.resolve(process.cwd(), 'data');
export const filteredWordsFile = process.env.FILTERED_WORDS_FILE || 'filtered-words.json';
export const ollamaModel = process.env.OLLAMA_MODEL || 'mistral';
export const enableTickets = process.env.ENABLE_TICKETS === 'false' ? false : true;
export const ticketChannel = process.env.TICKET_CHANNEL || 'issues';
export const moderatorChannel = process.env.MODERATOR_CHANNEL || 'moderators';
export const welcomeChannel = process.env.WELCOME_CHANNEL || 'welcome';
export const chatChannel = process.env.CHAT_CHANNEL || 'chat';
export const moderatorRole = process.env.MODERATOR_ROLE || 'Moderator';
export const trustedRole = process.env.TRUSTED_ROLE || 'Trusted';
export const ticketDirectoryPath = process.env.TICKET_DIRECTORY_PATH || path.resolve(process.cwd(), 'tickets');
export const serverStatsPath = process.env.SERVER_STATS_PATH || path.resolve(process.cwd(), 'data');
export const serverStatsFile = process.env.SERVER_STATS_FILE || 'server-stats.json';
export const serverRulesIdPath = process.env.SERVER_RULES_ID_PATH || path.resolve(process.cwd(), 'data');
export const serverRulesIdFile = process.env.SERVER_RULES_ID_FILE || 'server-rules-id.json';
export const bannedListPath = process.env.BANNED_LIST_PATH || path.resolve(process.cwd(), 'data');
export const bannedListFile = process.env.BANNED_LIST_FILE || 'bannedlist.json';
