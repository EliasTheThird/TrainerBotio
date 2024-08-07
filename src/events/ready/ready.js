module.exports = async (client) => {
    const channelId = '1270799684491018310'; // The ID of the channel where you want to post the message
    const channel = await client.channels.fetch(channelId);
  
    if (channel) {
      channel.send('The bot is now online!\n /trivia start needs to be rerun');
    } else {
      console.error('Channel not found for ready command');
    }
  };