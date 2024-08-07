const { Client, IntentsBitField } = require('discord.js');
const setStatus = require('../../database/status-database');

module.exports = (client) => {
  console.log(`${client.user.tag} is online.`);
  setStatus(client);
};
