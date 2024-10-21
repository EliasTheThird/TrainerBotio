const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
      const { customId } = interaction;

      if (interaction.guild.id === '1062827045744279613') { // TDG: 1062827045744279613 || Testing: 1095466674771214480
        const message = interaction.message;
        if (message.embeds.length) {
          const embedData = message.embeds[0].data;
          const embed = new EmbedBuilder(embedData);

          const description = embed.data.description;
          const userIdMatch = description.match(/User: .* \((\d+)\)/);
          const userId = userIdMatch ? userIdMatch[1] : undefined;
          const username = interaction.user.username;

          if (!userId) {
            console.error('User ID not found in embed description');
            return;
          }

          try {
            const member = await client.guilds.cache
              .get('1211814157544853524')
              .members.fetch(userId);

            const avatarURL = member.user.displayAvatarURL({ dynamic: true });
            await member.roles.remove('1211825933443407893'); // Removing a role

            let actionTaken;
            const logChannelId = '1211845797008646174';
            let logEmbed = new EmbedBuilder(embed);

            // Set PFP in the initial embed
            embed.setThumbnail(avatarURL); // Set the PFP before button click

            if (customId === 'approve_request') {
              embed.setColor('Green')
                .setTitle(`Request Approved by @${username}`);
              await member.roles.add('1211824538082349077'); // Add approved role
              actionTaken = 'approved';
              logEmbed.setColor('Green').setTitle(`Request Approved by @${username}`).setThumbnail(avatarURL);

              try {
                await interaction.guild.members.unban(userId, 'User appealed, and it was accepted.');
                console.log(`User ${userId} has been unbanned.`);
              } catch (err) {
                if (err.code === 10026) {
                  console.warn(`Failed to unban user ${userId}: User is already unbanned.`);
                } else {
                  console.error(`Failed to unban user ${userId}:`, err);
                }
              }

              await member.send('**Your unban appeal for TrainerDario Gaming has been Accepted!**\n> https://discord.gg/TrainerDario');

            } else if (customId === 'deny_request') {
              embed.setColor('Red')
                .setTitle(`Request Denied by @${username}`);
              await member.roles.add('1211821733019914310'); // Add denied role
              actionTaken = 'denied';
              logEmbed.setColor('Red').setTitle(`Request Denied by @${username}`).setThumbnail(avatarURL);

              await member.send('**Your unban appeal for TrainerDario Gaming has been Denied!**\n> You may appeal [HERE](<https://discord.com/channels/1211814157544853524/1211821640594362408>)');
            }

            // Disable buttons
            const disabledActionRow = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId('approve_request')
                  .setLabel('Approve Unban')
                  .setStyle('Success')
                  .setDisabled(true),
                new ButtonBuilder()
                  .setCustomId('deny_request')
                  .setLabel('Deny Unban')
                  .setStyle('Danger')
                  .setDisabled(true)
              );

            // Edit the message with updated embed including PFP
            embed.setThumbnail(avatarURL); // Ensure the PFP is included in the edited embed
            await message.edit({ embeds: [embed], components: [disabledActionRow] });

            const logChannel = client.channels.cache.get(logChannelId);
            if (logChannel) {
              await logChannel.send({ embeds: [logEmbed] });
            } else {
              console.error('Log channel not found.');
            }

            // Check if interaction has already been replied to before replying
            if (!interaction.replied) {
              await interaction.reply({ content: `The request has been ${actionTaken}.`, ephemeral: true });
            }

          } catch (error) {
            console.error('Error handling user roles or fetching member:', error);
            if (!interaction.replied) {
              await interaction.reply({ content: `An error occurred while handling the request.`, ephemeral: true });
            }
          }
        }
      }
    }
  });
};
