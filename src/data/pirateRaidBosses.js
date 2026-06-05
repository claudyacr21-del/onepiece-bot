const PIRATE_RAID_BOSSES = {
  easy: {
    key: "easy",
    name: "Captain Morgan",
    tierName: "Easy",
    hp: 150000,
    atk: 900,
    basePoints: 25,
    minPirateLevel: 1,
    description: "A low-tier Marine boss for new pirates.",
  },

  normal: {
    key: "normal",
    name: "Arlong",
    tierName: "Normal",
    hp: 450000,
    atk: 1800,
    basePoints: 75,
    minPirateLevel: 5,
    description: "A stronger boss for growing pirate crews.",
  },

  hard: {
    key: "hard",
    name: "Crocodile",
    tierName: "Hard",
    hp: 1200000,
    atk: 3000,
    basePoints: 180,
    minPirateLevel: 15,
    description: "A Warlord-level guild raid boss.",
  },

  extreme: {
    key: "extreme",
    name: "Doflamingo",
    tierName: "Extreme",
    hp: 3000000,
    atk: 6500,
    basePoints: 420,
    minPirateLevel: 35,
    description: "A dangerous boss for strong pirates.",
  },

  legendary: {
    key: "legendary",
    name: "Kaido",
    tierName: "Legendary",
    hp: 7500000,
    atk: 9000,
    basePoints: 1000,
    minPirateLevel: 60,
    description: "A Yonko-tier pirate raid boss.",
  },
};

function normalizePirateRaidTier(query) {
  const raw = String(query || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "");

  const aliases = {
    e: "easy",
    easy: "easy",
    morgan: "easy",
    captainmorgan: "easy",

    n: "normal",
    normal: "normal",
    arlong: "normal",

    h: "hard",
    hard: "hard",
    croc: "hard",
    crocodile: "hard",

    ex: "extreme",
    extreme: "extreme",
    doffy: "extreme",
    doflamingo: "extreme",

    l: "legendary",
    leg: "legendary",
    legendary: "legendary",
    kaido: "legendary",
  };

  return aliases[raw] || null;
}

module.exports = {
  PIRATE_RAID_BOSSES,
  normalizePirateRaidTier,
};