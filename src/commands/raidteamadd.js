const { readPlayers, writePlayers } = require("../playerStore");
const { getRoom, addWhitelistUser } = require("../utils/partyRooms");

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

function resolveUserLabel(message, targetId) {
  const member =
    message.guild?.members?.cache?.get(String(targetId)) || null;

  if (member) {
    return member.displayName || member.user?.username || String(targetId);
  }

  const user = message.client?.users?.cache?.get(String(targetId)) || null;
  return user?.username || String(targetId);
}

module.exports = {
  name: "raidteamadd",
  aliases: ["rtadd"],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const targetId = extractMentionId(args[0]);
    if (!targetId) {
      return message.reply("Usage: `op rtadd <@user>`");
    }

    if (targetId === String(message.author.id)) {
      return message.reply("You do not need to add yourself.");
    }

    const targetLabel = resolveUserLabel(message, targetId);
    const activeRoom = getRoom(message.author.id);

    if (activeRoom) {
      try {
        const updated = addWhitelistUser(message.author.id, targetId);
        return message.reply(
          `Added ${targetLabel} to active ${updated.mode} room whitelist. Total invited: ${updated.whitelist.length}`
        );
      } catch (error) {
        return message.reply(error.message || "Failed to add user to active room.");
      }
    }

    const players = readPlayers();
    const hostId = String(message.author.id);

    if (!players[hostId]) {
      return message.reply("Your player data was not found. Run a normal game command first.");
    }

    players[hostId].raidTeam = players[hostId].raidTeam || {};
    players[hostId].raidTeam.members = ensureArray(players[hostId].raidTeam.members);

    if (players[hostId].raidTeam.members.includes(targetId)) {
      return message.reply(`${targetLabel} is already in your saved raid team.`);
    }

    players[hostId].raidTeam.members.push(targetId);
    writePlayers(players);

    return message.reply(
      `Added ${targetLabel} to your saved raid team. Total members: ${players[hostId].raidTeam.members.length}`
    );
  },
};