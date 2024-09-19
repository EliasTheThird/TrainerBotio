const { testServers } = require('../../../config.json');
const areCommandsDifferent = require('../../utils/areCommandsDifferent');
const getApplicationCommands = require('../../utils/getApplicationCommands');
const getLocalCommands = require('../../utils/getLocalCommands');

module.exports = async (client) => {
  try {
    const localCommands = getLocalCommands();

    for (const serverId of testServers) { 
      const guild = client.guilds.cache.get(serverId); // Get the server (guild) details
      const guildName = guild ? guild.name : 'Unknown Server'; // Handle cases where guild might not be found
      const applicationCommands = await getApplicationCommands(client, serverId);

      for (const localCommand of localCommands) {
        const { name, description, options } = localCommand;

        const existingCommand = await applicationCommands.cache.find(
          (cmd) => cmd.name === name
        );

        if (existingCommand) {
          if (localCommand.deleted) {
            await applicationCommands.delete(existingCommand.id);
            console.log(`🗑 Deleted command "${name}" in server ${guildName} ID: ${serverId}.`);
            continue;
          }

          if (areCommandsDifferent(existingCommand, localCommand)) {
            await applicationCommands.edit(existingCommand.id, {
              description,
              options,
            });

            console.log(`🔁 Edited command "${name}" in server ${guildName} ID: ${serverId}.`);
          }
        } else {
          if (localCommand.deleted) {
            console.log(
              `⏩ Skipping registering command "${name}" as it's set to delete in server ${guildName} ID: ${serverId}.`
            );
            continue;
          }

          await applicationCommands.create({
            name,
            description,
            options,
          });

          console.log(`👍 Registered command "${name}" in server ${guildName} ID: ${serverId}.`);
        }
      }
    }
  } catch (error) {
    console.log(`There was an error: ${error}`);
  }
};
