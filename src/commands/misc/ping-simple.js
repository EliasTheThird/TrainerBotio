module.exports = {
    name: 'ping-simple',
    description: 'Replies with Pong!',
  
    callback: (client, interaction) => {
      interaction.reply('Pong!');
    },
  };
  