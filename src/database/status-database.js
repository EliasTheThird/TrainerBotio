const { ActivityType } = require('discord.js');

const statuses = [
  {
    name: 'TrainerDario',
    type: ActivityType.Streaming,
    url: 'https://www.youtube.com/watch?v=b7ZnVHdmSbc&t=393s',
  },
  {
    name: 'bot by EliasTheThird',
    type: ActivityType.Playing,
  },
  {
    name: 'Ess the Best 2025',
    type: ActivityType.Playing,
  },
];

function setStatus(client) {
  setInterval(() => {
    const randomIndex = Math.floor(Math.random() * statuses.length);
    const status = statuses[randomIndex];

    const activityOptions = { type: status.type };
    if (status.url) {
      activityOptions.url = status.url;
    }

    client.user.setActivity(status.name, activityOptions);
  }, 30000);
}

module.exports = setStatus;