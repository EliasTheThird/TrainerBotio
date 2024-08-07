const {
    ApplicationCommandOptionType,
  } = require('discord.js');
  
  function generateAdditionEquation(target) {
    let sum = 0;
    const parts = [];
    while (sum < target) {
      let add = Math.floor(Math.random() * (target - sum)) + 1;
      parts.push(add);
      sum += add;
    }
    return parts.join('+');
  }
  
  module.exports = {
    //deleted: true
    name: 'count',
    description: 'Creates a simple random addition equation for the provided number.',
    options: [
      {
        name: 'number',
        description: 'Enter a number',
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
    ],
  
    callback: async (client, interaction) => {
      const number = interaction.options.getInteger('number');
      if (number <= 0) {
        await interaction.reply({
          content: "Please provide a positive integer.",
          ephemeral: true,
        });
        return;
      }
  
      const equation = generateAdditionEquation(number);
  
      await interaction.reply({
        content: `${equation}`,
        ephemeral: true
      });
    },
  };
  