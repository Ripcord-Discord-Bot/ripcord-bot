// Guild cleanup script — deletes messages, channels, roles, and categories from a Discord server

import 'dotenv/config.js';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import { fileURLToPath } from 'url';
import * as config from './config.js';

// Verify bot token is available
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

// Core cleanup logic — accepts a guild object so it can be reused by setup.js
export async function cleanupGuild(guild) {
  console.log(`\nCleaning up server: ${guild.name}`);

  const textChannels = guild.channels.cache.filter((ch) => ch.type === ChannelType.GuildText);

  // Delete all messages from all channels
  for (const [, channel] of textChannels) {
    try {
      let fetched;
      while ((fetched = await channel.messages.fetch({ limit: 100 })).size > 0) {
        await Promise.all(fetched.map((msg) => msg.delete()));
      }
      console.log(`✓ Deleted all messages from #${channel.name}`);
    } catch (error) {
      console.error(`✗ Error deleting messages from #${channel.name}: ${error.message}`);
    }
  }

  // Delete all text channels except the welcome channel
  for (const [, channel] of textChannels) {
    if (channel.name !== config.welcomeChannel) {
      try {
        await channel.delete();
        console.log(`✓ Deleted #${channel.name} channel`);
      } catch (error) {
        console.error(`✗ Error deleting #${channel.name}: ${error.message}`);
      }
    }
  }

  // Delete all voice channels
  const voiceChannels = guild.channels.cache.filter((ch) => ch.type === ChannelType.GuildVoice);
  for (const [, channel] of voiceChannels) {
    try {
      await channel.delete();
      console.log(`✓ Deleted 🔊 ${channel.name} voice channel`);
    } catch (error) {
      console.error(`✗ Error deleting 🔊 ${channel.name}: ${error.message}`);
    }
  }

  console.log('\n✓ Cleanup complete!\n');
}

// Main cleanup function — standalone runner
async function cleanupServer() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
    ],
  });

  client.once('clientReady', async () => {
    try {
      const guild = client.guilds.cache.first();
      if (!guild) {
        console.error('No guild found. Make sure the bot is in a server.');
        process.exit(1);
      }
      await cleanupGuild(guild);
      process.exit(0);
    } catch (error) {
      console.error('Cleanup error:', error.message || error);
      process.exit(1);
    }
  });

  client.login(token);
}

// Only run as standalone script, not when imported as a module
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cleanupServer();
}
