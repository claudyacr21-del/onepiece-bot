const { EmbedBuilder } = require("discord.js");
const { readPlayers } = require("../playerStore");
const { getRoom } = require("../utils/partyRooms");

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

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function isAdmin(userId) {
  return getAdminIds().includes(String(userId));
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
  name: "raidteam",
  aliases: ["rt"],

  async execute(message) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const activeRoom = getRoom(message.author.id);

    if (activeRoom) {
      const members = ensureArray(activeRoom.whitelist);
      const participants = ensureArray(activeRoom.participants);

      const hostId = String(activeRoom.hostId);
      const guestParticipants = participants.filter(
        (p) => String(p.userId) !== hostId
      );

      const maxGuestSlots = Math.max(
        0,
        Number(activeRoom.maxParticipants || 0) - 1
      );

      const hostUsername = await resolveUsername(message, hostId);
      const invitedLines = await Promise.all(
        members.map(async (id, i) => `${i + 1}. ${await resolveUsername(message, id)}`)
      );
      const joinedLines = await Promise.all(
        guestParticipants.map(async (p, i) => {
          const username = await resolveUsername(message, p.userId);
          const cards = ensureArray(p.selectedCards)
            .map((c) => c.name || c.code)
            .join(", ");
          return `${i + 1}. ${username} • ${cards}`;
        })
      );

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(
              `Active ${activeRoom.mode === "raid" ? "Raid" : "Party Boss"} Team`
            )
            .setDescription(
              [
                `**Boss:** ${activeRoom.bossName}`,
                `**Status:** ${activeRoom.status}`,
                `**Joined Guests:** ${guestParticipants.length}/${maxGuestSlots}`,
                `**Invited Users:** ${members.length}`,
                "",
                `**Host**`,
                hostUsername,
                "",
                "**Invited Users**",
                ...(invitedLines.length ? invitedLines : ["None"]),
                "",
                "**Joined Battle**",
                ...(joinedLines.length ? joinedLines : ["None"]),
              ].join("\n")
            ),
        ],
      });
    }

    const players = readPlayers();
    const hostId = String(message.author.id);

    if (!players[hostId]) {
      return message.reply(
        "Your player data was not found. Run a normal game command first."
      );
    }

    const members = ensureArray(players[hostId]?.raidTeam?.members);
    const memberLines = await Promise.all(
      members.map(async (id, i) => `${i + 1}. ${await resolveUsername(message, id)}`)
    );

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`Saved Raid Team ${members.length}/9`)
          .setDescription(
            memberLines.length ? memberLines.join("\n") : "No saved raid team members."
          ),
      ],
    });
  },
};