const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer, updatePlayerAtomic } = require("../playerStore");
const { createOwnedCard } = require("../utils/evolution");
const rawCards = require("../data/cards");
const rawWeapons = require("../data/weapons");
const rawDevilFruits = require("../data/devilFruits");
const { applyGlobalPullReset } = require("../utils/pullReset");
const { findPirateByUser } = require("../utils/pirateStore");
const { applyAutoLevelForDuplicate } = require("../utils/autoLevel");
const {
  addFragmentWithAutoSac,
  removeFragmentAmount,
} = require("../utils/autoSac");
const {
  getNextAvailablePullKey,
  consumePullSlot,
  getTotalPullUsage,
  buildPullAccessSnapshot,
} = require("../utils/pullSlots");
const {
  rollStandardBaseTier,
  rollStandardContentType,
  rollStandardDevilFruitTier,
  rollPremiumBaseTier,
  rollPremiumContentType,
  rollPremiumDevilFruitTier,
  rollVivreBaseTier,
  rollVivreContentType,
  rollVivreDevilFruitTier,
  rollStandardWeaponTier,
  rollVivreWeaponTier,
  rollPremiumWeaponTier,
} = require("../utils/pullRates");

const { getPremiumTier } = require("../utils/premiumAccess");
const { incrementQuestCounter } = require("../utils/questProgress");
const {
  getCardImage,
  getWeaponImage,
  getDevilFruitImage,
  getRarityBadge,
} = require("../config/assetLinks");

const PREMIUM_PITY_TARGET = 100;
const VIVRE_PITY_TARGET = 125;
const NORMAL_PITY_TARGET = 150;
const PULL_USER_LOCKS = new Set();

function getPirateLuckBoost(userId) {
  const pirate = findPirateByUser(userId);
  const luckLevel = Math.max(0, Math.floor(Number(pirate?.perks?.luckBoost || 0)));
  return Number((luckLevel * 0.1).toFixed(1));
}

function getSharedPity(player) {
  const pity = player?.pity || {};
  return Number(
    pity.pullPity ??
      Math.max(Number(pity.normalSPity || 0), Number(pity.premiumSPity || 0)) ??
      0
  );
}

function getPityLimit(tier) {
  if (tier === "motherFlame") return PREMIUM_PITY_TARGET;
  if (tier === "vivreCard") return VIVRE_PITY_TARGET;
  return NORMAL_PITY_TARGET;
}

function getPityGuarantee(tier) {
  return tier === "none" || tier === "normal" ? "A" : "S";
}

function getEffectivePullTierForSlot(roleTier, pullKey) {
  if (roleTier === "motherFlame") return "motherFlame";

  if (roleTier === "vivreCard") return "vivreCard";

  return "normal";
}

function syncPremiumSnapshot(snapshot, premiumTier) {
  const safe = snapshot && typeof snapshot === "object" ? snapshot : {};

  if (premiumTier === "motherFlame") {
    return {
      ...safe,
      patreon: true,
      vivreCard: false,
      litePremium: false,
    };
  }

  if (premiumTier === "vivreCard") {
    return {
      ...safe,
      patreon: false,
      vivreCard: true,
      litePremium: true,
    };
  }

  return {
    ...safe,
    patreon: Boolean(safe.patreon),
    vivreCard: Boolean(safe.vivreCard || safe.litePremium),
    litePremium: Boolean(safe.vivreCard || safe.litePremium),
  };
}

function pickContentType(tier) {
  if (tier === "motherFlame") return rollPremiumContentType();
  if (tier === "vivreCard") return rollVivreContentType();
  return rollStandardContentType();
}

function rollThroneEquivalentCardTier(baseTier) {
  // Road Poneglyph special chance: 0.5%.
  // If it fails, keep the original rolled tier.
  const roll = Math.random() * 100;
  if (roll < 0.5) return "THRONE";
  return baseTier;
}

function pickBaseTier(tier, contentType, triggeredPity, pullChanceBonus = 0) {
  if (contentType === "devilFruit") {
    if (tier === "motherFlame") return rollPremiumDevilFruitTier();
    if (tier === "vivreCard") return rollVivreDevilFruitTier();
    return rollStandardDevilFruitTier();
  }

  if (contentType === "weapon") {
    if (tier === "motherFlame") return rollPremiumWeaponTier();
    if (tier === "vivreCard") return rollVivreWeaponTier();
    return rollStandardWeaponTier();
  }

  if (triggeredPity) return getPityGuarantee(tier);

  const baseTier =
    tier === "motherFlame"
      ? rollPremiumBaseTier(pullChanceBonus)
      : tier === "vivreCard"
      ? rollVivreBaseTier(pullChanceBonus)
      : rollStandardBaseTier(pullChanceBonus);

  if (contentType === "boostCard") {
    return rollThroneEquivalentCardTier(baseTier);
  }

  return baseTier;
}

function prettySlotName(key) {
  const map = {
    base: "Base Pull",
    supportMember: "Main Server Member Pull",
    booster: "Main Server Booster Pull",
    owner: "Server Owner Pull",
    patreon: "Mother Flame Pull",
    vivreCard: "Vivre Card Pull",
    baccaratCard: "Baccarat Card Pull",
    baccaratFruit: "Baccarat Fruit Pull",
  };
  return map[key] || key;
}

function getTicketPool() {
  return [
    {
      code: "common_raid_ticket",
      name: "Common Raid Ticket",
      rarity: "B",
      type: "Ticket",
      weight: 55,
      image:
        "https://cdn.discordapp.com/attachments/1493204525975076944/1503019862086254712/content.png?ex=6a01d3d3&is=6a008253&hm=3adddcd707caa59db48cd9489b6eed6f5012b7a1725d7458a1c51ff1406b6621&",
    },
    {
      code: "raid_ticket",
      name: "Raid Ticket",
      rarity: "A",
      type: "Ticket",
      weight: 34,
      image:
        "https://cdn.discordapp.com/attachments/1493204525975076944/1503019862694301907/content.png?ex=6a01d3d4&is=6a008254&hm=c46ef6d8f72ef586dc9817d629edbe23f8895613eeef5216ab80d026820e9ce2&",
    },
    {
      code: "gold_raid_ticket",
      name: "Gold Raid Ticket",
      rarity: "S",
      type: "Ticket",
      weight: 8,
      image:
        "https://cdn.discordapp.com/attachments/1493204525975076944/1503019863172448387/content.png?ex=6a01d3d4&is=6a008254&hm=cc387565f21d590a67bd120924c42e5b296f2acc7b12c1aa24f1d5713232f72e&",
    },
    {
      code: "empty_throne_raid_writ",
      name: "Empty Throne Raid Writ",
      rarity: "S",
      type: "Ticket",
      weight: 3,
      image:
        "https://cdn.discordapp.com/attachments/1493204525975076944/1503039261551624302/content.png?ex=6a01e5e5&is=6a009465&hm=d1c5a4e761f84b982572f211b9d5cbb202129e75226665b278ff6608fe94ea41",
    },
    {
      code: "mythic_raid_ticket",
      name: "Mythic Raid Ticket",
      rarity: "UR",
      type: "Ticket",
      weight: 0.5,
      image:
        "https://cdn.discordapp.com/attachments/1493204525975076944/1513072518498353162/content.png?ex=6a266617&is=6a251497&hm=e3a300a1a63dae89865fb29e0dc7742baacabd739e1534cc519a19114d3d660f",
    },
  ];
}

function pickWeightedTicket() {
  const pool = getTicketPool();
  const total = pool.reduce((sum, item) => sum + Number(item.weight || 0), 0);

  let roll = Math.random() * total;

  for (const item of pool) {
    roll -= Number(item.weight || 0);
    if (roll <= 0) return item;
  }

  return pool[0];
}

function getRewardPool(contentType) {
  if (contentType === "ticket") return getTicketPool();

  if (contentType === "battleCard") {
    return rawCards.filter(
      (card) =>
        card.cardRole === "battle" &&
        String(card.code || "").toLowerCase() !== "imu" 
    );
  }

  if (contentType === "boostCard") {
    return rawCards.filter((card) => card.cardRole === "boost");
  }

  if (contentType === "weapon") {
    return rawWeapons.filter(
      (weapon) =>
        !weapon.raidOnly &&
        weapon.source !== "empty_throne_raid_writ" &&
        weapon.source !== "gold_raid_ticket"
    );
  }

  return rawDevilFruits;
}

function getPullRarity(entry) {
  return String(entry?.pullTier || entry?.baseTier || entry?.rarity || "").toUpperCase();
}

function pickRandomByRarity(pool, rarity) {
  const list = Array.isArray(pool) ? pool : [];
  if (!list.length) return null;

  const targetRarity = String(rarity || "").toUpperCase();

  // Special pullTier: THRONE means this card only appears from the tiny throne-equivalent pool.
  if (targetRarity !== "THRONE") {
    const throneBlocked = list.filter((entry) => getPullRarity(entry) !== "THRONE");

    const filtered = throneBlocked.filter(
      (entry) => getPullRarity(entry) === targetRarity
    );

    const source = filtered.length ? filtered : throneBlocked.length ? throneBlocked : list;
    return source[Math.floor(Math.random() * source.length)] || null;
  }

  const thronePool = list.filter((entry) => getPullRarity(entry) === "THRONE");
  if (!thronePool.length) return null;

  return thronePool[Math.floor(Math.random() * thronePool.length)] || null;
}

function addFragment(list, card) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = card.code;
  const index = arr.findIndex((x) => x.code === code);

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 0) + 1,
    };
    return arr;
  }

  arr.push({
    name: card.displayName || card.name,
    amount: 1,
    rarity: card.baseTier || card.rarity || "C",
    category: card.cardRole === "boost" ? "boost" : "battle",
    code: card.code,
    image: card.image || "",
  });

  return arr;
}

function hasNamedItemByCode(list, code) {
  return (Array.isArray(list) ? list : []).some(
    (entry) =>
      String(entry.code || "").toLowerCase() === String(code || "").toLowerCase()
  );
}

function hasWeaponOwnedOrEquipped(player, weaponsList, code) {
  const targetCode = String(code || "").toLowerCase().trim();
  if (!targetCode) return false;

  if (hasNamedItemByCode(weaponsList, targetCode)) {
    return true;
  }

  const cards = Array.isArray(player?.cards) ? player.cards : [];

  return cards.some((card) => {
    const equippedWeapons = Array.isArray(card?.equippedWeapons)
      ? card.equippedWeapons
      : [];

    const hasMultiEquipped = equippedWeapons.some(
      (weapon) =>
        String(weapon?.code || "").toLowerCase().trim() === targetCode ||
        String(weapon?.weaponCode || "").toLowerCase().trim() === targetCode
    );

    const hasLegacyEquipped =
      String(card?.equippedWeaponCode || "").toLowerCase().trim() === targetCode;

    return hasMultiEquipped || hasLegacyEquipped;
  });
}

function buildWeaponFragmentPayload(weapon) {
  return {
    name: `${weapon.name} Fragment`,
    amount: 1,
    rarity: weapon.rarity || "C",
    category: "weapon",
    code: `weapon_fragment_${weapon.code}`,
    image: weapon.image || "",
    weaponCode: weapon.code,
  };
}

function addNamedItem(list, reward) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = String(reward.code || "");
  const index = arr.findIndex((entry) => String(entry.code || "") === code);

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 1) + 1,
      upgradeLevel: Math.max(
        Number(arr[index].upgradeLevel || 0),
        Number(reward.upgradeLevel || 0)
      ),
    };
    return arr;
  }

  arr.push({
    name: reward.name,
    amount: 1,
    rarity: reward.rarity,
    code: reward.code,
    image: reward.image || "",
    type: reward.type,
    statPercent: reward.statPercent || {
      atk: 0,
      hp: 0,
      speed: 0,
    },
    ownerBonusPercent: reward.ownerBonusPercent || {
      atk: 0,
      hp: 0,
      speed: 0,
    },
    owners: reward.owners || [],
    boostBonus: reward.boostBonus,
    description: reward.description || "",
    power: reward.power || undefined,
    upgradeLevel: Number(reward.upgradeLevel || 0),
  });

  return arr;
}

function addDevilFruitItem(list, fruit) {
 const arr = Array.isArray(list) ? [...list] : [];
 const code = String(fruit?.code || fruit?.name || "")
  .toLowerCase()
  .trim();

 const index = arr.findIndex((entry) => {
  const entryCode = String(entry?.code || entry?.name || "")
   .toLowerCase()
   .trim();

  return entryCode === code;
 });

 if (index !== -1) {
  arr[index] = {
   ...arr[index],
   ...fruit,
   code: fruit.code || arr[index].code,
   name: fruit.name || arr[index].name,
   amount: Number(arr[index].amount || 1) + 1,
   rarity: fruit.rarity || arr[index].rarity,
   type: fruit.type || arr[index].type || "Devil Fruit",
   statPercent: fruit.statPercent || arr[index].statPercent || {
    atk: 0,
    hp: 0,
    speed: 0,
   },
   description: fruit.description || arr[index].description || "",
   power: fruit.power || arr[index].power,
   image: fruit.image || arr[index].image || "",
  };

  return arr;
 }

 arr.push({
  ...fruit,
  code: fruit.code,
  name: fruit.name,
  amount: 1,
  rarity: fruit.rarity || "C",
  type: fruit.type || "Devil Fruit",
  statPercent: fruit.statPercent || {
   atk: 0,
   hp: 0,
   speed: 0,
  },
  description: fruit.description || "",
  power: fruit.power || undefined,
  image: fruit.image || "",
 });

 return arr;
}

function addTicket(list, ticket) {
  const arr = Array.isArray(list) ? [...list] : [];
  const idx = arr.findIndex((x) => String(x.code) === String(ticket.code));

  if (idx === -1) {
    arr.push({
      code: ticket.code,
      name: ticket.name,
      amount: 1,
      rarity: ticket.rarity,
      type: "Ticket",
    });
  } else {
    arr[idx] = {
      ...arr[idx],
      amount: Number(arr[idx].amount || 0) + 1,
    };
  }

  return arr;
}

function getTypeLabel(contentType) {
  if (contentType === "battleCard") return "Battle Card";
  if (contentType === "boostCard") return "Boost Card";
  if (contentType === "weapon") return "Weapon";
  if (contentType === "devilFruit") return "Devil Fruit";
  return "Ticket";
}

function getRewardImage(contentType, reward, ownedCard = null) {
  if (contentType === "ticket") {
    return reward?.image || reward?.imageUrl || null;
  }

  if (contentType === "battleCard" || contentType === "boostCard") {
    return (
      ownedCard?.evolutionForms?.[0]?.image ||
      ownedCard?.stageImages?.M1 ||
      ownedCard?.image ||
      reward?.evolutionForms?.[0]?.image ||
      reward?.stageImages?.M1 ||
      getCardImage(reward?.code, "M1", reward?.image || "") ||
      reward?.image ||
      null
    );
  }

  if (contentType === "weapon") {
    return getWeaponImage(reward?.code, reward?.image || "") || reward?.image || null;
  }

  return getDevilFruitImage(reward?.code, reward?.image || "") || reward?.image || null;
}

function getRewardBadge(contentType, reward, ownedCard = null) {
  const rarity =
    ownedCard?.currentTier ||
    ownedCard?.rarity ||
    reward?.baseTier ||
    reward?.rarity ||
    "C";

  if (contentType === "battleCard" || contentType === "boostCard") {
    return (
      ownedCard?.evolutionForms?.[0]?.badgeImage ||
      ownedCard?.badgeImage ||
      getRarityBadge(rarity) ||
      null
    );
  }

  return getRarityBadge(rarity) || null;
}

function normalizeBoostTypeLabel(value) {
  const type = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]+/g, "");

  if (type === "attack" || type === "atk" || type === "atkboost" || type === "attackboost") {
    return "ATK";
  }

  if (type === "health" || type === "hp" || type === "hpboost" || type === "healthboost") {
    return "HP";
  }

  if (type === "speed" || type === "spd" || type === "spdboost" || type === "speedboost") {
    return "SPD";
  }

  if (type === "damage" || type === "dmg" || type === "dmgboost" || type === "damageboost") {
    return "DMG";
  }

  if (
    type === "experience" ||
    type === "exp" ||
    type === "expboost" ||
    type === "experienceboost"
  ) {
    return "EXP";
  }

  if (
    type === "daily" ||
    type === "dailyboost" ||
    type === "dailyreward" ||
    type === "dailyrewardboost"
  ) {
    return "Daily Reward";
  }

  if (type === "pullchance" || type === "pullboost" || type === "pullrate" || type === "pitydrop") {
    return "Pity Drop";
  }

  if (
    type === "fragmentstorage" ||
    type === "fragmentstorageboost" ||
    type === "fragstorage" ||
    type === "storage"
  ) {
    return "Fragment Storage";
  }

  return value ? String(value) : "Boost";
}

function buildBoostEffectText(reward) {
  const boost = reward.boostBonus || {};
  const effects = [];
  const atk = Number(boost.atk || 0);
  const hp = Number(boost.hp || 0);
  const spd = Number(boost.spd || boost.speed || 0);
  const dmg = Number(boost.dmg || boost.damage || 0);
  const exp = Number(boost.exp || 0);
  const daily = Number(boost.daily || 0);
  const pullChance = Number(boost.pullChance || boost.pull || boost.pityDrop || 0);
  const fragmentStorage = Number(boost.fragmentStorage || boost.storage || 0);

  if (atk) effects.push(`+${atk}% ATK`);
  if (hp) effects.push(`+${hp}% HP`);
  if (spd) effects.push(`+${spd}% SPD`);
  if (dmg) effects.push(`+${dmg}% DMG`);
  if (exp) effects.push(`+${exp}% EXP`);
  if (daily) effects.push(`+${daily} Daily Reward`);
  if (pullChance) effects.push(`+${pullChance} Pity Drop`);
  if (fragmentStorage) effects.push(`+${fragmentStorage} Fragment Storage`);

  const boostType = normalizeBoostTypeLabel(reward.boostType || reward.boostTarget);
  const boostValue = Number(reward.boostValue ?? reward.value ?? 0);

  if (boostValue) {
    const suffix = ["ATK", "HP", "SPD", "DMG", "EXP"].includes(boostType) ? "%" : "";
    effects.push(`+${boostValue}${suffix} ${boostType}`);
  }

  if (effects.length) {
    return [`**Effect:** ${effects.join(" / ")}`];
  }

  if (reward.boostDescription) {
    return [`**Effect:** ${reward.boostDescription}`];
  }

  if (reward.description) {
    return [`**Description:** ${reward.description}`];
  }

  return ["**Effect:** No effect data"];
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function buildRewardStatsText(contentType, reward) {
  if (contentType === "ticket") {
    return [
      `**Item:** ${reward.name}`,
      `**Use:** ${
        reward.code === "empty_throne_raid_writ"
          ? "Imu Raid only"
          : reward.code === "gold_raid_ticket"
          ? "S Gold Raid"
          : reward.code === "raid_ticket"
          ? "A Raid"
          : "C/B Common Raid"
      }`,
    ];
  }

  if (contentType === "battleCard") {
    return [
      `**Attack:** ${formatAtkRange(reward.atk)}`,
      `**HP:** ${reward.hp ?? 0}`,
      `**SPD:** ${reward.speed ?? 0}`,
    ];
  }

  if (contentType === "boostCard") {
    return buildBoostEffectText(reward);
  }

  const stat = reward.statPercent || {
    atk: 0,
    hp: 0,
    speed: 0,
  };

  return [
    `**ATK Bonus:** ${Number(stat.atk || 0)}%`,
    `**HP Bonus:** ${Number(stat.hp || 0)}%`,
    `**SPD Bonus:** ${Number(stat.speed || 0)}%`,
  ];
}

function getStackCode(item) {
  return String(item?.code || item?.name || "")
    .toLowerCase()
    .trim();
}

function mergeStackList(existingList, nextList) {
  const map = new Map();

  for (const item of Array.isArray(existingList) ? existingList : []) {
    if (!item) continue;

    const key = getStackCode(item);
    if (!key) continue;

    map.set(key, {
      ...item,
      amount: Number(item.amount || 0),
    });
  }

  for (const item of Array.isArray(nextList) ? nextList : []) {
    if (!item) continue;

    const key = getStackCode(item);
    if (!key) continue;

    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        ...item,
        amount: Number(item.amount || 0),
      });
      continue;
    }

    map.set(key, {
      ...existing,
      ...item,
      amount: Math.max(Number(existing.amount || 0), Number(item.amount || 0)),
    });
  }

  return [...map.values()].filter((item) => Number(item.amount || 0) > 0);
}

function mergeNamedInventory(existingList, nextList) {
  const map = new Map();

  for (const item of Array.isArray(existingList) ? existingList : []) {
    if (!item) continue;

    const key = getStackCode(item);
    if (!key) continue;

    map.set(key, {
      ...item,
      amount: Number(item.amount || 1),
    });
  }

  for (const item of Array.isArray(nextList) ? nextList : []) {
    if (!item) continue;

    const key = getStackCode(item);
    if (!key) continue;

    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        ...item,
        amount: Number(item.amount || 1),
      });
      continue;
    }

    map.set(key, {
      ...existing,
      ...item,
      amount: Math.max(Number(existing.amount || 1), Number(item.amount || 1)),
      upgradeLevel: Math.max(
        Number(existing.upgradeLevel || 0),
        Number(item.upgradeLevel || 0)
      ),
    });
  }

  return [...map.values()].filter((item) => Number(item.amount || 0) > 0);
}

function getCardMergeKey(card) {
  const instanceId = String(card?.instanceId || "").trim();
  if (instanceId) return `id:${instanceId}`;

  const code = String(card?.code || card?.name || "").toLowerCase().trim();
  const role = String(card?.cardRole || "battle").toLowerCase().trim();

  return `${role}:${code}`;
}

function getCardStageRank(card) {
  const raw = String(card?.evolutionKey || card?.form || "").toUpperCase();
  const stage = Number(card?.evolutionStage || 0);

  if (raw === "M3") return 3;
  if (raw === "M2") return 2;
  if (raw === "M1") return 1;

  return Math.max(1, stage || 1);
}

function mergeCardRecord(existing, next) {
  if (!existing) return next;
  if (!next) return existing;

  const existingStage = getCardStageRank(existing);
  const nextStage = getCardStageRank(next);

  const existingLevel = Number(existing.level || 1);
  const nextLevel = Number(next.level || 1);

  const existingExp = Number(existing.exp || existing.xp || 0);
  const nextExp = Number(next.exp || next.xp || 0);

  const existingKills = Number(existing.kills || 0);
  const nextKills = Number(next.kills || 0);

  const stronger =
    nextStage > existingStage ||
    (nextStage === existingStage && nextLevel > existingLevel) ||
    (nextStage === existingStage &&
      nextLevel === existingLevel &&
      nextExp >= existingExp)
      ? next
      : existing;

  const weaker = stronger === next ? existing : next;
  const bestStage = Math.max(existingStage, nextStage);
  const bestExp = Math.max(existingExp, nextExp);

  return {
    ...weaker,
    ...stronger,
    evolutionStage: bestStage,
    evolutionKey: stronger.evolutionKey || weaker.evolutionKey || `M${bestStage}`,
    level: Math.max(existingLevel, nextLevel),
    exp: bestExp,
    xp: bestExp,
    kills: Math.max(existingKills, nextKills),
  };
}

function getCardProgressScore(card) {
  const stage = Number(card?.evolutionStage || 1);
  const level = Number(card?.level || 1);
  const exp = Number(card?.exp ?? card?.xp ?? 0);
  const power = Number(card?.currentPower || card?.power || 0);
  const prestige = Number(
    card?.prestige ??
      card?.raidPrestige ??
      card?.bossPrestige ??
      card?.arenaPrestige ??
      0
  );

  return (
    stage * 1_000_000_000_000 +
    level * 1_000_000_000 +
    prestige * 1_000_000 +
    exp * 100 +
    power
  );
}

function getCardPrestigeValue(card) {
  return Math.max(
    Number(card?.prestige || 0),
    Number(card?.raidPrestige || 0),
    Number(card?.bossPrestige || 0),
    Number(card?.arenaPrestige || 0)
  );
}

function pickBetterProgressCard(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const existingScore = getCardProgressScore(existing);
  const incomingScore = getCardProgressScore(incoming);

  return incomingScore > existingScore ? incoming : existing;
}

function mergeCardCollections(existingCards, nextCards) {
  const map = new Map();

  for (const card of Array.isArray(existingCards) ? existingCards : []) {
    if (!card) continue;
    map.set(getCardMergeKey(card), { ...card });
  }

  for (const card of Array.isArray(nextCards) ? nextCards : []) {
    if (!card) continue;

    const key = getCardMergeKey(card);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...card });
      continue;
    }

    const better = pickBetterProgressCard(existing, card);
    const maxPrestige = Math.max(
      getCardPrestigeValue(existing),
      getCardPrestigeValue(card)
    );

    map.set(key, {
      ...existing,
      ...card,

      // Prevent stale pull/pa snapshots from rolling back card progression.
      evolutionStage: Math.max(
        Number(existing.evolutionStage || 1),
        Number(card.evolutionStage || 1)
      ),
      level: Math.max(Number(existing.level || 1), Number(card.level || 1)),

      exp: Math.max(Number(existing.exp || 0), Number(card.exp || 0)),
      xp: Math.max(Number(existing.xp || 0), Number(card.xp || 0)),

      currentTier:
        better.currentTier ||
        better.rarity ||
        existing.currentTier ||
        card.currentTier,
      rarity:
        better.rarity ||
        better.currentTier ||
        existing.rarity ||
        card.rarity,
      evolutionKey:
        better.evolutionKey ||
        existing.evolutionKey ||
        card.evolutionKey,

      currentPower: Math.max(
        Number(existing.currentPower || existing.power || 0),
        Number(card.currentPower || card.power || 0)
      ),
      power: Math.max(
        Number(existing.power || existing.currentPower || 0),
        Number(card.power || card.currentPower || 0)
      ),

      atk: Math.max(Number(existing.atk || 0), Number(card.atk || 0)),
      hp: Math.max(Number(existing.hp || 0), Number(card.hp || 0)),
      speed: Math.max(Number(existing.speed || 0), Number(card.speed || 0)),

      kills: Math.max(Number(existing.kills || 0), Number(card.kills || 0)),

      // Prestige-safe fields.
      prestige: Math.max(Number(existing.prestige || 0), Number(card.prestige || 0), maxPrestige),
      raidPrestige: Math.max(
        Number(existing.raidPrestige || 0),
        Number(card.raidPrestige || 0),
        maxPrestige
      ),
      bossPrestige: Math.max(
        Number(existing.bossPrestige || 0),
        Number(card.bossPrestige || 0)
      ),
      arenaPrestige: Math.max(
        Number(existing.arenaPrestige || 0),
        Number(card.arenaPrestige || 0)
      ),

      equippedWeapons:
        Array.isArray(card.equippedWeapons) && card.equippedWeapons.length
          ? card.equippedWeapons
          : existing.equippedWeapons || [],
      equippedWeapon: card.equippedWeapon || existing.equippedWeapon || null,
      equippedWeaponName:
        card.equippedWeaponName || existing.equippedWeaponName || null,
      equippedWeaponCode:
        card.equippedWeaponCode || existing.equippedWeaponCode || null,
      equippedWeaponLevel: Math.max(
        Number(existing.equippedWeaponLevel || 0),
        Number(card.equippedWeaponLevel || 0)
      ),

      equippedDevilFruit:
        card.equippedDevilFruit || existing.equippedDevilFruit || null,
      equippedDevilFruitName:
        card.equippedDevilFruitName || existing.equippedDevilFruitName || null,
      equippedDevilFruitCode:
        card.equippedDevilFruitCode || existing.equippedDevilFruitCode || null,
    });
  }

  return [...map.values()];
}

function mergePullUsageForSave(existingPulls = {}, nextPulls = {}) {
  const result = {
    ...(existingPulls || {}),
    ...(nextPulls || {}),
  };

  const keys = [
    "base",
    "supportMember",
    "booster",
    "owner",
    "patreon",
    "vivreCard",
    "baccaratCard",
    "baccaratFruit",
  ];

  for (const key of keys) {
    const existing = existingPulls?.[key] || {};
    const next = nextPulls?.[key] || {};

    result[key] = {
      ...existing,
      ...next,
      used: Math.max(Number(existing.used || 0), Number(next.used || 0)),
      max: Math.max(Number(existing.max || 0), Number(next.max || 0)),
    };
  }

  result.lastResetBucket =
    nextPulls?.lastResetBucket ||
    existingPulls?.lastResetBucket ||
    result.lastResetBucket;

  result.slotSchemaVersion =
    nextPulls?.slotSchemaVersion ||
    existingPulls?.slotSchemaVersion ||
    result.slotSchemaVersion;

  return result;
}

function savePullResultFresh(userId, payload, username = "Unknown") {
  return updatePlayerAtomic(
    userId,
    (fresh) => {
      const existing = fresh || {};

      return {
        ...existing,

        cards: mergeCardCollections(existing.cards, payload.cards),

        weapons: mergeNamedInventory(existing.weapons, payload.weapons),
        devilFruits: mergeNamedInventory(existing.devilFruits, payload.devilFruits),
        fragments: mergeStackList(existing.fragments, payload.fragments),
        tickets: mergeStackList(existing.tickets, payload.tickets),

        berries: Number(existing.berries || 0) + Number(payload.addBerries || 0),

        pulls: mergePullUsageForSave(existing.pulls, payload.pulls),
        pity: payload.pity,

        stats: {
          ...(existing.stats || {}),
          ...(payload.stats || {}),
        },

        quests: {
          ...(existing.quests || {}),
          ...(payload.quests || {}),
        },
      };
    },
    username
  );
}

module.exports = {
  name: "pull",
  aliases: ["gacha"],

  async execute(message) {
    const pullLockKey = String(message.author.id);

    if (PULL_USER_LOCKS.has(pullLockKey)) {
      return message.reply({
        content: "Your previous pull is still being saved. Please wait 1-2 seconds and try again.",
        allowedMentions: { repliedUser: false },
      });
    }

    PULL_USER_LOCKS.add(pullLockKey);

    try {
      const player = getPlayer(message.author.id, message.author.username);

    const resetState = applyGlobalPullReset(player);
    if (resetState?.wasReset) {
      updatePlayer(message.author.id, {
        pulls: resetState.pulls,
      });
      player.pulls = resetState.pulls;
    }

    const roleTier = await getPremiumTier(message);
    const snapshot = syncPremiumSnapshot(
      buildPullAccessSnapshot(player, message),
      roleTier
    );

    updatePlayer(message.author.id, {
      pullAccessSnapshot: snapshot,
    });

    player.pullAccessSnapshot = snapshot;

    const { totalUsed, totalMax } = getTotalPullUsage(player, message);
    const available = Math.max(0, totalMax - totalUsed);

    if (available <= 0) {
      return message.reply(
        "You do not have any available pulls right now.\nUse `op pullinfo` to check your slots."
      );
    }

    const pullKey = getNextAvailablePullKey(player, message);
    if (!pullKey) {
      return message.reply("No pull slot is currently available.");
    }

    const premiumTier = getEffectivePullTierForSlot(roleTier, pullKey);
    const pityLimit = getPityLimit(premiumTier);
    const pityGuarantee = getPityGuarantee(premiumTier);

    let pityCounter = getSharedPity(player) + 1;
    const triggeredPity = pityCounter >= pityLimit;
    const rolledContentType = pickContentType(premiumTier);

    const contentType = triggeredPity
      ? Math.random() < 0.5
        ? "battleCard"
        : "boostCard"
      : rolledContentType;

    const pirateLuckBoost = getPirateLuckBoost(message.author.id);

    const baseTier = triggeredPity
      ? pityGuarantee
      : pickBaseTier(premiumTier, contentType, false, pirateLuckBoost);

    const pool = getRewardPool(contentType);
    const picked =
      contentType === "ticket" ? pickWeightedTicket() : pickRandomByRarity(pool, baseTier);

    if (!picked) {
      return message.reply(`Pull pool is empty for ${contentType} ${baseTier}.`);
    }

    const updatedPulls = consumePullSlot(player, pullKey);
    player.pulls = updatedPulls;
    const updatedDailyState = incrementQuestCounter(player, "pullsUsed", 1);

    let updatedTickets = [...(player.tickets || [])];
    let updatedCards = [...(player.cards || [])];
    let updatedWeapons = [...(player.weapons || [])];
    let updatedDevilFruits = [...(player.devilFruits || [])];
    let updatedFragments = [...(player.fragments || [])];
    let ownedCard = null;
    let duplicateLine = null;
    let autoSacBerries = 0;

    if (contentType === "ticket") {
      updatedTickets = addTicket(updatedTickets, picked);
    } else if (contentType === "battleCard" || contentType === "boostCard") {
      const alreadyOwned = updatedCards.some(
        (card) =>
          String(card.code || "").toLowerCase() ===
          String(picked.code || "").toLowerCase()
      );

      if (alreadyOwned) {
        const autoLevelResult = applyAutoLevelForDuplicate({
          cards: updatedCards,
          fragments: updatedFragments,
          autoLevel: player.autoLevel,
          pulledCard: picked,
          amount: 1,
        });

        updatedCards = autoLevelResult.cards;
        updatedFragments = autoLevelResult.fragments;

        if (autoLevelResult.levelGained > 0) {
          duplicateLine = `You already own **${
            picked.displayName || picked.name
          }**.\nAuto-level used **1 Fragment** → **+${
            autoLevelResult.levelGained
          } Level**.`;
        } else {
          const storedAmount = Number(autoLevelResult.fragmentsStored || 1);

          const fragmentsBeforeAutoSac = removeFragmentAmount(
            autoLevelResult.fragments,
            picked,
            storedAmount
          );

          const sacResult = addFragmentWithAutoSac(
            player,
            fragmentsBeforeAutoSac,
            picked,
            storedAmount
          );

          updatedFragments = sacResult.fragments;
          autoSacBerries += Number(sacResult.berries || 0);

          if (Number(sacResult.sacrificed || 0) > 0) {
            duplicateLine = `You already own **${
              picked.displayName || picked.name
            }**.\n${sacResult.reason}: **${
              sacResult.sacrificed
            } Fragment** → **+${Number(sacResult.berries || 0).toLocaleString(
              "en-US"
            )} berries**.`;
          } else {
            duplicateLine = `You already own **${
              picked.displayName || picked.name
            }**.\nConverted into **${Number(sacResult.added || storedAmount)} Fragment** instead.`;
          }
        }
      } else {
        ownedCard = createOwnedCard(picked);
        updatedCards.push(ownedCard);
      }
    } else if (contentType === "weapon") {
      const alreadyOwnedWeapon = hasWeaponOwnedOrEquipped(player, updatedWeapons, picked.code);

    if (alreadyOwnedWeapon) {
      const weaponFragment = buildWeaponFragmentPayload(picked);
      const sacResult = addFragmentWithAutoSac(player, updatedFragments, weaponFragment, 1);

      updatedFragments = sacResult.fragments;
      autoSacBerries += Number(sacResult.berries || 0);

      if (Number(sacResult.sacrificed || 0) > 0) {
        duplicateLine = `You already own **${picked.name}**.\n${sacResult.reason}: **${sacResult.sacrificed} Fragment** → **+${Number(
          sacResult.berries || 0
        ).toLocaleString("en-US")} berries**.`;
      } else {
        duplicateLine = `You already own **${picked.name}**.\nConverted into **1 ${picked.name} Fragment** instead.`;
      }
    } else {
      updatedWeapons = addNamedItem(updatedWeapons, picked);
    }
    } else if (contentType === "devilFruit") {
    updatedDevilFruits = addDevilFruitItem(updatedDevilFruits, picked);
    }

    if (triggeredPity) {
      pityCounter = 0;
    }

    const updatedPity = {
      ...(player.pity || {}),
      pullPity: pityCounter,
      normalAPity: pityCounter,
      normalSPity: pityCounter,
      premiumSPity: pityCounter,
    };

    await savePullResultFresh(message.author.id,
      {
        cards: updatedCards,
        weapons: updatedWeapons,
        devilFruits: updatedDevilFruits,
        fragments: updatedFragments,
        tickets: updatedTickets,
        addBerries: autoSacBerries,
        pulls: updatedPulls,
        pity: updatedPity,
        stats: {
          cardsPulled:
            Number(player?.stats?.cardsPulled || 0) +
            (contentType === "battleCard" || contentType === "boostCard" ? 1 : 0),
        },
        quests: {
          dailyState: updatedDailyState,
        },
      },
      message.author.username
    );

    const rewardName = picked.displayName || picked.name || "Unknown";
    const rewardRarity = String(picked.baseTier || picked.rarity || "C").toUpperCase();

    const pityText = triggeredPity
      ? `Pity triggered: **${pityGuarantee} Guarantee**`
      : `Pity: ${updatedPity.pullPity}/${pityLimit}`;

    const image = getRewardImage(contentType, picked, ownedCard);
    const badge = getRewardBadge(contentType, picked, ownedCard);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(" Pull Result")
      .setDescription(
        [
          `**Slot Used:** ${prettySlotName(pullKey)}`,
          `**Remaining Pulls:** ${available - 1}/${totalMax}`,
          `**${pityText}**`,
          "",
          duplicateLine || `**${rewardName}**`,
          duplicateLine ? null : `**Type:** ${getTypeLabel(contentType)}`,
          duplicateLine ? null : `**Rarity:** ${rewardRarity}`,
          contentType === "weapon" || contentType === "devilFruit"
          ? picked.type
            ? `**Category:** ${picked.type}`
            : `**Category:** ${getTypeLabel(contentType)}`
          : contentType === "ticket"
          ? `**Category:** Ticket`
          : `**Current Form:** ${ownedCard?.evolutionKey || "M1"}`,
          "",
          contentType === "battleCard" || contentType === "boostCard"
            ? buildRewardStatsText(contentType, ownedCard || picked).join("\n")
            : duplicateLine
            ? null
            : buildRewardStatsText(contentType, ownedCard || picked).join("\n"),
        ]
          .filter(Boolean)
          .join("\n")
      )
      .setFooter({
        text: `One Piece Bot • Pull • ${prettySlotName(pullKey)}`,
      });

    if (badge) embed.setThumbnail(badge);
    if (image) embed.setImage(image);

    return message.reply({
      embeds: [embed],
    });
    } finally {
      PULL_USER_LOCKS.delete(pullLockKey);
    }
  },
};