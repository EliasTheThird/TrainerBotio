const { Events, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

const duplicateTracker = new Map();

const MEMORY_TIME = 5 * 60 * 1000; // 5 minutes
const LOG_CHANNEL_ID = "1162168193201229834";
const REASON = "automod: (link spam) suspected hacked account";

module.exports = (client) => {
  if (client._antiHackedAccountsRegistered) return;
  client._antiHackedAccountsRegistered = true;

  client.on(Events.MessageCreate, async (message) => {
    if (!message.guild) return;

    if (message.author.bot) return;

    if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) return;

    if (message.attachments.size === 0) return;

    const attachmentsArray = Array.from(message.attachments.values())
      .map(a => `${a.name}:${a.size}`)
      .sort();
    const key = attachmentsArray.join("|");

    let entry = duplicateTracker.get(key);

    if (!entry) {
      entry = {
        channels: new Set(),
        messages: new Map(),
        timeout: null,
      };

      entry.timeout = setTimeout(() => {
        duplicateTracker.delete(key);
      }, MEMORY_TIME);

      duplicateTracker.set(key, entry);
    }

    entry.channels.add(message.channelId);
    entry.messages.set(message.channelId, message);

    // Trigger condition: same attachments in 3+ channels
    if (entry.channels.size >= 3) {

      const affectedChannels = Array.from(entry.channels)
        .map(id => `<#${id}>`)
        .join(", ");

      // Capture what was deleted BEFORE deleting it
      const deletedSnapshots = [];
      for (const msg of entry.messages.values()) {
        const attachmentList = Array.from(msg.attachments.values())
          .map(a => `[${a.name}](${a.url})`)
          .join(", ") || "*(none)*";
        const content = msg.content?.trim()
          ? (msg.content.length > 200 ? msg.content.slice(0, 200) + "…" : msg.content)
          : "*(no text)*";
        deletedSnapshots.push(
          `**<#${msg.channelId}>**\n` +
          `Content: ${content}\n` +
          `Attachments: ${attachmentList}`
        );
      }
      let deletedSummary = deletedSnapshots.join("\n\n");
      if (deletedSummary.length > 1024) {
        deletedSummary = deletedSummary.slice(0, 1021) + "…";
      }

      // 1️⃣ Delete all messages
      for (const msg of entry.messages.values()) {
        try {
          await msg.delete();
        } catch {}
      }

      // 2️⃣ Kick the user
      try {
        if (message.member?.kickable) {
          await message.member.kick(REASON);
        }
      } catch {}

      // 3️⃣ Send embedded log
      try {
        const logChannel = await message.guild.channels.fetch(LOG_CHANNEL_ID);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setTitle("Auto Moderation")
            .setDescription(
              `> **User:** ${message.author.tag} (<@${message.author.id}>)\n` +
              `> **ID:** ${message.author.id}\n` +
              `> **Channel(s):** ${affectedChannels}\n` +
              `> **Reason:** ${REASON}\n` +
              `> **Action:** Messages deleted + Kicked`
            )
            .addFields({
              name: "Deleted Content",
              value: deletedSummary || "*(nothing captured)*",
            })
            .setColor('e67e22')
            .setTimestamp();

          await logChannel.send({ embeds: [embed] });
        }
      } catch {}

      // 4️⃣ Cleanup
      clearTimeout(entry.timeout);
      duplicateTracker.delete(key);
    }
  });
};