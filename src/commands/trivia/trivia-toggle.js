// statusUpdate.js
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  name: 'status-update',
  description: 'Creates a status update embed with buttons.',
  callback: async (client, interaction) => {
    // Create the buttons
    const checkButton = new ButtonBuilder()
      .setCustomId('status_check')
      .setLabel('Start Posting')
      .setStyle(ButtonStyle.Success);

    const crossButton = new ButtonBuilder()
      .setCustomId('status_cross')
      .setLabel('Stop Posting')
      .setStyle(ButtonStyle.Danger);

    // Create an embed
    const embed = new EmbedBuilder()
      .setTitle('Status Update')
      .setDescription('Press the buttons below to control status updates.')
      .setColor('#0000FF');

    // Send the embed with buttons
    await interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(checkButton, crossButton)],
    });
  },
};
