// Guild setup script — creates channels, roles, and categories for a new Discord server

import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, PermissionFlagsBits } from 'discord.js';
import * as config from './config.js';
import logger from './logger.js';
import { cleanupGuild } from './cleanup.js';
import {
  setupInteractions,
  createRole,
  createCategory,
  createTextChannel,
  moveChannelsToCategory,
  sendToChannel,
} from './interactions.js';
import { ensureDir, resolvePath } from './io.js';

const { ViewChannel, SendMessages } = PermissionFlagsBits;

async function setupServer() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  client.once('ready', async () => {
    await logger.info(`Setup: connected as ${client.user.tag}`);
    setupInteractions(client, logger);

    const guild = client.guilds.cache.first();
    if (!guild) {
      await logger.error('Setup: no guild found');
      client.destroy();
      process.exit(1);
    }

    try {
      await logger.info(`Setup: starting for server "${guild.name}"`);

      // Step 1: Clean slate
      await cleanupGuild();
      // Re-create logs dir — cleanup deletes it but the logger needs it immediately
      await ensureDir(resolvePath(config.logsPath));

      // Step 2: Roles
      const modRole = await createRole(config.moderatorRole, { reason: 'Setup script' });
      const trustedRole = await createRole(config.trustedRole, { reason: 'Setup script' });

      if (!modRole || !trustedRole) {
        throw new Error('Failed to create required roles');
      }

      const everyoneRole = guild.roles.everyone;

      // Step 3: Channels with permission overwrites
      // #welcome — anyone can see, only mods can post
      await createTextChannel(config.welcomeChannel, {
        reason: 'Setup script',
        permissionOverwrites: [
          { id: everyoneRole.id, allow: [ViewChannel], deny: [SendMessages] },
          { id: modRole.id, allow: [ViewChannel, SendMessages] },
        ],
      });

      // #chat — anyone can see, trusted and mods can post
      await createTextChannel(config.chatChannel, {
        reason: 'Setup script',
        permissionOverwrites: [
          { id: everyoneRole.id, allow: [ViewChannel], deny: [SendMessages] },
          { id: trustedRole.id, allow: [ViewChannel, SendMessages] },
          { id: modRole.id, allow: [ViewChannel, SendMessages] },
        ],
      });

      // #moderators — only mods can see and post
      await createTextChannel(config.moderatorChannel, {
        reason: 'Setup script',
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [ViewChannel, SendMessages] },
          { id: modRole.id, allow: [ViewChannel, SendMessages] },
        ],
      });

      // #issues — trusted and mods can see and post
      await createTextChannel(config.ticketChannel, {
        reason: 'Setup script',
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [ViewChannel, SendMessages] },
          { id: trustedRole.id, allow: [ViewChannel, SendMessages] },
          { id: modRole.id, allow: [ViewChannel, SendMessages] },
        ],
      });

      // Step 4: Category and move channels into it
      const categoryName = config.textChannelsCategory;
      await createCategory(categoryName, { reason: 'Setup script' });
      await moveChannelsToCategory(
        [config.welcomeChannel, config.chatChannel, config.moderatorChannel, config.ticketChannel],
        categoryName
      );

      // Step 5: Set system channel to welcome channel
      const welcomeChannelObj = guild.channels.cache.find(
        (ch) => ch.name === config.welcomeChannel && ch.isTextBased()
      );
      if (welcomeChannelObj) {
        try {
          await guild.setSystemChannel(welcomeChannelObj, 'Set by setup script');
          await logger.info(`Setup: system channel set to #${config.welcomeChannel}`);
        } catch (err) {
          await logger.error(`Setup: failed to set system channel: ${err.message || err}`);
        }
      } else {
        await logger.warn(`Setup: welcome channel #${config.welcomeChannel} not found for system channel assignment.`);
      }

      // Step 6: Welcome message
      await sendToChannel(
        config.welcomeChannel,
        `**Welcome to ${guild.name}!** 👋\n\nPlease read the rules and react with 👍 to gain access to the server.`
      );

      await logger.info('Setup: complete.');
    } catch (error) {
      await logger.error(`Setup: unexpected error: ${error.message || error}`);
    }

    client.destroy();
    process.exit(0);
  });

  client.login(config.token).catch(async (err) => {
    await logger.error(`Setup: login failed: ${err.message || err}`);
    process.exit(1);
  });
}

setupServer();
