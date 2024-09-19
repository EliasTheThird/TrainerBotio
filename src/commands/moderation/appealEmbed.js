const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  PermissionsBitField,
} = require('discord.js');

module.exports = {
  name: 'unban-request',
  description: 'Creates an unban request button',
  callback: async (client, interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      await interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true,
      });
      return;
    }

    // Create the button
    const button = new ButtonBuilder()
      .setCustomId('unban_request')
      .setLabel('Request Unban')
      .setStyle(ButtonStyle.Primary);

    // Create an embed
    const embed = new EmbedBuilder()
      .setTitle('Unban Request')
      .setDescription('Click the button below to request to be unbanned.')
      .setColor('e67e22');

    // Send the embed with the button
    await interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(button)],
    });
  },
};
