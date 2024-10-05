module.exports = async (client) => {
    const channelId = '1291931717271031859'; // TDG: 1291931717271031859 || tServer: 1160015142101192764
    const channel = await client.channels.fetch(channelId);
    const admins = '1167886120445562880';
  
    if (channel) {
      channel.send(`<@${admins}> Trivia needs to be restarted!`);
    } else {
      console.error('Channel not found for ready command');
    }
  };