const { EmbedBuilder } = require("discord.js");
const {
  readPlayers,
  writePlayers,
  flushPlayerNow,
} = require("../playerStore");

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

function createDefaultPlayer(userId, username = "Unknown User") {
  return {
    username: username || `User ${userId}`,
    berries: 1000,
    gems: 100,
    cards: [],
    fragments: [],
    boxes: [],
    tickets: [],
    materials: [],
    items: [],
    weapons: [],
    devilFruits: [],
  };
}

module.exports = {
  name: "banuser",

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
          "`op banuser <@user/userId> <reason>`",
          "",
          "Example:",
          "`op banuser @user Exploiting event bug`",
        ].join("\n"),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (String(targetUserId) === String(message.author.id)) {
      return message.reply({
        content: "You cannot ban yourself.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (getAdminUserIds().includes(String(targetUserId))) {
      return message.reply({
        content: "You cannot ban another bot admin/owner with this command.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const reason = args.join(" ").trim() || "No reason provided.";
    const players = readPlayers();

    const mentioned = message.mentions.users.first();
    const existing = players[String(targetUserId)] || null;
    const username =
      existing?.username ||
      mentioned?.username ||
      mentioned?.tag ||
      `User ${targetUserId}`;

    const player = existing || createDefaultPlayer(targetUserId, username);

    if (player.adminBan?.active) {
      return message.reply({
        content: `<@${targetUserId}> is already banned.\nReason: ${player.adminBan.reason || "No reason provided."}`,
        allowedMentions: {
          users: [String(targetUserId)],
          repliedUser: false,
        },
      });
    }

    players[String(targetUserId)] = {
      ...player,
      username,
      adminBan: {
        active: true,
        reason,
        bannedBy: String(message.author.id),
        bannedAt: Date.now(),
        unbannedBy: null,
        unbannedAt: null,
      },
    };

    writePlayers(players);
    await flushPlayerNow(
      String(targetUserId),
      Number(process.env.PLAYER_DB_COMMAND_FLUSH_MS || 8000)
    );

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("Player Banned")
      .setDescription(
        [
          `**Player:** <@${targetUserId}>`,
          `**User ID:** \`${targetUserId}\``,
          `**Banned By:** <@${message.author.id}>`,
          `**Reason:** ${reason}`,
          "",
          "Player data was not deleted. This only blocks the user from using bot commands.",
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Admin Ban",
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