const { EmbedBuilder } = require("discord.js");
const { readPlayers } = require("../playerStore");

function parseEnvIds(...values) {
  return values
    .flatMap((value) => String(value || "").split(","))
    .map((id) => id.trim())
    .filter(Boolean);
}

function getAdminUserIds() {
  return parseEnvIds(
    process.env.ADMIN_USER_IDS,
    process.env.DISCORD_OWNER_ID,
    process.env.BOT_OWNER_ID,
    process.env.BOT_OWNER_IDS,
    process.env.OWNER_IDS
  );
}

function getAdminRoleIds() {
  return parseEnvIds(process.env.ADMIN_ROLE_IDS);
}

function memberHasAdminRole(message) {
  const roleIds = getAdminRoleIds();
  if (!roleIds.length) return false;

  const member = message?.resolvedMember || message?.mainMember || message?.member || null;
  if (!member?.roles?.cache) return false;

  return roleIds.some((roleId) => member.roles.cache.has(roleId));
}

function isAdmin(message) {
  const userId = String(message?.author?.id || "");
  const guild = message?.resolvedGuild || message?.mainGuild || message?.guild || null;
  const isOwner = guild && String(guild.ownerId) === userId;

  return getAdminUserIds().includes(userId) || memberHasAdminRole(message) || isOwner;
}

function formatTime(timestamp) {
  const value = Number(timestamp || 0);
  if (!value) return "N/A";

  return `<t:${Math.floor(value / 1000)}:R>`;
}

function shorten(value, max = 90) {
  const text = String(value || "No reason provided.");
  if (text.length <= max) return text;

  return `${text.slice(0, max - 3)}...`;
}

module.exports = {
  name: "baninfo",

  async execute(message) {
    if (!isAdmin(message)) {
      return message.reply({
        content: "Owner/Admin only command.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const players = readPlayers();

    const banned = Object.entries(players || {})
      .filter(([userId, player]) => {
        return !String(userId).startsWith("__") && player?.adminBan?.active;
      })
      .map(([userId, player]) => {
        const ban = player.adminBan || {};

        return {
          userId,
          username: player.username || `User ${userId}`,
          reason: ban.reason || "No reason provided.",
          bannedBy: ban.bannedBy || "",
          bannedAt: Number(ban.bannedAt || 0),
        };
      })
      .sort((a, b) => b.bannedAt - a.bannedAt);

    const embed = new EmbedBuilder()
      .setColor(banned.length ? 0xe74c3c : 0x2ecc71)
      .setTitle("Banned User List")
      .setFooter({
        text: `Total banned users: ${banned.length}`,
      })
      .setTimestamp();

    if (!banned.length) {
      embed.setDescription("No banned users found.");
    } else {
      const lines = banned.slice(0, 25).map((entry, index) => {
        return [
          `**${index + 1}.** <@${entry.userId}>`,
          `ID: \`${entry.userId}\``,
          `Reason: ${shorten(entry.reason)}`,
          `Banned By: ${entry.bannedBy ? `<@${entry.bannedBy}>` : "N/A"}`,
          `Banned: ${formatTime(entry.bannedAt)}`,
        ].join("\n");
      });

      embed.setDescription(lines.join("\n\n"));

      if (banned.length > 25) {
        embed.addFields({
          name: "More Banned Users",
          value: `Showing 25 of ${banned.length} banned users.`,
        });
      }
    }

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        parse: [],
        repliedUser: false,
      },
    });
  },
};