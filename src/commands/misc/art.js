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
            // Defer the reply to ensure we don't hit the 3-second timeout
            await interaction.deferReply({ ephemeral: true });

            // Initialize cooldown map if it doesn't exist
            if (!client.cooldowns) {
                client.cooldowns = new Map();
            }

            // Per-person cooldown key
            const cooldownKey = `${interaction.user.id}-art-submission`; // Unique per-user cooldown key
            const cooldown = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

            if (client.cooldowns.has(cooldownKey) && Date.now() - client.cooldowns.get(cooldownKey) < cooldown) {
                await interaction.editReply({
                    content: 'You have already submitted art within the last 24 hours. Please wait before submitting again.',
                });
                return;
            }

            // Set the cooldown for this user
            client.cooldowns.set(cooldownKey, Date.now());

            // Configuration variables
            const staffChannelId = '1270803780115628042';
            const approvalChannelId = '1123709712005877821';  // Testing: 1095238175187816449 || Art: 1123709712005877821
            const pingRoleId = '1270813980063174787';

            // Fetching the uploaded image, title, and description
            const image = interaction.options.getAttachment('image');
            const title = interaction.options.getString('title') || 'Untitled';
            const description = interaction.options.getString('description') || ' ';

            if (!image) {
                await interaction.editReply({ content: "You must upload an image." });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('New Art Submission')
                .setDescription(`**Title:** ${title}\n**Description:** ${description}\n**Submitted by:** ${interaction.user.tag}`)
                .setImage(image.url)
                .setColor('#e67e22');

            const staffChannel = await client.channels.fetch(staffChannelId);

            const approvalMessage = await staffChannel.send({ embeds: [embed] });

            // Adding approval and denial reactions
            await approvalMessage.react('✅');
            await approvalMessage.react('❌');

            const filter = (reaction, user) => {
                return ['✅', '❌'].includes(reaction.emoji.name) && !user.bot;
            };

            const collector = approvalMessage.createReactionCollector({ filter, max: 1, time: 86400000 }); // Collect for 24 hours

            collector.on('collect', async (reaction, user) => {
                if (reaction.emoji.name === '✅') {
                    const approvalEmbed = new EmbedBuilder()
                        .setTitle(title)
                        .setDescription(description)
                        .setImage(image.url)
                        .setColor('#e67e22')
                        .setFooter({ text: `Submitted by: ${interaction.user.tag}` });

                    const approvalChannel = await client.channels.fetch(approvalChannelId);

                    await approvalChannel.send({ content: `<@&${pingRoleId}> new art has been posted by <@${interaction.user.id}>!`, embeds: [approvalEmbed] });
                    await staffChannel.send('The art submission has been approved.');
                    
                } else if (reaction.emoji.name === '❌') {
                    await staffChannel.send('The art submission has been denied.');
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    staffChannel.send('No action was taken on this submission within 24 hours.');
                }
            });

            await interaction.editReply({ content: "Your art submission has been sent for approval." });
        } catch (error) {
            console.error('An error occurred:', error);
            await interaction.editReply({ content: 'An error occurred while processing your submission.' });
        }
    },

    deleted: true,
    name: 'art',
    description: 'Submit your art for approval!',
    options: [
        {
            name: 'image',
            description: 'The image of the art to submit',
            type: ApplicationCommandOptionType.Attachment,
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
