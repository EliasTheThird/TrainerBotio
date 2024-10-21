const { Client, IntentsBitField } = require('discord.js');
const setStatus = require('../../database/status-database');

// Define timezone and date formatting options
const options = {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true, // 12-hour format
};

const logChannelId = '1291931717271031859'; // TDG: 1291931717271031859 || Testing: 1160015142101192764

module.exports = (client) => {
  console.log(`${client.user.tag} is online.`);
  setStatus(client);

  // Handle interactionCreate event
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // Get the time in EST
    const now = new Date();
    const formattedTime = new Intl.DateTimeFormat('en-US', options).format(now);

    // Get the username and user ID
    const username = interaction.user.tag;
    const userID = interaction.user.id;

    // Get the main command and subcommand (if any)
    const commandName = interaction.commandName;
    const subcommand = interaction.options.getSubcommand(false); // Will return null if there's no subcommand

    // Log command, subcommand, and options (fields)
    let commandLog = `[${formattedTime}] **${commandName}** ${subcommand ? ` ${subcommand}` : ''} run by **${username}** ID:${userID}`;

    // Get all fields (options) if any
    const optionsData = interaction.options.data;
    if (optionsData.length > 0) {
      const fields = optionsData.map(option => `${option.name}: ${option.value}`).join(', ');
      commandLog += ` with fields **{${fields}}**`;
    }

    // Fetch the log channel
    const logChannel = client.channels.cache.get(logChannelId);
    if (logChannel) {
      try {
        // Send the log message to the specified channel
        await logChannel.send(commandLog);
      } catch (error) {
        console.error(`Could not send log to channel: ${error}`);
      }
    } else {
      console.error('Log channel not found.');
    }
  });
};
