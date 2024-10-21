const { ApplicationCommandOptionType } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const fetch = require('node-fetch'); // Import node-fetch for HTTP requests
const sharp = require('sharp'); // Import sharp for image conversion
const path = require('path'); // Import path module
const defaultAvatarPath = path.join(__dirname, '../../media/defaultpfp.jpg');
const cooldowns = new Map(); // Create a cooldown map to track user cooldowns

module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    const userId = interaction.user.id;

    // Cooldown bypass for user ID: 742766266699481089
    const bypassUserId = '742766266699481089';

    // Check for cooldown only if the user is not the bypass user
    if (userId !== bypassUserId) {
      const now = Date.now();
      const cooldownAmount = 30 * 60 * 1000; // 30 minutes in milliseconds

      // Check if user is in cooldown map
      if (cooldowns.has(userId)) {
        const expirationTime = cooldowns.get(userId) + cooldownAmount;
        if (now < expirationTime) {
          const timeLeft = Math.round((expirationTime - now) / 1000);
          await interaction.reply({ content: `Please wait ${timeLeft} more seconds before using this command again.`, ephemeral: true });
          return;
        }
      }

      // Set the cooldown for the user
      cooldowns.set(userId, now);
    }

    // Configuration variables
    const baseQuoteFontSize = 60; // Increased base font size for the quote
    const baseAuthorFontSize = 36; // Increased base font size for the author
    const lineHeight = 32; // Reduced line height for closer spacing

    // Fetch the message using the ID provided
    const messageId = interaction.options.getString('message_id');
    const message = await interaction.channel.messages.fetch(messageId).catch(console.error);
    if (!message) {
      await interaction.reply({ content: 'Message not found.', ephemeral: true });
      return;
    }

    // Get the author's avatar with a larger size for better quality
    const avatarURL = message.author.displayAvatarURL({ format: 'png', size: 1024 }); // Fetch a larger avatar

    // Create canvas with a width that accommodates the profile picture and text
    const canvas = createCanvas(800, 400); // Adjust dimensions as needed
    const ctx = canvas.getContext('2d');

    // Fill the background with solid black
    ctx.fillStyle = '#000000'; // Solid black
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Fills the entire canvas

    // Declare avatar variable
    let avatar;

    // Load and draw the user's avatar
    try {
      // Fetch the avatar image
      const response = await fetch(avatarURL);
      const buffer = await response.buffer();

      // Check the image type based on the URL or buffer
      const imageType = response.headers.get('content-type');
      if (!imageType || !imageType.startsWith('image/')) {
        throw new Error('Unsupported image type');
      }

      // If the avatar is in webp format, convert it to PNG format
      if (imageType === 'image/webp') {
        const pngBuffer = await sharp(buffer).toFormat('png').toBuffer();
        avatar = await loadImage(pngBuffer); // Load the converted PNG image
      } else {
        avatar = await loadImage(buffer); // Load the image directly
      }
    } catch (error) {
      console.error('Failed to load avatar:', error);
      // Use a default avatar image
      try {
        avatar = await loadImage(defaultAvatarPath);
      } catch (defaultError) {
        console.error('Failed to load default avatar:', defaultError);
        return; // Early exit if both fail
      }
    }

    const avatarWidth = canvas.width / 2; // Width of avatar (half of canvas width)
    const avatarHeight = canvas.height; // Full height of the canvas
    ctx.drawImage(avatar, 0, 0, avatarWidth, avatarHeight); // Position (0, 0) with calculated width and height

    // Create a larger fading effect
    const fadeWidth = 150; // Increase this value for a larger fade effect
    const fadeGradient = ctx.createLinearGradient(avatarWidth - fadeWidth, 0, avatarWidth, 0); // Start gradient at the left edge of the fade area
    fadeGradient.addColorStop(0, 'rgba(43, 45, 49, 0)'); // Transparent
    fadeGradient.addColorStop(1, 'rgba(0, 0, 0, 1)'); // Black
    ctx.fillStyle = fadeGradient;
    ctx.fillRect(avatarWidth - fadeWidth, 0, fadeWidth, canvas.height); // Fill the rectangle with the fade effect

    // Prepare the quote and author text
    const quoteText = `"${message.content}"`;
    const authorText = `- ${message.author.username}`; // Removed discriminator
    const fullText = `${quoteText}\n${authorText}`; // Combine quote and author with a newline

    // Determine the appropriate font size for the quote
    let quoteFontSize = getFittedFontSize(ctx, quoteText, avatarWidth - 40, baseQuoteFontSize);
    ctx.font = `bold italic ${quoteFontSize}px Arial`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center'; // Center align the text horizontally

    // Text wrapping for the quote
    const lines = getWrappedText(quoteText, avatarWidth - 40, ctx); // Adjusted to accommodate padding
    const startingY = canvas.height / 2 - (lines.length * lineHeight) / 2;

    // Draw each line of the quote centered on the right side
    lines.forEach((line, index) => {
      ctx.fillText(line, avatarWidth + (canvas.width - avatarWidth) / 2, startingY + index * lineHeight); // Centered on the right side
    });

    // Determine the appropriate font size for the author
    let authorFontSize = getFittedFontSize(ctx, authorText, avatarWidth - 40, baseAuthorFontSize);
    ctx.font = `bold ${authorFontSize}px Arial`;

    // Draw the author text on a new line centered on the right side
    ctx.fillText(authorText, avatarWidth + (canvas.width - avatarWidth) / 2, startingY + lines.length * lineHeight + lineHeight); // New line with added spacing

    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png');

    // Send the image with a link to the original message
    const messageLink = `https://discord.com/channels/${interaction.guild.id}/${interaction.channelId}/${messageId}`;
    await interaction.reply({
      content: `**[Jump to Original Message](${messageLink})**`, // Updated content
      files: [{ attachment: buffer, name: 'quote.png' }],
    });
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

// Function to dynamically adjust font size based on the text and available width
function getFittedFontSize(ctx, text, maxWidth, baseFontSize) {
  let fontSize = baseFontSize;
  ctx.font = `bold ${fontSize}px Arial`;

  // Measure the text width and reduce the font size if it exceeds the max width
  while (ctx.measureText(text).width > maxWidth && fontSize > 20) {
    // Minimum font size of 20
    fontSize -= 1; // Decrease font size by 1 for a more gradual adjustment
    ctx.font = `bold ${fontSize}px Arial`;
  }

  return fontSize;
}

// Function to wrap text into multiple lines based on the maximum width
function getWrappedText(text, maxWidth, ctx) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + (currentLine.length ? ' ' : '') + word;
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word; // Start a new line with the current word
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine); // Add the last line if there's any remaining text
  }

  return lines;
}
