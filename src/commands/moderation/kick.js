const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  Client,
  Interaction,
  EmbedBuilder,
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
      'User forgot to enter a reason lol.';

    await interaction.deferReply();

    const targetUser = await interaction.guild.members.fetch(targetUserId);

    if (!targetUser) {
      await interaction.editReply("That user doesn't exist in this server.");
      return;
    }

    if (targetUser.id === interaction.guild.ownerId) {
      await interaction.editReply("You can't kick Dario silly.");
      return;
    }

    const targetUserRolePosition = targetUser.roles.highest.position; // Highest role of the target user
    const requestUserRolePosition = interaction.member.roles.highest.position; // Highest role of the user running the cmd
    const botRolePosition = interaction.guild.members.me.roles.highest.position; // Highest role of the bot

    if (targetUserRolePosition >= requestUserRolePosition) {
      await interaction.editReply("You can't kick that person.");
      return;
    }

    if (targetUserRolePosition >= botRolePosition) {
      await interaction.editReply(
        "I can't kick that user, they are too powerful..."
      );
      return;
    }

    // Prepare the embed
    const embed = new EmbedBuilder()
      .setTitle('User NOT Kicked')
      .setDescription(`**User**: ${targetUser}\n**Reason**: ${reason}`)
      .setColor(0xff0000)
      .setThumbnail(targetUser.displayAvatarURL())
      .setTimestamp();

    // Reply with the embed
    await interaction.editReply({
      embeds: [embed],
    });
    // Reply with Skill Issue
    await interaction.followUp({
      content: `L ${interaction.user} thought you could kick someone... Skill Issue!`,
    });
  },

  deleted: true,
  name: 'kick',
  description: 'Kicks a member!!!',
  // devOnly: true,
  //testOnly: true,
  options: [
    {
      name: 'target-user',
      description: 'The user you want to kick.',
      required: true,
      type: ApplicationCommandOptionType.Mentionable,
    },
    {
      name: 'reason',
      description: 'The reason you want to kick.',
      type: ApplicationCommandOptionType.String,
    },
  ],
  permissionsRequired: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
};
