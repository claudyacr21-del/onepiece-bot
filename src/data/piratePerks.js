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

  crewSlotBoost: {
    key: "crewSlotBoost",
    name: "Crew Slot",
    unlockGuildLevel: 40,
    maxLevel: 4,
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
    materials.cola_engine_part = 25 + nextLevel * 15;
    materials.enhancement_stone = 20 + nextLevel * 12;
    materials.hardwood = 80 + nextLevel * 30;
    materials.iron_plating = 70 + nextLevel * 25;
    materials.sail_cloth = 60 + nextLevel * 20;
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
  return `+${lv * perk.bonusPerLevel}% ${perk.name}`;
}

module.exports = {
  PIRATE_PERKS,
  normalizePerkKey,
  getPerkRequirement,
  getPerkEffectText,
};