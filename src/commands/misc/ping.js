module.exports = {
    name: 'ping',
    description: 'Replies with Pong!',
  
    callback: (client, interaction) => {
      interaction.reply('Pong!');
    },
   // deleted: true,
  };
  