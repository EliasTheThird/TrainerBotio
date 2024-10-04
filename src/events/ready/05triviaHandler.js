// buttonHandler.js
const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
  let interval; // Variable to hold the setInterval reference

  client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
      const originalEmbed = interaction.message.embeds[0]; // Get the original embed
      const channel = interaction.channel; // Get the channel where the interaction occurred

      // Create a new EmbedBuilder from the original embed
      const embed = new EmbedBuilder(originalEmbed.data); // Create a new instance from the existing embed data

      if (interaction.customId === 'status_check') {
        // If the check button is pressed
        if (interval) return; // Prevent multiple intervals from being set

        embed.setColor('#00FF00') // Use a hex color for green
          .setDescription('Status updates are now active!'); // Update embed
        await interaction.update({ embeds: [embed] });

        // Start posting every 10 seconds
        interval = setInterval(() => {
          channel.send('This is a status update!'); // Send status update message
        }, 10000);

      } else if (interaction.customId === 'status_cross') {
        // If the cross button is pressed
        clearInterval(interval); // Stop posting
        interval = null; // Reset interval variable
        embed.setColor('#FF0000') // Use a hex color for red
          .setDescription('Status updates are now stopped.'); // Update embed
        await interaction.update({ embeds: [embed] });
      }
    }
  });
};
