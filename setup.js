import 'dotenv/config.js';
import { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } from 'discord.js';

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

const CHANNELS = {
  welcome: 'welcome',
  chat: 'chat',
  issues: 'issues',
  moderators: 'moderators',
};

async function setupServer() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
    ],
  });

  client.on('clientReady', async () => {
    try {
      const guild = client.guilds.cache.first();
      if (!guild) {
        console.error('No guild found. Make sure the bot is in a server.');
        process.exit(1);
      }

      console.log(`\nSetting up server: ${guild.name}`);

      // Get or create moderator role
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

      // Get @everyone role
      const everyoneRole = guild.roles.everyone;

      // Setup channels
      for (const [key, channelName] of Object.entries(CHANNELS)) {
        let channel = guild.channels.cache.find((ch) => ch.name === channelName && ch.type === ChannelType.GuildText);

        if (!channel) {
          channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            reason: 'Setup script - create channel',
          });
          console.log(`✓ Created #${channelName} channel`);
        } else {
          console.log(`✓ #${channelName} channel already exists`);
        }

        // Configure permissions
        if (key === 'welcome') {
          // Only moderators can send messages
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
          // Only moderators can see and post
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

      // Post welcome message to welcome channel
      const welcomeChannel = guild.channels.cache.find((ch) => ch.name === CHANNELS.welcome);
      if (welcomeChannel) {
        const existingMessages = await welcomeChannel.messages.fetch({ limit: 10 });
        const hasWelcomeMessage = existingMessages.some((msg) => msg.author.id === client.user.id && msg.content.includes('Welcome'));

        if (!hasWelcomeMessage) {
          await welcomeChannel.send('**Welcome!** 👋\n\nWelcome to our Discord server! We\'re glad to have you here.');
          console.log('✓ Posted welcome message');
        } else {
          console.log('✓ Welcome message already posted');
        }

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

  client.login(token);
}

setupServer();
