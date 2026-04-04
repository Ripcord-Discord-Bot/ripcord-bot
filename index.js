require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (ready) => {
  console.log(`Logged in as ${ready.user.tag}`);
});

client.login(token).catch((error) => {
  console.error('Login failed:', error);
  process.exit(1);
});
