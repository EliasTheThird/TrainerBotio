const {
  ApplicationCommandOptionType,
  Client,
  Interaction,
} = require('discord.js');

module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    if (!client.cooldowns) {
      client.cooldowns = new Map();
    }

    // --- ROLE BLOCK CHECK ---
    const blockedRoleId = '1442589623111913604';
    const member = interaction.member;

    if (member.roles.cache.has(blockedRoleId)) {
      return interaction.reply({
        content: "You are not allowed to use this command.",
        ephemeral: true,
      });
    }
    // -------------------------

    let message = interaction.options.getString('message');

    // Remove mentions from message (no bypassing)
    message = message
      .replace(/<@!?(\d+)>/g, `Don't try and bypass smh`)
      .replace(/<@&(\d+)>/g, `Don't try and bypass smh`);

    // Per-user cooldown key
    const cooldownKey = `${interaction.user.id}-pingtrainer`;
    const cooldown = 60 * 60 * 1000; // 1 hour

    if (
      client.cooldowns.has(cooldownKey) &&
      Date.now() - client.cooldowns.get(cooldownKey) < cooldown
    ) {
      await interaction.reply({
        content: 'This command is on cooldown. Please wait.',
        ephemeral: true,
      });
      return;
    }

    // Set cooldown
    client.cooldowns.set(cooldownKey, Date.now());

    // TrainerDario ID
    const trainerId = '193169855007031296';

    // Pings
    const trainerPing = `<@${trainerId}>`;
    const userPing = `<@${interaction.user.id}>`;

    // Final message
    const messageContent = `${trainerPing}, you have a new message from ${userPing}:\n${message}`;

    await interaction.reply({
      content: messageContent,
      allowedMentions: { parse: ['users'] },
    });
  },

  name: 'pingtrainer',
  description: 'Sends your message along with a ping to TrainerDario.',
  devOnly: false,
  options: [
    {
      name: 'message',
      description: 'The message you want to send to TrainerDario.',
      required: true,
      type: ApplicationCommandOptionType.String,
    },
  ],
  permissionsRequired: [],
  botPermissions: [],
};