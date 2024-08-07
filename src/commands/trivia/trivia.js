const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder,
  Client,
  Interaction,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const triviaQuestions = require('../../database/trivia-database');

const leaderboardPath = path.resolve(__dirname, '../../database/trivia-leaderboard.json');
const channelId = '1095238175187816449'; // general: 1064371335016489011 || testing: 1095238175187816449
const threadChannelId = '1270799837557686342';
const highLevelRoleId = '1103768817122934876';
const now = new Date();
const formattedDate = now.toLocaleString();

let triviaInterval;
let triviaLoopRunning = false;
let currentQuestion = null;

module.exports = {
  /**
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.user;

    console.log(`[${formattedDate}] Trivia Command "${subcommand}" run by: ${user.tag} (ID: ${user.id})`);

    if (subcommand === 'start') {
      if (triviaLoopRunning) {
        await interaction.reply({
          content: 'Trivia game is already running!',
          ephemeral: true,
        });
        return;
      }

      triviaLoopRunning = true;
      startTriviaLoop(client);

      await interaction.reply({
        content: 'Trivia game started!',
        ephemeral: true,
      });
    } else if (subcommand === 'stop') {
      if (!triviaLoopRunning) {
        await interaction.reply({
          content: 'Trivia game is not running!',
          ephemeral: true,
        });
        return;
      }

      clearInterval(triviaInterval);
      triviaLoopRunning = false;

      await interaction.reply({
        content: 'Trivia game has been stopped!',
        ephemeral: true,
      });
    }
  },

  name: 'trivia',
  description: 'Manage the trivia game loop.',
  options: [
    {
      name: 'start',
      description: 'Start the trivia game loop.',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'stop',
      description: 'Stop the trivia game loop.',
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],
  permissionsRequired: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.SendMessages],
};

const normalizeAnswer = (answer) => {
  return answer
    .toLowerCase()                // Convert to lowercase
    .trim()                        // Remove leading and trailing spaces
    .normalize('NFD')              // Normalize accents and diacritics
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/\s+/g, '')          // Remove all spaces
};


async function startTriviaLoop(client) {
  const channel = client.channels.cache.get(channelId);
  if (!channel) {
    console.error('Trivia channel not found!');
    return;
  }

  const postQuestionAndAwaitAnswer = async () => {
    const randomXP = getRandomInt(50, 100);
    const questionStartTime = Date.now();

    await postTriviaQuestion(channel);

    const filter = response => {
      if (currentQuestion) {
        const normalizedUserAnswer = normalizeAnswer(response.content);
        return currentQuestion.answer
          .map(normalizeAnswer)
          .some(answer => answer === normalizedUserAnswer);
      }
      return false;
    };

    try {
      const collected = await channel.awaitMessages({ filter, max: 1, time: 3540000, errors: ['time'] });
      const winner = collected.first().author;

      await channel.send({ embeds: [createWinnerEmbed(winner, randomXP)] });
      await announceWinner(client, winner, randomXP);
    } catch (error) {
      await channel.send({ embeds: [createClosedEmbed()] });
    }
  };

  // Post the first trivia question immediately
  await postQuestionAndAwaitAnswer();

  // Set up the interval for subsequent questions
  triviaInterval = setInterval(async () => {
    if (!triviaLoopRunning) {
      clearInterval(triviaInterval);
      return;
    }

    await postQuestionAndAwaitAnswer();
  }, 3600000); // Loop every hour
}

async function postTriviaQuestion(channel) {
  currentQuestion = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];

  const embed = new EmbedBuilder()
    .setTitle('Trivia Question!')
    .setDescription(currentQuestion.question)
    .setColor('#e67e22')
    .setFooter({ text: 'Run /trivia-suggestion to suggest more questions!' });

  await channel.send({ embeds: [embed] });
}

function createWinnerEmbed(winner, randomXP) {
  return new EmbedBuilder()
    .setTitle('Trivia Winner!')
    .setDescription(`Congratulations <@${winner.id}>, you were first to answer correctly and are the Trivia Winner!`)
    .setFooter({ text: `You have won: ${randomXP} XP!` })
    .setColor('#e67e22');
}

function createClosedEmbed() {
  return new EmbedBuilder()
    .setDescription('No correct answers were given in time. The trivia question is now closed.')
    .setColor('#e67e22');
}

// List of special users
const specialUsers = [
  '699054958632370217',
  '216404071253278720',
  '742766266699481089',
];

async function announceWinner(client, winner, randomXP) {
  const threadChannel = client.channels.cache.get(threadChannelId);
  const guild = threadChannel.guild;
  const member = await guild.members.fetch(winner.id);

  if (threadChannel) {
    if (specialUsers.includes(winner.id)) {
      await threadChannel.send(`/xp add member:<@${winner.id}> xp:${randomXP}`);
      updateLeaderboard(winner.id, randomXP, 1);
    } else if (member.roles.cache.has(highLevelRoleId)) {
      await threadChannel.send(`<@${winner.id}> is over level 100, no XP can be awarded.`);
      updateLeaderboard(winner.id, randomXP, 1);
    } else {
      await threadChannel.send(`/xp add member:${winner.id} xp:${randomXP}`);
      updateLeaderboard(winner.id, randomXP, 1);
    }
  } else {
    console.error('Thread channel not found!');
  }
}


function updateLeaderboard(userId, xp, answeredCorrectly) {
  fs.readFile(leaderboardPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading leaderboard file:', err);
      return;
    }

    const leaderboard = JSON.parse(data);
    let user = leaderboard.winners.find(w => w.id === userId);

    if (user) {
      user.xp += xp;
      user.correctAnswers += answeredCorrectly;
    } else {
      user = {
        id: userId,
        xp: xp,
        correctAnswers: answeredCorrectly
      };
      leaderboard.winners.push(user);
    }

    fs.writeFile(leaderboardPath, JSON.stringify(leaderboard, null, 2), err => {
      if (err) {
        console.error('Error writing to leaderboard file:', err);
      }
    });
  });
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
