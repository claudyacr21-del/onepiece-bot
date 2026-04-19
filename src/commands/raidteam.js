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

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`Active ${activeRoom.mode === "raid" ? "Raid" : "Party Boss"} Team`)
            .setDescription(
              [
                `**Boss:** ${activeRoom.bossName}`,
                `**Room ID:** ${activeRoom.roomId}`,
                `**Status:** ${activeRoom.status}`,
                `**Max Participants:** ${activeRoom.maxParticipants}`,
                "",
                "**Invited Users**",
                ...(members.length ? members.map((id, i) => `${i + 1}. <@${id}>`) : ["None"]),
                "",
                "**Joined Battle**",
                ...(participants.length
                  ? participants.map(
                      (p, i) =>
                        `${i + 1}. <@${p.userId}> • ${ensureArray(p.selectedCards)
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
      return message.reply("Your player data was not found. Run a normal game command first.");
    }

    const members = ensureArray(players[hostId]?.raidTeam?.members);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("Saved Raid Team")
          .setDescription(
            members.length
              ? members.map((id, i) => `${i + 1}. <@${id}>`).join("\n")
              : "No saved raid team members."
          ),
      ],
    });
  },
};