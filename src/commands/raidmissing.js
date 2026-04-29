const { EmbedBuilder } = require("discord.js");
const { readPlayers } = require("../playerStore");
const { getRoom, listRooms, getMissingUsers } = require("../utils/partyRooms");

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
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

async function resolveUsername(message, userId) {
  const id = String(userId);

  try {
    const cachedMember = message.guild?.members?.cache?.get(id);

    if (cachedMember?.user?.username) {
      return cachedMember.user.username;
    }

    const fetchedMember = message.guild
      ? await message.guild.members.fetch(id).catch(() => null)
      : null;

    if (fetchedMember?.user?.username) {
      return fetchedMember.user.username;
    }

    const cachedUser = message.client?.users?.cache?.get(id);

    if (cachedUser?.username) {
      return cachedUser.username;
    }

    const fetchedUser = await message.client.users.fetch(id).catch(() => null);

    if (fetchedUser?.username) {
      return fetchedUser.username;
    }
  } catch (_) {}

  return id;
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
        return message.reply("You do not have an active raid/party room or saved raid team.");
      }

      const savedLines = await Promise.all(
        savedMembers.map(async (id, i) => `${i + 1}. ${await resolveUsername(message, id)}`)
      );

      return message.reply({
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

      missingIds = ensureArray(room.whitelist).filter((id) => !joined.has(String(id)));
    }

    const joinedLines = ensureArray(room.participants).length
      ? await Promise.all(
          ensureArray(room.participants).map(async (p, i) => {
            const username = await resolveUsername(message, p.userId);
            const cards = ensureArray(p.selectedCards)
              .map((card) => card.name || card.code)
              .filter(Boolean)
              .join(", ");

            return `✅ ${i + 1}. ${username}${cards ? ` • ${cards}` : ""}`;
          })
        )
      : ["None"];

    const missingLines = missingIds.length
      ? await Promise.all(
          missingIds.map(async (id, i) => `❌ ${i + 1}. ${await resolveUsername(message, id)}`)
        )
      : ["Everyone in the team has already joined battle."];

    return message.reply({
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