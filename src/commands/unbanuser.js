const { EmbedBuilder } = require("discord.js");
const { readPlayers, writePlayers, flushPlayerNow } = require("../playerStore");

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

function parseUserId(value) {
  return String(value || "")
    .replace(/[<@!>]/g, "")
    .trim();
}

function getTargetUserId(message, args) {
  const mentioned = message.mentions.users.first();
  if (mentioned?.id) return mentioned.id;

  return parseUserId(args.shift());
}

module.exports = {
  name: "unbanuser",

  async execute(message, args = []) {
    if (!isAdmin(message)) {
      return message.reply({
        content: "Owner/Admin only command.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const targetUserId = getTargetUserId(message, args);

    if (!targetUserId) {
      return message.reply({
        content: [
          "Usage:",
          "`op unbanuser <@user/userId>`",
          "",
          "Example:",
          "`op unbanuser @user`",
        ].join("\n"),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const players = readPlayers();
    const player = players[String(targetUserId)];

    if (!player) {
      return message.reply({
        content: `User data not found: \`${targetUserId}\``,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (!player.adminBan?.active) {
      return message.reply({
        content: `<@${targetUserId}> is not currently banned.`,
        allowedMentions: {
          users: [String(targetUserId)],
          repliedUser: false,
        },
      });
    }

    players[String(targetUserId)] = {
      ...player,
      adminBan: {
        ...(player.adminBan || {}),
        active: false,
        unbannedBy: String(message.author.id),
        unbannedAt: Date.now(),
      },
    };

    writePlayers(players);
    await flushPlayerNow(String(targetUserId), Number(process.env.PLAYER_DB_COMMAND_FLUSH_MS || 8000));

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("Player Unbanned")
      .setDescription(
        [
          `**Player:** <@${targetUserId}>`,
          `**User ID:** \`${targetUserId}\``,
          `**Unbanned By:** <@${message.author.id}>`,
          "",
          "The player can now use bot commands again.",
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Admin Unban",
      })
      .setTimestamp();

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        users: [String(targetUserId), String(message.author.id)],
        repliedUser: false,
      },
    });
  },
};