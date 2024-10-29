const { ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');

module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */

  callback: async (client, interaction) => {
    const message = interaction.options.getString('message');
    const specifiedChannel = interaction.options.getChannel('channel');
    const channel = specifiedChannel || interaction.channel;

    // Respond to interaction first to avoid timeout
    await interaction.reply({
      content: 'Processing your request...',
      ephemeral: true,
    });

    // Try to find the message to respond to
    const targetMessageId = interaction.options.getString('target_message');
    let targetMessage = null;

    if (targetMessageId) {
      try {
        // Fetch the target message from the specified channel
        targetMessage = await channel.messages.fetch(targetMessageId);
      } catch (error) {
        // Check if the error is due to unknown message
        if (error.code === 10008) {
          // Log a simplified message instead of the full error
          console.warn('Unknown message ID provided, cannot fetch the message.');

          await interaction.followUp({
            content: 'The specified message ID does not exist. Please provide a valid message ID.',
            ephemeral: true,
          });
        } else {
          // Log the error details for any other errors
          console.error('Error fetching the target message:', error);

          await interaction.followUp({
            content: 'An error occurred while trying to fetch the message. Please try again later.',
            ephemeral: true,
          });
        }
        return; // Exit to prevent further actions
      }
    }

    // If a target message was found, reply to it
    if (targetMessage) {
      try {
        await targetMessage.reply(message);
        // Send a follow-up after replying to the target message
        await interaction.followUp({
          content: 'Replied to the target message!',
          ephemeral: true,
        });
      } catch (error) {
        console.error('Error replying to the target message:', error);
      }
    } else {
      // If no target message was found or specified, send the message to the channel
      try {
        await channel.send(message);
        // Send a follow-up after sending the message to the channel
        await interaction.followUp({
          content: 'Message sent in the channel!',
          ephemeral: true,
        });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  },

  name: 'speak',
  description: 'Make the bot speak in a channel or respond to a message',
  devOnly: true,
  permissionsRequired: [PermissionFlagsBits.Administrator],
  options: [
    {
      name: 'message',
      description: 'Message to be spoken or replied to',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'channel',
      description: 'Channel to speak in (optional)',
      type: ApplicationCommandOptionType.Channel,
      required: false,
    },
    {
      name: 'target_message',
      description: 'Message ID to respond to (optional)',
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
};
