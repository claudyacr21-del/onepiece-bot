const { EmbedBuilder } = require("discord.js");
const { readPlayers } = require("../playerStore");
const { getRoom, listRooms } = require("../utils/partyRooms");

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

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function findRelevantRoom(userId) {
  const uid = String(userId || "");
  const direct = getRoom(uid);

  if (direct) return direct;

  return (
    listRooms().find((room) => String(room.hostId) === uid) ||
    listRooms().find((room) =>
      ensureArray(room.participants).some((p) => String(p.userId) === uid)
    ) ||
    listRooms().find((room) =>
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

async function buildSavedTeamLines(message, members) {
  if (!members.length) return ["No saved raid team members."];

  return Promise.all(
    members.map(async (id, i) => `${i + 1}. ${await resolveUsername(message, id)}`)
  );
}

module.exports = {
  name: "raidteam",
  aliases: ["rt"],

  async execute(message) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const hostId = String(message.author.id);
    const room = findRelevantRoom(hostId);
    const players = readPlayers();
    const savedMembers = ensureArray(players?.[hostId]?.raidTeam?.members).map(String);
    const savedLines = await buildSavedTeamLines(message, savedMembers);

    if (room) {
      const whitelist = ensureArray(room.whitelist).map(String);
      const participants = ensureArray(room.participants);
      const guestParticipants = participants.filter((p) => String(p.userId) !== String(room.hostId));
      const maxGuestSlots = Math.max(0, Number(room.maxParticipants || 0) - 1);

      const invitedLines = await Promise.all(
        whitelist.map(async (id, i) => {
          const joined = participants.some((p) => String(p.userId) === String(id));
          return `${joined ? "✅" : "❌"} ${i + 1}. ${await resolveUsername(message, id)}`;
        })
      );

      const joinedLines = await Promise.all(
        guestParticipants.map(async (p, i) => {
          const username = await resolveUsername(message, p.userId);
          const cards = ensureArray(p.selectedCards)
            .map((c) => c.name || c.code)
            .filter(Boolean)
            .join(", ");

          return `${i + 1}. ${username}${cards ? ` • ${cards}` : ""}`;
        })
      );

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`Active ${room.mode === "raid" ? "Raid" : "Party Boss"} Team`)
            .setDescription(
              [
                `**Boss:** ${room.bossName || "Unknown"}`,
                `**Status:** ${room.status || "waiting"}`,
                `**Joined Guests:** ${guestParticipants.length}/${maxGuestSlots}`,
                `**Invited Users:** ${whitelist.length}`,
                "",
                "## Active Room Invited",
                ...(invitedLines.length ? invitedLines : ["None"]),
                "",
                "## Joined Battle",
                ...(joinedLines.length ? joinedLines : ["None"]),
                "",
                `## Saved Raid Team ${savedMembers.length}/9`,
                ...savedLines,
              ].join("\n")
            )
            .setFooter({
              text: "One Piece Bot • Raid Team",
            }),
        ],
      });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`Saved Raid Team ${savedMembers.length}/9`)
          .setDescription(savedLines.join("\n"))
          .setFooter({
            text: "One Piece Bot • Raid Team",
          }),
      ],
    });
  },
};