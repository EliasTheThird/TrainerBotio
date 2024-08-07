const {
    ApplicationCommandOptionType,
    Client,
    Interaction,
  } = require('discord.js');
  
  module.exports = {
    /**
     *
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
      if (!client.cooldowns) {
        client.cooldowns = new Map();
      }
  
      let description = interaction.options.getString('description');
  
      // Remove mentions from the description
      description = description.replace(/<@!?(\d+)>/g, `Don't try and bypass smh`).replace(/<@&(\d+)>/g, `Don't try and bypass smh`);
  
      // const cooldownKey = `${interaction.user.id}-revive`; // per person cooldown
      const cooldownKey = 'global-revive-cooldown'; // global cooldown
      const cooldown = 30 * 60 * 1000; // 30 minutes in milliseconds
  
      if (client.cooldowns.has(cooldownKey) && Date.now() - client.cooldowns.get(cooldownKey) < cooldown) {
        await interaction.reply({
          content: 'This command is on cooldown. Please wait.',
          ephemeral: true,
        });
        return;
      }
  
      client.cooldowns.set(cooldownKey, Date.now());
  
      const roleId = '1232810899484704890';
      const messageContent = `<@&${roleId}> - ${description}`;
  
      await interaction.reply({ content: messageContent, allowedMentions: { parse: ['roles'] } });
    },
    name: 'revive',
    description: 'Ping the Revive Chat role!',
    devOnly: false,
    options: [
      {
        name: 'description',
        description: 'Description of the revive.',
        required: true,
        type: ApplicationCommandOptionType.String,
      },
    ],
    permissionsRequired: [],
    botPermissions: [],
  };
  