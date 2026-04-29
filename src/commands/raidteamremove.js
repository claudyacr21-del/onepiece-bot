const { readPlayers, writePlayers } = require("../playerStore");
const { getRoom, removeWhitelistUser } = require("../utils/partyRooms");

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

function removeFromSavedRaidTeam(hostId, targetId) {
  const players = readPlayers();

  if (!players[hostId]) {
    return {
      removed: false,
      remaining: 0,
    };
  }

  players[hostId].raidTeam = players[hostId].raidTeam || {};
  players[hostId].raidTeam.members = ensureArray(players[hostId].raidTeam.members)
    .map(String)
    .filter(Boolean);

  const before = players[hostId].raidTeam.members.length;

  players[hostId].raidTeam.members = players[hostId].raidTeam.members.filter(
    (id) => String(id) !== String(targetId)
  );

  const after = players[hostId].raidTeam.members.length;

  writePlayers(players);

  return {
    removed: after < before,
    remaining: after,
  };
}

module.exports = {
  name: "raidteamremove",
  aliases: ["rtremove"],

  async execute(message, args) {
    try {
      const rawTarget = args.join(" ").trim();

      if (!rawTarget) {
        return message.reply("Usage: `op rtremove @user` or `op rtremove exact_username`");
      }

      const target = await resolveTargetUser(message, rawTarget);

      if (!target) {
        return message.reply("User not found. Use `@mention` or exact username only.");
      }

      const hostId = String(message.author.id);
      const savedResult = removeFromSavedRaidTeam(hostId, target.id);
      const activeRoom = getRoom(hostId);
      let activeText = "";

      if (activeRoom) {
        try {
          removeWhitelistUser(hostId, target.id);
          activeText = `Removed ${target.username} from active ${activeRoom.mode || "raid"} room whitelist.`;
        } catch (error) {
          activeText = `Active room remove skipped: ${error.message || "Unknown error"}`;
        }
      }

      if (!savedResult.removed && !activeRoom) {
        return message.reply(`${target.username} is not in your saved raid team.`);
      }

      return message.reply(
        [
          savedResult.removed
            ? `Removed ${target.username} from your saved raid team.`
            : `${target.username} was not in saved raid team.`,
          `Remaining members: ${savedResult.remaining}/9`,
          activeText,
        ]
          .filter(Boolean)
          .join("\n")
      );
    } catch (error) {
      console.error("raidteamremove error:", error);
      return message.reply("Failed to remove user from raid team.");
    }
  },
};