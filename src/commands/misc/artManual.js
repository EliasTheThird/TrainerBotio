const {
    ApplicationCommandOptionType,
    EmbedBuilder,
    Client,
    Interaction
} = require('discord.js');

module.exports = {
    /**
     *
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        try {
            // Defer reply to avoid timeout issues
            await interaction.deferReply({ ephemeral: true });

            // Configuration variables
            const approvalChannelId = '1123709712005877821';  // Testing: 1095238175187816449 || Art: 1123709712005877821
            const pingRoleId = '1270813980063174787'; // ID of the @art ping role

            // Fetching options
            const image = interaction.options.getAttachment('image');
            const author = interaction.options.getUser('author');
            const title = interaction.options.getString('title') || 'Untitled';
            const description = interaction.options.getString('description') || ' ';

            if (!image) {
                await interaction.editReply({ content: "You must upload an image." });
                return;
            }

            const approvalEmbed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setImage(image.url)
                .setColor('#e67e22')
                .setFooter({ text: `Submitted by: ${author.tag}` });

            const approvalChannel = await client.channels.fetch(approvalChannelId);

            await approvalChannel.send({ content: `<@&${pingRoleId}> new art has been posted!`, embeds: [approvalEmbed] });

            await interaction.editReply({ content: "Art submission has been posted successfully." });
        } catch (error) {
            console.error('An error occurred:', error);
            await interaction.editReply({ content: 'An error occurred while posting the art submission.' });
        }
    },

    name: 'postart',
    description: 'Manually post an art submission with image, title, description, and author',
    options: [
        {
            name: 'image',
            description: 'The image of the art to submit',
            type: ApplicationCommandOptionType.Attachment,
            required: true,
        },
        {
            name: 'author',
            description: 'The author of the art submission',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: 'title',
            description: 'The title of the art',
            type: ApplicationCommandOptionType.String,
            required: false,
        },
        {
            name: 'description',
            description: 'The description of the art',
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],
};
