// Configuration — loads environment variables and exports bot settings

import 'dotenv/config.js';
import { promises as fsp } from 'fs';
import path from 'path';

// Bot
export const token = process.env.DISCORD_TOKEN || null;
export const commandPrefix = process.env.COMMAND_PREFIX || '!';
export const serverTitle = process.env.SERVER_TITLE || 'Ripcord';
export const textChannelsCategory = process.env.TEXT_CHANNELS_CATEGORY || 'text channels';

// Logging
export const enableConsole = process.env.ENABLE_CONSOLE === 'false' ? false : true;
export const enableFileLogging = process.env.ENABLE_FILE_LOGGING === 'false' ? false : true;
export const logsPath = process.env.LOGS_PATH || path.resolve(process.cwd(), 'logs');

// Channels
export const chatChannel = process.env.CHAT_CHANNEL || 'chat';
export const moderatorChannel = process.env.MODERATOR_CHANNEL || 'moderators';
export const ticketChannel = process.env.TICKET_CHANNEL || 'issues';
export const welcomeChannel = process.env.WELCOME_CHANNEL || 'welcome';

// Roles
export const moderatorRole = process.env.MODERATOR_ROLE || 'Moderator';
export const trustedRole = process.env.TRUSTED_ROLE || 'Trusted';

// Filtering
export const enableFiltering = process.env.ENABLE_FILTERING === 'false' ? false : true;
export const filteredWordsDir = process.env.FILTERED_WORDS_DIR || path.resolve(process.cwd(), 'data');
export const filteredWordsFile = process.env.FILTERED_WORDS_FILE || 'filtered-words.json';

// Server Stats
export const serverStatsPath = process.env.SERVER_STATS_PATH || path.resolve(process.cwd(), 'data');
export const serverStatsFile = process.env.SERVER_STATS_FILE || 'server-stats.json';

// AI
export const ollamaModel = process.env.OLLAMA_MODEL || 'mistral';

// Tickets
export const enableTickets = process.env.ENABLE_TICKETS === 'false' ? false : true;
export const ticketDirectoryPath = process.env.TICKET_DIRECTORY_PATH || path.resolve(process.cwd(), 'tickets');

// Onboarding
export const enableOnboarding = process.env.ENABLE_ONBOARDING === 'false' ? false : true;

// Scheduler
export const schedulesPath = process.env.SCHEDULES_PATH || path.resolve(process.cwd(), 'data');
export const schedulesFile = process.env.SCHEDULES_FILE || 'schedules.json';


// Invites
export const invitesPath = process.env.INVITES_PATH || path.resolve(process.cwd(), 'data');
export const invitesFile = process.env.INVITES_FILE || 'invites.json';

// Persistence
export const autoKickerPath = process.env.AUTO_KICKER_PATH || path.resolve(process.cwd(), 'data');
export const autoKickerFile = process.env.AUTO_KICKER_FILE || 'kicked-users.json';
export const bannedUsersPath = process.env.BANNED_USERS_PATH || path.resolve(process.cwd(), 'data');
export const bannedUsersFile = process.env.BANNED_USERS_FILE || 'banned-users.json';
export const serverRulesIdPath = process.env.SERVER_RULES_ID_PATH || path.resolve(process.cwd(), 'data');
export const serverRulesIdFile = process.env.SERVER_RULES_ID_FILE || 'server-rules-id.json';
export const categoryTitleIdPath = process.env.CATEGORY_TITLE_ID_PATH || path.resolve(process.cwd(), 'data');
export const categoryTitleIdFile = process.env.CATEGORY_TITLE_ID_FILE || 'category-title-id.json';

const ENV_PATH = path.resolve(process.cwd(), '.env');

export async function readEnvFile() {
  try { return await fsp.readFile(ENV_PATH, 'utf8'); }
  catch { return ''; }
}

export async function writeEnvFields(updates) {
  let src = await readEnvFile();
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    src = re.test(src) ? src.replace(re, line) : src + (src.endsWith('\n') || src === '' ? '' : '\n') + line + '\n';
  }
  await fsp.writeFile(ENV_PATH, src, 'utf8');
}
