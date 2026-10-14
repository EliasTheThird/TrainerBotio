const { Client, Interaction, EmbedBuilder } = require('discord.js');

module.exports = {
  /**
   * @param {Client} client
   * @param {Interaction} interaction
   */

  callback: async (client, interaction) => {
    // Acknowledge the interaction without posting anything visible
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('TrainerBotio — YouTube Member Perks')
      //.setDescription("Here are the exclusive bot perks available for YouTube Members:")
      .setColor('#e67e22')
      .addFields(
        {
          name: '`/ban`',
          value: 'Sends a **fake ban message** in the chat.',
        },
        {
          name: '`/warn`',
          value: 'Sends a **fake warn message** in the chat.',
        },
        {
          name: '`/pingtrainer`',
          value: 'Can **only be used in the member chat**. Sends your message along with a ping to **<@193169855007031296>** so he can review it when available.',
        },
        {
          name: '`/quote`',
          value: 'Creates an image quoting a selected message and posts it in the channel. It is also automatically reposted in <#1441531334324654221>.',
        },
        {
          name: '`/revive`',
          value: 'Pings the <@&1232810899484704890> role along with your message to help restart activity.',
        },
        {
          name: '\u200B',
          value: '*⚠️ Abuse of any commands may result in you being blocked from using them ⚠️*',
        }
      );

    // Send the embed as a NEW message in the channel
    await interaction.channel.send({
      embeds: [embed],
    });

    // Edit the deferred reply (invisible to others)
    await interaction.editReply({
      content: 'Perks posted!',
    });
  },

  name: 'memberperks',
  description: "Displays TrainerBotio's YouTube member perks.",
  devOnly: false,
  options: [],
  permissionsRequired: [],
  botPermissions: [],
};