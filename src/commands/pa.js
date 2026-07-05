const { EmbedBuilder } = require("discord.js");
const {
  getPlayer,
  updatePlayerAtomic,
} = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const rawCards = require("../data/cards");
const rawWeapons = require("../data/weapons");
const rawDevilFruits = require("../data/devilFruits");
const { applyGlobalPullReset, applyManualPullReset } = require("../utils/pullReset");
const { findPirateByUser } = require("../utils/pirateStore");
const { applyAutoLevelForDuplicate } = require("../utils/autoLevel");
const {
  addFragmentWithAutoSac,
  removeFragmentAmount,
  getFragmentStorageInfo,
  getSacBerryValue,
} = require("../utils/autoSac");
const {
  getPullSlotStatus,
  consumeAllActivePullSlots,
  buildPullAccessSnapshot,
} = require("../utils/pullSlots");
const { incrementQuestCounter } = require("../utils/questProgress");
const {
  rollPremiumBaseTier,
  rollPremiumContentType,
  rollPremiumDevilFruitTier,
  rollPremiumWeaponTier,
} = require("../utils/pullRates");
const {
  getLuckyWeekPullMultiplier,
  getLuckyWeekBonusLine,
} = require("../utils/luckyWeekStore");
const { PREMIUM_ROLE_NAME, isPremiumUser } = require("../utils/premiumAccess");

const PREMIUM_PITY_TARGET = 100;
const PULL_COMMAND_LOCKS =
  global.__ONEPIECE_PULL_COMMAND_LOCKS ||
  (global.__ONEPIECE_PULL_COMMAND_LOCKS = new Set());

const PA_REWARD_POOL_CACHE =
  global.__ONEPIECE_PA_REWARD_POOL_CACHE ||
  (global.__ONEPIECE_PA_REWARD_POOL_CACHE = new Map());

function normalizePaCode(value) {
  return String(value || "").toLowerCase().trim();
}

function getCachedRewardPool(contentType) {
  const key = String(contentType || "unknown");

  if (PA_REWARD_POOL_CACHE.has(key)) {
    return PA_REWARD_POOL_CACHE.get(key);
  }

  const pool = getRewardPool(contentType);
  const rarityMap = new Map();
  const normalPool = [];

  for (const entry of Array.isArray(pool) ? pool : []) {
    const rarity = getPullRarity(entry);

    if (rarity !== "THRONE") {
      normalPool.push(entry);
    }

    if (!rarityMap.has(rarity)) {
      rarityMap.set(rarity, []);
    }

    rarityMap.get(rarity).push(entry);
  }

  const cached = {
    pool,
    normalPool,
    rarityMap,
  };

  PA_REWARD_POOL_CACHE.set(key, cached);
  return cached;
}

function pickRandomByRarityCached(contentType, rarity) {
  const cached = getCachedRewardPool(contentType);
  const targetRarity = String(rarity || "").toUpperCase();

  if (targetRarity === "THRONE") {
    const thronePool = cached.rarityMap.get("THRONE") || [];
    if (!thronePool.length) return null;

    return thronePool[Math.floor(Math.random() * thronePool.length)] || null;
  }

  const filtered = cached.rarityMap.get(targetRarity) || [];
  const source = filtered.length
    ? filtered
    : cached.normalPool.length
    ? cached.normalPool
    : cached.pool;

  if (!source.length) return null;
  return source[Math.floor(Math.random() * source.length)] || null;
}

function buildOwnedCardCodeSet(cards) {
  const set = new Set();

  for (const card of Array.isArray(cards) ? cards : []) {
    const code = normalizePaCode(card?.code);
    if (code) set.add(code);
  }

  return set;
}

function buildOwnedWeaponCodeSet(player, weaponsList) {
  const set = new Set();

  for (const weapon of Array.isArray(weaponsList) ? weaponsList : []) {
    const code = normalizePaCode(weapon?.code);
    if (code) set.add(code);
  }

  for (const card of Array.isArray(player?.cards) ? player.cards : []) {
    for (const weapon of Array.isArray(card?.equippedWeapons) ? card.equippedWeapons : []) {
      const code = normalizePaCode(weapon?.code || weapon?.weaponCode);
      if (code) set.add(code);
    }

    const legacyCode = normalizePaCode(card?.equippedWeaponCode);
    if (legacyCode) set.add(legacyCode);
  }

  return set;
}

function yieldPaEventLoop() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

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

function makeInstanceId(code) {
  return `${code}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createOwnedCardLocal(template) {
  return hydrateCard({
    ...template,
    instanceId: makeInstanceId(template.code || "card"),
    level: 1,
    xp: 0,
    exp: 0,
    kills: 0,
    fragments: 0,
    evolutionStage: 1,
    evolutionKey: "M1",
    currentTier: template.baseTier || template.rarity || "C",
    rarity: template.baseTier || template.rarity || "C",
    equippedWeapons: [],
    equippedWeapon: null,
    equippedWeaponName: null,
    equippedWeaponCode: null,
    equippedWeaponLevel: 0,
    equippedDevilFruit: null,
    equippedDevilFruitName: null,
  });
}

function getContentType() {
  return rollPremiumContentType();
}

function rollThroneEquivalentCardTier(baseTier) {
  // Same special feel as Empty Throne Raid Writ.
  // Road Poneglyph will only appear from pullTier: "THRONE".
  const roll = Math.random() * 100;
  if (roll < 0.25) return "THRONE";
  return baseTier;
}

function getPremiumRewardTier(
  contentType,
  triggeredPity,
  pullChanceBonus = 0,
  luckyMultiplier = 1
) {
  if (contentType === "devilFruit") {
    return rollPremiumDevilFruitTier(luckyMultiplier);
  }

  if (contentType === "weapon") {
    return rollPremiumWeaponTier(luckyMultiplier);
  }

  if (triggeredPity) return "S";

  const baseTier = rollPremiumBaseTier(pullChanceBonus, luckyMultiplier);

  if (contentType === "boostCard") {
    return rollThroneEquivalentCardTier(baseTier);
  }

  return baseTier;
}

function getTicketPool() {
  return [
    {
      code: "common_raid_ticket",
      name: "Common Raid Ticket",
      rarity: "B",
      type: "Ticket",
      weight: 30,
    },
    {
      code: "raid_ticket",
      name: "Raid Ticket",
      rarity: "A",
      type: "Ticket",
      weight: 30,
    },
    {
      code: "gold_raid_ticket",
      name: "Gold Raid Ticket",
      rarity: "S",
      type: "Ticket",
      weight: 25,
    },
    {
      code: "empty_throne_raid_writ",
      name: "Empty Throne Raid Writ",
      rarity: "S",
      type: "Ticket",
      weight: 10,
    },
    {
      code: "mythic_raid_ticket",
      name: "Mythic Raid Ticket",
      rarity: "UR",
      type: "Ticket",
      weight: 5,
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
  return String(
    entry?.pullTier ||
      entry?.baseTier ||
      entry?.rarity ||
      ""
  ).toUpperCase();
}

function pickRandomByRarity(pool, rarity) {
  const list = Array.isArray(pool) ? pool : [];
  if (!list.length) return null;

  const targetRarity = String(rarity || "").toUpperCase();

  if (targetRarity === "THRONE") {
    const thronePool = list.filter((entry) => getPullRarity(entry) === "THRONE");
    if (!thronePool.length) return null;

    return thronePool[Math.floor(Math.random() * thronePool.length)] || null;
  }

  // Prevent THRONE-only cards from leaking into normal S pool.
  const normalPool = list.filter((entry) => getPullRarity(entry) !== "THRONE");

  const filtered = normalPool.filter(
    (entry) => getPullRarity(entry) === targetRarity
  );

  const source = filtered.length ? filtered : normalPool.length ? normalPool : list;

  return source[Math.floor(Math.random() * source.length)] || null;
}

function hasOwnedCardByCode(cards, code) {
  return (Array.isArray(cards) ? cards : []).some(
    (entry) =>
      String(entry.code || "").toLowerCase() === String(code || "").toLowerCase()
  );
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
  const items = Array.isArray(list) ? [...list] : [];
  const existingIndex = items.findIndex(
    (entry) => String(entry.code) === String(reward.code)
  );

  if (existingIndex !== -1) {
    items[existingIndex] = {
      ...items[existingIndex],
      amount: Number(items[existingIndex].amount || 1) + 1,
      upgradeLevel: Math.max(
        Number(items[existingIndex].upgradeLevel || 0),
        Number(reward.upgradeLevel || 0)
      ),
    };

    return items;
  }

  items.push({
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
    upgradeLevel: 0,
  });

  return items;
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
  const items = Array.isArray(list) ? [...list] : [];
  const existingIndex = items.findIndex(
    (entry) => String(entry.code) === String(ticket.code)
  );

  if (existingIndex !== -1) {
    items[existingIndex] = {
      ...items[existingIndex],
      amount: Number(items[existingIndex].amount || 0) + 1,
    };

    return items;
  }

  items.push({
    code: ticket.code,
    name: ticket.name,
    amount: 1,
    rarity: ticket.rarity,
    type: "Ticket",
  });

  return items;
}

function getRewardResult(contentType, reward) {
  if (contentType === "ticket") {
    return {
      storageKey: "tickets",
      storedReward: reward,
    };
  }

  if (contentType === "battleCard" || contentType === "boostCard") {
    return {
      storageKey: "cards",
      storedReward: createOwnedCardLocal(reward),
    };
  }

  if (contentType === "weapon") {
    return {
      storageKey: "weapons",
      storedReward: reward,
    };
  }

  return {
    storageKey: "devilFruits",
    storedReward: reward,
  };
}

function getTypeLabel(contentType) {
  if (contentType === "battleCard") return "Battle Card";
  if (contentType === "boostCard") return "Boost Card";
  if (contentType === "weapon") return "Weapon";
  if (contentType === "devilFruit") return "Devil Fruit";
  return "Ticket";
}

function getConvertBerries(reward, contentType) {
  const rarity = String(reward?.baseTier || reward?.rarity || "C").toUpperCase();

  const rarityValue = {
    C: 500,
    B: 1000,
    A: 2500,
    S: 6000,
    SS: 12000,
    UR: 25000,
  };

  const typeBonus = {
    battleCard: 1,
    boostCard: 1,
    weapon: 1.25,
    devilFruit: 1.5,
    ticket: 1,
  };

  return Math.floor((rarityValue[rarity] || 500) * (typeBonus[contentType] || 1));
}

function getFragmentAmount(fragment) {
  return Math.max(0, Number(fragment?.amount || 0));
}

function getFragmentRarity(fragment) {
  return String(fragment?.rarity || "C").toUpperCase();
}

function getFragmentBerryValue(fragment, amount = 1) {
  return getSacBerryValue(getFragmentRarity(fragment), amount);
}

function getFragmentSortRank(fragment) {
  const rarityRank = {
    C: 1,
    B: 2,
    A: 3,
    S: 4,
    SS: 5,
    UR: 6,
  };

  return rarityRank[getFragmentRarity(fragment)] || 1;
}

function enforceFragmentStorageLimit(player, fragments) {
  const list = Array.isArray(fragments)
    ? fragments
        .map((fragment) => ({
          ...fragment,
          amount: getFragmentAmount(fragment),
        }))
        .filter((fragment) => getFragmentAmount(fragment) > 0)
    : [];

  const storage = getFragmentStorageInfo(player, list);
  const total = Number(storage.total || 0);
  const max = Number(storage.max || 0);

  if (!max || total <= max) {
    return {
      fragments: list,
      convertedCount: 0,
      convertedBerries: 0,
      overflow: 0,
    };
  }

  let overflow = total - max;
  let convertedCount = 0;
  let convertedBerries = 0;

  // Convert low rarity fragments first so higher rarity fragments are preserved.
  const indexed = list.map((fragment, index) => ({
    fragment,
    index,
  }));

  indexed.sort((a, b) => {
    const rarityDiff =
      getFragmentSortRank(a.fragment) - getFragmentSortRank(b.fragment);

    if (rarityDiff !== 0) return rarityDiff;

    return getFragmentAmount(b.fragment) - getFragmentAmount(a.fragment);
  });

  const next = [...list];

  for (const entry of indexed) {
    if (overflow <= 0) break;

    const current = next[entry.index];
    if (!current) continue;

    const owned = getFragmentAmount(current);
    if (owned <= 0) continue;

    const convertAmount = Math.min(owned, overflow);

    next[entry.index] = {
      ...current,
      amount: owned - convertAmount,
    };

    convertedCount += convertAmount;
    convertedBerries += getFragmentBerryValue(current, convertAmount);
    overflow -= convertAmount;
  }

  return {
    fragments: next.filter((fragment) => getFragmentAmount(fragment) > 0),
    convertedCount,
    convertedBerries,
    overflow: total - max,
  };
}

function addTicketSummary(summary, reward) {
  if (reward.code === "common_raid_ticket") summary.commonRaidTicket += 1;
  if (reward.code === "raid_ticket") summary.raidTicket += 1;
  if (reward.code === "gold_raid_ticket") summary.goldRaidTicket += 1;
  if (reward.code === "empty_throne_raid_writ") summary.emptyThroneRaidWrit += 1;
  if (reward.code === "mythic_raid_ticket") summary.mythicRaidTicket += 1;
}

function getCardMergeKey(card) {
  const instanceId = String(card?.instanceId || "").trim();
  if (instanceId) return `instance:${instanceId}`;

  const code = String(card?.code || "").toLowerCase().trim();
  const stage = String(card?.evolutionStage || card?.evolutionKey || "1").toLowerCase();

  return `code:${code}:${stage}`;
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

function getPullResetBucketValue(pulls = {}) {
  const raw = pulls?.lastResetBucket;

  if (raw === null || raw === undefined || raw === "") return null;

  const asNumber = Number(raw);
  if (Number.isFinite(asNumber)) return asNumber;

  return String(raw || "").trim();
}

function isDifferentPullResetBucket(existingPulls = {}, nextPulls = {}) {
  const existingBucket = getPullResetBucketValue(existingPulls);
  const nextBucket = getPullResetBucketValue(nextPulls);

  if (existingBucket === null || nextBucket === null) return false;

  return String(existingBucket) !== String(nextBucket);
}

function mergePullUsageForSave(existingPulls = {}, nextPulls = {}) {
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

  const bucketChanged = isDifferentPullResetBucket(existingPulls, nextPulls);

  const result = {
    ...(existingPulls || {}),
    ...(nextPulls || {}),
  };

  for (const key of keys) {
    const existing = existingPulls?.[key] || {};
    const next = nextPulls?.[key] || {};

    result[key] = {
      ...existing,
      ...next,
      used: bucketChanged
        ? Math.max(0, Number(next.used || 0))
        : Math.max(Number(existing.used || 0), Number(next.used || 0)),
      max: Math.max(Number(existing.max || 0), Number(next.max || 0)),
    };
  }

  result.lastResetBucket =
    nextPulls?.lastResetBucket ??
    existingPulls?.lastResetBucket ??
    result.lastResetBucket;

  result.slotSchemaVersion =
    nextPulls?.slotSchemaVersion ||
    existingPulls?.slotSchemaVersion ||
    result.slotSchemaVersion;

  return result;
}

function clonePullPlanPlayer(player) {
  return {
    ...player,
    pulls: JSON.parse(JSON.stringify(player?.pulls || {})),
    pullAccessSnapshot: {
      ...(player?.pullAccessSnapshot || {}),
    },
  };
}

function savePullAllResultFresh(userId, payload, username = "Unknown") {
  let didSave = false;
  let savedPulls = null;
  let savedAvailableTotal = 0;

  const result = updatePlayerAtomic(
    userId,
    (fresh) => {
      const existing = fresh || {};
      const finalPulls = payload.finalPulls || existing.pulls || {};

      didSave = true;
      savedPulls = finalPulls;
      savedAvailableTotal = Number(payload.availableTotal || 0);

      return {
        ...existing,

        cards: mergeCardCollections(existing.cards, payload.cards),
        weapons: mergeNamedInventory(existing.weapons, payload.weapons),
        devilFruits: mergeNamedInventory(existing.devilFruits, payload.devilFruits),
        fragments: mergeStackList(existing.fragments, payload.fragments),

        tickets: Array.isArray(payload.tickets)
          ? payload.tickets
          : existing.tickets || [],

        berries: Number(existing.berries || 0) + Number(payload.addBerries || 0),

        pulls: finalPulls,
        pity: payload.pity,
        pullAccessSnapshot:
          payload.pullAccessSnapshot || existing.pullAccessSnapshot || {},

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

  return {
    result,
    didSave,
    pulls: savedPulls,
    availableTotal: savedAvailableTotal,
  };
}

function addDuplicateCardReward({
  player,
  reward,
  updatedCards,
  updatedFragments,
}) {
  const autoLevelResult = applyAutoLevelForDuplicate({
    cards: updatedCards,
    fragments: updatedFragments,
    autoLevel: player.autoLevel,
    pulledCard: reward,
    amount: 1,
  });

  let nextCards = autoLevelResult.cards;
  let nextFragments = autoLevelResult.fragments;
  let duplicateNote = "";
  let convertedBerries = 0;
  let convertedCount = 0;
  let fragmentCount = 0;

  if (autoLevelResult.levelGained > 0) {
    duplicateNote = ` → Auto Level +${autoLevelResult.levelGained}`;
  } else {
    const storedAmount = Number(autoLevelResult.fragmentsStored || 1);

    const fragmentsBeforeAutoSac = removeFragmentAmount(
      autoLevelResult.fragments,
      reward,
      storedAmount
    );

    const sacResult = addFragmentWithAutoSac(
      player,
      fragmentsBeforeAutoSac,
      reward,
      storedAmount
    );

    nextFragments = sacResult.fragments;

    if (Number(sacResult.sacrificed || 0) > 0) {
      convertedBerries += Number(sacResult.berries || 0);
      convertedCount += Number(sacResult.sacrificed || 0);
      duplicateNote = ` → ${sacResult.reason} (+${Number(
        sacResult.berries || 0
      ).toLocaleString("en-US")} berries)`;
    } else {
      fragmentCount += Number(sacResult.added || 0);
      duplicateNote = ` → Duplicate (+${Number(sacResult.added || storedAmount)} fragment)`;
    }
  }

  return {
    cards: nextCards,
    fragments: nextFragments,
    duplicateNote,
    convertedBerries,
    convertedCount,
    fragmentCount,
  };
}

function addDuplicateWeaponReward({
  player,
  reward,
  updatedFragments,
}) {
  const weaponFragment = buildWeaponFragmentPayload(reward);
  const sacResult = addFragmentWithAutoSac(player, updatedFragments, weaponFragment, 1);

  let duplicateNote = "";
  let convertedBerries = 0;
  let convertedCount = 0;
  let fragmentCount = 0;

  if (Number(sacResult.sacrificed || 0) > 0) {
    convertedBerries += Number(sacResult.berries || 0);
    convertedCount += Number(sacResult.sacrificed || 0);
    duplicateNote = ` → ${sacResult.reason} (+${Number(
      sacResult.berries || 0
    ).toLocaleString("en-US")} berries)`;
  } else {
    fragmentCount += Number(sacResult.added || 1);
    duplicateNote = ` → Duplicate (+${Number(sacResult.added || 1)} ${
      reward.name
    } Fragment)`;
  }

  return {
    fragments: sacResult.fragments,
    duplicateNote,
    convertedBerries,
    convertedCount,
    fragmentCount,
  };
}

module.exports = {
  name: "pa",
  aliases: ["pullall"],

  async execute(message, args = []) {
    const paLockKey = String(message.author.id);
    let processingMessage = null;

    const replyOrEdit = async (payload) => {
      if (processingMessage && typeof processingMessage.edit === "function") {
        return processingMessage.edit(payload).catch(() => message.reply(payload));
      }

      processingMessage = await message.reply(payload);
      return processingMessage;
    };

    if (PULL_COMMAND_LOCKS.has(paLockKey)) {
      return message.reply({
        content: "Your previous Pull All is still being saved. Please wait 1-2 seconds and try again.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    PULL_COMMAND_LOCKS.add(paLockKey);

try {
  const useManualResetAfterPull = String(args[0] || "").toLowerCase() === "reset";

  const player = getPlayer(message.author.id, message.author.username);
    player.id = String(message.author.id);
    player.userId = String(message.author.id);

    player.pullAccessSnapshot = {
      ...(player.pullAccessSnapshot || {}),
      patreon: true,
      vivreCard: false,
    };

    const resetState = applyGlobalPullReset(player);

    if (resetState?.wasReset) {
      player.pulls = resetState.pulls;
    }

    const snapshot = buildPullAccessSnapshot(player, message);
    snapshot.patreon = true;
    snapshot.vivreCard = false;

    player.pullAccessSnapshot = snapshot;

    const slotStatus = getPullSlotStatus(player, message);

    const availableSlots = Object.entries(slotStatus)
      .filter(([, slot]) => slot?.enabled)
      .map(([key, slot]) => {
        const max = Math.max(0, Math.floor(Number(slot.max || 0)));
        const used = Math.max(0, Math.floor(Number(slot.used || 0)));
        const safeUsed = Math.min(used, max);
        const remaining = Math.max(0, max - safeUsed);

        return {
          key,
          max,
          used: safeUsed,
          remaining,
        };
      })
      .filter((slot) => slot.remaining > 0);

    const availableTotal = availableSlots.reduce(
      (sum, slot) => sum + Number(slot.remaining || 0),
      0
    );

    if (availableTotal > 0) {
      processingMessage = await message.reply({
        content: `Pulling all available slots... (${availableTotal} pull${availableTotal === 1 ? "" : "s"})`,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (availableTotal <= 0) {
      return replyOrEdit({
        content: "You do not have any available pulls right now.",
        embeds: [],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const premiumAccess = await isPremiumUser(message);

    if (!premiumAccess) {
      return replyOrEdit({
        content: `Only ${PREMIUM_ROLE_NAME} users can use \`op pa\`.`,
        embeds: [],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    let updatedCards = [...(player.cards || [])];
    let updatedWeapons = [...(player.weapons || [])];
    let updatedDevilFruits = [...(player.devilFruits || [])];
    let updatedFragments = [...(player.fragments || [])];
    let updatedTickets = [...(player.tickets || [])];
    let pityCounter = getSharedPity(player);
    const pirateLuckBoost = getPirateLuckBoost(message.author.id);
    const luckyWeekMultiplier = getLuckyWeekPullMultiplier();
    let convertedBerries = 0;
    let convertedCount = 0;
    let cardsPulledThisRun = 0;

    const summary = {
      card: 0,
      weapon: 0,
      devilFruit: 0,
      C: 0,
      B: 0,
      A: 0,
      S: 0,
      SS: 0,
      UR: 0,
      fragments: 0,
      commonRaidTicket: 0,
      raidTicket: 0,
      goldRaidTicket: 0,
      emptyThroneRaidWrit: 0,
      mythicRaidTicket: 0,
    };

    const pullGroups = {
      cards: [],
      weapons: [],
      devilFruits: [],
      tickets: [],
    };

    const ownedCardCodes = buildOwnedCardCodeSet(updatedCards);
    const ownedWeaponCodes = buildOwnedWeaponCodeSet(player, updatedWeapons);

    const paYieldEvery = Math.max(
      1,
      Number(process.env.PA_EVENT_LOOP_YIELD_EVERY || 9999)
    );

    for (let i = 0; i < availableTotal; i++) {
      if (i > 0 && i % paYieldEvery === 0) {
        await yieldPaEventLoop();
      }

      pityCounter += 1;
      const triggeredPity = pityCounter >= PREMIUM_PITY_TARGET;

      let contentType = getContentType();

      if (triggeredPity) {
        contentType = Math.random() < 0.5 ? "battleCard" : "boostCard";
      }

      const rarity = getPremiumRewardTier(
        contentType,
        triggeredPity,
        pirateLuckBoost,
        luckyWeekMultiplier
      );

      const reward =
        contentType === "ticket"
          ? pickWeightedTicket()
          : pickRandomByRarityCached(contentType, rarity);

      if (!reward) continue;

      const rewardResult = getRewardResult(contentType, reward);
      let duplicateNote = "";

      const rewardCode = normalizePaCode(rewardResult.storedReward?.code);

      const isDuplicateCard =
        rewardResult.storageKey === "cards" && ownedCardCodes.has(rewardCode);

      const isDuplicateWeapon =
        rewardResult.storageKey === "weapons" && ownedWeaponCodes.has(rewardCode);

      const needsStorageSlot = false;

      if (rewardResult.storageKey === "tickets") {
        updatedTickets = addTicket(updatedTickets, rewardResult.storedReward);
      } else if (rewardResult.storageKey === "cards") {
        const alreadyOwned = isDuplicateCard;

        if (alreadyOwned) {
          const duplicateResult = addDuplicateCardReward({
            player,
            reward,
            updatedCards,
            updatedFragments,
          });

          updatedCards = duplicateResult.cards;
          updatedFragments = duplicateResult.fragments;
          duplicateNote = duplicateResult.duplicateNote;
          convertedBerries += duplicateResult.convertedBerries;
          convertedCount += duplicateResult.convertedCount;
          summary.fragments += duplicateResult.fragmentCount;
        } else {
          updatedCards.push(rewardResult.storedReward);
          if (rewardCode) ownedCardCodes.add(rewardCode);
        }
      } else if (rewardResult.storageKey === "weapons") {
        const alreadyOwnedWeapon = isDuplicateWeapon;

        if (alreadyOwnedWeapon) {
          const duplicateResult = addDuplicateWeaponReward({
            player,
            reward: rewardResult.storedReward,
            updatedFragments,
          });

          updatedFragments = duplicateResult.fragments;
          duplicateNote = duplicateResult.duplicateNote;
          convertedBerries += duplicateResult.convertedBerries;
          convertedCount += duplicateResult.convertedCount;
          summary.fragments += duplicateResult.fragmentCount;
        } else {
          updatedWeapons = addNamedItem(updatedWeapons, rewardResult.storedReward);
          if (rewardCode) ownedWeaponCodes.add(rewardCode);
        }
      } else if (rewardResult.storageKey === "devilFruits") {
        updatedDevilFruits = addDevilFruitItem(
          updatedDevilFruits,
          rewardResult.storedReward
        );
      }

      if (contentType === "battleCard" || contentType === "boostCard") {
        summary.card += 1;
        cardsPulledThisRun += 1;
      } else if (contentType === "weapon") {
        summary.weapon += 1;
      } else if (contentType === "devilFruit") {
        summary.devilFruit += 1;
      } else {
        addTicketSummary(summary, reward);
      }

      const rewardRarity = String(reward.baseTier || reward.rarity || "C").toUpperCase();

      if (summary[rewardRarity] !== undefined) {
        summary[rewardRarity] += 1;
      }

      const rewardName = reward.displayName || reward.name || "Unknown";
      const pityLabel = triggeredPity ? " [PITY]" : "";

      const targetGroup =
        contentType === "weapon"
          ? pullGroups.weapons
          : contentType === "devilFruit"
          ? pullGroups.devilFruits
          : contentType === "ticket"
          ? pullGroups.tickets
          : pullGroups.cards;

      const line = `${targetGroup.length + 1}. [${rewardRarity}] ${rewardName}${pityLabel}${duplicateNote}`;

      targetGroup.push(line);

      if (triggeredPity) {
        pityCounter = 0;
      }
    }

    const updatedPity = {
      ...(player.pity || {}),
      pullPity: pityCounter,
      normalAPity: pityCounter,
      normalSPity: pityCounter,
      premiumSPity: pityCounter,
    };

    let resetTicketUsed = false;
    let resetFailedReason = "";

    if (useManualResetAfterPull) {
      const resetTicketCode = "pull_reset_ticket";
      const ticketIndex = updatedTickets.findIndex(
        (ticket) => String(ticket.code || "").toLowerCase() === resetTicketCode
      );

      if (ticketIndex === -1 || Number(updatedTickets[ticketIndex].amount || 0) <= 0) {
        resetFailedReason =
          "You do not have Pull Reset Ticket left, so pull reset was not applied.";
      } else {
        updatedTickets[ticketIndex] = {
          ...updatedTickets[ticketIndex],
          amount: Number(updatedTickets[ticketIndex].amount || 0) - 1,
        };

        if (Number(updatedTickets[ticketIndex].amount || 0) <= 0) {
          updatedTickets.splice(ticketIndex, 1);
        }

        resetTicketUsed = true;
      }
    }

    const pullPlanPlayer = clonePullPlanPlayer(player);
    let finalPulls = consumeAllActivePullSlots(pullPlanPlayer, message);

    if (resetTicketUsed) {
      finalPulls = applyManualPullReset(finalPulls).pulls;
    }

    const updatedDailyState = incrementQuestCounter(player, "pullsUsed", availableTotal);

    const fragmentStorageAudit = enforceFragmentStorageLimit(player, updatedFragments);

    if (fragmentStorageAudit.convertedCount > 0) {
      updatedFragments = fragmentStorageAudit.fragments;
      convertedBerries += fragmentStorageAudit.convertedBerries;
      convertedCount += fragmentStorageAudit.convertedCount;
    }

    const saveResult = await savePullAllResultFresh(
      message.author.id,
      {
        cards: updatedCards,
        weapons: updatedWeapons,
        devilFruits: updatedDevilFruits,
        fragments: updatedFragments,
        tickets: updatedTickets,
        addBerries: convertedBerries,

        pity: updatedPity,
        pullAccessSnapshot: snapshot,

        finalPulls,
        availableTotal,

        stats: {
          ...(player.stats || {}),
          cardsPulled: Number(player?.stats?.cardsPulled || 0) + cardsPulledThisRun,
        },

        quests: {
          ...(player.quests || {}),
          dailyState: updatedDailyState,
        },
      },
      message.author.username
    );

    if (!saveResult.didSave) {
      return replyOrEdit({
        content: "You do not have any available pulls right now.",
        embeds: [],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const groupedLines = [];
    const luckyWeekLine = getLuckyWeekBonusLine();

    if (luckyWeekLine) {
      groupedLines.push(luckyWeekLine);
      groupedLines.push("");
    }

    if (pullGroups.cards.length) {
      groupedLines.push("## Cards");
      groupedLines.push(...pullGroups.cards);
      groupedLines.push("");
    }

    if (pullGroups.weapons.length) {
      groupedLines.push("## Weapons");
      groupedLines.push(...pullGroups.weapons);
      groupedLines.push("");
    }

    if (pullGroups.devilFruits.length) {
      groupedLines.push("## Devil Fruits");
      groupedLines.push(...pullGroups.devilFruits);
      groupedLines.push("");
    }

    if (pullGroups.tickets.length) {
      groupedLines.push("## Tickets");
      groupedLines.push(...pullGroups.tickets);
    }

    if (convertedCount > 0) {
      groupedLines.push("");
      groupedLines.push("## Auto Convert");
      groupedLines.push(
        `${convertedCount} reward(s) converted into **${convertedBerries.toLocaleString("en-US")} berries**.`
      );

      if (fragmentStorageAudit?.convertedCount > 0) {
        groupedLines.push(
          `Fragment storage overflow converted: **${fragmentStorageAudit.convertedCount} fragment(s)**.`
        );
      }
    }

    if (useManualResetAfterPull) {
      groupedLines.push("");
      groupedLines.push("## Reset");

      if (resetTicketUsed) {
        groupedLines.push("Pull Reset Ticket x1 used.");
        groupedLines.push("Pull slots have been reset after Pull All.");
        groupedLines.push("You can use `op pa` again now.");
      } else {
        groupedLines.push(resetFailedReason || "Pull reset was not applied.");
        groupedLines.push("Pull All rewards were still saved.");
      }
    }

    const chunkSize = 25;
    const chunks = [];
    for (let i = 0; i < groupedLines.length; i += chunkSize) {
      chunks.push(groupedLines.slice(i, i + chunkSize).join("\n"));
    }

    const embeds = [];

    chunks.slice(0, 10).forEach((chunk, index) => {
      embeds.push(
        new EmbedBuilder()
          .setColor(0x8e44ad)
          .setTitle(`Pull Results ${index + 1}/${chunks.length}`)
          .setDescription(chunk || "No rewards rolled.")
          .setFooter({
            text: `One Piece Bot • Pull All • Pity ${updatedPity.pullPity}/${PREMIUM_PITY_TARGET}`,
          })
      );
    });

    if (!embeds.length) {
      embeds.push(
        new EmbedBuilder()
          .setColor(0x8e44ad)
          .setTitle("Pull Results")
          .setDescription("No rewards rolled.")
      );
    }

    return replyOrEdit({
      content: "",
      embeds,
      allowedMentions: {
        repliedUser: false,
      },
    });
  } finally {
    PULL_COMMAND_LOCKS.delete(paLockKey);
  }
  },
};