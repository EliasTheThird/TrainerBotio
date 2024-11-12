const { ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');

module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    const emoji = interaction.options.getString('emoji');
    const messageId = interaction.options.getString('message_id');
    const channel = interaction.channel;

    // Respond to interaction first to avoid timeout
    await interaction.reply({
      content: 'Processing your reaction...',
      ephemeral: true,
    });

    try {
      // Fetch the target message from the current channel
      const targetMessage = await channel.messages.fetch(messageId);

      // React to the message with the specified emoji
      await targetMessage.react(emoji);

      await interaction.followUp({
        content: `Successfully added ${emoji} reaction to the message!`,
        ephemeral: true,
      });
    } catch (error) {
      if (error.code === 10008) {
        // Invalid message ID
        console.warn('Unknown message ID provided, cannot fetch the message.');
        await interaction.followUp({
          content: 'The specified message ID does not exist. Please provide a valid message ID.',
          ephemeral: true,
        });
      } else if (error.code === 10014) {
        // Invalid emoji
        console.warn('Invalid emoji provided, cannot add reaction.');
        await interaction.followUp({
          content: 'The specified emoji is invalid. Please provide a valid emoji.',
          ephemeral: true,
        });
      } else {
        console.error('Error adding reaction:', error);
        await interaction.followUp({
          content: 'An error occurred while trying to add the reaction. Please try again later.',
          ephemeral: true,
        });
      }
    }
  },

  name: 'react',
  description: 'React to a message with a specified emoji',
  permissionsRequired: [PermissionFlagsBits.Administrator],
  options: [
    {
      name: 'emoji',
      description: 'The emoji to react with',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'message_id',
      description: 'The ID of the message to react to',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
};
