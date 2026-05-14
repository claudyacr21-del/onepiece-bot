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

async function resolveUsername(message, room, userId) {
  const id = String(userId || "").replace(/\D/g, "");

  const participant = ensureArray(room.participants).find(
    (p) => String(p.userId) === id
  );

  if (participant?.username) return participant.username;

  const savedCandidates = [
    ...ensureArray(room.savedMembers),
    ...ensureArray(room.members),
    ...ensureArray(room.raidTeamMembers),
    ...ensureArray(room.invitedMembers),
  ];

  const saved = savedCandidates.find(
    (entry) => String(entry?.userId || entry?.id || "") === id
  );

  if (saved?.username) return saved.username;
  if (saved?.name) return saved.name;

  const cachedMember = message.guild?.members?.cache?.get(id);
  if (cachedMember?.user?.username) return cachedMember.user.username;

  const fetchedMember = message.guild
    ? await message.guild.members.fetch(id).catch(() => null)
    : null;

  if (fetchedMember?.user?.username) return fetchedMember.user.username;

  const cachedUser = message.client?.users?.cache?.get(id);
  if (cachedUser?.username) return cachedUser.username;

  const fetchedUser = await message.client?.users?.fetch(id).catch(() => null);
  if (fetchedUser?.username) return fetchedUser.username;

  return userMention(id);
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
      missingIds = getMissingUsers(room.hostId).map(String);
    } catch (_) {
      const joined = new Set(
        ensureArray(room.participants).map((p) => String(p.userId))
      );

      missingIds = ensureArray(room.whitelist)
        .map(String)
        .filter((id) => !joined.has(String(id)));
    }

    const joinedParticipants = ensureArray(room.participants);

    const missingLines = missingIds.length
      ? await Promise.all(
          missingIds.map(async (id, index) => {
            const username = await resolveUsername(message, room, id);
            return `❌ ${index + 1}. ${username}`;
          })
        )
      : ["Everyone in the team has already joined battle."];

    const joinedLines = joinedParticipants.length
      ? await Promise.all(
          joinedParticipants.map(async (participant, index) => {
            const username =
              participant.username ||
              (await resolveUsername(message, room, participant.userId));

            const cards = ensureArray(participant.selectedCards)
              .map((card) => card.name || card.displayName || card.code)
              .filter(Boolean)
              .join(", ");

            return `✅ ${index + 1}. ${username}${cards ? ` • ${cards}` : ""}`;
          })
        )
      : ["None"];

    return message.reply({
      content: missingIds.length
        ? `📣 Missing raid members: ${missingIds.map(userMention).join(" ")}`
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