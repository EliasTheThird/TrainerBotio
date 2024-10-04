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
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const question2 = new TextInputBuilder()
        .setCustomId('why_unbanned')
        .setLabel('Why would you like to be unbanned?')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const question3 = new TextInputBuilder()
        .setCustomId('anything_else')
        .setLabel('Anything else?')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      // Create action rows for the modal
      const actionRow1 = new ActionRowBuilder().addComponents(question1);
      const actionRow2 = new ActionRowBuilder().addComponents(question2);
      const actionRow3 = new ActionRowBuilder().addComponents(question3);

      // Attach inputs to modal
      modal.addComponents(actionRow1, actionRow2, actionRow3);

      await interaction.showModal(modal);
    }
  });
};
