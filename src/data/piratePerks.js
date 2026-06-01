const PIRATE_PERKS = {
  berryBoost: {
    key: "berryBoost",
    name: "Berry Boost",
    unlockGuildLevel: 5,
    maxLevel: 25,
    bonusPerLevel: 1,
    effect: "Increase berries earned by all crew members.",
  },

  luckBoost: {
    key: "luckBoost",
    name: "Luck Boost",
    unlockGuildLevel: 10,
    maxLevel: 25,
    bonusPerLevel: 0.2,
    effect: "Increase pull rates by +0.2% per perk level for all crew members.",
  },

  raidPointBoost: {
    key: "raidPointBoost",
    name: "Raid Glory",
    unlockGuildLevel: 20,
    maxLevel: 20,
    bonusPerLevel: 1,
    effect: "Increase guild raid points earned by all crew members.",
  },

  expBoost: {
    key: "expBoost",
    name: "Crew Training",
    unlockGuildLevel: 30,
    maxLevel: 20,
    bonusPerLevel: 1,
    effect: "Increase EXP gained by all crew members.",
  },

  shopDiscount: {
    key: "shopDiscount",
    name: "Pirate Bargain",
    unlockGuildLevel: 50,
    maxLevel: 10,
    bonusPerLevel: 1,
    effect: "Reduce guild shop prices.",
  },

  bossDamageBoost: {
    key: "bossDamageBoost",
    name: "War Banner",
    unlockGuildLevel: 75,
    maxLevel: 20,
    bonusPerLevel: 1,
    effect: "Increase damage against guild raid bosses.",
  },
};

function normalizePerkKey(query) {
  const raw = String(query || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "");

  if (!raw) return null;

  const aliases = {
    berry: "berryBoost",
    berries: "berryBoost",
    berryboost: "berryBoost",

    luck: "luckBoost",
    pull: "luckBoost",
    pullrate: "luckBoost",
    pullrates: "luckBoost",
    luckboost: "luckBoost",

    raid: "raidPointBoost",
    point: "raidPointBoost",
    points: "raidPointBoost",
    raidpoint: "raidPointBoost",
    raidpoints: "raidPointBoost",
    raidglory: "raidPointBoost",

    exp: "expBoost",
    xp: "expBoost",
    training: "expBoost",
    crewtraining: "expBoost",

    shop: "shopDiscount",
    discount: "shopDiscount",
    bargain: "shopDiscount",
    piratebargain: "shopDiscount",

    boss: "bossDamageBoost",
    damage: "bossDamageBoost",
    bossdamage: "bossDamageBoost",
    warbanner: "bossDamageBoost",
  };

  return aliases[raw] || Object.keys(PIRATE_PERKS).find((key) => key.toLowerCase() === raw) || null;
}

function getPerkRequirement(perkKey, currentPerkLevel) {
  const perk = PIRATE_PERKS[perkKey];
  if (!perk) return null;

  const level = Math.max(0, Math.floor(Number(currentPerkLevel || 0)));
  const nextLevel = level + 1;

  if (level >= perk.maxLevel) return null;

  const requiredGuildLevel = Math.min(
    100,
    perk.unlockGuildLevel + Math.floor(level / 3) * 2
  );

  const berries = Math.floor(
    50000 + perk.unlockGuildLevel * 3000 + nextLevel * 18000 + Math.pow(nextLevel, 1.6) * 9000
  );

  const materials = {};

  if (perkKey === "berryBoost") {
    materials.wood = 3 + nextLevel;
    materials.iron = 2 + Math.floor(nextLevel / 2);
  }

  if (perkKey === "luckBoost") {
    materials.cola = 2 + nextLevel;
    materials.enhancement_stone = 1 + Math.floor(nextLevel / 2);
  }

  if (perkKey === "raidPointBoost") {
    materials.gunpowder = 2 + nextLevel;
    materials.steel = 2 + Math.floor(nextLevel / 2);
  }

  if (perkKey === "expBoost") {
    materials.cloth = 3 + nextLevel;
    materials.rope = 2 + Math.floor(nextLevel / 2);
  }

  if (perkKey === "shopDiscount") {
    materials.scrap = 5 + nextLevel;
    materials.ship_part = 2 + Math.floor(nextLevel / 2);
  }

  if (perkKey === "bossDamageBoost") {
    materials.engine = 2 + nextLevel;
    materials.rare_ship_part = 1 + Math.floor(nextLevel / 3);
    materials.enhancement_stone = 2 + Math.floor(nextLevel / 2);
  }

  return {
    perkKey,
    fromLevel: level,
    toLevel: nextLevel,
    requiredGuildLevel,
    berries,
    materials,
  };
}

function getPerkEffectText(perkKey, level) {
  const perk = PIRATE_PERKS[perkKey];
  const lv = Math.max(0, Math.floor(Number(level || 0)));

  if (!perk) return "Unknown effect.";
  if (perkKey === "luckBoost") return `+${(lv * 0.2).toFixed(1)}% pull rate`;

  return `+${lv * perk.bonusPerLevel}% ${perk.name}`;
}

module.exports = {
  PIRATE_PERKS,
  normalizePerkKey,
  getPerkRequirement,
  getPerkEffectText,
};