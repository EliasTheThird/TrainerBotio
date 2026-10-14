const fs = require('fs').promises;
const { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const path = require('path');

const LEADERS_PER_PAGE = 10; // Number of leaderboard entries per page
const COLLECTOR_TIME = 120_000; // How long Prev/Next buttons stay active (2 min)

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

      const totalPages = Math.ceil(leaderboard.length / LEADERS_PER_PAGE);

      // Find the caller's own rank in this sort order, so the leaderboard can
      // default to the page they're on instead of always starting at page 1
      const callerId = interaction.user.id;
      const callerRank = leaderboard.findIndex((w) => w.id === callerId) + 1;
      const callerPage = callerRank > 0 ? Math.ceil(callerRank / LEADERS_PER_PAGE) : 1;
      const callerFooter = callerRank > 0
        ? `Your rank: #${callerRank} of ${leaderboard.length}`
        : `You haven't answered any trivia questions yet!`;

      // If the person explicitly passed a page, honour it; otherwise jump to their own rank
      const requestedPage = interaction.options.getInteger('page');
      let currentPage = requestedPage
        ? Math.min(Math.max(requestedPage, 1), totalPages)
        : callerPage;

      // Builds the embed for a given page — no username fetches needed since we
      // use @mentions, same approach as egg board's leaderboard rows
      function buildEmbed(page) {
        const startIndex = (page - 1) * LEADERS_PER_PAGE;
        const slice = leaderboard.slice(startIndex, startIndex + LEADERS_PER_PAGE);
        const medals = ['🥇', '🥈', '🥉'];

        const rows = slice.map((winner, index) => {
          const rank = startIndex + index + 1;
          const medal = medals[rank - 1] ?? `**${rank}.**`;
          const value = sortBy === 'xp' ? (winner.xp || 0) : winner.correctAnswers;
          const arrow = winner.id === callerId ? ' ◄ you' : '';
          return `${medal} <@${winner.id}> — **${value}**${arrow}`;
        });

        const description = `Top Players by ${sortBy === 'xp' ? 'XP' : 'Correct Answers'}\n\n${rows.join('\n') || 'No entries on this page.'}`;

        return new EmbedBuilder()
          .setTitle('Trivia Leaderboard')
          .setColor('#e67e22')
          .setDescription(description)
          .setFooter({ text: `${callerFooter} • Page ${page}/${totalPages}` });
      }

      function buildButtons(page) {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('trivia_lb_prev')
            .setLabel('◀ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 1),
          new ButtonBuilder()
            .setCustomId('trivia_lb_next')
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages),
        );
      }

      const reply = await interaction.editReply({
        embeds: [await buildEmbed(currentPage)],
        components: totalPages > 1 ? [buildButtons(currentPage)] : [],
      });

      if (totalPages <= 1) return;

      const collector = reply.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id && ['trivia_lb_prev', 'trivia_lb_next'].includes(i.customId),
        time: COLLECTOR_TIME,
      });

      collector.on('collect', async (btn) => {
        if (btn.customId === 'trivia_lb_prev') currentPage = Math.max(1, currentPage - 1);
        if (btn.customId === 'trivia_lb_next') currentPage = Math.min(totalPages, currentPage + 1);

        await btn.update({
          embeds: [await buildEmbed(currentPage)],
          components: [buildButtons(currentPage)],
        });
      });

      collector.on('end', async () => {
        try {
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('trivia_lb_prev').setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('trivia_lb_next').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(true),
          );
          await interaction.editReply({ components: [disabledRow] });
        } catch { /* message may have been deleted */ }
      });
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