const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'appeal-embed',
  description: 'Posts the appeal form embed.',
  callback: async (client, interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      await interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true,
      });
      return;
    }

    // Create the button
    const button = new ButtonBuilder().setCustomId('unban_request').setLabel('Request Unban').setStyle(ButtonStyle.Primary);

    // Create an embed
    const embed = new EmbedBuilder()
      .setTitle('TDG Appeal Form')
      .setDescription(
        '> By continuing, you agree to the rules of this server and the main server.\n\nWelcome to the appeal form for TrainerDario Gaming.\n\nThere must be a good reason as to why your appeal should be approved. Simply apologizing will not do. If you misuse this form then you will be blacklisted.\n\nTo appeal, press the **Request Unban** button below.'
      )
      .setFooter({ text: 'Good Luck! | If your appeal is denied, you may dispute it.' })
      .setColor('e67e22');

    // Send the embed with the button to the same channel
    await interaction.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(button)],
    });

    // Send an ephemeral message confirming the embed was posted
    await interaction.reply({
      content: 'Embed posted successfully.',
      ephemeral: true,
    });
  },
  //deleted: true,
};
