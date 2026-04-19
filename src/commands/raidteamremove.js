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

function isAdmin(userId) {
  return getAdminIds().includes(String(userId));
}

async function resolveTargetUser(message, raw) {
  const text = String(raw || "").trim();
  if (!text) return null;

  const mention = text.match(/^<@!?(\d+)>$/);
  if (mention) {
    const id = mention[1];
    const member =
      message.guild?.members?.cache?.get(id) ||
      (message.guild ? await message.guild.members.fetch(id).catch(() => null) : null);

    if (member?.user) {
      return { id, username: member.user.username };
    }

    const user =
      message.client?.users?.cache?.get(id) ||
      (await message.client.users.fetch(id).catch(() => null));

    if (user) {
      return { id, username: user.username };
    }

    return { id, username: id };
  }

  if (/^\d+$/.test(text)) {
    const id = text;
    const member =
      message.guild?.members?.cache?.get(id) ||
      (message.guild ? await message.guild.members.fetch(id).catch(() => null) : null);

    if (member?.user) {
      return { id, username: member.user.username };
    }

    const user =
      message.client?.users?.cache?.get(id) ||
      (await message.client.users.fetch(id).catch(() => null));

    if (user) {
      return { id, username: user.username };
    }

    return { id, username: id };
  }

  const lower = text.toLowerCase();

  const cachedMembers = message.guild
    ? [...message.guild.members.cache.values()]
    : [];

  let member =
    cachedMembers.find((m) => m.user?.username?.toLowerCase() === lower) ||
    cachedMembers.find((m) => m.user?.username?.toLowerCase().includes(lower));

  if (!member && message.guild) {
    const fetchedMembers = await message.guild.members.fetch().catch(() => null);
    if (fetchedMembers) {
      const all = [...fetchedMembers.values()];
      member =
        all.find((m) => m.user?.username?.toLowerCase() === lower) ||
        all.find((m) => m.user?.username?.toLowerCase().includes(lower));
    }
  }

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
  name: "raidteamremove",
  aliases: ["rtremove"],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const rawTarget = args.join(" ").trim();
    const target = await resolveTargetUser(message, rawTarget);

    if (!target) {
      return message.reply("Usage: `op rtremove <@user|userId|username>`");
    }

    const activeRoom = getRoom(message.author.id);

    if (activeRoom) {
      try {
        removeWhitelistUser(message.author.id, target.id);
        return message.reply(
          `Removed ${target.username} from active ${activeRoom.mode} room whitelist.`
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
      (id) => String(id) !== String(target.id)
    );

    if (players[hostId].raidTeam.members.length === before) {
      return message.reply(`${target.username} is not in your saved raid team.`);
    }

    writePlayers(players);

    return message.reply(
      `Removed ${target.username} from your saved raid team. Remaining members: ${players[hostId].raidTeam.members.length}`
    );
  },
};