const PIRATE_PERKS = {
  berryBoost: {
    key: "berryBoost",
    name: "Berry Boost",
    unlockGuildLevel: 5,
    maxLevel: 25,
    bonusPerLevel: 1,
    effect: "Increase berries earned by all crew members.",
  },

  gemsBoost: {
    key: "gemsBoost",
    name: "Gems Boost",
    unlockGuildLevel: 8,
    maxLevel: 20,
    bonusPerLevel: 1,
    effect: "Increase gems earned by all crew members.",
  },

  luckBoost: {
    key: "luckBoost",
    name: "Luck Boost",
    unlockGuildLevel: 10,
    maxLevel: 25,
    bonusPerLevel: 0.1,
    effect: "Increase pull rates by +0.1% per perk level for all crew members.",
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

  fragmentStorageBoost: {
    key: "fragmentStorageBoost",
    name: "Fragment Storage",
    unlockGuildLevel: 35,
    maxLevel: 4,
    bonusPerLevel: 26,
    effect: "Increase fragment inventory storage by +26 slots per level for all pirate members.",
  },

  crewSlotBoost: {
    key: "crewSlotBoost",
    name: "Crew Slot",
    unlockGuildLevel: 40,
    maxLevel: 5,
    bonusPerLevel: 1,
    effect: "Increase pirate/guild member capacity by +1 slot per level.",
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

    gem: "gemsBoost",
    gems: "gemsBoost",
    gemboost: "gemsBoost",
    gemsboost: "gemsBoost",

    luck: "luckBoost",
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

    slot: "crewSlotBoost",
    slots: "crewSlotBoost",
    member: "crewSlotBoost",
    members: "crewSlotBoost",
    crewslot: "crewSlotBoost",
    crewslots: "crewSlotBoost",
    guildslot: "crewSlotBoost",
    guildslots: "crewSlotBoost",
    pirateslot: "crewSlotBoost",
    pirateslots: "crewSlotBoost",
    crewslotboost: "crewSlotBoost",

    finv: "fragmentStorageBoost",
    inventory: "fragmentStorageBoost",
    storage: "fragmentStorageBoost",
    fragment: "fragmentStorageBoost",
    fragments: "fragmentStorageBoost",
    fragmentstorage: "fragmentStorageBoost",
    fragmentstorageboost: "fragmentStorageBoost",
    finvstorage: "fragmentStorageBoost",
  };

  return aliases[raw] || Object.keys(PIRATE_PERKS).find((key) => key.toLowerCase() === raw) || null;
}

function addMaterial(materials, code, amount) {
  const safeCode = String(code || "").trim();
  const safeAmount = Math.max(0, Math.floor(Number(amount || 0)));

  if (!safeCode || safeAmount <= 0) return;

  materials[safeCode] = (materials[safeCode] || 0) + safeAmount;
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

  let berries = Math.floor(
    50000 + perk.unlockGuildLevel * 3000 + nextLevel * 18000 + Math.pow(nextLevel, 1.6) * 9000
  );

  if (perkKey === "crewSlotBoost") {
    berries = Math.floor(
      700000 + nextLevel * 500000 + Math.pow(nextLevel, 2) * 300000
    );
  }

  const materials = {};

  if (perkKey === "berryBoost") {
    addMaterial(materials, "hardwood", 3 + nextLevel);
    addMaterial(materials, "iron_plating", 2 + Math.floor(nextLevel / 2));
  }

  if (perkKey === "gemsBoost") {
    addMaterial(materials, "cola_engine_part", 2 + Math.floor(nextLevel / 2));
    addMaterial(materials, "enhancement_stone", 2 + nextLevel);
  }

  if (perkKey === "luckBoost") {
    addMaterial(materials, "cola_engine_part", 2 + nextLevel);
    addMaterial(materials, "enhancement_stone", 1 + Math.floor(nextLevel / 2));
  }

  if (perkKey === "raidPointBoost") {
    addMaterial(materials, "iron_plating", 2 + nextLevel);
    addMaterial(materials, "enhancement_stone", 2 + Math.floor(nextLevel / 2));
  }

  if (perkKey === "fragmentStorageBoost") {
    addMaterial(materials, "hardwood", 4 + nextLevel * 2);
    addMaterial(materials, "iron_plating", 3 + nextLevel * 2);
    addMaterial(materials, "sail_cloth", 3 + nextLevel);
  }

  if (perkKey === "expBoost") {
    addMaterial(materials, "sail_cloth", 3 + nextLevel);
    addMaterial(materials, "hardwood", 2 + Math.floor(nextLevel / 2));
  }

  if (perkKey === "shopDiscount") {
    addMaterial(materials, "hardwood", 5 + nextLevel);
    addMaterial(materials, "sail_cloth", 2 + Math.floor(nextLevel / 2));
  }

  if (perkKey === "bossDamageBoost") {
    addMaterial(materials, "cola_engine_part", 2 + nextLevel);
    addMaterial(materials, "iron_plating", 1 + Math.floor(nextLevel / 3));
    addMaterial(materials, "enhancement_stone", 2 + Math.floor(nextLevel / 2));
  }

  if (perkKey === "crewSlotBoost") {
    materials.cola_engine_part = 2 + nextLevel * 4;
    materials.enhancement_stone = 2 + nextLevel * 3;
    materials.hardwood = 12 + nextLevel * 8;
    materials.iron_plating = 10 + nextLevel * 6;
    materials.sail_cloth = 8 + nextLevel * 6;
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
  if (perkKey === "luckBoost") return `+${(lv * 0.1).toFixed(1)}% pull rate`;
  if (perkKey === "crewSlotBoost") return `+${lv} member slot${lv === 1 ? "" : "s"}`;

  if (perkKey === "fragmentStorageBoost") {
    return `+${lv * 26} fragment storage`;
  }

  return `+${lv * perk.bonusPerLevel}% ${perk.name}`;
}

module.exports = {
  PIRATE_PERKS,
  normalizePerkKey,
  getPerkRequirement,
  getPerkEffectText,
};