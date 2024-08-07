const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  Client,
  Interaction,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */

  callback: async (client, interaction) => {
    const targetUserId = interaction.options.get('target-user').value;
    const reason =
      interaction.options.get('reason')?.value ||
      `${interaction.user} forgot to enter a reason lol.`;

    await interaction.deferReply();

    const targetUser = await interaction.guild.members.fetch(targetUserId);

    if (!targetUser) {
      await interaction.editReply("That user doesn't exist in this server.");
      return;
    }

    if (targetUser.id === interaction.guild.ownerId) {
      await interaction.editReply("You can't ban Dario silly.");
      return;
    }

    const targetUserRolePosition = targetUser.roles.highest.position; // Highest role of the target user
    const requestUserRolePosition = interaction.member.roles.highest.position; // Highest role of the user running the cmd
    const botRolePosition = interaction.guild.members.me.roles.highest.position; // Highest role of the bot

    /*
    if (targetUserRolePosition > requestUserRolePosition) {
      await interaction.editReply(
        "You can't ban that person."
      );
      return;
    }
    */

    if (targetUserRolePosition >= botRolePosition) {
      await interaction.editReply(
        "I can't ban that user, they're too powerful..."
      );
      return;
    }

    // Prepare the embed
    const embed = new EmbedBuilder()
      .setTitle('User NOT Banned')
      .setDescription(`**User**: ${targetUser}\n**Reason**: ${reason}`)
      .setColor(0xFF0000)
      .setThumbnail(targetUser.displayAvatarURL())
      .setTimestamp();

    // Reply with the embed
    await interaction.editReply({
      content: `L ${interaction.user} thought they could ban someone... Skill Issue!`,
      embeds: [embed],
    });
  },

  //deleted: true,
  name: 'ban',
  description: 'Bans a member!!!',
  // devOnly: true,
  // testOnly: true,
  options: [
    {
      name: 'target-user',
      description: 'The user you want to ban.',
      required: true,
      type: ApplicationCommandOptionType.Mentionable,
    },
    {
      name: 'reason',
      description: 'The reason for banning.',
      type: ApplicationCommandOptionType.String,
    },
  ],
  // permissionsRequired: [PermissionFlagsBits.BanMembers],
  // botPermissions: [PermissionFlagsBits.BanMembers],
};
