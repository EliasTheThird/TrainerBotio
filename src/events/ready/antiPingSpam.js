const { Events, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

const PING_LOG_CHANNEL_ID = "1147328581471584346"; 
const ACTION_LOG_CHANNEL_ID = "1162168193201229834"; 
const RULE_NAME = "Blocked Pings";
const REASON = "automod: (ping spam) suspected hacked account";
const STRIKE_LIMIT = 3;
const MEMORY_TIME = 5 * 60 * 1000; // 5 minutes


const pingTracker = new Map();

module.exports = (client) => {
  if (client._antiPingSpamRegistered) return;
  client._antiPingSpamRegistered = true;

  client.on(Events.MessageCreate, async (message) => {
    try {
      if (message.channel.id !== PING_LOG_CHANNEL_ID) return;
      if (!message.embeds.length) return;

      const embed = message.embeds[0];

      if (!embed.fields || !embed.fields.length) {
        return;
      }

      const fields = {};
      for (const f of embed.fields) {
        const name = f.name || f.rawName;
        const value = f.value || f.rawValue;
        if (name && value) fields[name.toLowerCase()] = value;
      }

      if (fields.rule_name !== RULE_NAME) return;
      if (fields.decision_outcome !== "blocked") return;

      const userId = message.author.id;
      const triggeredChannelId = fields.channel_id;

      const guild = message.guild;
      if (!guild) return;

      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return;

      if (member.user.bot) return;
      if (member.permissions.has(PermissionFlagsBits.Administrator)) return;

      // Track strikes
      let record = pingTracker.get(userId);
      if (!record) {
        record = { channels: new Set(), strikes: [], timeout: null };
        record.timeout = setTimeout(() => {
          pingTracker.delete(userId);
        }, MEMORY_TIME);
        pingTracker.set(userId, record);
      }

      record.channels.add(triggeredChannelId);

      // Capture what the user tried to send. Discord's native AutoMod puts
      // the full original message in the embed description (e.g. "mods
      // @everyone"), while `keyword_matched_content` only contains the
      // matched portion (e.g. "@everyone"). The description is preferred
      // because it preserves surrounding context; the rest are fallbacks
      // in case the format changes or another automod bot is in play.
      const blockedContent =
        embed.description ||
        fields.keyword_matched_content ||
        fields.content ||
        fields.message_content ||
        fields.matched_content ||
        "*(content not in log)*";
      record.strikes.push({ channelId: triggeredChannelId, content: blockedContent });

      if (record.channels.size >= STRIKE_LIMIT) {
        try {
          if (member.kickable) {
            await member.kick(REASON);
          }
        } catch (err) {}

        try {
          const logChannel = await guild.channels.fetch(ACTION_LOG_CHANNEL_ID);
          if (logChannel) {
            const affectedChannels = Array.from(record.channels)
              .map((id) => `<#${id}>`)
              .join(", ");

            // Build a per-strike summary of what was blocked
            const blockedSummary = record.strikes
              .map((s) => {
                const snippet = s.content.length > 150
                  ? s.content.slice(0, 150) + "…"
                  : s.content;
                return `**<#${s.channelId}>**: ${snippet}`;
              })
              .join("\n\n");
            const blockedValue = blockedSummary.length > 1024
              ? blockedSummary.slice(0, 1021) + "…"
              : (blockedSummary || "*(nothing captured)*");

            const embedLog = new EmbedBuilder()
              .setTitle("Auto Moderation")
              .setDescription(
                `> **User:** ${member.user.tag} (<@${userId}>)\n` +
                  `> **ID:** ${userId}\n` +
                  `> **Channel(s):** ${affectedChannels}\n` +
                  `> **Reason:** ${REASON}\n` +
                  `> **Action:** Kicked`
              )
              .addFields({
                name: "Blocked Content",
                value: blockedValue,
              })
              .setColor('e67e22')
              .setTimestamp();

            await logChannel.send({ embeds: [embedLog] });
          }
        } catch (err) {}

        clearTimeout(record.timeout);
        pingTracker.delete(userId);
      }

    } catch (err) {}
  });
};