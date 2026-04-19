const { readPlayers, writePlayers } = require("../playerStore");
const { getRoom, clearWhitelist } = require("../utils/partyRooms");

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

module.exports = {
  name: "raidteamdelete",
  aliases: ["rtdelete"],

  async execute(message) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const activeRoom = getRoom(message.author.id);

    if (activeRoom) {
      try {
        clearWhitelist(message.author.id);
        return message.reply(
          `Cleared invited users from active ${activeRoom.mode} room. Host stays in the room.`
        );
      } catch (error) {
        return message.reply(error.message || "Failed to clear active room whitelist.");
      }
    }

    const players = readPlayers();
    const hostId = String(message.author.id);

    if (!players[hostId]) {
      return message.reply("Your player data was not found. Run a normal game command first.");
    }

    players[hostId].raidTeam = players[hostId].raidTeam || {};
    players[hostId].raidTeam.members = [];
    writePlayers(players);

    return message.reply("Your saved raid team has been fully cleared.");
  },
};