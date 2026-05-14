const { EmbedBuilder } = require("discord.js");
const { getRoom, listRooms, getMissingUsers } = require("../utils/partyRooms");

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function userMention(userId) {
  const id = String(userId || "").replace(/\D/g, "");
  return id ? `<@${id}>` : String(userId || "Unknown");
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

function getSavedDisplayName(room, userId) {
  const uid = String(userId || "");

  const participant = ensureArray(room.participants).find(
    (p) => String(p.userId) === uid
  );

  if (participant?.username) return participant.username;

  const savedMember =
    ensureArray(room.savedMembers).find((m) => String(m.userId || m.id) === uid) ||
    ensureArray(room.members).find((m) => String(m.userId || m.id) === uid) ||
    ensureArray(room.raidTeamMembers).find((m) => String(m.userId || m.id) === uid);

  if (savedMember?.username) return savedMember.username;
  if (savedMember?.name) return savedMember.name;

  return `User ${uid}`;
}

module.exports = {
  name: "raidmissing",
  aliases: ["rm", "missing"],

  async execute(message) {
    const userId = String(message.author.id);
    const room = findRelevantRoom(userId);

    if (!room) {
      return message.reply(
        "No active raid/party room found. Start a raid first with `op raid <boss>` or `op craid <boss>`."
      );
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

    const joinedParticipants = ensureArray(room.participants);
    const missingMentions = missingIds.map((id) => userMention(id)).join(" ");

    const missingLines = missingIds.length
      ? missingIds.map(
          (id, index) => `❌ ${index + 1}. ${getSavedDisplayName(room, id)}`
        )
      : ["Everyone in the team has already joined battle."];

    const joinedLines = joinedParticipants.length
      ? joinedParticipants.map((participant, index) => {
          const cards = ensureArray(participant.selectedCards)
            .map((card) => card.name || card.displayName || card.code)
            .filter(Boolean)
            .join(", ");

          return `✅ ${index + 1}. ${participant.username || getSavedDisplayName(room, participant.userId)}${
            cards ? ` • ${cards}` : ""
          }`;
        })
      : ["None"];

    return message.reply({
      content: missingIds.length
        ? `📣 Missing raid members: ${missingMentions}`
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
              `**Joined:** ${joinedParticipants.length}`,
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