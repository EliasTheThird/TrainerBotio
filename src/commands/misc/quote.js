const { ApplicationCommandOptionType } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const fetch = require('node-fetch');
const sharp = require('sharp');
const path = require('path');

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const DEFAULT_AVATAR_PATH = path.join(__dirname, '../../media/defaultpfp.jpg');
const LOG_CHANNEL_ID      = '1441531334324654221'; // TDG || swap for testing server
const BYPASS_ROLE_IDS     = ['1126183128084529203']; // roles that skip cooldown
const COOLDOWN_MS         = 30 * 60 * 1000; // 30 minutes

// Canvas dimensions
const W = 900, H = 420;
const AVATAR_W = W / 2;
const TEXT_X   = AVATAR_W + (W - AVATAR_W) / 2; // centre of right panel
const FADE_W   = 340; // how wide the avatar→black gradient is (pushes well into the avatar)

// Font sizes
const QUOTE_BASE_SIZE  = 36;
const QUOTE_MIN_SIZE   = 16;
const AUTHOR_SIZE      = 28;
const USERNAME_SIZE    = 19;
const LINE_HEIGHT_MULT = 1.45; // multiplied against font size
const MAX_QUOTE_LINES  = 6;    // truncate with … beyond this many lines

// ─── COOLDOWN MAP ─────────────────────────────────────────────────────────────

const cooldowns = new Map();

// ─── COMMAND DEFINITION ──────────────────────────────────────────────────────

module.exports = {
  name: 'quote',
  description: 'Turn any message into a stylish quote image.',
  options: [
    {
      name: 'message',
      description: 'Message ID or Message Link to quote',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],

  callback: async (client, interaction) => {
    // Defer immediately so we don't time out during canvas work
    await interaction.deferReply();

    const userId = interaction.user.id;

    // ── Cooldown check ────────────────────────────────────────────────────────
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    const hasBypass = BYPASS_ROLE_IDS.some(id => member?.roles.cache.has(id));

    if (!hasBypass) {
      const now = Date.now();
      const lastUsed = cooldowns.get(userId);
      if (lastUsed && now < lastUsed + COOLDOWN_MS) {
        const secsLeft = Math.ceil((lastUsed + COOLDOWN_MS - now) / 1000);
        await interaction.editReply({
          content: `⏳ Please wait **${formatSeconds(secsLeft)}** before using this command again.`,
        });
        return;
      }
      cooldowns.set(userId, now);
      setTimeout(() => cooldowns.delete(userId), COOLDOWN_MS);
    }

    // ── Fetch target message ─────────────────────────────────────────────────
    const raw = interaction.options.getString('message');

    if (!raw?.trim()) {
      await interaction.editReply({
        content: '❌ Please provide a message ID or message link.',
      });
      return;
    }

    const input = raw.trim();

    // Parse either a bare ID or a full message link:
    // https://discord.com/channels/<guildId>/<channelId>/<messageId>
    const linkMatch = input.match(/^https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/\d+\/(\d+)\/(\d+)/);

    let channelId, messageId;
    if (linkMatch) {
      channelId = linkMatch[1];
      messageId = linkMatch[2];
    } else if (/^\d+$/.test(input)) {
      channelId = interaction.channelId;
      messageId = input;
    } else {
      await interaction.editReply({
        content: '❌ Please provide a valid message ID or message link.',
      });
      return;
    }

    // Resolve the channel — it may differ from the current one if a link was used.
    // client.channels.fetch() is used (not guild.channels.fetch) because threads
    // are not returned by the guild channels cache.
    let targetChannel;
    if (channelId === interaction.channelId) {
      targetChannel = interaction.channel;
    } else {
      targetChannel = await client.channels.fetch(channelId).catch((err) => {
        console.error(`[quote] Failed to fetch channel ${channelId}:`, err);
        return null;
      });
    }

    if (!targetChannel) {
      await interaction.editReply({
        content: '❌ Could not access the channel that message is in.',
      });
      return;
    }

    const message = await targetChannel.messages.fetch(messageId).catch(() => null);

    if (!message) {
      await interaction.editReply({
        content: '❌ Message not found. Make sure the ID or link is correct.',
      });
      return;
    }

    if (!message.content?.trim()) {
      await interaction.editReply({
        content: '❌ That message has no text content to quote.',
      });
      return;
    }

    // ── Resolve display info ─────────────────────────────────────────────────
    const authorMember  = message.guild.members.cache.get(message.author.id);
    const displayName   = authorMember?.displayName ?? message.author.username;
    const rawUsername   = message.author.username;
    const resolvedText  = await resolveDiscordPings(interaction.guild, message.content);

    // ── Build canvas ─────────────────────────────────────────────────────────
    const buffer = await buildQuoteImage(resolvedText, displayName, rawUsername, authorMember, message.author);

    // ── Reply ─────────────────────────────────────────────────────────────────
    const jumpURL = `https://discord.com/channels/${interaction.guild.id}/${message.channelId}/${message.id}`;

    await interaction.editReply({
      content: `**[Jump to original message](${jumpURL})**`,
      files: [{ attachment: buffer, name: 'quote.png' }],
    });

    // ── Log ───────────────────────────────────────────────────────────────────
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      await logChannel.send({
        content: `**[Jump to original message](${jumpURL})**`,
        files: [{ attachment: buffer, name: 'quote.png' }],
      });
    }
  },
};

// ─── IMAGE BUILDER ────────────────────────────────────────────────────────────

async function buildQuoteImage(text, displayName, username, authorMember, authorUser) {
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // Avatar
  const avatar = await loadAvatar(authorMember, authorUser);
  ctx.drawImage(avatar, 0, 0, AVATAR_W, H);

  // Fade overlay (avatar → black). Starts at x=0 so the transparent stop is well
  // inside the avatar, and the opaque stop lands just past the midpoint seam.
  const fadeStartX = Math.max(0, AVATAR_W - FADE_W);
  const fade = ctx.createLinearGradient(fadeStartX, 0, AVATAR_W + 20, 0);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(fadeStartX, 0, AVATAR_W + 20 - fadeStartX, H);

  // ── Measure and lay out text ─────────────────────────────────────────────
  const maxTextW = W - AVATAR_W - 48; // right-panel width minus padding
  // NOTE: do NOT call stripUnsupportedChars on the full text here — that would
  // destroy the <:name:id> emoji tags before wrapText can tokenise them.
  // Stripping happens per text-segment inside tokeniseText() instead.
  const quotedText = `"${text}"`;

  const fontSize = fitFontSize(ctx, quotedText, maxTextW, QUOTE_BASE_SIZE, QUOTE_MIN_SIZE);
  const lineH    = Math.round(fontSize * LINE_HEIGHT_MULT);

  ctx.font = `italic ${fontSize}px Arial`;
  const wrappedLines = wrapText(ctx, quotedText, maxTextW);

  // Total block height: quote lines + gap + author line + username line
  const quoteBlockH  = wrappedLines.length * lineH;
  const authorBlockH = AUTHOR_SIZE + 8 + USERNAME_SIZE;
  const totalH       = quoteBlockH + 20 + authorBlockH;
  let   y            = H / 2 - totalH / 2 + fontSize; // baseline of first line

  // ── Draw quote lines ─────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = `italic ${fontSize}px Arial`;

  for (const line of wrappedLines) {
    await drawMixedLine(ctx, line, TEXT_X, y, fontSize);
    y += lineH;
  }

  // ── Draw author name ──────────────────────────────────────────────────────
  y += 20; // gap between quote and attribution
  ctx.font      = `bold ${AUTHOR_SIZE}px Arial`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`- ${stripUnsupportedChars(displayName).trim()}`, TEXT_X, y);

  // ── Draw @username ────────────────────────────────────────────────────────
  y += AUTHOR_SIZE * 1.4;
  ctx.font      = `${USERNAME_SIZE}px Arial`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(`@${stripUnsupportedChars(username).trim()}`, TEXT_X, y);

  return canvas.toBuffer('image/png');
}

// ─── FONT FITTING ─────────────────────────────────────────────────────────────

/**
 * Reduce font size until the longest "word" (or the full text) fits within maxW.
 * Starts large and steps down by 1px until everything wraps within maxW.
 */
function fitFontSize(ctx, text, maxW, baseSize, minSize) {
  let size = baseSize;

  // Bias starting size by word count — longer messages start smaller
  const wordCount = text.split(' ').length;
  if (wordCount > 20) size = Math.max(minSize, baseSize - 10);
  else if (wordCount > 12) size = Math.max(minSize, baseSize - 5);

  while (size > minSize) {
    ctx.font = `italic ${size}px Arial`;
    const words = text.split(' ');
    const longestWord = words.reduce((a, b) => (ctx.measureText(a).width > ctx.measureText(b).width ? a : b), '');
    if (ctx.measureText(longestWord).width <= maxW) break;
    size--;
  }
  return size;
}

// ─── TEXT WRAPPING ────────────────────────────────────────────────────────────

// ─── TOKENISER ────────────────────────────────────────────────────────────────

/**
 * Break a string into an ordered array of tokens:
 *   { type: 'custom_emoji', name, id, animated }  — Discord <:name:id> / <a:name:id>
 *   { type: 'unicode_emoji', sequence }            — standard Unicode emoji (one grapheme cluster)
 *   { type: 'text', content }                      — everything else, already stripped
 *
 * Text segments have stripUnsupportedChars applied so decorative symbols are
 * removed without touching the emoji tags that need separate handling.
 */
function tokeniseText(raw) {
  // Matches both animated and static custom Discord emoji
  const CUSTOM = /<(a?):(\w+):(\d+)>/g;

  // Matches Unicode emoji sequences: base char (U+1F000+) plus optional
  // variation selector, ZWJ sequences, and skin-tone / gender modifiers.
  // Covers: single emoji, ZWJ sequences, flags (regional indicator pairs),
  // keycap sequences, and tag sequences.
  const UNICODE_EMOJI = /(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\uFE0F|\uFE0E)?(?:[\u{1F3FB}-\u{1F3FF}])?(?:\u200D(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\uFE0F)?(?:[\u{1F3FB}-\u{1F3FF}])?)*|\p{Regional_Indicator}\p{Regional_Indicator}|[#*0-9]\uFE0F?\u20E3/gu;

  const tokens = [];

  // Walk through the string, extracting custom emoji, unicode emoji, and text
  let i = 0;
  // Build a combined regex that matches either custom or unicode emoji
  const COMBINED = /<a?:\w+:\d+>|(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\uFE0F|\uFE0E)?(?:[\u{1F3FB}-\u{1F3FF}])?(?:\u200D(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\uFE0F)?(?:[\u{1F3FB}-\u{1F3FF}])?)*|\p{Regional_Indicator}\p{Regional_Indicator}|[#*0-9]\uFE0F?\u20E3/gu;

  let last = 0;
  let m;
  COMBINED.lastIndex = 0;
  while ((m = COMBINED.exec(raw)) !== null) {
    // Text before this match
    if (m.index > last) {
      const chunk = stripUnsupportedChars(raw.slice(last, m.index));
      if (chunk) tokens.push({ type: 'text', content: chunk });
    }

    const match = m[0];
    const customMatch = match.match(/^<(a?):(\w+):(\d+)>$/);
    if (customMatch) {
      tokens.push({
        type: 'custom_emoji',
        animated: customMatch[1] === 'a',
        name: customMatch[2],
        id: customMatch[3],
      });
    } else {
      tokens.push({ type: 'unicode_emoji', sequence: match });
    }

    last = m.index + match.length;
  }

  // Remaining text
  if (last < raw.length) {
    const chunk = stripUnsupportedChars(raw.slice(last));
    if (chunk) tokens.push({ type: 'text', content: chunk });
  }

  return tokens;
}

// ─── TEXT WRAPPING ────────────────────────────────────────────────────────────

/**
 * Emoji render size: match font cap-height so it sits on the baseline naturally.
 * Kept as a multiplier of fontSize so every place uses the same value.
 */
const EMOJI_SCALE = 0.95; // slightly under 1em so it doesn't dwarf letters

/**
 * Wrap tokens into lines, capping at maxLines.
 * If content is cut short the final line ends with '…'.
 *
 * Spaces are preserved between words and emoji. We only skip a leading space
 * token if it's at the very beginning of the whole text (line 0, empty line).
 * Trailing spaces are stripped just before pushing a completed line so they
 * don't affect the centered-width calculation in drawMixedLine.
 */
function wrapText(ctx, text, maxW, maxLines = MAX_QUOTE_LINES) {
  const fontSize  = parseFontSize(ctx.font);
  const emojiW    = Math.round(fontSize * EMOJI_SCALE);
  const ellipsisW = ctx.measureText('…').width;

  const measureTok = (t) => t.type === 'text' ? ctx.measureText(t.content).width : emojiW;

  // Tokenise, then expand text tokens into per-word tokens (spaces kept as own tokens)
  const rawTokens  = tokeniseText(text);
  const wordTokens = [];
  for (const tok of rawTokens) {
    if (tok.type === 'text') {
      for (const p of tok.content.split(/(\s+)/)) {
        if (p) wordTokens.push({ type: 'text', content: p });
      }
    } else {
      wordTokens.push(tok);
    }
  }

  const lines = [];
  let curLine = [];
  let curW    = 0;

  /** Strip trailing whitespace tokens from curLine + update curW, for clean line ends. */
  const trimTrailing = () => {
    while (curLine.length) {
      const last = curLine[curLine.length - 1];
      if (last.type === 'text' && /^\s+$/.test(last.content)) {
        curW -= measureTok(last);
        curLine.pop();
      } else break;
    }
  };

  for (let i = 0; i < wordTokens.length; i++) {
    const tok     = wordTokens[i];
    const tw      = measureTok(tok);
    const isSpace = tok.type === 'text' && /^\s+$/.test(tok.content);

    // Skip a space at the start of any line — either the absolute beginning of
    // the text, or right after a line-break. A space here means it was the
    // separator between the last word of the previous line and the first token
    // of this one; it has no visual role on a centered line.
    if (isSpace && curLine.length === 0) continue;

    const wouldOverflow = curW + tw > maxW && curLine.length > 0;

    if (!isSpace && wouldOverflow) {
      // Close this line
      trimTrailing();

      if (lines.length + 1 >= maxLines) {
        appendEllipsis(ctx, curLine, curW, maxW, ellipsisW, emojiW);
        lines.push(curLine);
        return lines;
      }

      lines.push(curLine);
      curLine = [];
      curW    = 0;

      // When starting a fresh line after a wrap, skip only a space token that
      // immediately follows the line break (there's no visual need for it since
      // the previous line already ended after the word — any space here would
      // just indent the new line). But if this token IS a space we would have
      // caught it with !isSpace above, so this branch only runs for real tokens.
      // The overflowing token itself (tok) goes onto the new line normally.
    }

    curLine.push(tok);
    curW += tw;
  }

  trimTrailing();
  if (curLine.length) lines.push(curLine);
  return lines;
}

/**
 * Append '…' to parts, trimming tokens from the right until it fits.
 * Always appends — caller is responsible for only calling when truncation is needed.
 */
function appendEllipsis(ctx, parts, currentW, maxW, ellipsisW, emojiW) {
  const tokenW = (p) => p.type === 'text' ? ctx.measureText(p.content).width : emojiW;
  let w = currentW;

  // Remove from the right until there's room for '…'
  while (parts.length > 0 && w + ellipsisW > maxW) {
    const last = parts[parts.length - 1];
    if (last.type === 'text' && last.content.length > 1) {
      const removed = last.content[last.content.length - 1];
      last.content = last.content.slice(0, -1).trimEnd();
      w -= ctx.measureText(removed).width;
      if (last.content === '') { parts.pop(); }
    } else {
      w -= tokenW(last);
      parts.pop();
    }
  }

  parts.push({ type: 'text', content: '…' });
}

// ─── MIXED LINE RENDERER ──────────────────────────────────────────────────────

async function drawMixedLine(ctx, parts, centerX, y, fontSize) {
  const emojiSize = Math.round(fontSize * EMOJI_SCALE);

  // Measure total width using the same formula as wrapText
  let totalW = 0;
  for (const part of parts) {
    totalW += part.type === 'text' ? ctx.measureText(part.content).width : emojiSize;
  }

  let x = centerX - totalW / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';

  for (const part of parts) {
    if (part.type === 'text') {
      const w = ctx.measureText(part.content).width;
      ctx.fillText(part.content, x, y);
      x += w;

    } else if (part.type === 'custom_emoji') {
      try {
        const img = await loadCustomEmoji(part);
        ctx.drawImage(img, x, y - emojiSize * 0.85, emojiSize, emojiSize);
      } catch {
        // silent skip
      }
      x += emojiSize;

    } else if (part.type === 'unicode_emoji') {
      try {
        const img = await loadUnicodeEmoji(part.sequence);
        ctx.drawImage(img, x, y - emojiSize * 0.85, emojiSize, emojiSize);
      } catch {
        ctx.fillText(part.sequence, x, y);
      }
      x += emojiSize;
    }
  }

  ctx.textAlign = prevAlign;
}

// ─── AVATAR LOADER ────────────────────────────────────────────────────────────

async function loadAvatar(member, author) {
  const url = member?.displayAvatarURL({ extension: 'png', size: 1024 })
           ?? author?.displayAvatarURL({ extension: 'png', size: 1024 });
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf       = await res.buffer();
    const mediaType = res.headers.get('content-type') ?? '';
    if (!mediaType.startsWith('image/')) throw new Error('Not an image');
    const pngBuf = await sharp(buf).png().toBuffer();
    return await loadImage(pngBuf);
  } catch (err) {
    console.warn('[quote] Avatar load failed, using default:', err.message);
    return await loadImage(DEFAULT_AVATAR_PATH);
  }
}

// ─── EMOJI LOADERS ────────────────────────────────────────────────────────────

/** Load a custom Discord emoji (static webp or animated gif → PNG frame) */
async function loadCustomEmoji(emoji) {
  const ext = emoji.animated ? 'gif' : 'webp';
  const url = `https://cdn.discordapp.com/emojis/${emoji.id}.${ext}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for emoji ${emoji.id}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Convert to PNG (sharp extracts first frame of GIFs automatically)
  const png = await sharp(buf).png().toBuffer();
  return await loadImage(png);
}

/**
 * Load a standard Unicode emoji as an image via Twemoji CDN.
 * Converts the emoji sequence to its codepoint hex string (e.g. "1f600").
 * Falls back to trying a variation-selector-stripped version if the first
 * attempt 404s, since some sequences are stored without VS-16 (U+FE0F).
 */
async function loadUnicodeEmoji(sequence) {
  const toCodepoints = (str) => {
    const points = [];
    for (const char of str) {
      const cp = char.codePointAt(0);
      // Skip variation selectors (U+FE0F, U+FE0E) and zero-width joiners
      // that Twemoji omits from its filenames
      if (cp === 0xFE0F || cp === 0xFE0E || cp === 0x200D) continue;
      points.push(cp.toString(16));
    }
    return points.join('-');
  };

  const tryLoad = async (seq) => {
    const codepoints = toCodepoints(seq);
    const url = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${codepoints}.svg`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Twemoji 404: ${codepoints}`);
    const svgBuf = Buffer.from(await res.arrayBuffer());
    // sharp can rasterise SVG natively
    const png = await sharp(svgBuf).resize(64, 64).png().toBuffer();
    return await loadImage(png);
  };

  // First try the full sequence, then without variation selectors
  try {
    return await tryLoad(sequence);
  } catch {
    // Strip variation selectors and retry
    const stripped = sequence.replace(/[\uFE0F\uFE0E]/g, '');
    return await tryLoad(stripped);
  }
}

// ─── PING RESOLVER ────────────────────────────────────────────────────────────

async function resolveDiscordPings(guild, content) {
  if (!guild) return content;

  // User mentions
  let resolved = await replaceAsync(content, /<@!?(\d+)>/g, async (_, uid) => {
    const m = guild.members.cache.get(uid)
           ?? await guild.members.fetch(uid).catch(() => null);
    return m ? `@${m.displayName}` : '@Unknown';
  });

  // Role mentions
  resolved = resolved.replace(/<@&(\d+)>/g, (_, rid) => {
    const role = guild.roles.cache.get(rid);
    return role ? `@${role.name}` : '@Unknown Role';
  });

  // Channel mentions
  resolved = resolved.replace(/<#(\d+)>/g, (_, cid) => {
    const channel = guild.channels.cache.get(cid);
    return channel ? `#${channel.name}` : '#unknown-channel';
  });

  return resolved;
}

async function replaceAsync(str, regex, fn) {
  const promises = [];
  str.replace(regex, (match, ...args) => { promises.push(fn(match, ...args)); });
  const results = await Promise.all(promises);
  return str.replace(regex, () => results.shift());
}

// ─── UTILS ────────────────────────────────────────────────────────────────────

/**
 * Strip characters Arial can't render so they don't appear as tofu boxes.
 *
 * Rather than blacklisting individual code points we WHITELIST the Unicode
 * blocks Arial reliably supports, then drop everything else. Blocks kept:
 *   - Basic Latin & Latin-1 Supplement          U+0020–U+00FF
 *   - Latin Extended A/B                        U+0100–U+024F
 *   - IPA Extensions                            U+0250–U+02AF
 *   - Spacing Modifier Letters                  U+02B0–U+02FF
 *   - Combining Diacritical Marks               U+0300–U+036F
 *   - Greek & Coptic                            U+0370–U+03FF
 *   - Cyrillic + Supplement                     U+0400–U+052F
 *   - Hebrew                                    U+0590–U+05FF
 *   - Arabic                                    U+0600–U+06FF
 *   - CJK Unified Ideographs (common subset)    U+4E00–U+9FFF
 *   - CJK Compatibility                         U+F900–U+FAFF
 *   - General Punctuation                       U+2000–U+206F
 *   - Currency Symbols                          U+20A0–U+20CF
 *   - Letterlike Symbols                        U+2100–U+214F
 *   - Number Forms                              U+2150–U+218F
 *   - Arrows                                    U+2190–U+21FF
 *
 * Everything else (decorative symbols like ｡⋆౨ৎ˚, Halfwidth Katakana,
 * Supplemental characters, emoji, etc.) is removed.
 *
 * Surrogates and private-use blocks are always stripped regardless.
 */
function stripUnsupportedChars(str) {
  return str
    .replace(/<a?:\w+:\d+>/g, '')          // Discord custom emoji tags
    .replace(/[\uD800-\uDFFF]/g, '')        // Unpaired surrogates / astral chars encoded as pairs
    .replace(/[\uE000-\uF8FF]/g, '')        // Private Use Area
    .split('')
    .filter(ch => {
      const cp = ch.codePointAt(0);
      return (
        (cp >= 0x0020 && cp <= 0x024F) ||  // Basic Latin → Latin Extended B
        (cp >= 0x0250 && cp <= 0x02FF) ||  // IPA + Spacing Modifiers
        (cp >= 0x0300 && cp <= 0x036F) ||  // Combining Diacritical Marks
        (cp >= 0x0370 && cp <= 0x03FF) ||  // Greek & Coptic
        (cp >= 0x0400 && cp <= 0x052F) ||  // Cyrillic
        (cp >= 0x0590 && cp <= 0x05FF) ||  // Hebrew
        (cp >= 0x0600 && cp <= 0x06FF) ||  // Arabic
        (cp >= 0x2000 && cp <= 0x206F) ||  // General Punctuation
        (cp >= 0x20A0 && cp <= 0x20CF) ||  // Currency Symbols
        (cp >= 0x2100 && cp <= 0x218F) ||  // Letterlike / Number Forms
        (cp >= 0x2190 && cp <= 0x21FF) ||  // Arrows
        (cp >= 0x4E00 && cp <= 0x9FFF) ||  // CJK Unified Ideographs
        (cp >= 0xF900 && cp <= 0xFAFF)     // CJK Compatibility
      );
    })
    .join('')
    .replace(/\s{2,}/g, ' ');
  // NOTE: no .trim() here — leading/trailing spaces in a text chunk are
  // meaningful when the chunk is adjacent to an emoji token.
}

function formatSeconds(secs) {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60), s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

/**
 * Extract the numeric px size from a ctx.font string like "italic 36px Arial"
 * or "bold 28px Arial". parseInt() fails on strings starting with letters.
 */
function parseFontSize(fontStr) {
  const m = fontStr.match(/(\d+(?:\.\d+)?)px/);
  return m ? parseFloat(m[1]) : 16; // fallback to 16 if unparseable
}