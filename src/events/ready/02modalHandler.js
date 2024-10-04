const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {

    if (interaction.isModalSubmit() && interaction.customId === 'unban_modal') {
      const whyBanned = interaction.fields.getTextInputValue('why_banned');
      const whyUnbanned = interaction.fields.getTextInputValue('why_unbanned');
      const anythingElse = interaction.fields.getTextInputValue('anything_else');

      // Get the user ID from the interaction
      const userId = interaction.user.id;

      // Create an embed with the modal responses
      const embed = new EmbedBuilder()
        .setTitle('Unban Request')
        .addFields(
          { name: 'Why were you banned?', value: whyBanned },
          { name: 'Why do you want to be unbanned?', value: whyUnbanned },
          { name: 'Anything else?', value: anythingElse || 'N/A' }
        )
        .setDescription(`User ID: ${userId}`) // Store the user ID here
        .setTimestamp();

      // Use the channel ID directly
      const targetChannelId = '1286119328265015296';
      const targetChannel = client.channels.cache.get(targetChannelId);

      if (!targetChannel) {
        console.error('Target channel not found.');
        await interaction.reply({
          content: 'Target channel not found.',
          ephemeral: true,
        });
        return;
      }

      // Send the embed to the channel and add reactions
      try {
        const message = await targetChannel.send({ embeds: [embed] });

        await message.react('✅');
        await message.react('❌');
      } catch (error) {
        console.error('Error sending the message or reacting:', error);
        await interaction.reply({
          content: 'There was an error sending your request. Please try again later.',
          ephemeral: true,
        });
        return;
      }

      // Acknowledge the modal submission
      await interaction.reply({
        content: 'Your unban request has been sent.',
        ephemeral: true,
      });
    }
  });
};
