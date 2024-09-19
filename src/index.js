require('dotenv').config();
const {
  Client,
  IntentsBitField,
} = require('discord.js');

const eventHandler = require('./handlers/eventHandler.js');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMessageReactions,
  ],
});

eventHandler(client);

const guildIds = process.env.GUILD_ID.split(',');

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  guildIds.forEach((guildId) => {
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
      console.log(`Bot is active in guild: ${guild.name}`);
    } else {
      console.log(`Bot is not a member of guild ID: ${guildId}`);
    }
  });
});

client.login(process.env.TOKEN);
