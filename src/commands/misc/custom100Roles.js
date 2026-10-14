const {
  ApplicationCommandOptionType,
  EmbedBuilder,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// ─── Config ────────────────────────────────────────────────────────────────
const LEVEL_100_ROLE_ID = '1103768817122934876';
const BOOKMARK_ROLE_ID  = '1130704460503580742';

const DB_PATH = path.resolve(__dirname, '../../database/custom-roles.json');

// ─── DB helpers ────────────────────────────────────────────────────────────
function loadDB() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ roles: {} }, null, 2));
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getUserRoleId(userId) {
  return loadDB().roles[userId] ?? null;
}

function setUserRoleId(userId, roleId) {
  const db = loadDB();
  db.roles[userId] = roleId;
  saveDB(db);
}

function removeUserRoleId(userId) {
  const db = loadDB();
  delete db.roles[userId];
  saveDB(db);
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function parseHex(raw) {
  if (!raw) return null;
  const clean = raw.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return parseInt(clean, 16);
}

function isLevel100(member) {
  return member.roles.cache.has(LEVEL_100_ROLE_ID);
}

const COLOR = 0xe67e22;

function successEmbed(description) {
  return new EmbedBuilder().setColor(0x2ecc71).setDescription(`✅ ${description}`);
}
function errorEmbed(description) {
  return new EmbedBuilder().setColor(0xe74c3c).setDescription(`❌ ${description}`);
}
function infoEmbed(title, description) {
  return new EmbedBuilder().setColor(COLOR).setTitle(title).setDescription(description);
}

// ─── Subcommand handlers ────────────────────────────────────────────────────

async function handleHelp(interaction) {
  const lines = [
    '### 📖 Custom Role Commands\n',
    '**For Level 100 members:**',
    '`/customrole create <name> [color]` — Create your personal Level 100 role.',
    '`/customrole rename <name>` — Rename your role.',
    '`/customrole color <hex>` — Change your role colour (e.g. `#ff4500`).',
    '`/customrole gradient <color1> <color2>` — Set a gradient colour (uses server booster gradient feature).',
    '`/customrole info` — View your current role details.',
  ];

  await interaction.reply({ embeds: [infoEmbed('Custom Role Help', lines.join('\n'))] });
}

async function handleCreate(interaction) {
  const member = interaction.member;

  if (!isLevel100(member)) {
    return interaction.reply({ embeds: [errorEmbed('You need to be **Level 100** to use this command.')] });
  }

  if (getUserRoleId(interaction.user.id)) {
    return interaction.reply({ embeds: [errorEmbed('You already have a custom role. Use `/customrole rename` or `/customrole color` to edit it.')] });
  }

  const name  = interaction.options.getString('name');
  const hex   = interaction.options.getString('color');
  const color = parseHex(hex);

  if (!color && hex) {
    return interaction.reply({ embeds: [errorEmbed('Invalid hex colour. Use format `#RRGGBB` e.g. `#ff4500`.')] });
  }

  await interaction.deferReply();

  try {
    const guild        = interaction.guild;
    const bookmarkRole = guild.roles.cache.get(BOOKMARK_ROLE_ID);

    if (!bookmarkRole) {
      return interaction.editReply({ embeds: [errorEmbed('Bookmark role not found. Please contact an admin.')] });
    }

    const newRole = await guild.roles.create({
      name,
      color: color ?? 0x000000,
      position: bookmarkRole.position,
      reason: `Level 100 custom role for ${interaction.user.username}`,
    });

    await member.roles.add(newRole);
    setUserRoleId(interaction.user.id, newRole.id);

    await interaction.editReply({
      embeds: [successEmbed(`Your custom role **${newRole.name}** has been created and assigned!`)],
    });
  } catch (err) {
    console.error('[customrole create]', err);
    await interaction.editReply({ embeds: [errorEmbed('Something went wrong creating your role. Make sure the bot has the Manage Roles permission and its role is above the bookmark role.')] });
  }
}

async function handleRename(interaction) {
  const member = interaction.member;

  if (!isLevel100(member)) {
    return interaction.reply({ embeds: [errorEmbed('You need to be **Level 100** to use this command.')] });
  }

  const roleId = getUserRoleId(interaction.user.id);
  if (!roleId) {
    return interaction.reply({ embeds: [errorEmbed("You don't have a custom role yet. Use `/customrole create` first.")] });
  }

  const newName = interaction.options.getString('name');
  await interaction.deferReply();

  try {
    const role = await interaction.guild.roles.fetch(roleId);
    if (!role) {
      removeUserRoleId(interaction.user.id);
      return interaction.editReply({ embeds: [errorEmbed('Your role no longer exists in the server. Please contact an admin.')] });
    }

    await role.setName(newName, `Renamed by ${interaction.user.username}`);
    await interaction.editReply({ embeds: [successEmbed(`Your role has been renamed to **${newName}**.`)] });
  } catch (err) {
    console.error('[customrole rename]', err);
    await interaction.editReply({ embeds: [errorEmbed('Failed to rename the role.')] });
  }
}

async function handleColor(interaction) {
  const member = interaction.member;

  if (!isLevel100(member)) {
    return interaction.reply({ embeds: [errorEmbed('You need to be **Level 100** to use this command.')] });
  }

  const roleId = getUserRoleId(interaction.user.id);
  if (!roleId) {
    return interaction.reply({ embeds: [errorEmbed("You don't have a custom role yet. Use `/customrole create` first.")] });
  }

  const hex   = interaction.options.getString('hex');
  const color = parseHex(hex);
  if (!color) {
    return interaction.reply({ embeds: [errorEmbed('Invalid hex colour. Use format `#RRGGBB` e.g. `#ff4500`.')] });
  }

  await interaction.deferReply();

  try {
    const role = await interaction.guild.roles.fetch(roleId);
    if (!role) {
      removeUserRoleId(interaction.user.id);
      return interaction.editReply({ embeds: [errorEmbed('Your role no longer exists in the server. Please contact an admin.')] });
    }

    await role.setColor(color, `Color changed by ${interaction.user.username}`);
    await interaction.editReply({
      embeds: [successEmbed(`Your role colour has been updated to **#${color.toString(16).padStart(6, '0').toUpperCase()}**.`)],
    });
  } catch (err) {
    console.error('[customrole color]', err);
    await interaction.editReply({ embeds: [errorEmbed('Failed to update the colour.')] });
  }
}

async function handleGradient(interaction) {
  const member = interaction.member;

  if (!isLevel100(member)) {
    return interaction.reply({ embeds: [errorEmbed('You need to be **Level 100** to use this command.')] });
  }

  const roleId = getUserRoleId(interaction.user.id);
  if (!roleId) {
    return interaction.reply({ embeds: [errorEmbed("You don't have a custom role yet. Use `/customrole create` first.")] });
  }

  const hex1   = interaction.options.getString('color1');
  const hex2   = interaction.options.getString('color2');
  const color1 = parseHex(hex1);
  const color2 = parseHex(hex2);

  if (!color1 || !color2) {
    return interaction.reply({ embeds: [errorEmbed('One or both hex colours are invalid. Use format `#RRGGBB`.')] });
  }

  await interaction.deferReply();

  try {
    const role = await interaction.guild.roles.fetch(roleId);
    if (!role) {
      removeUserRoleId(interaction.user.id);
      return interaction.editReply({ embeds: [errorEmbed('Your role no longer exists. Please contact an admin.')] });
    }

    await interaction.guild.client.rest.patch(`/guilds/${interaction.guild.id}/roles/${roleId}`, {
      body: {
        color: 0,
        colors: {
          primary_color:   color1,
          secondary_color: color2,
        },
      },
      reason: `Gradient set by ${interaction.user.username}`,
    });

    const hex1Str = color1.toString(16).padStart(6, '0').toUpperCase();
    const hex2Str = color2.toString(16).padStart(6, '0').toUpperCase();
    await interaction.editReply({
      embeds: [successEmbed(`Your role gradient has been set: **#${hex1Str}** → **#${hex2Str}**.\n\n> ⚠️ Gradient colours are a server booster feature. If the server loses that perk, the gradient will be removed automatically by Discord.`)],
    });
  } catch (err) {
    console.error('[customrole gradient]', err);
    await interaction.editReply({ embeds: [errorEmbed('Failed to set the gradient. Make sure the server has the gradient role booster perk unlocked.')] });
  }
}

async function handleInfo(interaction) {
  const member = interaction.member;

  if (!isLevel100(member)) {
    return interaction.reply({ embeds: [errorEmbed('You need to be **Level 100** to use this command.')] });
  }

  const roleId = getUserRoleId(interaction.user.id);
  if (!roleId) {
    return interaction.reply({ embeds: [infoEmbed('Your Custom Role', "You don't have a custom role yet. Use `/customrole create` to make one!")] });
  }

  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) {
    removeUserRoleId(interaction.user.id);
    return interaction.reply({ embeds: [errorEmbed('Your role no longer exists in the server. Please contact an admin.')] });
  }

  // Fetch raw role data to check for gradient colours
  const rawRole = await interaction.guild.client.rest.get(`/guilds/${interaction.guild.id}/roles`)
    .then(roles => roles.find(r => r.id === roleId))
    .catch(() => null);

  const primary   = rawRole?.colors?.primary_color;
  const secondary = rawRole?.colors?.secondary_color;

  let colorValue;
  if (primary && secondary) {
    const hex1 = primary.toString(16).padStart(6, '0').toUpperCase();
    const hex2 = secondary.toString(16).padStart(6, '0').toUpperCase();
    colorValue = `#${hex1} → #${hex2}`;
  } else {
    colorValue = `#${role.color.toString(16).padStart(6, '0').toUpperCase()}`;
  }

  const embed = new EmbedBuilder()
    .setColor(primary ?? role.color ?? COLOR)
    .setTitle('Your Custom Role')
    .addFields(
      { name: 'Name',  value: role.name,       inline: true },
      { name: 'Color', value: colorValue,       inline: true },
      { name: 'Role',  value: `<@&${role.id}>`, inline: true },
    );

  await interaction.reply({ embeds: [embed] });
}

// ─── Export ──────────────────────────────────────────────────────────────────

module.exports = {
  name: 'customrole',
  description: 'Manage your Level 100 custom role.',

  options: [
    {
      name: 'help',
      description: 'Show all custom role commands.',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'create',
      description: 'Create your personal Level 100 custom role.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'name',
          description: 'Name for your role.',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'color',
          description: 'Hex colour e.g. #ff4500 (optional, defaults to invisible).',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: 'rename',
      description: 'Rename your custom role.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'name',
          description: 'New name for your role.',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: 'color',
      description: 'Change your custom role colour.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'hex',
          description: 'Hex colour e.g. #ff4500.',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: 'gradient',
      description: 'Set a gradient colour for your custom role (requires server booster perk).',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'color1',
          description: 'First (primary) gradient colour e.g. #ff4500.',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'color2',
          description: 'Second (secondary) gradient colour e.g. #0044ff.',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: 'info',
      description: 'View your current custom role details.',
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],

  callback: async (client, interaction) => {
    const sub = interaction.options.getSubcommand(false);

    if (sub === 'help')     return handleHelp(interaction);
    if (sub === 'create')   return handleCreate(interaction);
    if (sub === 'rename')   return handleRename(interaction);
    if (sub === 'color')    return handleColor(interaction);
    if (sub === 'gradient') return handleGradient(interaction);
    if (sub === 'info')     return handleInfo(interaction);
  },
};
