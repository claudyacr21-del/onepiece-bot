const fs = require("fs");
const path = require("path");

const persistentDir = process.env.PLAYER_DATA_DIR || "/data";
const fallbackDir = path.join(__dirname, "data");

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
    console.error("players.json is invalid. Creating backup and resetting file...", error);

    try {
      const brokenRaw = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
      const backupPath = `${filePath}.broken.${Date.now()}.bak`;
      fs.writeFileSync(backupPath, brokenRaw, "utf8");
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
          boostBonus: entry.boostBonus || undefined,
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
        image: entry.image || "",
      };
    })
    .filter(Boolean);
}

function normalizeCards(value) {
  if (!Array.isArray(value)) return [];

  return value.map((card) => {
    const equippedWeapons = Array.isArray(card.equippedWeapons)
      ? card.equippedWeapons.map((w) => ({
          name: w?.name || "Unknown Weapon",
          code: w?.code || null,
          rarity: w?.rarity || undefined,
          type: w?.type || undefined,
          image: w?.image || "",
          description: w?.description || undefined,
          owners: Array.isArray(w?.owners) ? w.owners : undefined,
          upgradeLevel: Number(w?.upgradeLevel || 0),
          statPercent: w?.statPercent || w?.baseStatPercent || undefined,
          baseStatPercent: w?.baseStatPercent || w?.statPercent || undefined,
          statBonus: {
            atk: Number(w?.statBonus?.atk || 0),
            hp: Number(w?.statBonus?.hp || 0),
            speed: Number(w?.statBonus?.speed || 0),
          },
        }))
      : [];

    const legacySingleWeapon = !equippedWeapons.length && (card.equippedWeapon || card.equippedWeaponCode)
      ? [{
          name: card.equippedWeaponName || card.equippedWeapon || "Unknown Weapon",
          code: card.equippedWeaponCode || null,
          upgradeLevel: Number(card.equippedWeaponLevel || 0),
          statBonus: {
            atk: Number(card?.weaponBonus?.atk || 0),
            hp: Number(card?.weaponBonus?.hp || 0),
            speed: Number(card?.weaponBonus?.speed || 0),
          },
        }]
      : [];

    const finalEquippedWeapons = equippedWeapons.length ? equippedWeapons : legacySingleWeapon;

    const totalWeaponBonus = finalEquippedWeapons.reduce(
      (acc, w) => {
        acc.atk += Number(w?.statBonus?.atk || 0);
        acc.hp += Number(w?.statBonus?.hp || 0);
        acc.speed += Number(w?.statBonus?.speed || 0);
        return acc;
      },
      { atk: 0, hp: 0, speed: 0 }
    );

    return {
      ...card,
      instanceId: String(card.instanceId || `${Date.now()}-${Math.floor(Math.random() * 10000)}`),
      level: Number(card.level) > 0 ? Number(card.level) : 1,
      exp: Number(card.exp) >= 0 ? Number(card.exp) : 0,
      kills: Number(card.kills) >= 0 ? Number(card.kills) : 0,
      fragments: Number(card.fragments) >= 0 ? Number(card.fragments) : 0,
      image: card.image || "",
      equippedWeapons: finalEquippedWeapons,
      equippedWeapon: finalEquippedWeapons.length ? finalEquippedWeapons.map((w) => w.name).join(", ") : null,
      equippedWeaponCode: finalEquippedWeapons.length === 1 ? finalEquippedWeapons[0].code : null,
      equippedWeaponLevel: finalEquippedWeapons.length === 1 ? Number(finalEquippedWeapons[0].upgradeLevel || 0) : Number(card.equippedWeaponLevel || 0),
      weaponBonus: totalWeaponBonus,
      equippedDevilFruit: card.equippedDevilFruit || null,
      equippedDevilFruitCode: card.equippedDevilFruitCode || null,
    };
  });
}
function normalizePullSlot(slot, fallbackMax) {
  return {
    used: Number(slot?.used) >= 0 ? Number(slot.used) : 0,
    max: Number(slot?.max) >= 0 ? Number(slot.max) : fallbackMax,
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
    lastResetBucket: Number.isInteger(pulls?.lastResetBucket) ? pulls.lastResetBucket : null,
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
    dmg: Number(boosts?.dmg) || 0,
    motherFlameFight: Number(boosts?.motherFlameFight) || 0,
  };
}

function normalizeQuests(quests) {
  return {
    daily: {
      total: Number(quests?.daily?.total) > 0 ? Number(quests.daily.total) : 5,
      completed: Number(quests?.daily?.completed) >= 0 ? Number(quests.daily.completed) : 0,
    },
    dailyState: {
      dateKey: quests?.dailyState?.dateKey || null,
      rewardClaimed: Boolean(quests?.dailyState?.rewardClaimed),
      quests: Array.isArray(quests?.dailyState?.quests) ? quests.dailyState.quests : [],
      counters: {
        dailyClaims: Number(quests?.dailyState?.counters?.dailyClaims || 0),
        pullsUsed: Number(quests?.dailyState?.counters?.pullsUsed || 0),
        boxesOpened: Number(quests?.dailyState?.counters?.boxesOpened || 0),
        resetTicketsUsed: Number(quests?.dailyState?.counters?.resetTicketsUsed || 0),
        fightsPlayed: Number(quests?.dailyState?.counters?.fightsPlayed || 0),
        fightsWon: Number(quests?.dailyState?.counters?.fightsWon || 0),
        bossFights: Number(quests?.dailyState?.counters?.bossFights || 0),
        bossesDefeated: Number(quests?.dailyState?.counters?.bossesDefeated || 0),
        craftsDone: Number(quests?.dailyState?.counters?.craftsDone || 0),
      },
    },
    totalClears: Number(quests?.totalClears) >= 0 ? Number(quests.totalClears) : 0,
  };
}

function normalizeCooldowns(cooldowns) {
  return {
    daily: cooldowns?.daily ?? null,
    fight: cooldowns?.fight ?? null,
    fightMotherFlame: cooldowns?.fightMotherFlame ?? null,
    boss: cooldowns?.boss ?? null,
    pullReset: cooldowns?.pullReset ?? null,
    ship: cooldowns?.ship ?? null,
    vote: cooldowns?.vote ?? null,
    treasure: cooldowns?.treasure ?? null,
  };
}

function normalizeVote(vote) {
  return {
    streak: Number(vote?.streak) >= 0 ? Number(vote.streak) : 0,
    totalVotes: Number(vote?.totalVotes) >= 0 ? Number(vote.totalVotes) : 0,
    lastVoteAt: vote?.lastVoteAt || null,
    lastEventId: vote?.lastEventId || null,
    processedIds: Array.isArray(vote?.processedIds)
      ? vote.processedIds.map(String).slice(-50)
      : [],
  };
}

function normalizeTeam(team) {
  const slots = Array.isArray(team?.slots) ? team.slots.slice(0, 3) : [];
  while (slots.length < 3) {
    slots.push(null);
  }

  return {
    slots: slots.map((slot) => (slot ? String(slot) : null)),
  };
}

function normalizeStats(stats) {
  return {
    wins: Number(stats?.wins) >= 0 ? Number(stats.wins) : 0,
    losses: Number(stats?.losses) >= 0 ? Number(stats.losses) : 0,
    winStreak: Number(stats?.winStreak) >= 0 ? Number(stats.winStreak) : 0,
    bestWinStreak: Number(stats?.bestWinStreak) >= 0 ? Number(stats.bestWinStreak) : 0,
  };
}

function normalizeArena(arena) {
  return {
    points: Number(arena?.points) >= 0 ? Number(arena.points) : 0,
    wins: Number(arena?.wins) >= 0 ? Number(arena.wins) : 0,
    losses: Number(arena?.losses) >= 0 ? Number(arena.losses) : 0,
    draws: Number(arena?.draws) >= 0 ? Number(arena.draws) : 0,
    streak: Number(arena?.streak) >= 0 ? Number(arena.streak) : 0,
    bestStreak: Number(arena?.bestStreak) >= 0 ? Number(arena.bestStreak) : 0,
    matches: Number(arena?.matches) >= 0 ? Number(arena.matches) : 0,
    dailyDateKey: arena?.dailyDateKey || null,
    dailyUses: Number(arena?.dailyUses) >= 0 ? Number(arena.dailyUses) : 0,
  };
}

function normalizeShip(ship, currentIsland) {
  const unlocked =
    Array.isArray(ship?.unlockedIslands) && ship.unlockedIslands.length
      ? ship.unlockedIslands
      : ["foosha_village"];

  let shipCode = ship?.shipCode || "small_boat";
  let tier = Number(ship?.tier || 1);

  if (tier <= 1) {
    shipCode = "small_boat";
    tier = 1;
  }

  return {
    shipCode,
    tier,
    sea: ship?.sea || "East Blue",
    nextTravelAt: Number(ship?.nextTravelAt || 0),
    unlockedIslands: unlocked,
    currentPort: ship?.currentPort || currentIsland || "Foosha Village",
  };
}

function normalizeStory(story) {
  const bossPhases = story?.bossPhases || {};

  return {
    clearedIslandBosses: Array.isArray(story?.clearedIslandBosses)
      ? story.clearedIslandBosses
      : [],
    bossPhases: {
      egghead: {
        phase1Cleared: Boolean(bossPhases?.egghead?.phase1Cleared),
        phase2Cleared: Boolean(bossPhases?.egghead?.phase2Cleared),
        completed: Boolean(bossPhases?.egghead?.completed),
      },
      elbaf: {
        phase1Cleared: Boolean(bossPhases?.elbaf?.phase1Cleared),
        phase2Cleared: Boolean(bossPhases?.elbaf?.phase2Cleared),
        completed: Boolean(bossPhases?.elbaf?.completed),
      },
    },
  };
}

function normalizePlayer(player, username = "Unknown") {
  const currentIsland = player.currentIsland || "Foosha Village";

  return {
    username: player.username || username,
    berries: typeof player.berries === "number" ? player.berries : 1000,
    gems: typeof player.gems === "number" ? player.gems : 100,
    currentIsland,
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
      premiumSPity: Number(player?.pity?.premiumSPity) >= 0 ? Number(player.pity.premiumSPity) : 0,
    },
    pulls: normalizePulls(player.pulls),
    boosts: normalizeBoosts(player.boosts),
    quests: normalizeQuests(player.quests),
    cooldowns: normalizeCooldowns(player.cooldowns),
    vote: normalizeVote(player.vote),
    team: normalizeTeam(player.team),
    stats: normalizeStats(player.stats),
    arena: normalizeArena(player.arena),
    ship: normalizeShip(player.ship, currentIsland),
    story: normalizeStory(player.story),
    clan: {
      name: player?.clan?.name || null,
      role: player?.clan?.role || "member",
    },
  };
}

function getDefaultPlayer(username) {
  return {
    username,
    berries: 1000,
    gems: 100,
    currentIsland: "Foosha Village",
    dailyLastClaim: null,

    cards: [],
    fragments: [],
    items: [],
    weapons: [],
    devilFruits: [],

    boxes: [],

    tickets: [
      { code: "common_raid_ticket", name: "Common Raid Ticket", amount: 0 },
      { code: "raid_ticket", name: "Raid Ticket", amount: 0 },
    ],

    materials: [],

    pity: {
      normalSPity: 0,
      premiumSPity: 0,
    },

    pulls: {
      base: { used: 0, max: 6 },
      supportMember: { used: 0, max: 1 },
      booster: { used: 0, max: 1 },
      owner: { used: 0, max: 1 },
      patreon: { used: 0, max: 3 },
      baccaratCard: { used: 0, max: 1 },
      baccaratFruit: { used: 0, max: 1 },
      lastResetBucket: null,
    },

    boosts: {
      pullSlot: 0,
      daily: 0,
      atk: 0,
      hp: 0,
      spd: 0,
      exp: 0,
      dmg: 0,
      motherFlameFight: 0,
    },

    quests: {
      daily: { total: 5, completed: 0 },
      dailyState: {
        dateKey: null,
        rewardClaimed: false,
        quests: [],
        counters: {
          dailyClaims: 0,
          pullsUsed: 0,
          boxesOpened: 0,
          resetTicketsUsed: 0,
          fightsPlayed: 0,
          fightsWon: 0,
          bossFights: 0,
          bossesDefeated: 0,
          craftsDone: 0,
        },
      },
      totalClears: 0,
    },

    cooldowns: {
      daily: null,
      fight: null,
      fightMotherFlame: null,
      boss: null,
      pullReset: null,
      ship: null,
      vote: null,
      treasure: null,
    },

    vote: {
      streak: 0,
      totalVotes: 0,
      lastVoteAt: null,
    },

    team: {
      slots: [null, null, null],
    },

    stats: {
      wins: 0,
      losses: 0,
      winStreak: 0,
      bestWinStreak: 0,
    },

    arena: {
      points: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      streak: 0,
      bestStreak: 0,
      matches: 0,
    },

    ship: {
      shipCode: "small_boat",
      tier: 1,
      sea: "East Blue",
      nextTravelAt: 0,
      unlockedIslands: ["foosha_village"],
      currentPort: "Foosha Village",
    },

    story: {
      clearedIslandBosses: [],
      bossPhases: {
        egghead: {
          phase1Cleared: false,
          phase2Cleared: false,
          completed: false,
        },
        elbaf: {
          phase1Cleared: false,
          phase2Cleared: false,
          completed: false,
        },
      },
    },

    clan: {
      name: null,
      role: "member",
    },
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
    {
      ...currentPlayer,
      ...newData,
    },
    currentPlayer.username
  );

  writePlayers(players);
}

module.exports = {
  readPlayers,
  writePlayers,
  getPlayer,
  updatePlayer,
};