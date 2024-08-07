const { Client, Interaction, PermissionFlagsBits, EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');

const suggestionThreadId = '1270799944776945766'; // The ID of the thread channel to post suggestions

module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    const question = interaction.options.getString('question');
    const answer = interaction.options.getString('answer') || 'No answer provided';

    const suggestionThread = client.channels.cache.get(suggestionThreadId);

    if (!suggestionThread) {
      await interaction.reply({
        content: 'Suggestion thread not found!',
        ephemeral: true,
      });
      return;
    }

    const suggestionEmbed = new EmbedBuilder()
      .setTitle('New Trivia Question Suggestion')
      .addFields(
        { name: 'Question', value: question }, 
        { name: 'Answer', value: answer }, 
        { name: 'Submitted by', value: `@${interaction.user.tag} (${interaction.user.id})` })
      .setColor('#e67e22');

    await suggestionThread.send({ embeds: [suggestionEmbed] });

    await interaction.reply({
      content: 'Your trivia question suggestion has been submitted!',
      ephemeral: true,
    });
  },

  name: 'trivia-suggestion',
  description: 'Submit a trivia question suggestion.',
  options: [
    {
      name: 'question',
      description: 'The trivia question',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'answer',
      description: 'The answer to the trivia question (optional)',
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
};