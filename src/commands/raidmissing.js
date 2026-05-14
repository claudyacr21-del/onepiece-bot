const { EmbedBuilder } = require("discord.js");
const { readPlayers } = require("../playerStore");
const {
  getRoom,
  listRooms,
  getMissingUsers,
} = require("../utils/partyRooms");

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function userMention(userId) {
  const id = String(userId || "").replace(/\D/g, "");

  return id ? `<@${id}>` : String(userId || "Unknown");
}

function findRelevantRoom(userId) {
  const uid = String(userId || "");
  const direct = getRoom(uid);

  if (direct) return direct;

  const rooms = listRooms();

  return (
    rooms.find((room) => String(room.hostId) === uid) ||
    rooms.find((room) =>
      ensureArray(room.participants).some((p) => String(p.userId) === uid)
    ) ||
    rooms.find((room) =>
      ensureArray(room.whitelist).some((id) => String(id) === uid)
    ) ||
    null
  );
}

function getMentionAllowedUsers(...ids) {
  return [
    ...new Set(
      ids
        .flat()
        .map((id) => String(id || "").replace(/\D/g, ""))
        .filter(Boolean)
    ),
  ];
}

module.exports = {
  name: "raidmissing",
  aliases: ["rm", "missing"],

  async execute(message) {
    const hostId = String(message.author.id);
    const room = findRelevantRoom(hostId);

    if (!room) {
      const players = readPlayers();
      const savedMembers = ensureArray(players?.[hostId]?.raidTeam?.members).map(String);

      if (!savedMembers.length) {
        return message.reply(
          "You do not have an active raid/party room or saved raid team."
        );
      }

      const savedLines = savedMembers.map(
        (id, index) => `${index + 1}. ${userMention(id)}`
      );

      return message.reply({
        content: savedMembers.length
          ? `📣 Raid team reminder: ${savedMembers.map((id) => userMention(id)).join(" ")}`
          : null,
        allowedMentions: {
          users: getMentionAllowedUsers(savedMembers),
          repliedUser: false,
        },
        embeds: [
          new EmbedBuilder()
            .setColor(0xe67e22)
            .setTitle("Saved Raid Team • No Active Room")
            .setDescription(
              [
                "You have saved raid team members, but no active raid/party room.",
                "Start a room with `op raid <boss>` or `op craid <boss>`.",
                "",
                `**Saved Members:** ${savedMembers.length}/9`,
                ...savedLines,
              ].join("\n")
            )
            .setFooter({
              text: "One Piece Bot • Raid Missing",
            }),
        ],
      });
    }

    let missingIds = [];

    try {
      missingIds = getMissingUsers(room.hostId);
    } catch (_) {
      const joined = new Set(
        ensureArray(room.participants).map((p) => String(p.userId))
      );

      missingIds = ensureArray(room.whitelist).filter(
        (id) => !joined.has(String(id))
      );
    }

    const joinedUserIds = ensureArray(room.participants).map((p) =>
      String(p.userId)
    );

    const joinedLines = ensureArray(room.participants).length
      ? ensureArray(room.participants).map((participant, index) => {
          const cards = ensureArray(participant.selectedCards)
            .map((card) => card.name || card.displayName || card.code)
            .filter(Boolean)
            .join(", ");

          return `✅ ${index + 1}. ${userMention(participant.userId)}${
            cards ? ` • ${cards}` : ""
          }`;
        })
      : ["None"];

    const missingLines = missingIds.length
      ? missingIds.map((id, index) => `❌ ${index + 1}. ${userMention(id)}`)
      : ["Everyone in the team has already joined battle."];

    return message.reply({
      content: missingIds.length
        ? `📣 Missing raid members: ${missingIds.map((id) => userMention(id)).join(" ")}`
        : null,
      allowedMentions: {
        users: getMentionAllowedUsers(missingIds),
        repliedUser: false,
      },
      embeds: [
        new EmbedBuilder()
          .setColor(0xe67e22)
          .setTitle(`Missing Users • ${room.bossName || "Raid Room"}`)
          .setDescription(
            [
              `**Boss:** ${room.bossName || "Unknown"}`,
              `**Status:** ${room.status || "waiting"}`,
              `**Invited:** ${ensureArray(room.whitelist).length}`,
              `**Joined:** ${ensureArray(room.participants).length}`,
              "",
              "## Missing",
              ...missingLines,
              "",
              "## Joined",
              ...joinedLines,
            ].join("\n")
          )
          .setFooter({
            text: "One Piece Bot • Raid Missing",
          }),
      ],
    });
  },
};