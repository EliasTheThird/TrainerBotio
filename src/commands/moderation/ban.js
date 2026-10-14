const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  Client,
  Interaction,
  EmbedBuilder
} = require('discord.js');

// Cooldown map (same as /warn)
const cooldowns = new Map();

const fakeBanReasons = [
  "Posting cringe in general chat.",
  "Declared war on TrainerDario without authorization.",
  "Was too powerful for this realm.",
  "Committed crimes against the server",
  "Forgot to feed their PokÃ©mon. Unacceptable.",
  "Banned themselves in spirit.",
  "Forgot to enter a reason lol.",
  "Ban failed because the target has plot armor."
];

module.exports = {
  /**
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    try {
      const userId = interaction.user.id;
      const bypassUserId = '742766266699481089';
      const now = Date.now();
      const cooldownAmount = 30 * 60 * 1000; // 30 min

      // Cooldown check first
      if (userId !== bypassUserId) {
        if (cooldowns.has(userId)) {
          const expirationTime = cooldowns.get(userId) + cooldownAmount;
          if (now < expirationTime) {
            const timeLeft = Math.round((expirationTime - now) / 1000);
            await interaction.reply({
              content: `Please wait ${timeLeft} more seconds before using this command again.`,
              ephemeral: true,
            });
            return;
          }
        }
        cooldowns.set(userId, now);
        setTimeout(() => cooldowns.delete(userId), cooldownAmount);
      }

      const targetUserId = interaction.options.get('target-user').value;
      const customReason = interaction.options.get('reason')?.value;
      const randomReason = fakeBanReasons[Math.floor(Math.random() * fakeBanReasons.length)];
      const reason = customReason || randomReason;

      const targetUser = await interaction.guild.members
        .fetch(targetUserId)
        .catch(() => null);

      if (!targetUser) {
        await interaction.reply("That user doesn't exist in this server.");
        return;
      }

      if (targetUser.id === interaction.guild.ownerId) {
        await interaction.reply("You can't ban Dario silly.");
        return;
      }

      const targetUserRolePosition = targetUser.roles.highest.position;
      const requestUserRolePosition = interaction.member.roles.highest.position;
      const botRolePosition = interaction.guild.members.me.roles.highest.position;

      
      // Check if the target has the "too powerful" role
      const tooPowerfulRoleId = '1130293554279886908';

      if (targetUser.roles.cache.has(tooPowerfulRoleId)) {
        await interaction.reply(
          "I can't ban that user, they're too powerful..."
        );
        return;
      }

      // Embed
      const embed = new EmbedBuilder()
        .setTitle('User Banned')
        .setDescription(`**User:** ${targetUser}\n**Reason:** ${reason}`)
        .setColor(0xff0000)
        .setThumbnail(targetUser.displayAvatarURL())
        .setFooter({ text: 'This is a fake ban.' })
        .setTimestamp();

      // Ping target + show embed
      await interaction.reply({
        content: `Hey, <@${targetUser.id}>, you have been BANNED! 🔨`,
        embeds: [embed],
        allowedMentions: { parse: ['users'] },
      });
    } catch (err) {
      console.error("Error in /ban command:", err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("Something went wrong while running this command.");
      } else {
        await interaction.reply({
          content: "Something went wrong while running this command.",
          ephemeral: true,
        });
      }
    }
  },

  name: 'ban',
  description: 'Fake bans a member for fun.',
  options: [
    {
      name: 'target-user',
      description: 'The user you want to fake ban.',
      required: true,
      type: ApplicationCommandOptionType.Mentionable,
    },
    {
      name: 'reason',
      description: 'Custom fake reason (optional).',
      type: ApplicationCommandOptionType.String,
    },
  ],
  // permissionsRequired: [PermissionFlagsBits.BanMembers],
  // botPermissions: [PermissionFlagsBits.BanMembers],
};
