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

client.login(process.env.TOKEN);