const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "data", "players.json");

function ensureFile() {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "{}", "utf8");
  }
}

function readPlayers() {
  ensureFile();

  try {
    const raw = fs.readFileSync(filePath, "utf8").trim();

    if (!raw) {
      fs.writeFileSync(filePath, "{}", "utf8");
      return {};
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error("players.json is invalid. Resetting file...", error);
    fs.writeFileSync(filePath, "{}", "utf8");
    return {};
  }
}

function writePlayers(data) {
  ensureFile();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function normalizeNamedList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return { name: entry, amount: 1 };
      }

      if (entry && typeof entry === "object") {
        return {
          name: entry.name || "Unknown Item",
          amount: Number(entry.amount) > 0 ? Number(entry.amount) : 1,
          rarity: entry.rarity || undefined,
          code: entry.code || undefined,
          image: entry.image || "",
          type: entry.type || undefined,
          statBonus: entry.statBonus || undefined,
          owners: Array.isArray(entry.owners) ? entry.owners : undefined,
          description: entry.description || undefined,
          boostBonus: entry.boostBonus || undefined
        };
      }

      return null;
    })
    .filter(Boolean);
}

function normalizeFragmentList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;

      return {
        name: entry.name || "Unknown Fragment",
        amount: Number(entry.amount) > 0 ? Number(entry.amount) : 0,
        rarity: entry.rarity || "C",
        category: entry.category || "battle",
        code: entry.code || undefined,
        image: entry.image || ""
      };
    })
    .filter(Boolean);
}

function normalizeCards(value) {
  if (!Array.isArray(value)) return [];

  return value.map((card) => ({
    ...card,
    instanceId: String(card.instanceId || Date.now()),
    level: Number(card.level) > 0 ? Number(card.level) : 1,
    kills: Number(card.kills) >= 0 ? Number(card.kills) : 0,
    fragments: Number(card.fragments) >= 0 ? Number(card.fragments) : 0,
    image: card.image || "",
    equippedWeapon: card.equippedWeapon || null,
    equippedDevilFruit: card.equippedDevilFruit || null
  }));
}

function normalizePulls(pulls) {
  return {
    base: {
      used: Number(pulls?.base?.used) >= 0 ? Number(pulls.base.used) : 0,
      max: Number(pulls?.base?.max) > 0 ? Number(pulls.base.max) : 6
    },
    supportMember: {
      used: Number(pulls?.supportMember?.used) >= 0 ? Number(pulls.supportMember.used) : 0,
      max: Number(pulls?.supportMember?.max) >= 0 ? Number(pulls.supportMember.max) : 1
    },
    booster: {
      used: Number(pulls?.booster?.used) >= 0 ? Number(pulls.booster.used) : 0,
      max: Number(pulls?.booster?.max) >= 0 ? Number(pulls.booster.max) : 1
    },
    owner: {
      used: Number(pulls?.owner?.used) >= 0 ? Number(pulls.owner.used) : 0,
      max: Number(pulls?.owner?.max) >= 0 ? Number(pulls.owner.max) : 1
    },
    patreon: {
      used: Number(pulls?.patreon?.used) >= 0 ? Number(pulls.patreon.used) : 0,
      max: Number(pulls?.patreon?.max) >= 0 ? Number(pulls.patreon.max) : 3
    },
    lastResetBucket: Number.isInteger(pulls?.lastResetBucket)
      ? pulls.lastResetBucket
      : null
  };
}

function normalizeBoosts(boosts) {
  return {
    pullSlot: Number(boosts?.pullSlot) || 0,
    daily: Number(boosts?.daily) || 0,
    atk: Number(boosts?.atk) || 0,
    hp: Number(boosts?.hp) || 0,
    spd: Number(boosts?.spd) || 0,
    exp: Number(boosts?.exp) || 0,
    dmg: Number(boosts?.dmg) || 0
  };
}

function normalizeQuests(quests) {
  return {
    daily: {
      total: Number(quests?.daily?.total) > 0 ? Number(quests.daily.total) : 5,
      completed: Number(quests?.daily?.completed) >= 0 ? Number(quests.daily.completed) : 0
    },
    totalClears: Number(quests?.totalClears) >= 0 ? Number(quests.totalClears) : 0
  };
}

function normalizeCooldowns(cooldowns) {
  return {
    daily: cooldowns?.daily || null,
    fight: cooldowns?.fight || null,
    boss: cooldowns?.boss || null,
    pullReset: cooldowns?.pullReset || null,
    ship: cooldowns?.ship || null,
    vote: cooldowns?.vote || null,
    treasure: cooldowns?.treasure || null
  };
}

function normalizeVote(vote) {
  return {
    streak: Number(vote?.streak) >= 0 ? Number(vote.streak) : 0,
    totalVotes: Number(vote?.totalVotes) >= 0 ? Number(vote.totalVotes) : 0,
    lastVoteAt: vote?.lastVoteAt || null
  };
}

function normalizePlayer(player, username = "Unknown") {
  return {
    username: player.username || username,
    berries: typeof player.berries === "number" ? player.berries : 1000,
    gems: typeof player.gems === "number" ? player.gems : 100,
    currentIsland: player.currentIsland || "Shells Town",
    dailyLastClaim: player.dailyLastClaim || null,
    cards: normalizeCards(player.cards),
    fragments: normalizeFragmentList(player.fragments),
    items: normalizeNamedList(player.items),
    weapons: normalizeNamedList(player.weapons),
    devilFruits: normalizeNamedList(player.devilFruits),
    boxes: normalizeNamedList(player.boxes),
    tickets: normalizeNamedList(player.tickets),
    materials: normalizeNamedList(player.materials),
    pity: {
      normalSPity: Number(player?.pity?.normalSPity) >= 0 ? Number(player.pity.normalSPity) : 0,
      premiumSPity: Number(player?.pity?.premiumSPity) >= 0 ? Number(player.pity.premiumSPity) : 0
    },
    pulls: normalizePulls(player.pulls),
    boosts: normalizeBoosts(player.boosts),
    quests: normalizeQuests(player.quests),
    cooldowns: normalizeCooldowns(player.cooldowns),
    vote: normalizeVote(player.vote),
    clan: {
      name: player?.clan?.name || null,
      role: player?.clan?.role || "member"
    }
  };
}

function getDefaultPlayer(username) {
  return {
    username,
    berries: 1000,
    gems: 100,
    currentIsland: "Shells Town",
    dailyLastClaim: null,
    cards: [],
    fragments: [],
    items: [],
    weapons: [],
    devilFruits: [],
    boxes: [],
    tickets: [],
    materials: [],
    pity: {
      normalSPity: 0,
      premiumSPity: 0
    },
    pulls: {
      base: { used: 0, max: 6 },
      supportMember: { used: 0, max: 1 },
      booster: { used: 0, max: 1 },
      owner: { used: 0, max: 1 },
      patreon: { used: 0, max: 3 },
      lastResetBucket: null
    },
    boosts: {
      pullSlot: 0,
      daily: 0,
      atk: 0,
      hp: 0,
      spd: 0,
      exp: 0,
      dmg: 0
    },
    quests: {
      daily: {
        total: 5,
        completed: 0
      },
      totalClears: 0
    },
    cooldowns: {
      daily: null,
      fight: null,
      boss: null,
      pullReset: null,
      ship: null,
      vote: null,
      treasure: null
    },
    vote: {
      streak: 0,
      totalVotes: 0,
      lastVoteAt: null
    },
    clan: {
      name: null,
      role: "member"
    }
  };
}

function getPlayer(userId, username) {
  const players = readPlayers();

  if (!players[userId]) {
    players[userId] = getDefaultPlayer(username);
    writePlayers(players);
  } else {
    players[userId] = normalizePlayer(players[userId], username);
    writePlayers(players);
  }

  return players[userId];
}

function updatePlayer(userId, newData) {
  const players = readPlayers();

  const currentPlayer = players[userId]
    ? normalizePlayer(players[userId])
    : getDefaultPlayer("Unknown");

  players[userId] = normalizePlayer(
    { ...currentPlayer, ...newData },
    currentPlayer.username
  );

  writePlayers(players);
}

module.exports = {
  readPlayers,
  writePlayers,
  getPlayer,
  updatePlayer
};