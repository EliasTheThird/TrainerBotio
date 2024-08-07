const {
    ApplicationCommandOptionType,
    EmbedBuilder, 
} = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

module.exports = {
    /**
     *
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        // Configuration variables
        const quoteFontSize = 48;
        const authorFontSize = 30;
        const lineHeight = 54; // Line height should generally be font size + some padding
        const quoteXPositionFactor = 0.5; // 0.9 means 90% from the left
        const quoteYPositionFactor = 0.5; // 0.5 means vertically centered

        // Fetching the message using the ID provided
        const messageId = interaction.options.getString('message_id');
        const message = await interaction.channel.messages.fetch(messageId).catch(console.error);
        if (!message) {
            await interaction.reply({ content: "Message not found.", ephemeral: true });
            return;
        }

        // Load a background image from a relative path
        const background = await loadImage(path.join(__dirname, '../../media/quote.jpg'));
        const canvas = createCanvas(background.width, background.height);
        const ctx = canvas.getContext('2d');

        // Draw the image onto the canvas
        ctx.drawImage(background, 0, 0);

        // Set the text style for the quote
        ctx.font = `bold ${quoteFontSize}px Arial`;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1; // Thickness of the outline
        ctx.textAlign = 'center';  // Align text to the right
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;

        // Text wrapping
        const lines = getWrappedText(`"${message.content}"`, canvas.width - 40, ctx);
        const startingY = canvas.height * quoteYPositionFactor - (lines.length * lineHeight) / 2;
        const xPosition = canvas.width * quoteXPositionFactor;

        // Draw each line of the quote with an outline
        lines.forEach((line, index) => {
            ctx.strokeText(line, xPosition, startingY + index * lineHeight); // Draw the outline
            ctx.fillText(line, xPosition, startingY + index * lineHeight); // Draw the fill
        });

        // Calculate the width of the author text
        const authorWidth = ctx.measureText(`- ${message.author.username}`).width;

        // Calculate the starting X position for the author text to right-align it
        const authorXPosition = canvas.width - 20 - authorWidth;

        // Draw the author text right-aligned
        ctx.strokeText(`- ${message.author.username}`, authorXPosition, startingY + lines.length * lineHeight + 30);
        ctx.fillText(`- ${message.author.username}`, authorXPosition, startingY + lines.length * lineHeight + 30);

        // Convert canvas to buffer
        const buffer = canvas.toBuffer('image/png');

        // Create an embed object
        const embed = {
            color: parseInt('2b2d31', 16), // Parse hexadecimal color code to integer
            description: `[**Jump to Original Message**](https://discord.com/channels/${interaction.guild.id}/${interaction.channelId}/${messageId})`,
            image: {
                url: 'attachment://quote.png'
            },
};

// Send the embed with the image as an attachment
await interaction.reply({ embeds: [embed], files: [{ attachment: buffer, name: 'quote.png' }] });


},

    name: 'quote',
    description: 'Quote a message!',
    options: [
        {
            name: 'message_id',
            description: 'The ID of the message to quote',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
};

function getWrappedText(text, maxWidth, context) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = context.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}
