const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */

  callback: async (client, interaction) => {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members
      .fetch(user.id)
      .catch(console.error);
    const issuer = interaction.member; // `member` is the guild member who executed the command

    if (!member) {
      await interaction.reply({
        content: "This user doesn't exist in the server.",
        ephemeral: true,
      });
      return;
    }

    if (member.id === interaction.guild.ownerId) {
      await interaction.reply("You can't warn Dario silly.");
      return;
    }

    // 1130293554279886908 - Creator Id || 1062828085256400896 - Admin
    // Array of Blacklisted Role IDs
    const protectedRoleIds = ['1130293554279886908', '1062828085256400896',];
    // Check if the member has any of the protected roles
    if (protectedRoleIds.some(roleId => member.roles.cache.has(roleId))) {
      await interaction.reply({
        content: 'This user is protected from being warned, L!',
      });
      return;
    }
    
    // Array of possible default reasons
    const defaultReasons = [
      'Your activities have been noted and require moderation.',
      'Imagine being warned, L!',
      'Youre a silly goose, oink!',
      'Simping for TrainerDario',
      'EliasTheThird is my favourite! 🖤',
      'Being a nerd! 🤓',
      'Being a skill issue!',
      'LMAO IMAGINE 🤣'
    ];

    // Selecting a random reason if none is provided
    const reason = interaction.options.getString('reason') || defaultReasons[Math.floor(Math.random() * defaultReasons.length)];

    /*
    const reason =
      interaction.options.getString('reason') ||
      'Your activities have been noted and require moderation.';
    */

    const embed = new EmbedBuilder()
      .setTitle('Warning Notice')
      .setColor('Random')
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        {
          name: 'Username',
          value: user.username,
          inline: true,
        },
        {
          name: 'User ID',
          value: user.id,
          inline: true,
        },
        {
          name: 'Note',
          value: reason,
          inline: false,
        }
      );

    await interaction.reply({
      content: `📢 Hey, <@${user.id}>, you have been warned! 🤡`,
      embeds: [embed],
      allowedMentions: { parse: ['users'] },
    });
  },

  name: 'warn',
  description: 'Warn another user!!!',
  options: [
    {
      name: 'user',
      description: 'Select a user',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'reason',
      description: 'Reason for warning the user',
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  // permissionsRequired: [PermissionFlagsBits.Administrator],
  // botPermissions: [PermissionFlagsBits.Administrator],
};
