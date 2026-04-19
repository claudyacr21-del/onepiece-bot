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

function resolveUserLabel(message, userId) {
  const member =
    message.guild?.members?.cache?.get(String(userId)) || null;

  if (member) {
    return member.displayName || member.user?.username || String(userId);
  }

  const user = message.client?.users?.cache?.get(String(userId)) || null;
  return user?.username || String(userId);
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
                resolveUserLabel(message, hostId),
                "",
                "**Invited Users**",
                ...(members.length
                  ? members.map((id, i) => `${i + 1}. ${resolveUserLabel(message, id)}`)
                  : ["None"]),
                "",
                "**Joined Battle**",
                ...(guestParticipants.length
                  ? guestParticipants.map(
                      (p, i) =>
                        `${i + 1}. ${resolveUserLabel(message, p.userId)} • ${ensureArray(
                          p.selectedCards
                        )
                          .map((c) => c.name || c.code)
                          .join(", ")}`
                    )
                  : ["None"]),
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

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`Saved Raid Team ${members.length}/9`)
          .setDescription(
            members.length
              ? members.map((id, i) => `${i + 1}. ${resolveUserLabel(message, id)}`).join("\n")
              : "No saved raid team members."
          ),
      ],
    });
  },
};