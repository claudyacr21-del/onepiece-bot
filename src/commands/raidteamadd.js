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

function isAdmin(userId) {
  return getAdminIds().includes(String(userId));
}

async function resolveTargetUser(message, raw) {
  const text = String(raw || "").trim();
  if (!text) return null;

  const mention = text.match(/^<@!?(\d+)>$/);
  if (mention) {
    const id = mention[1];

    const member = message.guild?.members?.cache?.get(id) || null;
    if (member?.user) {
      return { id: String(member.user.id), username: member.user.username };
    }

    const user =
      message.client?.users?.cache?.get(id) ||
      (await message.client.users.fetch(id).catch(() => null));

    if (user) {
      return { id: String(user.id), username: user.username };
    }

    return null;
  }

  if (/^\d+$/.test(text)) {
    const id = text;

    const member = message.guild?.members?.cache?.get(id) || null;
    if (member?.user) {
      return { id: String(member.user.id), username: member.user.username };
    }

    const user =
      message.client?.users?.cache?.get(id) ||
      (await message.client.users.fetch(id).catch(() => null));

    if (user) {
      return { id: String(user.id), username: user.username };
    }

    return null;
  }

  const lower = text.toLowerCase();

  const cachedMembers = message.guild
    ? [...message.guild.members.cache.values()]
    : [];

  const member =
    cachedMembers.find((m) => m.user?.username?.toLowerCase() === lower) ||
    cachedMembers.find((m) => m.user?.username?.toLowerCase().includes(lower));

  if (member?.user) {
    return {
      id: String(member.user.id),
      username: member.user.username,
    };
  }

  const cachedUsers = [...message.client.users.cache.values()];
  const user =
    cachedUsers.find((u) => u.username?.toLowerCase() === lower) ||
    cachedUsers.find((u) => u.username?.toLowerCase().includes(lower));

  if (user) {
    return {
      id: String(user.id),
      username: user.username,
    };
  }

  return null;
}

module.exports = {
  name: "raidteamadd",
  aliases: ["rtadd"],

  async execute(message, args) {
    try {
      if (!isAdmin(message.author.id)) {
        return message.reply("Owner only command.");
      }

      const rawTarget = args.join(" ").trim();
      const target = await resolveTargetUser(message, rawTarget);

      if (!target) {
        return message.reply("User not found.");
      }

      if (target.id === String(message.author.id)) {
        return message.reply("You do not need to add yourself.");
      }

      const activeRoom = getRoom(message.author.id);

      if (activeRoom) {
        try {
          const updated = addWhitelistUser(message.author.id, target.id);
          return message.reply(
            `Added ${target.username} to active ${updated.mode} room whitelist. Total invited: ${updated.whitelist.length}`
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

      if (players[hostId].raidTeam.members.includes(target.id)) {
        return message.reply(`${target.username} is already in your saved raid team.`);
      }

      players[hostId].raidTeam.members.push(target.id);
      writePlayers(players);

      return message.reply(
        `Added ${target.username} to your saved raid team. Total members: ${players[hostId].raidTeam.members.length}`
      );
    } catch (error) {
      console.error("raidteamadd error:", error);
      return message.reply("Failed to add user to raid team.");
    }
  },
};