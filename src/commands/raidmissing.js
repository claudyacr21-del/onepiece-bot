const { EmbedBuilder } = require("discord.js");
const { listRooms, getMissingUsers } = require("../utils/partyRooms");
const { getPlayer } = require("../playerStore");

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function findRelevantRoom(userId) {
  const uid = String(userId || "");
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

function formatUserMention(userId) {
  return `<@${String(userId)}>`;
}

module.exports = {
  name: "raidmissing",
  aliases: ["rm", "missing"],

  async execute(message) {
    const userId = String(message.author.id);
    const room = findRelevantRoom(userId);

    if (!room) {
      const player = getPlayer(message.author.id, message.author.username);
      const savedTeam = ensureArray(player?.raidTeam?.members);

      if (savedTeam.length) {
        return message.reply(
          [
            "You have a saved raid team, but there is no active raid/party room right now.",
            "Start a raid first with `op raid <boss>` or `op craid <boss>`.",
          ].join("\n")
        );
      }

      return message.reply("You do not have an active raid/party room.");
    }

    let missingIds = [];

    try {
      missingIds = getMissingUsers(room.hostId);
    } catch (_) {
      missingIds = ensureArray(room.whitelist).filter((id) => {
        return !ensureArray(room.participants).some((p) => String(p.userId) === String(id));
      });
    }

    const joinedIds = new Set(
      ensureArray(room.participants).map((p) => String(p.userId))
    );

    const joinedLines = ensureArray(room.participants).length
      ? ensureArray(room.participants).map((p) => {
          const cards = ensureArray(p.selectedCards)
            .map((card) => card.name || card.code)
            .filter(Boolean)
            .join(", ");

          return `✅ ${formatUserMention(p.userId)}${cards ? ` • ${cards}` : ""}`;
        })
      : ["None"];

    const missingLines = missingIds.length
      ? missingIds.map((id) => `❌ ${formatUserMention(id)}`)
      : ["None"];

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("🧭 Raid Missing Members")
          .setDescription(
            [
              `**Host:** ${formatUserMention(room.hostId)}`,
              `**Boss:** ${room.bossName || "Unknown"}`,
              `**Status:** ${room.status || "waiting"}`,
              `**Joined:** ${joinedIds.size}/${ensureArray(room.whitelist).length + 1}`,
              "",
              "## Joined",
              ...joinedLines,
              "",
              "## Missing",
              ...missingLines,
            ].join("\n")
          )
          .setFooter({
            text: "One Piece Bot • Raid Missing",
          }),
      ],
    });
  },
};