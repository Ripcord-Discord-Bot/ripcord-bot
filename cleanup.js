// Load environment variables from .env file
import 'dotenv/config.js';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';

// Verify bot token is available
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

// Main cleanup function
async function cleanupServer() {
  // Create Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
    ],
  });

  // Execute cleanup when bot is ready
  client.on('clientReady', async () => {
    try {
      // Get the first (and usually only) server the bot is in
      const guild = client.guilds.cache.first();
      if (!guild) {
        console.error('No guild found. Make sure the bot is in a server.');
        process.exit(1);
      }

      console.log(`\nCleaning up server: ${guild.name}`);

      // Get all text channels
      const textChannels = guild.channels.cache.filter((ch) => ch.type === ChannelType.GuildText);

      // Delete all messages from all channels
      for (const [, channel] of textChannels) {
        try {
          // Fetch and delete messages in batches of 100 until empty
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
        if (channel.name !== 'welcome') {
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
      process.exit(0);
    } catch (error) {
      console.error('Cleanup error:', error.message || error);
      process.exit(1);
    }
  });

  // Connect to Discord and execute cleanup
  client.login(token);
}

// Run the cleanup script
cleanupServer();
