const { EmbedBuilder } = require("discord.js");
const { setPatreonRole } = require("../utils/patreonRoleStore");

const DEFAULT_DAYS = 30;
const INDONESIA_TIMEZONE = process.env.PATREON_TIMEZONE || "Asia/Jakarta";

function getAdminIds() {
  return String(
    process.env.ADMIN_USER_IDS ||
      process.env.DISCORD_OWNER_ID ||
      process.env.BOT_OWNER_ID ||
      ""
  )
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function isAdmin(userId) {
  return getAdminIds().includes(String(userId));
}

function parseUserId(value) {
  return String(value || "").replace(/[<@!>]/g, "").trim();
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function formatIndonesiaDate(timestamp) {
  return new Date(Number(timestamp || Date.now())).toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

async function resolveMotherFlameRole(message) {
  const envRoleId =
    process.env.MOTHER_FLAME_ROLE_ID ||
    process.env.PATREON_MOTHER_FLAME_ROLE_ID ||
    process.env.PATREON_ROLE_ID ||
    null;

  if (envRoleId) {
    const role =
      message.guild.roles.cache.get(String(envRoleId)) ||
      (await message.guild.roles.fetch(String(envRoleId)).catch(() => null));

    if (role) return role;
  }

  const roleName =
    process.env.PATREON_PREMIUM_ROLE_NAME ||
    process.env.PREMIUM_ROLE_NAME ||
    "Mother Flame";

  return (
    message.guild.roles.cache.find((role) => normalize(role.name) === normalize(roleName)) ||
    null
  );
}

module.exports = {
  name: "patreon30",
  aliases: ["mf30"],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    if (!message.guild) {
      return message.reply("This command can only be used inside a server.");
    }

    const targetId = parseUserId(args[0]);

    if (!targetId) {
      return message.reply("Usage: `op patreon30 <@user/userId>`");
    }

    const role = await resolveMotherFlameRole(message);

    if (!role) {
      return message.reply(
        "Mother Flame role was not found. Set `MOTHER_FLAME_ROLE_ID` in Railway or create a role named `Mother Flame`."
      );
    }

    const botMember =
      message.guild.members.me ||
      (await message.guild.members.fetchMe().catch(() => null));

    if (!botMember?.permissions?.has("ManageRoles")) {
      return message.reply("Bot does not have **Manage Roles** permission.");
    }

    if (role.position >= botMember.roles.highest.position) {
      return message.reply(
        "Bot role must be placed **above** the Mother Flame role in Discord role settings."
      );
    }

    const member = await message.guild.members.fetch(targetId).catch(() => null);

    if (!member) {
      return message.reply("Target user was not found in this server.");
    }

    await member.roles.add(role.id, "Mother Flame Patreon 30 days manual claim");

    const grantedAt = Date.now();
    const expiresAt = grantedAt + DEFAULT_DAYS * 24 * 60 * 60 * 1000;

    setPatreonRole(member.id, {
      roleId: role.id,
      guildId: message.guild.id,
      grantedBy: message.author.id,
      grantedAt,
      expiresAt,
    });

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("🔥 Mother Flame Activated")
      .setDescription(
        [
          `**User:** ${member.user.tag}`,
          `**Role:** ${role.name}`,
          `**Duration:** ${DEFAULT_DAYS} days`,
          `**Granted At:** ${formatDateTime(grantedAt)} WIB`,
          `**Expires At:** ${formatDateTime(expiresAt)} WIB`,
          "",
          "This Patreon role was activated manually after ticket proof verification.",
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Patreon Admin",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};