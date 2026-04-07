// Guild setup script — creates channels, roles, and categories for a new Discord server

import 'dotenv/config.js';
import { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } from 'discord.js';
import * as config from './config.js';
import { cleanupGuild } from './cleanup.js';

// Verify bot token is available
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

// Ensure a role exists, creating it if not
async function ensureRole(guild, name, options = {}) {
  let role = guild.roles.cache.find((r) => r.name === name);
  if (!role) {
    role = await guild.roles.create({ name, reason: 'Setup script', ...options });
    console.log(`✓ Created role: ${name}`);
  } else {
    console.log(`✓ Role already exists: ${name}`);
  }
  return role;
}

// Ensure a text channel exists, creating it if not
async function ensureChannel(guild, name) {
  let channel = guild.channels.cache.find((ch) => ch.name === name && ch.type === ChannelType.GuildText);
  if (!channel) {
    channel = await guild.channels.create({ name, type: ChannelType.GuildText, reason: 'Setup script' });
    console.log(`✓ Created #${name}`);
  } else {
    console.log(`✓ #${name} already exists`);
  }
  return channel;
}

async function setupServer() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  client.once('clientReady', async () => {
    try {
      const guild = client.guilds.cache.first();
      if (!guild) {
        console.error('No guild found. Make sure the bot is in a server.');
        process.exit(1);
      }

      console.log(`\nSetting up server: ${guild.name}`);

      // Step 1: Clean up
      await cleanupGuild(guild);

      // Step 2: Ensure roles
      const modRole = await ensureRole(guild, config.moderatorRole);
      await ensureRole(guild, config.trustedRole);
      const everyoneRole = guild.roles.everyone;

      // Step 3: Ensure channels with permissions
      const welcome = await ensureChannel(guild, config.welcomeChannel);
      await welcome.permissionOverwrites.set([
        { id: everyoneRole.id, deny: [PermissionFlagsBits.SendMessages] },
        { id: modRole.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel] },
      ]);
      console.log(`✓ Set #${config.welcomeChannel} permissions`);

      await welcome.send(
        `**Welcome to ${guild.name}!** 👋\n\nPlease read the rules below and react with 👍 to gain access to the server.`
      );
      console.log(`✓ Sent welcome message to #${config.welcomeChannel}`);

      const trustedRole = guild.roles.cache.find((r) => r.name === config.trustedRole);
      const chatChannel = await ensureChannel(guild, config.chatChannel);
      await chatChannel.permissionOverwrites.set([
        { id: everyoneRole.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
        { id: trustedRole.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel] },
        { id: modRole.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel] },
      ]);
      console.log(`✓ Set #${config.chatChannel} permissions`);

      const modChannel = await ensureChannel(guild, config.moderatorChannel);
      await modChannel.permissionOverwrites.set([
        { id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: modRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ]);
      console.log(`✓ Set #${config.moderatorChannel} permissions`);

      await ensureChannel(guild, config.ticketChannel);

      console.log('\n✓ Server setup complete!\n');
      process.exit(0);
    } catch (error) {
      console.error('Setup error:', error.message || error);
      process.exit(1);
    }
  });

  client.login(token);
}

setupServer();
