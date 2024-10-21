const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {

    if (interaction.isButton() && interaction.customId === 'unban_request') {
      const modal = new ModalBuilder()
        .setCustomId('unban_modal')
        .setTitle('Unban Request Form');

      const question1 = new TextInputBuilder()
        .setCustomId('why_banned')
        .setLabel('Why were you banned?')
        .setPlaceholder('I was banned for <ban reason>')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const question2 = new TextInputBuilder()
        .setCustomId('how_long')
        .setLabel('How Long ago were you banned?')
        .setPlaceholder('<insert days/weeks ago>')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const question3 = new TextInputBuilder()
        .setCustomId('why_unbanned')
        .setLabel('Why would you like to be unbanned?')
        .setPlaceholder('Please be concise and respectful with your response')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const question4 = new TextInputBuilder()
        .setCustomId('anything_else')
        .setLabel('Anything else?')
        .setPlaceholder('If there is nothing else, you may ignore this')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      // Create action rows for the modal
      const actionRow1 = new ActionRowBuilder().addComponents(question1);
      const actionRow2 = new ActionRowBuilder().addComponents(question2);
      const actionRow3 = new ActionRowBuilder().addComponents(question3);
      const actionRow4 = new ActionRowBuilder().addComponents(question4);

      // Attach inputs to modal
      modal.addComponents(actionRow1, actionRow2, actionRow3, actionRow4);

      await interaction.showModal(modal);
    }
  });
};
