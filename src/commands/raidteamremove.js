const { readPlayers, writePlayers } = require("../playerStore");
const { getRoom, removeWhitelistUser } = require("../utils/partyRooms");

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

function extractMentionId(raw) {
  const text = String(raw || "").trim();
  const match = text.match(/^<@!?(\d+)>$/);
  if (match) return match[1];
  if (/^\d+$/.test(text)) return text;
  return null;
}

function isAdmin(userId) {
  return getAdminIds().includes(String(userId));
}

module.exports = {
  name: "raidteamremove",
  aliases: ["rtremove"],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const targetId = extractMentionId(args[0]);
    if (!targetId) {
      return message.reply("Usage: `op rtremove <@user>`");
    }

    const activeRoom = getRoom(message.author.id);

    if (activeRoom) {
      try {
        const updated = removeWhitelistUser(message.author.id, targetId);
        return message.reply(
          `Removed <@${targetId}> from active ${updated.mode} room whitelist.`
        );
      } catch (error) {
        return message.reply(error.message || "Failed to remove user from active room.");
      }
    }

    const players = readPlayers();
    const hostId = String(message.author.id);

    if (!players[hostId]) {
      return message.reply("Your player data was not found. Run a normal game command first.");
    }

    players[hostId].raidTeam = players[hostId].raidTeam || {};
    players[hostId].raidTeam.members = ensureArray(players[hostId].raidTeam.members);

    const before = players[hostId].raidTeam.members.length;
    players[hostId].raidTeam.members = players[hostId].raidTeam.members.filter(
      (id) => String(id) !== String(targetId)
    );

    if (players[hostId].raidTeam.members.length === before) {
      return message.reply(`<@${targetId}> is not in your saved raid team.`);
    }

    writePlayers(players);

    return message.reply(
      `Removed <@${targetId}> from your saved raid team. Remaining members: ${players[hostId].raidTeam.members.length}`
    );
  },
};