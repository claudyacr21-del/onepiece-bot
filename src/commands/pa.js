const { EmbedBuilder } = require("discord.js");
const {
  getPlayer,
  updatePlayerAtomicFast,
} = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const { bumpAchievement } = require("../utils/achievements");
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

function yieldPaCommand() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
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

function getContentType(
  luckyMultiplier = 1
) {
  return rollPremiumContentType(
    luckyMultiplier
  );
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
    return rollPremiumDevilFruitTier(
      pullChanceBonus,
      luckyMultiplier
    );
  }

  if (contentType === "weapon") {
    return rollPremiumWeaponTier(
      pullChanceBonus,
      luckyMultiplier
    );
  }

  if (triggeredPity) {
    return "S";
  }

  const baseTier = rollPremiumBaseTier(
    pullChanceBonus,
    luckyMultiplier
  );

  if (contentType === "boostCard") {
    return rollThroneEquivalentCardTier(
      baseTier
    );
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
  if (contentType === "ticket") {
    return getTicketPool();
  }

  if (contentType === "battleCard") {
    return rawCards.filter((card) => {
      const code = String(
        card.code || ""
      ).toLowerCase();

      return (
        card.cardRole === "battle" &&
        code !== "imu" &&
        card.canPA !== false &&
        card.summonOnly !== true &&
        card.mergeOnly !== true
      );
    });
  }

  if (contentType === "boostCard") {
    return rawCards.filter(
      (card) =>
        card.cardRole === "boost" &&
        card.canPA !== false &&
        card.summonOnly !== true &&
        card.mergeOnly !== true
    );
  }

  if (contentType === "weapon") {
    return rawWeapons.filter(
      (weapon) =>
        !weapon.raidOnly &&
        weapon.canPA !== false &&
        weapon.source !== "empty_throne_raid_writ" &&
        weapon.source !== "gold_raid_ticket"
    );
  }

  return rawDevilFruits.filter(
    (fruit) => fruit.canPA !== false
  );
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

function savePullAllResultFresh(
  userId,
  payload,
  username = "Unknown"
) {
  let didSave = false;

  const result = updatePlayerAtomicFast(
    userId,
    (fresh) => {
      const existing =
        fresh &&
        typeof fresh === "object"
          ? fresh
          : {};

      didSave = true;

      /*
        Payload PA was built from this player's current
        inventories. Replace only PA-owned fields and keep
        all unrelated live fields from fresh.
      */
      return {
        ...existing,

        username:
          existing.username ||
          username,

        cards: Array.isArray(payload.cards)
          ? payload.cards
          : existing.cards || [],

        weapons: Array.isArray(
          payload.weapons
        )
          ? payload.weapons
          : existing.weapons || [],

        devilFruits: Array.isArray(
          payload.devilFruits
        )
          ? payload.devilFruits
          : existing.devilFruits || [],

        fragments: Array.isArray(
          payload.fragments
        )
          ? payload.fragments
          : existing.fragments || [],

        tickets: Array.isArray(
          payload.tickets
        )
          ? payload.tickets
          : existing.tickets || [],

        berries:
          Number(existing.berries || 0) +
          Number(payload.addBerries || 0),

        pulls:
          payload.finalPulls ||
          existing.pulls ||
          {},

        pity:
          payload.pity ||
          existing.pity ||
          {},

        pullAccessSnapshot:
          payload.pullAccessSnapshot ||
          existing.pullAccessSnapshot ||
          {},

        stats: {
          ...(existing.stats || {}),
          ...(payload.stats || {}),
        },

        quests: {
          ...(existing.quests || {}),
          ...(payload.quests || {}),
        },

        achievements:
          payload.achievements ||
          existing.achievements,
      };
    },
    username
  );

  return {
    result,
    didSave,
    pulls:
      payload.finalPulls || null,
    availableTotal: Number(
      payload.availableTotal || 0
    ),
  };
}

function addDuplicateCardReward({
  player,
  reward,
  amount = 1,
  updatedCards,
  updatedFragments,
}) {
  const safeAmount = Math.max(
    1,
    Math.floor(Number(amount || 1))
  );

  const autoLevelResult =
    applyAutoLevelForDuplicate({
      cards: updatedCards,
      fragments: updatedFragments,
      autoLevel: player.autoLevel,
      pulledCard: reward,
      amount: safeAmount,
    });

  let nextCards = autoLevelResult.cards;
  let nextFragments = autoLevelResult.fragments;
  let duplicateNote = "";
  let convertedBerries = 0;
  let convertedCount = 0;
  let fragmentCount = 0;

  const levelGained = Math.max(
    0,
    Number(autoLevelResult.levelGained || 0)
  );

  const storedAmount = Math.max(
    0,
    Number(
      autoLevelResult.fragmentsStored || 0
    )
  );

  if (levelGained > 0) {
    duplicateNote =
      ` → Auto Level +${levelGained}`;

    if (storedAmount <= 0) {
      return {
        cards: nextCards,
        fragments: nextFragments,
        duplicateNote,
        convertedBerries,
        convertedCount,
        fragmentCount,
      };
    }
  }

  if (storedAmount > 0) {
    const fragmentsBeforeAutoSac =
      removeFragmentAmount(
        autoLevelResult.fragments,
        reward,
        storedAmount
      );

    const sacResult =
      addFragmentWithAutoSac(
        player,
        fragmentsBeforeAutoSac,
        reward,
        storedAmount
      );

    nextFragments = sacResult.fragments;

    const sacrificed = Math.max(
      0,
      Number(sacResult.sacrificed || 0)
    );

    const added = Math.max(
      0,
      Number(sacResult.added || 0)
    );

    if (sacrificed > 0) {
      convertedBerries += Number(
        sacResult.berries || 0
      );

      convertedCount += sacrificed;

      duplicateNote +=
        ` → ${sacResult.reason}` +
        ` (+${Number(
          sacResult.berries || 0
        ).toLocaleString("en-US")} berries)`;
    } else if (added > 0) {
      fragmentCount += added;

      duplicateNote +=
        ` → Duplicate (+${added} fragments)`;
    }
  }

  return {
    cards: nextCards,
    fragments: nextFragments,
    duplicateNote:
      duplicateNote ||
      ` → Duplicate x${safeAmount}`,
    convertedBerries,
    convertedCount,
    fragmentCount,
  };
}

function addDuplicateWeaponReward({
  player,
  reward,
  amount = 1,
  updatedFragments,
}) {
  const safeAmount = Math.max(
    1,
    Math.floor(Number(amount || 1))
  );

  const weaponFragment =
    buildWeaponFragmentPayload(reward);

  const sacResult =
    addFragmentWithAutoSac(
      player,
      updatedFragments,
      weaponFragment,
      safeAmount
    );

  let duplicateNote = "";
  let convertedBerries = 0;
  let convertedCount = 0;
  let fragmentCount = 0;

  const sacrificed = Math.max(
    0,
    Number(sacResult.sacrificed || 0)
  );

  const added = Math.max(
    0,
    Number(sacResult.added || 0)
  );

  if (sacrificed > 0) {
    convertedBerries += Number(
      sacResult.berries || 0
    );

    convertedCount += sacrificed;

    duplicateNote =
      ` → ${sacResult.reason}` +
      ` (+${Number(
        sacResult.berries || 0
      ).toLocaleString("en-US")} berries)`;
  } else {
    fragmentCount += added;

    duplicateNote =
      ` → Duplicate (+${added || safeAmount} ` +
      `${reward.name} Fragments)`;
  }

  return {
    fragments: sacResult.fragments,
    duplicateNote,
    convertedBerries,
    convertedCount,
    fragmentCount,
  };
}

for (const contentType of [
  "battleCard",
  "boostCard",
  "weapon",
  "devilFruit",
]) {
  getCachedRewardPool(contentType);
}

module.exports = {
  name: "pa",
  aliases: ["pullall"],

  async execute(message, args = []) {
    const userId = String(message.author.id);
    const username =
      message.author.username || "Unknown";

    if (PULL_COMMAND_LOCKS.has(userId)) {
      return message.reply({
        content:
          "Your previous Pull All is still being processed.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    PULL_COMMAND_LOCKS.add(userId);

    try {
      const useManualResetAfterPull =
        String(args[0] || "")
          .toLowerCase()
          .trim() === "reset";

      /*
        Begin Discord premium validation immediately,
        while all local player calculations continue.
      */
      const premiumPromise =
        isPremiumUser(message);

      const player =
        getPlayer(userId, username);

      player.id = userId;
      player.userId = userId;

      player.pullAccessSnapshot = {
        ...(player.pullAccessSnapshot || {}),
        patreon: true,
        vivreCard: false,
      };

      const resetState =
        applyGlobalPullReset(player);

      if (resetState?.wasReset) {
        player.pulls = resetState.pulls;
      }

      const snapshot =
        buildPullAccessSnapshot(
          player,
          message
        );

      snapshot.patreon = true;
      snapshot.vivreCard = false;

      player.pullAccessSnapshot = snapshot;

      const slotStatus =
        getPullSlotStatus(
          player,
          message
        );

      const availableTotal =
        Object.values(slotStatus)
          .filter((slot) => slot?.enabled)
          .reduce((total, slot) => {
            const max = Math.max(
              0,
              Math.floor(
                Number(slot?.max || 0)
              )
            );

            const used = Math.min(
              max,
              Math.max(
                0,
                Math.floor(
                  Number(slot?.used || 0)
                )
              )
            );

            return total +
              Math.max(0, max - used);
          }, 0);

      const premiumAccess =
        await premiumPromise;

      if (!premiumAccess) {
        return message.reply({
          content:
            `Only ${PREMIUM_ROLE_NAME} users ` +
            "can use `op pa`.",
          allowedMentions: {
            repliedUser: false,
          },
        });
      }

      if (availableTotal <= 0) {
        return message.reply({
          content:
            "You do not have any available pulls right now.",
          allowedMentions: {
            repliedUser: false,
          },
        });
      }
      
      const pullingMessage = await message.reply({
        content: `Pulling all available slots... (${availableTotal} pull${
          availableTotal === 1 ? "" : "s"
        })`,
        allowedMentions: {
          repliedUser: false,
        },
      });

      const pirateLuckBoost =
        getPirateLuckBoost(userId);

      const luckyWeekMultiplier =
        getLuckyWeekPullMultiplier();

      let pityCounter =
        getSharedPity(player);

      /*
        Phase 1:
        Roll only. Do not touch the large player
        inventories inside this loop.
      */
      const rolledRewards = [];

      for (
        let index = 0;
        index < availableTotal;
        index += 1
      ) {
        pityCounter += 1;

        const triggeredPity =
          pityCounter >= PREMIUM_PITY_TARGET;

        let contentType =
          getContentType(
            luckyWeekMultiplier
          );

        if (triggeredPity) {
          contentType =
            Math.random() < 0.5
              ? "battleCard"
              : "boostCard";
        }

        const rarity =
          getPremiumRewardTier(
            contentType,
            triggeredPity,
            pirateLuckBoost,
            luckyWeekMultiplier
          );

        const reward =
          contentType === "ticket"
            ? pickWeightedTicket()
            : pickRandomByRarityCached(
                contentType,
                rarity
              );

        if (reward) {
          rolledRewards.push({
            contentType,
            rarity: String(
              reward.baseTier ||
                reward.rarity ||
                rarity ||
                "C"
            ).toUpperCase(),
            reward,
            triggeredPity,
          });
        }

        if (triggeredPity) {
          pityCounter = 0;
        }

        /*
          This is not a timer delay.
          It releases Discord's message event loop after
          each roll, so op bal/op reset can run immediately.
        */
        await new Promise((resolve) => {
          setImmediate(resolve);
        });
      }

      /*
        Group identical results first.
        Ten duplicate copies of one card are now processed
        once with amount 10, instead of scanning inventory
        ten separate times.
      */
      const groupedRewardMap =
        new Map();

      for (const rolled of rolledRewards) {
        const rewardCode =
          normalizePaCode(
            rolled.reward?.code ||
              rolled.reward?.name
          );

        const groupKey = [
          rolled.contentType,
          rewardCode,
          rolled.rarity,
          rolled.triggeredPity
            ? "pity"
            : "normal",
        ].join(":");

        const current =
          groupedRewardMap.get(groupKey);

        if (current) {
          current.amount += 1;
        } else {
          groupedRewardMap.set(
            groupKey,
            {
              ...rolled,
              amount: 1,
            }
          );
        }
      }

      let updatedCards = [
        ...(player.cards || []),
      ];

      let updatedWeapons = [
        ...(player.weapons || []),
      ];

      let updatedDevilFruits = [
        ...(player.devilFruits || []),
      ];

      let updatedFragments = [
        ...(player.fragments || []),
      ];

      let updatedTickets = [
        ...(player.tickets || []),
      ];

      let convertedBerries = 0;
      let convertedCount = 0;
      let cardsPulledThisRun = 0;

      const ownedCardCodes =
        buildOwnedCardCodeSet(
          updatedCards
        );

      const ownedWeaponCodes =
        buildOwnedWeaponCodeSet(
          player,
          updatedWeapons
        );

      const pullGroups = {
        cards: [],
        weapons: [],
        devilFruits: [],
        tickets: [],
      };

      /*
        Phase 2:
        Apply each unique grouped reward once.
      */
      for (
        const grouped of
        groupedRewardMap.values()
      ) {
        const {
          contentType,
          reward,
          rarity,
          triggeredPity,
          amount,
        } = grouped;

        const rewardCode =
          normalizePaCode(
            reward?.code ||
              reward?.name
          );

        const rewardName =
          reward.displayName ||
          reward.name ||
          "Unknown";

        const pityLabel =
          triggeredPity
            ? " [PITY]"
            : "";

        let duplicateNote = "";

        if (
          contentType === "battleCard" ||
          contentType === "boostCard"
        ) {
          cardsPulledThisRun += amount;

          const alreadyOwned =
            ownedCardCodes.has(
              rewardCode
            );

          if (!alreadyOwned) {
            updatedCards.push(
              createOwnedCardLocal(
                reward
              )
            );

            ownedCardCodes.add(
              rewardCode
            );
          }

          const duplicateAmount =
            alreadyOwned
              ? amount
              : Math.max(0, amount - 1);

          if (duplicateAmount > 0) {
            const duplicateResult =
              addDuplicateCardReward({
                player,
                reward,
                amount:
                  duplicateAmount,
                updatedCards,
                updatedFragments,
              });

            updatedCards =
              duplicateResult.cards;

            updatedFragments =
              duplicateResult.fragments;

            duplicateNote =
              duplicateResult.duplicateNote;

            convertedBerries +=
              duplicateResult.convertedBerries;

            convertedCount +=
              duplicateResult.convertedCount;
          }

          pullGroups.cards.push(
            `${pullGroups.cards.length + 1}. ` +
            `[${rarity}] ${rewardName}` +
            `${amount > 1 ? ` x${amount}` : ""}` +
            `${pityLabel}${duplicateNote}`
          );
        } else if (
          contentType === "weapon"
        ) {
          const alreadyOwned =
            ownedWeaponCodes.has(
              rewardCode
            );

          if (!alreadyOwned) {
            updatedWeapons =
              addNamedItem(
                updatedWeapons,
                reward
              );

            ownedWeaponCodes.add(
              rewardCode
            );
          }

          const duplicateAmount =
            alreadyOwned
              ? amount
              : Math.max(0, amount - 1);

          if (duplicateAmount > 0) {
            const duplicateResult =
              addDuplicateWeaponReward({
                player,
                reward,
                amount:
                  duplicateAmount,
                updatedFragments,
              });

            updatedFragments =
              duplicateResult.fragments;

            duplicateNote =
              duplicateResult.duplicateNote;

            convertedBerries +=
              duplicateResult.convertedBerries;

            convertedCount +=
              duplicateResult.convertedCount;
          }

          pullGroups.weapons.push(
            `${pullGroups.weapons.length + 1}. ` +
            `[${rarity}] ${rewardName}` +
            `${amount > 1 ? ` x${amount}` : ""}` +
            `${pityLabel}${duplicateNote}`
          );
        } else if (
          contentType === "devilFruit"
        ) {
          for (
            let count = 0;
            count < amount;
            count += 1
          ) {
            updatedDevilFruits =
              addDevilFruitItem(
                updatedDevilFruits,
                reward
              );
          }

          pullGroups.devilFruits.push(
            `${pullGroups.devilFruits.length + 1}. ` +
            `[${rarity}] ${rewardName}` +
            `${amount > 1 ? ` x${amount}` : ""}` +
            pityLabel
          );
        } else {
          for (
            let count = 0;
            count < amount;
            count += 1
          ) {
            updatedTickets =
              addTicket(
                updatedTickets,
                reward
              );
          }

          pullGroups.tickets.push(
            `${pullGroups.tickets.length + 1}. ` +
            `[${rarity}] ${rewardName}` +
            `${amount > 1 ? ` x${amount}` : ""}` +
            pityLabel
          );
        }

        /*
          Allow command messages between unique groups.
          Normally there are only a few unique groups.
        */
        await new Promise((resolve) => {
          setImmediate(resolve);
        });
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
        const resetTicketCode =
          "pull_reset_ticket";

        const ticketIndex =
          updatedTickets.findIndex(
            (ticket) =>
              normalizePaCode(
                ticket?.code
              ) === resetTicketCode
          );

        if (
          ticketIndex === -1 ||
          Number(
            updatedTickets[ticketIndex]
              ?.amount || 0
          ) <= 0
        ) {
          resetFailedReason =
            "You do not have Pull Reset Ticket left, " +
            "so pull reset was not applied.";
        } else {
          updatedTickets[ticketIndex] = {
            ...updatedTickets[
              ticketIndex
            ],
            amount:
              Number(
                updatedTickets[
                  ticketIndex
                ].amount || 0
              ) - 1,
          };

          if (
            updatedTickets[ticketIndex]
              .amount <= 0
          ) {
            updatedTickets.splice(
              ticketIndex,
              1
            );
          }

          resetTicketUsed = true;
        }
      }

      const pullPlanPlayer =
        clonePullPlanPlayer(player);

      let finalPulls =
        consumeAllActivePullSlots(
          pullPlanPlayer,
          message
        );

      if (resetTicketUsed) {
        finalPulls =
          applyManualPullReset(
            finalPulls
          ).pulls;
      }

      const updatedDailyState =
        incrementQuestCounter(
          player,
          "pullsUsed",
          availableTotal
        );

      const fragmentStorageAudit =
        enforceFragmentStorageLimit(
          player,
          updatedFragments
        );

      if (
        fragmentStorageAudit
          .convertedCount > 0
      ) {
        updatedFragments =
          fragmentStorageAudit.fragments;

        convertedBerries +=
          fragmentStorageAudit
            .convertedBerries;

        convertedCount +=
          fragmentStorageAudit
            .convertedCount;
      }

      const saveResult =
        savePullAllResultFresh(
          userId,
          {
            cards: updatedCards,
            weapons: updatedWeapons,
            devilFruits:
              updatedDevilFruits,
            fragments:
              updatedFragments,
            tickets: updatedTickets,
            addBerries:
              convertedBerries,
            pity: updatedPity,
            pullAccessSnapshot:
              snapshot,
            finalPulls,
            availableTotal,

            stats: {
              ...(player.stats || {}),
              cardsPulled:
                Number(
                  player?.stats
                    ?.cardsPulled || 0
                ) +
                cardsPulledThisRun,
            },

            quests: {
              ...(player.quests || {}),
              dailyState:
                updatedDailyState,
            },

            achievements: bumpAchievement(
              player,
              "pullsUsed",
              availableTotal
            ),
          },
          username
        );

      if (!saveResult.didSave) {
        return message.reply({
          content:
            "Pull All could not be saved. No pulls were consumed.",
          allowedMentions: {
            repliedUser: false,
          },
        });
      }

      const groupedLines = [];
      const luckyWeekLine =
        getLuckyWeekBonusLine();

      if (luckyWeekLine) {
        groupedLines.push(
          luckyWeekLine,
          ""
        );
      }

      if (pullGroups.cards.length) {
        groupedLines.push(
          "## Cards",
          ...pullGroups.cards,
          ""
        );
      }

      if (pullGroups.weapons.length) {
        groupedLines.push(
          "## Weapons",
          ...pullGroups.weapons,
          ""
        );
      }

      if (
        pullGroups.devilFruits.length
      ) {
        groupedLines.push(
          "## Devil Fruits",
          ...pullGroups.devilFruits,
          ""
        );
      }

      if (pullGroups.tickets.length) {
        groupedLines.push(
          "## Tickets",
          ...pullGroups.tickets
        );
      }

      if (convertedCount > 0) {
        groupedLines.push(
          "",
          "## Auto Convert",
          `${convertedCount} reward(s) converted into ` +
          `**${convertedBerries.toLocaleString(
            "en-US"
          )} berries**.`
        );
      }

      if (useManualResetAfterPull) {
        groupedLines.push(
          "",
          "## Reset",
          resetTicketUsed
            ? "Pull Reset Ticket x1 used."
            : resetFailedReason,
          resetTicketUsed
            ? "Pull slots have been reset after Pull All."
            : "Pull All rewards were still saved."
        );
      }

      const chunks = [];

      for (
        let index = 0;
        index < groupedLines.length;
        index += 25
      ) {
        chunks.push(
          groupedLines
            .slice(index, index + 25)
            .join("\n")
        );
      }

      const embeds = (
        chunks.length
          ? chunks
          : ["No rewards rolled."]
      )
        .slice(0, 10)
        .map((chunk, index, list) =>
          new EmbedBuilder()
            .setColor(0x8e44ad)
            .setTitle(
              list.length > 1
                ? `Pull Results ${index + 1}/${list.length}`
                : "Pull Results"
            )
            .setDescription(chunk)
            .setFooter({
              text:
                "One Piece Bot • Pull All • " +
                `Pity ${updatedPity.pullPity}/` +
                PREMIUM_PITY_TARGET,
            })
        );

      return pullingMessage.edit({
        content: "",
        embeds,
        allowedMentions: {
          repliedUser: false,
        },
      });
    } finally {
      PULL_COMMAND_LOCKS.delete(
        userId
      );
    }
  },
};