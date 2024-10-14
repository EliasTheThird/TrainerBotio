module.exports = {
  name: 'ping',
  description: 'Replies with the bot ping!',
  // devOnly: Boolean,
  // testOnly: true,
  // options: Object[],
  // deleted: Boolean,

  callback: async (client, interaction) => {
    try {
      console.log('Deferring reply...');
      await interaction.deferReply();
      console.log('Reply deferred. Interaction:', interaction);

      console.log('Fetching reply...');
      const reply = await interaction.fetchReply();
      console.log('Reply fetched:', reply);

      console.log('Calculating ping...');
      const ping = reply.createdTimestamp - interaction.createdTimestamp;
      console.log('Calculating ping:', ping);

      await interaction.editReply(`Pong! Client: ${ping}ms | Websocket: ${client.ws.ping}ms`);
      console.log('Reply edited successfully.');

    } catch (error) {
      console.error('Error processing ping command:', error);
      await interaction.editReply('There was an error while processing your command.');
    }
  },
  
};