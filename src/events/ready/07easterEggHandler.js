const fs = require('fs');
const path = require('path');

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const ALLOWED_CHANNELS = new Set([
  '1144153321452609597',
  '1064371335016489011',
  '1128652042236330084',
  '1064371336278970419',
  '1064371337977679972',
  '1129773568306188358',
  '1121465540242833479',
  '1127041917834764308',
  '1121467640725114940',
  '1121468218410799204',
]);
const LOCK_EMOJI = '<:lock_IDS:1481078926460850187>';

const NORMAL_EGG_POOL = [
  { name: 'egg_of_knowledge',           id: '1481078835381538989' },
  { name: 'Pinkeggwithbluebutterflies', id: '1481078779500822629' },
  { name: 'easter',                     id: '1481078815848529951' },
  { name: 'egg_of_nostalgia',           id: '1481078861075710101' },
  { name: 'Corporate_egg',              id: '1481078502261395506' },
  { name: 'Dinosaur_Egg',               id: '1481078562806169610' },
  { name: 'EasterEgg',                  id: '1481078593730773003' },
  { name: 'EasterEgg',                  id: '1481078620997812407' },
  { name: 'EasterEgg',                  id: '1481078648793596125' },
  { name: 'Pink_easter_egg',            id: '1481078757229068350' },
];

const SPECIAL_EGG_POOL = [
  { name: 'Mythical_Egg',   id: '1481078736374861926' },
  { name: 'Exeggcute',      id: '1481078688991674520' },
  { name: 'Dario_egg',      id: '1481078533949489373' },
  { name: 'egg_of_royalty', id: '1481078879849287802' },
  { name: 'Fancy_Egg',      id: '1481078715231502570' },
  { name: 'rainbow_egg',    id: '1481078910262444134' },
];

const DARIO_EGG_POOL = [
  { name: 'dario_egg_special', id: '1488982805273641161' },
];

const SPECIAL_CHANCE   = 0.20;           // 20% chance for special egg
const DARIO_CHANCE     = 0.05;           // 5% chance for Dario egg
const NORMAL_POINTS    = 1;
const SPECIAL_POINTS   = 2;
const DARIO_POINTS     = 5;
const MSG_MIN          = 25;             // Min messages before egg can spawn
const MSG_MAX          = 75;             // Max messages before egg can spawn
const COOLDOWN_MS      = 10 * 60 * 1000; // 10 minutes cooldown between eggs
const EXPIRY_MS        = 60 * 60 * 1000; // 1 hour expiry
const EVENT_END_MS     = 1775880000000;  // April 6th 2026 00:00 EST (April 5th 11:59 PM is last valid minute)

const leaderboardPath       = path.resolve(__dirname, '../../database/easter-leaderboard.json');
const backupLeaderboardPath = path.resolve(__dirname, '../../database/easter-leaderboard-backup.json');

// ─── STATE ─────────────────────────────────────────────────────────────────────
let messageCount        = 0;
let lastEggTime         = 0;                // Timestamp of when last egg was posted
let lastSpawnAuthorId   = null;             // User who triggered the last spawn — cannot trigger the next one
let activeEgg           = null;             // { messageId, authorId, channelId, emojiId, points, expiryTimer }
let nextThreshold       = randomThreshold(); // How many messages until next egg

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function randomThreshold() {
  return Math.floor(Math.random() * (MSG_MAX - MSG_MIN + 1)) + MSG_MIN;
}

function readLeaderboard() {
  try {
    if (fs.existsSync(leaderboardPath)) {
      const data = fs.readFileSync(leaderboardPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[Easter] Error reading leaderboard:', err);
    if (fs.existsSync(backupLeaderboardPath)) {
      try {
        const backup = fs.readFileSync(backupLeaderboardPath, 'utf8');
        return JSON.parse(backup);
      } catch (backupErr) {
        console.error('[Easter] Backup also corrupted:', backupErr);
      }
    }
  }
  return { players: [] };
}

function writeLeaderboard(leaderboard) {
  try {
    if (fs.existsSync(leaderboardPath)) {
      fs.copyFileSync(leaderboardPath, backupLeaderboardPath);
    }
    fs.writeFileSync(leaderboardPath, JSON.stringify(leaderboard, null, 2));
  } catch (err) {
    console.error('[Easter] Error writing leaderboard:', err);
  }
}

function awardPoints(userId, points) {
  const leaderboard = readLeaderboard();

  let player = leaderboard.players.find(p => p.id === userId);
  const isSpecial = points === SPECIAL_POINTS;
  const isDario   = points === DARIO_POINTS;

  if (player) {
    player.points      += points;
    player.eggs         = (player.eggs || 0)        + ((!isSpecial && !isDario) ? 1 : 0);
    player.specialEggs  = (player.specialEggs || 0) + (isSpecial ? 1 : 0);
    player.darioEggs    = (player.darioEggs || 0)   + (isDario ? 1 : 0);
  } else {
    player = {
      id:          userId,
      points:      points,
      eggs:        (!isSpecial && !isDario) ? 1 : 0,
      specialEggs: isSpecial ? 1 : 0,
      darioEggs:   isDario ? 1 : 0,
    };
    leaderboard.players.push(player);
  }

  writeLeaderboard(leaderboard);
}

function clearActiveEgg() {
  if (activeEgg?.expiryTimer) clearTimeout(activeEgg.expiryTimer);
  activeEgg = null;
}

// ─── MAIN MODULE ───────────────────────────────────────────────────────────────
// Usage in your loader: require('./07easterEggHandler')(client)
module.exports = (client) => {

/*  // ── Count messages & spawn eggs ──────────────────────────────────────────────
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!ALLOWED_CHANNELS.has(message.channel.id)) return;
    if (Date.now() >= EVENT_END_MS) return; // Event has ended, no new eggs

    messageCount++;
    console.log(`[Easter] Messages: ${messageCount}/${nextThreshold} | Cooldown left: ${Math.max(0, COOLDOWN_MS - (Date.now() - lastEggTime))}ms`);

    const cooldownPassed   = (Date.now() - lastEggTime) >= COOLDOWN_MS;
    const thresholdMet     = messageCount >= nextThreshold;
    const notLastTriggerer = message.author.id !== lastSpawnAuthorId;

    if (thresholdMet && cooldownPassed && !activeEgg && notLastTriggerer) {
      messageCount      = 0;
      nextThreshold     = randomThreshold();
      lastEggTime       = Date.now();
      lastSpawnAuthorId = message.author.id;
      await spawnEgg(client, message);
    }
  });

  // ── Handle deleted messages — expire egg if its message is deleted ───────────
  client.on('messageDelete', async (message) => {
    if (!activeEgg) return;
    if (message.id !== activeEgg.messageId) return;

    console.log('[Easter] Egg message was deleted — expiring egg.');
    const channelId = activeEgg.channelId;
    clearActiveEgg();

    try {
      const channel = await client.channels.fetch(channelId);
      if (channel) await channel.send('⌛ The egg disappeared and has expired!');
    } catch (err) {
      console.error('[Easter] Could not send expiry message after delete:', err);
    }
  });

  // ── Handle reactions via raw event (works on all messages, cached or not) ────
  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;

    // Fetch partials if needed
    if (reaction.partial) {
      try { await reaction.fetch(); } catch { return; }
    }
    if (reaction.message.partial) {
      try { await reaction.message.fetch(); } catch { return; }
    }

    const message = reaction.message;

    if (!ALLOWED_CHANNELS.has(message.channel.id)) return;
    if (Date.now() >= EVENT_END_MS) return; // Event has ended, no claiming
    if (!activeEgg) return;
    if (message.id !== activeEgg.messageId) return;
    if (reaction.emoji.id !== activeEgg.emojiId) return;

    // ── Block the message author from claiming their own egg ─────────────────
    if (user.id === activeEgg.authorId) {
      console.log(`[Easter] Message author ${user.id} tried to claim their own egg — blocked.`);
      return;
    }

    // ── Verify the bot placed this egg reaction (blocks self-reacted emoji exploit) ──
    const botReaction   = message.reactions.cache.find(r => r.emoji.id === activeEgg.emojiId);
    const botHasReacted = botReaction?.users.cache.has(client.user.id);
    if (!botHasReacted) {
      try { await reaction.users.remove(user.id); } catch {}
      return;
    }

    // ── Atomically lock the egg before any await to prevent race conditions ───
    const claimedEgg = activeEgg;
    activeEgg = null;
    if (claimedEgg.expiryTimer) clearTimeout(claimedEgg.expiryTimer);

    const points    = claimedEgg.points;
    const isDario   = points === DARIO_POINTS;
    const isSpecial = points === SPECIAL_POINTS;

    awardPoints(user.id, points);

    try {
      await message.react(LOCK_EMOJI);
    } catch (err) {
      console.error('[Easter] Could not react with lock:', err);
    }

    try {
      const label    = isDario ? 'Dario Egg' : isSpecial ? '✨ Special Egg' : 'Egg';
      const bonusMsg = isDario ? ' **(+5 — Dario Egg!)**' : isSpecial ? ' **(+2 — Special Egg!)**' : '';
      await message.channel.send(
        `🎉 <@${user.id}> claimed the ${label} and earned **${points} point${points > 1 ? 's' : ''}**!${bonusMsg}`
      );
    } catch (err) {
      console.error('[Easter] Could not send claim message:', err);
    }

    console.log(`[Easter] Egg claimed by ${user.id} for ${points} point(s). Dario: ${isDario} | Special: ${isSpecial}`);
  });
};

// ─── SPAWN ─────────────────────────────────────────────────────────────────────
async function spawnEgg(client, triggerMessage) {
  const roll      = Math.random();
  const isDario   = roll < DARIO_CHANCE;
  const isSpecial = !isDario && roll < DARIO_CHANCE + SPECIAL_CHANCE;
  const pool      = isDario ? DARIO_EGG_POOL : isSpecial ? SPECIAL_EGG_POOL : NORMAL_EGG_POOL;
  const chosen    = pool[Math.floor(Math.random() * pool.length)];
  const points    = isDario ? DARIO_POINTS : isSpecial ? SPECIAL_POINTS : NORMAL_POINTS;
  const channel   = triggerMessage.channel;

  // Build the PartialEmoji string for reacting: <:name:id>
  const emojiString = `<:${chosen.name}:${chosen.id}>`;

  try {
    await triggerMessage.react(emojiString);
  } catch (err) {
    console.error('[Easter] Failed to react to message:', err);
    return;
  }

  // Set expiry — after 1 hour with no claim, lock and announce
  const expiryTimer = setTimeout(async () => {
    if (activeEgg && activeEgg.messageId === triggerMessage.id) {
      clearActiveEgg();
      try {
        await triggerMessage.react(LOCK_EMOJI);
        await channel.send('⌛ The egg was not claimed in time and has expired!');
      } catch (err) {
        console.error('[Easter] Error expiring egg:', err);
      }
      console.log('[Easter] Egg expired without being claimed.');
    }
  }, EXPIRY_MS);

  activeEgg = {
    messageId:   triggerMessage.id,
    authorId:    triggerMessage.author.id,  // Stored so the author can't claim their own egg
    channelId:   triggerMessage.channel.id, // Stored so we can send expiry notice after deletion
    emojiId:     chosen.id,                 // Matched by ID so name collisions don't matter
    points:      points,
    expiryTimer: expiryTimer,
  };

  console.log(`[Easter] Egg spawned! Emoji: ${emojiString} | Dario: ${isDario} | Special: ${isSpecial} | Points: ${points} | Author: ${triggerMessage.author.id} | Expires in 1h`);
  */
}