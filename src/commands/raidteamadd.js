const { readPlayers, writePlayers } = require("../playerStore");
const { getRoom, addWhitelistUser } = require("../utils/partyRooms");

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

async function fetchGuildMembers(message) {
  if (!message.guild) return [];

  await message.guild.members.fetch().catch(() => null);

  return [...message.guild.members.cache.values()];
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
      return {
        id: String(member.user.id),
        username: member.user.username,
      };
    }

    const user =
      message.client?.users?.cache?.get(id) ||
      (await message.client.users.fetch(id).catch(() => null));

    if (user) {
      return {
        id: String(user.id),
        username: user.username,
      };
    }

    return null;
  }

  if (/^\d+$/.test(text)) {
    const id = text;

    const member =
      message.guild?.members?.cache?.get(id) ||
      (message.guild ? await message.guild.members.fetch(id).catch(() => null) : null);

    if (member?.user) {
      return {
        id: String(member.user.id),
        username: member.user.username,
      };
    }

    const user =
      message.client?.users?.cache?.get(id) ||
      (await message.client.users.fetch(id).catch(() => null));

    if (user) {
      return {
        id: String(user.id),
        username: user.username,
      };
    }

    return null;
  }

  const q = normalize(text);
  const members = await fetchGuildMembers(message);

  const exactMember =
    members.find((m) => normalize(m.user?.username) === q) ||
    members.find((m) => normalize(m.displayName) === q) ||
    members.find((m) => normalize(m.user?.globalName) === q);

  if (exactMember?.user) {
    return {
      id: String(exactMember.user.id),
      username: exactMember.user.username,
    };
  }

  const cachedUsers = [...message.client.users.cache.values()];

  const exactUser =
    cachedUsers.find((u) => normalize(u.username) === q) ||
    cachedUsers.find((u) => normalize(u.globalName) === q);

  if (exactUser) {
    return {
      id: String(exactUser.id),
      username: exactUser.username,
    };
  }

  return null;
}

function getOrCreateHostPlayer(players, hostId, username) {
  if (!players[hostId]) {
    players[hostId] = {
      username,
      raidTeam: {
        members: [],
      },
    };
  }

  players[hostId].username = players[hostId].username || username;
  players[hostId].raidTeam = players[hostId].raidTeam || {};
  players[hostId].raidTeam.members = ensureArray(players[hostId].raidTeam.members)
    .map(String)
    .filter(Boolean);

  return players[hostId];
}

function addToSavedRaidTeam(hostId, hostUsername, targetId) {
  const players = readPlayers();
  const host = getOrCreateHostPlayer(players, hostId, hostUsername);

  if (host.raidTeam.members.includes(String(targetId))) {
    return {
      added: false,
      total: host.raidTeam.members.length,
    };
  }

  if (host.raidTeam.members.length >= 9) {
    throw new Error("Saved raid team is already full. Max 9 members.");
  }

  host.raidTeam.members.push(String(targetId));
  writePlayers(players);

  return {
    added: true,
    total: host.raidTeam.members.length,
  };
}

module.exports = {
  name: "raidteamadd",
  aliases: ["rtadd"],

  async execute(message, args) {
    try {
      const rawTarget = args.join(" ").trim();

      if (!rawTarget) {
        return message.reply("Usage: `op rtadd @user` or `op rtadd exact_username`");
      }

      const target = await resolveTargetUser(message, rawTarget);

      if (!target) {
        return message.reply("User not found. Use `@mention` or exact username only.");
      }

      if (target.id === String(message.author.id)) {
        return message.reply("You do not need to add yourself.");
      }

      const hostId = String(message.author.id);
      const saved = addToSavedRaidTeam(hostId, message.author.username, target.id);
      const activeRoom = getRoom(hostId);

      if (activeRoom) {
        try {
          const updated = addWhitelistUser(hostId, target.id);

          return message.reply(
            [
              saved.added
                ? `Added ${target.username} to your saved raid team.`
                : `${target.username} is already in your saved raid team.`,
              `Saved Raid Team: ${saved.total}/9`,
              `Added ${target.username} to active ${updated.mode} room whitelist.`,
              `Active Room Invited: ${updated.whitelist.length}`,
            ].join("\n")
          );
        } catch (error) {
          return message.reply(
            [
              saved.added
                ? `Added ${target.username} to your saved raid team.`
                : `${target.username} is already in your saved raid team.`,
              `Saved Raid Team: ${saved.total}/9`,
              "",
              `Active room sync failed: ${error.message || "Unknown error"}`,
            ].join("\n")
          );
        }
      }

      return message.reply(
        saved.added
          ? `Added ${target.username} to your saved raid team.\nTotal members: ${saved.total}/9`
          : `${target.username} is already in your saved raid team.\nTotal members: ${saved.total}/9`
      );
    } catch (error) {
      console.error("raidteamadd error:", error);
      return message.reply(error.message || "Failed to add user to raid team.");
    }
  },
};