const { ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');

module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */

  callback: async (client, interaction) => {
    const message = interaction.options.getString('message');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    // Send the message to the specified channel
    await channel.send(message);

    // Send acknowledgment back to the interaction
    await interaction.reply({
        content: 'Message sent!',
        ephemeral: true,
        });
  },

  name: 'speak',
  description: 'Make the bot speak in a channel',
  devOnly: true,
  permissionsRequired: [PermissionFlagsBits.Administrator],
  options: [
    {
      name: 'message',
      description: 'Message to be spoken',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'channel',
      description: 'Channel to speak in (optional)',
      type: ApplicationCommandOptionType.Channel,
      required: false,
    },
  ],
};
