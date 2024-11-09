const artChannelIds = ['1304886471060357160', '1123709712005877821']; // IDs for the art channels
const pingRoleId = '1270813980063174787'; // ID of the role to ping

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    // Ignore self
    if (message.author.bot) return;

    // Check if message is in one of the art channels
    if (artChannelIds.includes(message.channel.id)) {
      if (message.attachments.size > 0) {
        try {
          
          await message.channel.send({
            content: `<@&${pingRoleId}> new art has been posted by <@${message.author.id}>`,
          });

          // Create a thread 
          await message.startThread({
            name: `${message.author.username}'s Art Discussion`,
            autoArchiveDuration: 1440,
            reason: 'Art discussion thread',
          });
        } catch (error) {
          console.error('Error creating discussion thread or pinging role:', error);
        }
      } else {
        // If no attachment, delete and warn
        try {
          await message.delete();

          const warning = await message.channel.send({
            content: `${message.author}, only messages with attachments are allowed here!`,
          });
          
          setTimeout(async () => {
            try {
              await warning.delete();
            } catch (deleteError) {
              console.error('Error deleting warning message:', deleteError);
            }
          }, 5000);
        } catch (error) {
          console.error('Error handling non-attachment message:', error);
        }
      }
    }
  });
};
