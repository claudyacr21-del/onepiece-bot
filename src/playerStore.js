const fs = require("fs");
const path = require("path");

const persistentDir = process.env.PLAYER_DATA_DIR || "/data";
const fallbackDir = path.join(__dirname, "data");
const legacyFilePath = path.join(__dirname, "data", "players.json");

function resolveFilePath() {
  try {
    fs.mkdirSync(persistentDir, { recursive: true });
    return path.join(persistentDir, "players.json");
  } catch (error) {
    console.warn("Could not use persistent player data dir, falling back to local data dir.", error);
    fs.mkdirSync(fallbackDir, { recursive: true });
    return path.join(fallbackDir, "players.json");
  }
}

const filePath = resolveFilePath();

function ensureFile() {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "{}", "utf8");
  }
}

function tryMigrateLegacyData() {
  try {
    ensureFile();

    const currentRaw = fs.readFileSync(filePath, "utf8").trim();
    const currentData = currentRaw ? JSON.parse(currentRaw) : {};

    if (Object.keys(currentData).length > 0) {
      return;
    }

    if (!fs.existsSync(legacyFilePath)) {
      return;
    }

    const legacyRaw = fs.readFileSync(legacyFilePath, "utf8").trim();
    if (!legacyRaw) {
      return;
    }

    const legacyData = JSON.parse(legacyRaw);
    if (!legacyData || typeof legacyData !== "object" || Object.keys(legacyData).length === 0) {
      return;
    }

    fs.writeFileSync(filePath, JSON.stringify(legacyData, null, 2), "utf8");
    console.log("Migrated legacy player data to persistent storage.");
  } catch (error) {
    console.error("Legacy migration failed:", error);
  }
}

function readPlayers() {
  ensureFile();
  tryMigrateLegacyData();

  try {
    const raw = fs.readFileSync(filePath, "utf8").trim();

    if (!raw) {
      fs.writeFileSync(filePath, "{}", "utf8");
      return {};
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error("players.json is invalid. Creating backup and resetting file...", error);

    try {
      const brokenRaw = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
      const backupPath = `${filePath}.broken.${Date.now()}.bak`;
      fs.writeFileSync(backupPath, brokenRaw, "utf8");
      console.error(`Broken players.json backed up to ${backupPath}`);
    } catch (backupError) {
      console.error("Failed to back up broken players.json", backupError);
    }

    fs.writeFileSync(filePath, "{}", "utf8");
    return {};
  }
}

function writePlayers(data) {
  ensureFile();

  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
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
    instanceId: String(card.instanceId || `${Date.now()}-${Math.floor(Math.random() * 10000)}`),
    level: Number(card.level) > 0 ? Number(card.level) : 1,
    kills: Number(card.kills) >= 0 ? Number(card.kills) : 0,
    fragments: Number(card.fragments) >= 0 ? Number(card.fragments) : 0,
    image: card.image || "",
    equippedWeapon: card.equippedWeapon || null,
    equippedDevilFruit: card.equippedDevilFruit || null
  }));
}

function normalizePullSlot(slot, fallbackMax) {
  return {
    used: Number(slot?.used) >= 0 ? Number(slot.used) : 0,
    max: Number(slot?.max) >= 0 ? Number(slot.max) : fallbackMax
  };
}

function normalizePulls(pulls) {
  return {
    base: normalizePullSlot(pulls?.base, 6),
    supportMember: normalizePullSlot(pulls?.supportMember, 1),
    booster: normalizePullSlot(pulls?.booster, 1),
    owner: normalizePullSlot(pulls?.owner, 1),
    patreon: normalizePullSlot(pulls?.patreon, 3),
    baccaratCard: normalizePullSlot(pulls?.baccaratCard, 1),
    baccaratFruit: normalizePullSlot(pulls?.baccaratFruit, 1),
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

function normalizeTeam(team) {
  const slots = Array.isArray(team?.slots) ? team.slots.slice(0, 3) : [];

  while (slots.length < 3) {
    slots.push(null);
  }

  return {
    slots: slots.map((slot) => (slot ? String(slot) : null))
  };
}

function normalizeStats(stats) {
  return {
    wins: Number(stats?.wins) >= 0 ? Number(stats.wins) : 0,
    losses: Number(stats?.losses) >= 0 ? Number(stats.losses) : 0,
    winStreak: Number(stats?.winStreak) >= 0 ? Number(stats.winStreak) : 0,
    bestWinStreak: Number(stats?.bestWinStreak) >= 0 ? Number(stats.bestWinStreak) : 0
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
    team: normalizeTeam(player.team),
    stats: normalizeStats(player.stats),
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
      baccaratCard: { used: 0, max: 1 },
      baccaratFruit: { used: 0, max: 1 },
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
    team: {
      slots: [null, null, null]
    },
    stats: {
      wins: 0,
      losses: 0,
      winStreak: 0,
      bestWinStreak: 0
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