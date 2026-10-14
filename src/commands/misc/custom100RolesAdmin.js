const {
  ApplicationCommandOptionType,
  EmbedBuilder,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// ─── Config ────────────────────────────────────────────────────────────────
const ADMIN_ROLE_ID     = '1126183128084529203';
const LEVEL_100_ROLE_ID = '1103768817122934876';

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
function isAdmin(member)    { return member.roles.cache.has(ADMIN_ROLE_ID); }
function isLevel100(member) { return member.roles.cache.has(LEVEL_100_ROLE_ID); }

function successEmbed(description) {
  return new EmbedBuilder().setColor(0x2ecc71).setDescription(`✅ ${description}`);
}
function errorEmbed(description) {
  return new EmbedBuilder().setColor(0xe74c3c).setDescription(`❌ ${description}`);
}

// ─── Subcommand handlers ────────────────────────────────────────────────────

async function handleAssign(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ embeds: [errorEmbed('You need the **Admin** role to use this.')] });
  }

  const targetUser = interaction.options.getUser('user');
  const targetRole = interaction.options.getRole('role');

  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!targetMember) {
    return interaction.reply({ embeds: [errorEmbed('That user is not in the server.')] });
  }
  if (!isLevel100(targetMember)) {
    return interaction.reply({ embeds: [errorEmbed(`<@${targetUser.id}> doesn't have the Level 100 role.`)] });
  }

  const existing = getUserRoleId(targetUser.id);
  if (existing) {
    return interaction.reply({
      embeds: [errorEmbed(`<@${targetUser.id}> already has a custom role (<@&${existing}>). Use \`/customroleadmin unlink\` first if you want to reassign.`)],
    });
  }

  await interaction.deferReply();

  try {
    if (!targetMember.roles.cache.has(targetRole.id)) {
      await targetMember.roles.add(targetRole, `Custom role assigned by admin ${interaction.user.username}`);
    }

    setUserRoleId(targetUser.id, targetRole.id);

    await interaction.editReply({
      embeds: [successEmbed(`<@&${targetRole.id}> has been linked to <@${targetUser.id}> as their custom Level 100 role.`)],
    });
  } catch (err) {
    console.error('[customroleadmin assign]', err);
    await interaction.editReply({ embeds: [errorEmbed('Failed to assign the role.')] });
  }
}

async function handleUnlink(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ embeds: [errorEmbed('You need the **Admin** role to use this.')] });
  }

  const targetUser = interaction.options.getUser('user');
  const roleId = getUserRoleId(targetUser.id);

  if (!roleId) {
    return interaction.reply({ embeds: [errorEmbed(`<@${targetUser.id}> has no custom role linked.`)] });
  }

  removeUserRoleId(targetUser.id);

  await interaction.reply({
    embeds: [successEmbed(`The custom role link for <@${targetUser.id}> has been removed. The role itself still exists in the server.`)],
  });
}

async function handleDelete(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ embeds: [errorEmbed('You need the **Admin** role to use this.')] });
  }

  const targetUser = interaction.options.getUser('user');
  const roleId = getUserRoleId(targetUser.id);

  if (!roleId) {
    return interaction.reply({ embeds: [errorEmbed(`<@${targetUser.id}> has no custom role linked.`)] });
  }

  await interaction.deferReply();

  try {
    const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
    if (role) {
      await role.delete(`Deleted by admin ${interaction.user.username}`);
    }

    removeUserRoleId(targetUser.id);

    await interaction.editReply({
      embeds: [successEmbed(`The custom role for <@${targetUser.id}> has been permanently deleted.`)],
    });
  } catch (err) {
    console.error('[customroleadmin delete]', err);
    await interaction.editReply({ embeds: [errorEmbed('Failed to delete the role.')] });
  }
}

// ─── Export ──────────────────────────────────────────────────────────────────

module.exports = {
  name: 'customroleadmin',
  description: 'Admin tools for managing Level 100 custom roles.',

  options: [
    {
      name: 'assign',
      description: 'Link an existing role to a Level 100 user as their custom role.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'The Level 100 user.',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: 'role',
          description: 'The role to link to them.',
          type: ApplicationCommandOptionType.Role,
          required: true,
        },
      ],
    },
    {
      name: 'unlink',
      description: 'Remove the custom role link from a user (keeps the role in the server).',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'The user to unlink.',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
      ],
    },
    {
      name: 'delete',
      description: "Permanently delete a user's custom role from the server.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'The user whose role to delete.',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
      ],
    },
  ],

  callback: async (client, interaction) => {
    const sub = interaction.options.getSubcommand(false);

    if (sub === 'assign') return handleAssign(interaction);
    if (sub === 'unlink') return handleUnlink(interaction);
    if (sub === 'delete') return handleDelete(interaction);
  },
};
