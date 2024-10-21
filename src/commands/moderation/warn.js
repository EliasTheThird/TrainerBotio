const {
  ApplicationCommandOptionType,
  EmbedBuilder,
} = require('discord.js');

// Create a cooldown map to track user cooldowns
const cooldowns = new Map();

module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
      const userId = interaction.user.id;
      const bypassUserId = '742766266699481089'; // User ID to bypass cooldown
      const now = Date.now();
      const cooldownAmount = 30 * 60 * 1000; // 30 minutes in milliseconds

      // Check for cooldown and bypass for specific user ID
      if (userId !== bypassUserId) {
          // Check if user is in cooldown map
          if (cooldowns.has(userId)) {
              const expirationTime = cooldowns.get(userId) + cooldownAmount;
              if (now < expirationTime) {
                  const timeLeft = Math.round((expirationTime - now) / 1000);
                  await interaction.reply({ content: `Please wait ${timeLeft} more seconds before using this command again.`, ephemeral: true });
                  return;
              }
          }
          // Set the cooldown for the user
          cooldowns.set(userId, now);
      }

      const user = interaction.options.getUser('user');
      const member = await interaction.guild.members.fetch(user.id).catch(console.error);
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

      // Array of Blacklisted Role IDs
      const protectedRoleIds = ['1130293554279886908', '1062828085256400896'];

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
