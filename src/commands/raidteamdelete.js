const { readPlayers, writePlayers } = require("../playerStore");
const {
  getRoom,
  listRooms,
  clearWhitelist,
} = require("../utils/partyRooms");

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function findRelevantRoom(userId, guildId = null, channelId = null) {
  const uid = String(userId || "");
  const gid = guildId ? String(guildId) : null;
  const cid = channelId ? String(channelId) : null;

  const directRoom = getRoom(uid);
  if (directRoom) return directRoom;

  const rooms = listRooms();

  return (
    rooms.find((room) => String(room.hostId) === uid) ||
    rooms.find((room) => {
      const sameGuild = !gid || String(room.guildId || "") === gid;
      const sameChannel = !cid || String(room.channelId || "") === cid;

      return (
        sameGuild &&
        sameChannel &&
        ensureArray(room.participants).some((p) => String(p.userId) === uid)
      );
    }) ||
    rooms.find((room) => {
      const sameGuild = !gid || String(room.guildId || "") === gid;
      const sameChannel = !cid || String(room.channelId || "") === cid;

      return (
        sameGuild &&
        sameChannel &&
        ensureArray(room.whitelist).some((id) => String(id) === uid)
      );
    }) ||
    null
  );
}

function clearSavedRaidTeam(hostId, username) {
  const players = readPlayers();

  if (!players[hostId]) {
    players[hostId] = {
      username,
      raidTeam: {
        members: [],
      },
    };
  }

  players[hostId].raidTeam = players[hostId].raidTeam || {};
  players[hostId].raidTeam.members = [];

  writePlayers(players);
}

module.exports = {
  name: "raidteamdelete",
  aliases: ["rtdelete"],

  async execute(message) {
    const hostId = String(message.author.id);
    const activeRoom = findRelevantRoom(hostId, message.guildId, message.channelId);

    let activeText = "No active raid/party room whitelist found.";

    if (activeRoom && String(activeRoom.hostId) !== hostId) {
      return message.reply(
        `Only the raid host can clear this active room.\nRaid host: <@${activeRoom.hostId}>`
      );
    }

    if (activeRoom) {
      try {
        clearWhitelist(activeRoom.hostId);
        activeText = `Cleared invited users from active ${activeRoom.mode || "raid"} room. Host stays in the room.`;
      } catch (error) {
        activeText = `Active room clear failed: ${error.message || "Unknown error"}`;
      }
    }

    clearSavedRaidTeam(hostId, message.author.username);

    return message.reply(
      [
        "Your saved raid team has been fully cleared.",
        activeText,
      ].join("\n")
    );
  },
};