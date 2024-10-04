// statusUpdate.js
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  //deleted: true,
  name: 'trivia-toggle',
  description: 'Post an embed that can toggle trivia.',


  callback: async (client, interaction) => {

    // Creates buttons
    const checkButton = new ButtonBuilder()
      .setCustomId('trivia_start')
      .setLabel('Start Trivia')
      .setStyle(ButtonStyle.Success);

    const crossButton = new ButtonBuilder()
      .setCustomId('trivia_stop')
      .setLabel('Stop Trivia')
      .setStyle(ButtonStyle.Danger);

    // Creates embed
    const embed = new EmbedBuilder()
      .setTitle('Trivia Toggle')
      .setDescription('Press the buttons below to control the Trivia status!')
      .setColor('#e67e22');

    // Send the embed with buttons
    await interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(checkButton, crossButton)],
    });
  },
};
