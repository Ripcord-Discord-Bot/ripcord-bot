// Load environment variables from .env file
import 'dotenv/config.js';
import { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } from 'discord.js';

// Verify bot token is available
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

// Define the channels to be created during server setup
const CHANNELS = {
  welcome: 'welcome',
  chat: 'chat',
  issues: 'issues',
  moderators: 'moderators',
};

// Main setup function
async function setupServer() {
  // Create Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
    ],
  });

  // Execute setup when bot is ready
  client.on('clientReady', async () => {
    try {
      // Get the first (and usually only) server the bot is in
      const guild = client.guilds.cache.first();
      if (!guild) {
        console.error('No guild found. Make sure the bot is in a server.');
        process.exit(1);
      }

      console.log(`\nSetting up server: ${guild.name}`);

      // Get or create the Moderator role
      let moderatorRole = guild.roles.cache.find((role) => role.name === 'Moderator');
      if (!moderatorRole) {
        moderatorRole = await guild.roles.create({
          name: 'Moderator',
          reason: 'Setup script - moderator role',
        });
        console.log('✓ Created Moderator role');
      } else {
        console.log('✓ Moderator role already exists');
      }

      // Get the @everyone role for permission configuration
      const everyoneRole = guild.roles.everyone;

      // Create or verify all required channels
      for (const [key, channelName] of Object.entries(CHANNELS)) {
        // Check if channel already exists
        let channel = guild.channels.cache.find((ch) => ch.name === channelName && ch.type === ChannelType.GuildText);

        if (!channel) {
          // Create channel if it doesn't exist
          channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            reason: 'Setup script - create channel',
          });
          console.log(`✓ Created #${channelName} channel`);
        } else {
          console.log(`✓ #${channelName} channel already exists`);
        }

        // Configure channel-specific permissions
        if (key === 'welcome') {
          // Welcome channel: everyone can view but only moderators can post
          await channel.permissionOverwrites.set([
            {
              id: everyoneRole.id,
              deny: [PermissionFlagsBits.SendMessages],
            },
            {
              id: moderatorRole.id,
              allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel],
            },
          ]);
          console.log(`✓ Set #${channelName} permissions (only moderators can post)`);
        } else if (key === 'moderators') {
          // Moderators channel: only moderators can view and post
          await channel.permissionOverwrites.set([
            {
              id: everyoneRole.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: moderatorRole.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
          ]);
          console.log(`✓ Set #${channelName} permissions (only moderators can see and post)`);
        }
      }

      // Post welcome and rules messages to the welcome channel
      const welcomeChannel = guild.channels.cache.find((ch) => ch.name === CHANNELS.welcome);
      if (welcomeChannel) {
        // Fetch recent messages to check if setup messages already exist
        const existingMessages = await welcomeChannel.messages.fetch({ limit: 10 });

        // Check for and post welcome message
        const hasWelcomeMessage = existingMessages.some((msg) => msg.author.id === client.user.id && msg.content.includes('Welcome'));

        if (!hasWelcomeMessage) {
          await welcomeChannel.send('**Welcome!** 👋\n\nWelcome to our Discord server! We\'re glad to have you here.');
          console.log('✓ Posted welcome message');
        } else {
          console.log('✓ Welcome message already posted');
        }

        // Check for and post server rules message
        const hasRulesMessage = existingMessages.some((msg) => msg.author.id === client.user.id && msg.content.includes('Server Rules'));

        if (!hasRulesMessage) {
          await welcomeChannel.send(
            '**Server Rules** 📋\n\n' +
              '1. Be respectful to all members\n' +
              '2. No spam or advertising\n' +
              '3. Keep conversations appropriate\n' +
              '4. Follow all Discord Terms of Service\n\n' +
              'Thank you for following these rules!'
          );
          console.log('✓ Posted server rules message');
        } else {
          console.log('✓ Server rules message already posted');
        }
      }

      console.log('\n✓ Server setup complete!\n');
      process.exit(0);
    } catch (error) {
      console.error('Setup error:', error.message || error);
      process.exit(1);
    }
  });

  // Connect to Discord and execute setup
  client.login(token);
}

// Run the setup script
setupServer();
