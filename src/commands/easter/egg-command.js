const { EmbedBuilder, ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const EMBED_COLOR     = 0xe67e22;
const PAGE_SIZE       = 10;
const leaderboardPath = path.resolve(__dirname, '../../database/easter-leaderboard.json');

// ─── INCLUDED CHANNELS ─────────────────────────────────────────────────────────
const INCLUDED_CHANNELS = [
  { link: 'https://discord.com/channels/1062827045744279613/1144153321452609597', name: 'question-of-the-day' },
  { link: 'https://discord.com/channels/1062827045744279613/1064371335016489011', name: 'general-chat' },
  { link: 'https://discord.com/channels/1062827045744279613/1128652042236330084', name: 'off-topic' },
  { link: 'https://discord.com/channels/1062827045744279613/1064371336278970419', name: 'media' },
  { link: 'https://discord.com/channels/1062827045744279613/1064371337977679972', name: 'memes' },
  { link: 'https://discord.com/channels/1062827045744279613/1129773568306188358', name: 'pets' },
  { link: 'https://discord.com/channels/1062827045744279613/1121465540242833479', name: '1.8-chat' },
  { link: 'https://discord.com/channels/1062827045744279613/1127041917834764308', name: '1.21-chat' },
  { link: 'https://discord.com/channels/1062827045744279613/1121467640725114940', name: 'booster-general' },
  { link: 'https://discord.com/channels/1062827045744279613/1121468218410799204', name: 'member-chat' },
];

// ─── EGG POOLS (mirrored from 07easterEggHandler.js for /egg worth) ────────────
const NORMAL_EGG_POOL = [
  { name: 'egg_of_knowledge',           id: '1481078835381538989' },
  { name: 'Pinkeggwithbluebutterflies', id: '1481078779500822629' },
  { name: 'easter',                     id: '1481078815848529951' },
  { name: 'egg_of_nostalgia',           id: '1481078861075710101' },
  { name: 'Corporate_egg',              id: '1481078502261395506' },
  { name: 'Dinosaur_Egg',               id: '1481078562806169610' },
  { name: 'EasterEgg',                  id: '1481078593730773003' },
  { name: 'EasterEgg',                  id: '1481078620997812407' },
  { name: 'EasterEgg',                  id: '1481078648793596125' },
  { name: 'Pink_easter_egg',            id: '1481078757229068350' },
];

const SPECIAL_EGG_POOL = [
  { name: 'Mythical_Egg',   id: '1481078736374861926' },
  { name: 'Exeggcute',      id: '1481078688991674520' },
  { name: 'Dario_egg',      id: '1481078533949489373' },
  { name: 'egg_of_royalty', id: '1481078879849287802' },
  { name: 'Fancy_Egg',      id: '1481078715231502570' },
  { name: 'rainbow_egg',    id: '1481078910262444134' },
];

const DARIO_EGG_POOL = [
  { name: 'dario_egg_special', id: '1488982805273641161' },
];

// ─── HELPER ────────────────────────────────────────────────────────────────────
function readLeaderboard() {
  try {
    const data = fs.readFileSync(leaderboardPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return { players: [] };
  }
}

// ─── COMMAND ───────────────────────────────────────────────────────────────────
module.exports = {
  name: 'egg',
  description: 'Egg Hunt commands',
  options: [
    {
      name: 'info',
      description: 'Shows information about the Egg Hunt',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'stats',
      description: 'Shows your total points and leaderboard rank',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'User to check stats for (leave empty for yourself)',
          type: ApplicationCommandOptionType.User,
          required: false,
        },
      ],
    },
    {
      name: 'board',
      description: 'Shows the leaderboard for total points and eggs collected',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'channels',
      description: 'Shows what channels are included for spawning eggs',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'worth',
      description: 'Shows how many points each egg is worth',
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],

  callback: async (client, interaction) => {
    const sub = interaction.options.getSubcommand();

    // ── /egg info ──────────────────────────────────────────────────────────────
    if (sub === 'info') {
      const embed = new EmbedBuilder()
        .setTitle('TDG Egg Hunt')
        .setColor(EMBED_COLOR)
        .addFields(
          {
            name: 'How It Works',
            value: [
              'While chat is active, <@1232432919310499880> will randomly add egg reactions to messages.',
              'The **first person to click the reaction** collects the egg and its points.',
              'After an egg is claimed, Botio adds a **<:lock_IDS:1481078926460850187>** reaction to show it\'s taken.',
              'Most eggs are worth **1 point**, some are worth **2 points**. The more active a channel, the more likely eggs will spawn there.',
            ].join('\n'),
          },
          {
            name: 'Rules',
            value: [
              '• You **cannot claim eggs on your own message**',
              '• Eggs spawn **at least 10 minutes apart** after enough messages',
              '• **Spamming messages will not spawn eggs** and may lead to disqualification',
              '• **At least 2 people must be chatting** for eggs to appear',
              '• Only **one egg can be active at a time**',
              '• Eggs **expire after 1 hour**',
              '• **Do not add fake egg reactions** to confuse others',
              '• Only some channels are included — use `/egg channels` for a full list',
            ].join('\n'),
          },
          {
            name: 'Commands',
            value: [
              '`/egg stats` – Your points & rank',
              '`/egg board` – Leaderboard',
              '`/egg channels` – Included channels',
              '`/egg worth` – Egg point values',
              '`/egg info` – Event info',
            ].join('\n'),
          }
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ── /egg stats ─────────────────────────────────────────────────────────────
    else if (sub === 'stats') {
      await interaction.deferReply();

      const target      = interaction.options.getUser('user') || interaction.user;
      const leaderboard = readLeaderboard();
      const sorted      = [...(leaderboard.players || [])].sort((a, b) => b.points - a.points || b.eggs - a.eggs);
      const player      = sorted.find(p => p.id === target.id);
      const rankIndex   = sorted.findIndex(p => p.id === target.id);

      if (!player) {
        const noEggsEmbed = new EmbedBuilder()
          .setColor(EMBED_COLOR)
          .setDescription(
            target.id === interaction.user.id
              ? '🐣 You haven\'t claimed any eggs yet!'
              : `🐣 <@${target.id}> hasn't claimed any eggs yet!`
          );
        await interaction.editReply({ embeds: [noEggsEmbed] });
        return;
      }

      // Display the animated emoji if the value is 67 and the bot can access it, otherwise show the number
      const EMOJI_67_ID = '1441227612327514114';
      const emoji67     = client.emojis.cache.get(EMOJI_67_ID);
      const fmt67 = (n) => n === 67 && emoji67 ? `${emoji67}` : `${n}`;

      const rank      = rankIndex + 1;
      const medalMap  = { 1: '🥇', 2: '🥈', 3: '🥉' };
      const rankLabel = medalMap[rank] ?? `#${rank}`;

      const normalEggs  = player.eggs        || 0;
      const specialEggs = player.specialEggs || 0;
      const darioEggs   = player.darioEggs   || 0;

      const embed = new EmbedBuilder()
        .setTitle('Egg Hunt — Stats')
        .setColor(EMBED_COLOR)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: 'User',         value: `<@${target.id}>`,    inline: false },
          { name: 'Rank',         value: rankLabel,             inline: true  },
          { name: 'Total Points', value: fmt67(player.points),  inline: true  },
          { name: '\u200b',       value: '\u200b',              inline: false },
          { name: 'Normal Eggs',  value: fmt67(normalEggs),     inline: true  },
          { name: 'Special Eggs', value: fmt67(specialEggs),    inline: true  },
          { name: 'Dario Eggs',   value: fmt67(darioEggs),      inline: true  },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }

    // ── /egg board ─────────────────────────────────────────────────────────────
    else if (sub === 'board') {
      await interaction.deferReply();

      const leaderboard = readLeaderboard();
      const players     = leaderboard.players || [];

      if (players.length === 0) {
        await interaction.editReply({ content: '🐣 No eggs have been claimed yet! Be the first!' });
        return;
      }

      const sorted     = [...players].sort((a, b) => b.points - a.points || b.eggs - a.eggs);
      const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
      const callerId   = interaction.user.id;
      const callerRank = sorted.findIndex(p => p.id === callerId) + 1;
      const callerPage = callerRank > 0 ? Math.ceil(callerRank / PAGE_SIZE) : 1;
      let currentPage  = callerPage;

      function buildEmbed(page) {
        const start  = (page - 1) * PAGE_SIZE;
        const slice  = sorted.slice(start, start + PAGE_SIZE);
        const medals = ['🥇', '🥈', '🥉'];

        const rows = slice.map((player, i) => {
          const rank    = start + i + 1;
          const medal   = medals[rank - 1] ?? `**${rank}.**`;
          const normal  = player.eggs        > 0 ? ` 🥚×${player.eggs}`        : '';
          const special = player.specialEggs > 0 ? ` ✨×${player.specialEggs}` : '';
          const dario   = player.darioEggs   > 0 ? ` 🌟×${player.darioEggs}`  : '';
          const arrow   = player.id === callerId ? ' ◄ you' : '';
          return `${medal} <@${player.id}> — **${player.points} pts** |${normal}${special}${dario}${arrow}`;
        });

        const description = rows.join('\n') || 'No entries on this page.';

        const callerFooter = callerRank > 0
          ? `Your rank: #${callerRank} of ${sorted.length}`
          : `You haven't claimed any eggs yet!`;

        return new EmbedBuilder()
          .setTitle('🐣 Egg Hunt — Leaderboard')
          .setColor(EMBED_COLOR)
          .setDescription(description)
          .setFooter({ text: `${callerFooter} • Page ${page}/${totalPages}` })
          .setTimestamp();
      }

      function buildButtons(page) {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('easter_lb_prev')
            .setLabel('◀ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 1),
          new ButtonBuilder()
            .setCustomId('easter_lb_next')
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages),
        );
      }

      const reply = await interaction.editReply({
        embeds:     [buildEmbed(currentPage)],
        components: totalPages > 1 ? [buildButtons(currentPage)] : [],
      });

      if (totalPages <= 1) return;

      const collector = reply.createMessageComponentCollector({
        filter: i => i.user.id === callerId && ['easter_lb_prev', 'easter_lb_next'].includes(i.customId),
        time: 120_000,
      });

      collector.on('collect', async (btn) => {
        if (btn.customId === 'easter_lb_prev') currentPage = Math.max(1, currentPage - 1);
        if (btn.customId === 'easter_lb_next') currentPage = Math.min(totalPages, currentPage + 1);
        await btn.update({ embeds: [buildEmbed(currentPage)], components: [buildButtons(currentPage)] });
      });

      collector.on('end', async () => {
        try {
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('easter_lb_prev').setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('easter_lb_next').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(true),
          );
          await interaction.editReply({ components: [disabledRow] });
        } catch { /* message may have been deleted */ }
      });
    }

    // ── /egg channels ──────────────────────────────────────────────────────────
    else if (sub === 'channels') {
      const channelList = INCLUDED_CHANNELS
        .map(c => `- [#${c.name}](${c.link})`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setTitle('Egg Hunt — Included Channels')
        .setColor(EMBED_COLOR)
        .setDescription('Eggs can spawn in the following channels:\n\n' + channelList);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ── /egg worth ─────────────────────────────────────────────────────────────
    else if (sub === 'worth') {
      const normalList  = NORMAL_EGG_POOL.map(e => `<:${e.name}:${e.id}>`).join('  ');
      const specialList = SPECIAL_EGG_POOL.map(e => `<:${e.name}:${e.id}>`).join('  ');
      const darioList   = DARIO_EGG_POOL.map(e => `<:${e.name}:${e.id}>`).join('  ');

      const embed = new EmbedBuilder()
        .setTitle('Egg Hunt — Egg Values')
        .setColor(EMBED_COLOR)
        .addFields(
          { name: '1 Point Eggs', value: normalList,  inline: false },
          { name: '2 Point Eggs', value: specialList, inline: false },
          { name: '5 Point Eggs', value: darioList,   inline: false },
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};