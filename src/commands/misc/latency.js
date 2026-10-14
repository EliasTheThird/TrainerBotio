module.exports = {
  name: 'latency',
  description: 'Replies with the bots Latency!',
  // devOnly: Boolean,
  // testOnly: true,
  // options: Object[],
  // deleted: true,

  callback: async (client, interaction) => {
    try {
      await interaction.deferReply();

      const reply = await interaction.fetchReply();
      const ping = reply.createdTimestamp - interaction.createdTimestamp;

      await interaction.editReply(`Pong! Client: ${ping}ms | Websocket: ${client.ws.ping}ms`);
    } catch (error) {
      console.error('Error processing ping command:', error);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('There was an error while processing your command.');
      } else {
        await interaction.reply({
          content: 'There was an error while processing your command.',
          ephemeral: true,
        });
      }
    }
  },
};
