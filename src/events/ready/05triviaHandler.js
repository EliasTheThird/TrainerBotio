const { EmbedBuilder } = require('discord.js');
const triviaQuestions = require('../../database/trivia-database');
const fs = require('fs');
const path = require('path');

const leaderboardPath = path.resolve(__dirname, '../../database/trivia-leaderboard.json');
const backupLeaderboardPath = path.resolve(__dirname, '../../database/trivia-leaderboard-backup.json');
const channelId = '1064371335016489011'; // general: 1064371335016489011 || tServer: 1213751873383829536
const threadChannelId = '1270799837557686342'; // TDG: 1270799837557686342 || tServer: 1160015142101192764
const highLevelRoleId = '1103768817122934876'; // TDG: 1103768817122934876 || tServer: 1121896631277736026
const logsChannelId = '1291931717271031859'; // TDG: 1291931717271031859 || tServer: 1160015142101192764
const admins = '1062828085256400896'; // TDG: 1062828085256400896 || tServer: 1167886120445562880

const options = {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
};

let triviaInterval;
let triviaLoopRunning = false;
let currentQuestion = null;
let messageCount = 0;
let lastTriviaTime = Date.now();

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
      if (interaction.channelId !== '1270799684491018310') {
        return;
      }

      const originalEmbed = interaction.message.embeds[0];
      const channel = interaction.channel;

      const embed = new EmbedBuilder(originalEmbed.data);

      const now = new Date();
      const formattedDate = now.toLocaleString('en-US', options);

      const logsChannel = await client.channels.fetch(logsChannelId);

      if (logsChannel) {
        await logsChannel.send(`[${formattedDate}] Trivia Command **"${interaction.customId}"** run by: **${interaction.user.username}** (ID: ${interaction.user.id})`);
      } else {
        console.error('Logs channel not found!');
      }

      if (interaction.customId === 'trivia_start') {
        if (triviaLoopRunning) {
          await interaction.update({ embeds: [embed.setColor('#00FF00').setDescription('Trivia game is already running!')] });
          return;
        }

        triviaLoopRunning = true;
        await interaction.update({ embeds: [embed.setColor('#00FF00').setDescription('Trivia game started!')] });
        startTriviaLoop(client);
      } else if (interaction.customId === 'trivia_stop') {
        if (!triviaLoopRunning) {
          await interaction.update({ embeds: [embed.setColor('#FF0000').setDescription('Trivia game is not running!')] });
          return;
        }

        clearInterval(triviaInterval);
        triviaLoopRunning = false;

        await interaction.update({ embeds: [embed.setColor('#FF0000').setDescription('Trivia game has been stopped!')] });
      }
    }
  });

  // Listen for messages to count them
  client.on('messageCreate', async (message) => {
    if (message.channel.id === channelId) {
      messageCount++;

      /* Logging
      console.log(`Message Count: ${messageCount}`);
      console.log(`Time Since Last Trivia: ${(Date.now() - lastTriviaTime) / 1000} S`);
      */

      if (messageCount >= getRandomInt(50, 100) && Date.now() - lastTriviaTime >= 3600000 && triviaLoopRunning) { // SET TIME HERE
        lastTriviaTime = Date.now();
        await postQuestionAndAwaitAnswer(client, message.channel);
        messageCount = 0;
      }
    }
  });
};

const normalizeAnswer = (answer) => {
  return answer
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
};

function startTriviaLoop(client) {
  const channel = client.channels.cache.get(channelId);
  if (!channel) {
    console.error('Trivia channel not found!');
    return;
  }

  triviaLoopRunning = true;
  console.log('Trivia loop started.');
}

async function postQuestionAndAwaitAnswer(client, channel) {
  const randomXP = getRandomInt(50, 100);
  const questionStartTime = Date.now();

  /* Logging
  console.log(`Question Posted`);
  */  

  await postTriviaQuestion(channel);

  const filter = (response) => {
    if (currentQuestion) {
      const normalizedUserAnswer = normalizeAnswer(response.content);
      return currentQuestion.answer.map(normalizeAnswer).some((answer) => answer === normalizedUserAnswer);
    }
    return false;
  };

  try {
    const collected = await channel.awaitMessages({ filter, max: 1, time: 3540000, errors: ['time'] }); //59M: 3540000 || 59S: 59000
    const winner = collected.first().author;

    /* Logging
    console.log(`Question Answered`); // Logging
    */

    await channel.send({ embeds: [createWinnerEmbed(winner, randomXP)] });
    await announceWinner(client, winner, randomXP);
  } catch (error) {

    /* Logging
    console.log(`Time Up`); // Logging
    */
    console.error(`An error occurred: ${error.message}`);
    console.error(error.stack);

    await channel.send({ embeds: [createClosedEmbed()] });
  }
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
    .setDescription(`Congratulations <@${winner.id}>, you were first to answer correctly!`)
    .setFooter({ text: `You have won: ${randomXP} XP!` })
    .setColor('#e67e22');
}

function createClosedEmbed() {
  return new EmbedBuilder().setDescription('No correct answers were given in time. The trivia question is now closed.').setColor('#e67e22');
}

// List of special users
const specialUsers = ['699054958632370217', '216404071253278720', '742766266699481089'];

async function announceWinner(client, winner, randomXP) {
  const threadChannel = client.channels.cache.get(threadChannelId);
  const guild = threadChannel.guild;
  const member = await guild.members.fetch(winner.id);

  if (threadChannel) {
    if (specialUsers.includes(winner.id)) {
      await threadChannel.send(`/xp add member:<@${winner.id}> xp:${randomXP}`);
      updateLeaderboard(client, winner.id, randomXP, 1);
    } else if (member.roles.cache.has(highLevelRoleId)) {
      await threadChannel.send(`<@${winner.id}> is over level 100, no XP can be awarded.`);
      updateLeaderboard(client, winner.id, randomXP, 1);
    } else {
      await threadChannel.send(`/xp add member:${winner.id} xp:${randomXP}`);
      updateLeaderboard(client, winner.id, randomXP, 1);
    }
  } else {
    console.error('Thread channel not found!');
  }
}

function updateLeaderboard(client, userId, xp, answeredCorrectly) {
  try {
    // Backup the leaderboard file
    if (fs.existsSync(leaderboardPath)) {
      fs.copyFileSync(leaderboardPath, backupLeaderboardPath);
    }

    // Read leaderboard data synchronously
    let leaderboardData = fs.readFileSync(leaderboardPath, 'utf8');
    let leaderboard;

    try {
      leaderboard = JSON.parse(leaderboardData);
    } catch (error) {
      console.error('Error parsing leaderboard file, restoring from backup:', error);
      // Restore from backup if JSON is corrupted
      if (fs.existsSync(backupLeaderboardPath)) {
        leaderboardData = fs.readFileSync(backupLeaderboardPath, 'utf8');
        leaderboard = JSON.parse(leaderboardData);
      } else {
        // Fetch the logs channel
        client.channels
          .fetch(logsChannelId)
          .then((logsChannel) => {
            if (logsChannel) {
              logsChannel.send(`<@&${admins}> Turn off Trivia, big error`).catch((err) => console.error('Failed to send log message:', err));
            } else {
              console.error('Logs channel not found!');
            }
          })
          .catch((err) => console.error('Failed to fetch logs channel:', err));

        leaderboard = { winners: [] }; // If no backup is available, initialize an empty leaderboard
      }
    }

    let user = leaderboard.winners.find((w) => w.id === userId);

    if (user) {
      user.xp += xp;
      user.correctAnswers += answeredCorrectly;
    } else {
      user = {
        id: userId,
        xp: xp,
        correctAnswers: answeredCorrectly,
      };
      leaderboard.winners.push(user);
    }

    // Write leaderboard data synchronously
    fs.writeFileSync(leaderboardPath, JSON.stringify(leaderboard, null, 2));
  } catch (err) {
    console.error('Error updating leaderboard:', err);
  }
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
