const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {

    if (interaction.isModalSubmit() && interaction.customId === 'unban_modal') {
      const whyBanned = interaction.fields.getTextInputValue('why_banned');
      const howLong = interaction.fields.getTextInputValue('how_long');
      const whyUnbanned = interaction.fields.getTextInputValue('why_unbanned');
      const anythingElse = interaction.fields.getTextInputValue('anything_else');

      const userId = interaction.user.id; // Get user ID
      const username = interaction.user.username; // Get user name
	  const avatarURL = interaction.user.displayAvatarURL({ dynamic: true });

      // Create an embed with the modal responses
      const embed = new EmbedBuilder()
        .setTitle('Unban Request!')
        .addFields(
          { name: '__Why were you banned?__', value: whyBanned },
          { name: '__How long ago were you banned?__', value: howLong },
          { name: '__Why do you want to be unbanned?__', value: whyUnbanned },
          { name: '__Anything else?__', value: anythingElse || 'N/A' }
        )
        .setDescription(`User: ${username} (${userId})`)
        .setThumbnail(avatarURL)
        .setColor('e67e22')
        .setTimestamp();

      // Use the channel ID directly
      const targetChannelId = '1104850816583610398'; //TDG: 1104850816583610398 || Testing: 1286119328265015296
      const targetChannel = client.channels.cache.get(targetChannelId);

      if (!targetChannel) {
        console.error('Target channel not found.');
        await interaction.reply({
          content: 'Target channel not found.',
          ephemeral: true,
        });
        return;
      }

      // Create buttons for approval and denial
      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('approve_request')
            .setLabel('Approve Unban')
            .setStyle(ButtonStyle.Success), // Green button
          new ButtonBuilder()
            .setCustomId('deny_request')
            .setLabel('Deny Unban')
            .setStyle(ButtonStyle.Danger) // Red button
        );

      // Send the embed and buttons to the target channel
      try {
        await targetChannel.send(`<@&'1125945415527833712'>`); // Send role ping1095466940753002566
        const message = await targetChannel.send({ embeds: [embed], components: [actionRow] });

      } catch (error) {
        console.error('Error sending the message or buttons:', error);
        await interaction.reply({
          content: 'There was an error sending your request. Please try again later.',
          ephemeral: true,
        });
        return;
      }

      // Acknowledge the modal submission
      await interaction.reply({
        content: '**Appeal successfully sent!**\n-# Please wait while staff review it. Depending on the time of day, this may take up to a few hours.',
        ephemeral: true,
      });
    }
  });
};
