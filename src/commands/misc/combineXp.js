const { ApplicationCommandOptionType } = require('discord.js');

module.exports = {
  name: 'combinexp',
  description: 'Combine all XP entries starting from the given message ID.',
  options: [
    {
      name: 'from_message',
      description: 'The message ID to start collecting from (inclusive).',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],

  callback: async (client, interaction) => {
    const channel = interaction.channel;
    const fromMessageId = interaction.options.getString('from_message');

    await interaction.deferReply({ ephemeral: true });

    try {
      const xpTotals = {};
      const pattern = /\/xp add member:(\d+) xp:(\d+)/;

      let lastId = null;
      let reachedStart = false;
      let done = false;

      while (!done) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) break;

        for (const msg of messages.values()) {
          const match = pattern.exec(msg.content);
          if (match) {
            const memberId = match[1];
            const xp = parseInt(match[2]);
            xpTotals[memberId] = (xpTotals[memberId] || 0) + xp;
          }

          if (msg.id === fromMessageId) {
            reachedStart = true;
            done = true;
            break;
          }
        }

        lastId = messages.last().id;
        if (messages.size < 100) break;
      }

      if (!reachedStart) {
        await interaction.editReply(`Could not find a message with ID \`${fromMessageId}\` in this channel.`);
        return;
      }

      if (Object.keys(xpTotals).length === 0) {
        await interaction.editReply('No XP entries found since that message.');
        return;
      }

      // Send each result as a separate message
      for (const [memberId, total] of Object.entries(xpTotals)) {
        await channel.send(`/xp add member:${memberId} xp:${total}`);
      }

      await interaction.editReply(`Combined XP results sent (${Object.keys(xpTotals).length} members).`);
    } catch (error) {
      console.error('Error in /combinexp:', error);
      await interaction.editReply('There was an error while processing this command.');
    }
  },
};