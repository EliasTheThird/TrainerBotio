const fs = require('fs').promises;
const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const path = require('path');

module.exports = {
  callback: async (client, interaction) => {
    try {
      const filePath = path.resolve(__dirname, '../../database/trivia-leaderboard.json');

      // Read the leaderboard data from trivia-leaderboard.json
      const data = await fs.readFile(filePath, 'utf-8');
      const leaderboard = JSON.parse(data).winners;

      // Get sorting option
      const sortBy = interaction.options.getString('sort_by') || 'correctAnswers';

      // Sort leaderboard based on the selected option
      if (sortBy === 'xp') {
        leaderboard.sort((a, b) => b.xp - a.xp);
      } else {
        leaderboard.sort((a, b) => b.correctAnswers - a.correctAnswers);
      }

      // Prepare embed for leaderboard display
      const embed = new EmbedBuilder()
        .setTitle('Trivia Leaderboard')
        .setColor('#e67e22')
        .setDescription(`Top 10 Players by ${sortBy === 'xp' ? 'XP' : 'Correct Answers'}`)
        .addFields(
          await Promise.all(
            leaderboard.slice(0, 10).map(async (winner, index) => {
              const user = await client.users.fetch(winner.id).catch(() => null);
              const displayName = user ? user.username : 'Unknown User';
              
              // Build fields based on the selected sort option
              const fieldValue = sortBy === 'xp' 
                ? `Earned XP: ${winner.xp || 0}`
                : `Correct Answers: ${winner.correctAnswers}`;

              return {
                name: `${index + 1}. ${displayName}`,
                value: fieldValue,
                inline: false,
              };
            })
          )
        );

      // Reply with the embed
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching or parsing leaderboard data:', error);
      await interaction.reply('There was an error fetching the leaderboard.');
    }
  },

  name: 'trivia-leaderboard',
  description: 'Display the trivia leaderboard.',
  options: [
    {
      name: 'sort_by',
      description: 'Sort the leaderboard by correct answers or XP',
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        {
          name: 'Correct Answers',
          value: 'correctAnswers',
        },
        {
          name: 'XP',
          value: 'xp',
        },
      ],
    },
  ],
};
