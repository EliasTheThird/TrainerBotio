const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'info',
  description: 'View privacy information.',

  callback: async (client, interaction) => {
    const embed = new EmbedBuilder()
      .setTitle('TDG-Bot — Privacy Policy')
      .setColor('e67e22')
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
                {
          name: '🔒 Privacy Policy',
          value: [
            '**What data does this bot collect?**',
            'TDG-Bot processes message content and member information **in memory only** as part of automated moderation. Specifically:',
            '• **Message content & attachments** — scanned transiently to detect coordinated spam from suspected hacked accounts. Content is shown in a private mod-only log and immediately discarded.',
            '• **Member data** — fetched on-demand to verify permissions (e.g. admin status) before applying moderation actions.',
            '',
            '**Is any data stored or shared?**',
            'No data is stored off-platform or shared with third parties. All processing happens in memory and is discarded after each event.',
            '',
            '**Is data used for AI/ML training?**',
            'No.',
            '',
            '**Questions?** Contact a server administrator.',
          ].join('\n'),
        }
      )
      .setFooter({ text: 'TDG-Bot by EliasTheThird' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};