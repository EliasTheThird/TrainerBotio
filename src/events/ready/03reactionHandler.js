const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
  client.on('messageReactionAdd', async (reaction, user) => {

    // Ensure reaction is fully fetched
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Error fetching reaction:', error);
        return;
      }
    }

    // Ignore bot reactions
    if (user.bot) return;

    // Check if the message has embeds and belongs to the correct guild
    if (reaction.message.embeds.length && reaction.message.guild.id === '1095466674771214480') {
      const embedData = reaction.message.embeds[0].data; // Get raw embed data
      const embed = new EmbedBuilder(embedData); // Recreate EmbedBuilder with raw data

      // Retrieve user ID from the embed description
      const description = embed.data.description;
      const userIdMatch = description.match(/User ID: (\d+)/);
      const userId = userIdMatch ? userIdMatch[1] : undefined;

      if (!userId) {
        console.error('User ID not found in embed description');
        return;
      }

      try {
        const member = await client.guilds.cache
          .get('805563204301750333') // Original server
          .members.fetch(userId); // Fetch user by their ID

        if (reaction.emoji.name === '✅') {
          embed.setColor('Green').setTitle('Request Approved');
          await reaction.message.edit({ embeds: [embed] });
          await member.roles.add('1286122234515165304'); // Accepted role ID

        } else if (reaction.emoji.name === '❌') {
          embed.setColor('Red').setTitle('Request Denied');
          await reaction.message.edit({ embeds: [embed] });
          await member.roles.add('1286122269814558790'); // Denied role ID
        }

        // Remove all reactions after one is clicked
        const fetchedMessage = await reaction.message.fetch();
        const reactions = fetchedMessage.reactions.cache;
        for (const [reactionId, reactionObj] of reactions) {
          try {
            await reactionObj.remove(); // Remove all reactions
          } catch (error) {
            console.error('Error removing reaction:', error);
          }
        }

      } catch (error) {
        console.error('Error handling user roles or fetching member:', error);
      }
    }
  });
};
