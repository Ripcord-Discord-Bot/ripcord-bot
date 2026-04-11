// Cleanup — deletes bot data files and resets Discord server state

import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits } from 'discord.js';
import * as config from './config.js';
import logger from './logger.js';
import {
  setupInteractions,
  listTextChannels,
  listVoiceChannels,
  listCategories,
  listRoles,
  clearChannel,
  deleteChannelById,
  deleteRoleById,
} from './interactions.js';
import { checkDirExists, deleteDir, joinPath, resolvePath } from './io.js';

// Configured dirs — deduplicated; each is deleted if it exists
const CONFIGURED_DIRS = [...new Set([
  resolvePath(config.logsPath),
  resolvePath(config.filteredWordsDir),
  resolvePath(config.schedulesPath),
  resolvePath(config.autoKickerPath),
  resolvePath(config.serverRulesIdPath),
  resolvePath(config.serverStatsPath),
  resolvePath(config.ticketDirectoryPath),
])];

export async function cleanupGuild() {
  // --- Data directories from config ---
  await logger.info('Cleanup: deleting configured data directories...');
  for (const dirPath of CONFIGURED_DIRS) {
    if (await checkDirExists(dirPath)) {
      await deleteDir(dirPath);
      await logger.info(`Cleanup: deleted ${dirPath}`);
    }
  }

  // data/ is always checked last — terminal-history.json is saved there via a hardcoded path
  const dataDir = resolvePath('data');
  if (await checkDirExists(dataDir)) {
    await deleteDir(dataDir);
    await logger.info(`Cleanup: deleted ${dataDir}`);
  }

  // Snapshot all channel/category lists before modifying anything
  const textChannels = listTextChannels();
  const voiceChannels = listVoiceChannels();
  const categories = listCategories();

  // --- Discord: clear messages ---
  await logger.info('Cleanup: clearing messages from all channels...');
  for (const ch of textChannels) {
    await clearChannel(ch.name);
  }

  // --- Discord: delete channels (except welcome) ---
  await logger.info(`Cleanup: deleting channels (keeping #${config.welcomeChannel})...`);
  for (const ch of [...textChannels, ...voiceChannels]) {
    if (ch.name === config.welcomeChannel) continue;
    await deleteChannelById(ch.id);
  }

  // --- Discord: delete categories ---
  await logger.info('Cleanup: deleting categories...');
  for (const cat of categories) {
    await deleteChannelById(cat.id);
  }

  // --- Discord: delete roles ---
  await logger.info('Cleanup: deleting roles...');
  const roles = listRoles();
  for (const role of roles) {
    await deleteRoleById(role.id);
  }

  await logger.info('Cleanup: complete.');
}

// Standalone entry point — run directly with: node cleanup.js
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  client.once('ready', async () => {
    await logger.info(`Cleanup: connected as ${client.user.tag}`);
    setupInteractions(client, logger);

    if (!client.guilds.cache.first()) {
      await logger.error('Cleanup: no guild found');
      client.destroy();
      process.exit(1);
    }

    try {
      await cleanupGuild();
    } catch (error) {
      await logger.error(`Cleanup: unexpected error: ${error.message || error}`);
    }

    client.destroy();
    process.exit(0);
  });

  client.login(config.token).catch(async (err) => {
    await logger.error(`Cleanup: login failed: ${err.message || err}`);
    process.exit(1);
  });
}
