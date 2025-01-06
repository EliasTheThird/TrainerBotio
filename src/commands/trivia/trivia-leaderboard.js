const fs = require('fs').promises;
const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const path = require('path');

const LEADERS_PER_PAGE = 10; // Number of leaderboard entries per page

module.exports = {
  callback: async (client, interaction) => {
    try {
      // Defer reply to avoid interaction timeout
      await interaction.deferReply();

      const filePath = path.resolve(__dirname, '../../database/trivia-leaderboard.json');

      // Read the leaderboard data
      const data = await fs.readFile(filePath, 'utf-8').catch(() => null);
      if (!data) {
        throw new Error('Leaderboard file is missing or unreadable.');
      }

      const leaderboard = JSON.parse(data).winners || [];
      if (leaderboard.length === 0) {
        return await interaction.editReply('The leaderboard is empty.');
      }

      // Get sorting option
      const sortBy = interaction.options.getString('sort_by') || 'correctAnswers';

      // Sort leaderboard based on the selected option
      leaderboard.sort((a, b) => (sortBy === 'xp' ? b.xp - a.xp : b.correctAnswers - a.correctAnswers));

      // Get the page number and validate it
      const page = interaction.options.getInteger('page') || 1;
      const totalPages = Math.ceil(leaderboard.length / LEADERS_PER_PAGE);
      const currentPage = Math.min(Math.max(page, 1), totalPages); // Ensure the page is within range

      // Fetch user data for the current page
      const startIndex = (currentPage - 1) * LEADERS_PER_PAGE;
      const endIndex = Math.min(startIndex + LEADERS_PER_PAGE, leaderboard.length);

      // Use Promise.all with error handling for parallel user fetches
      const fields = await Promise.all(
        leaderboard.slice(startIndex, endIndex).map(async (winner, index) => {
          try {
            const user = await client.users.fetch(winner.id);
            const displayName = user.username;
            return {
              name: `${startIndex + index + 1}. ${displayName}`,
              value: sortBy === 'xp'
                ? `Earned XP: ${winner.xp || 0}`
                : `Correct Answers: ${winner.correctAnswers}`,
              inline: false,
            };
          } catch {
            return {
              name: `${startIndex + index + 1}. Unknown User`,
              value: sortBy === 'xp'
                ? `Earned XP: ${winner.xp || 0}`
                : `Correct Answers: ${winner.correctAnswers}`,
              inline: false,
            };
          }
        })
      );

      // Create embed with leaderboard fields
      const embed = new EmbedBuilder()
        .setTitle('Trivia Leaderboard')
        .setColor('#e67e22')
        .setDescription(`Top Players by ${sortBy === 'xp' ? 'XP' : 'Correct Answers'} (Page ${currentPage}/${totalPages})`)
        .addFields(fields);

      // Send the embed as a reply
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching or parsing leaderboard data:', error);
      await interaction.editReply('There was an error fetching the leaderboard.');
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
    {
      name: 'page',
      description: 'Select the page number of the leaderboard to display',
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
  ],
};
