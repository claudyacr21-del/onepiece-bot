const devilFruits = require("../data/devilFruits");
const { hydrateCard, findCardTemplate, getBoostStageValue } = require("./evolution");

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function normalizeBoostType(value) {
  const type = normalize(value);

  if (type === "attack") return "atk";
  if (type === "health") return "hp";
  if (type === "speed") return "spd";
  if (type === "pullchance" || type === "pull_chance") return "pullChance";
  if (type === "fragmentstorage" || type === "fragment_storage") return "fragmentStorage";

  return type;
}

function getOwnedCards(player) {
  return Array.isArray(player?.cards) ? player.cards : [];
}

function mergeBoostWithTemplate(rawCard) {
  const template = findCardTemplate(rawCard.code || rawCard.name || "");
  const merged = template
    ? {
        ...template,
        instanceId: rawCard.instanceId,
        ownerId: rawCard.ownerId,
        level: rawCard.level,
        xp: rawCard.xp,
        kills: rawCard.kills,
        fragments: rawCard.fragments,
        evolutionStage: rawCard.evolutionStage,
        evolutionKey: rawCard.evolutionKey,
        currentTier: rawCard.currentTier || template.currentTier,
        rarity: rawCard.rarity || template.rarity,
        equippedDevilFruit: rawCard.equippedDevilFruit || null,
        equippedDevilFruitName: rawCard.equippedDevilFruitName || null,
        equippedDevilFruitCode: rawCard.equippedDevilFruitCode || null,
        cardRole: rawCard.cardRole || template.cardRole,
      }
    : rawCard;

  return hydrateCard(merged);
}

function getBoostCards(player) {
  return getOwnedCards(player)
    .map(mergeBoostWithTemplate)
    .filter((card) => String(card?.cardRole || "").toLowerCase() === "boost");
}

function findBoostFruitByCode(code) {
  if (!code) return null;
  const q = normalize(code);

  return (
    devilFruits.find((fruit) => normalize(fruit.code) === q) ||
    devilFruits.find((fruit) => normalize(fruit.name) === q) ||
    null
  );
}

function getFruitBonusForBoostCard(card) {
  if (!card || card.cardRole !== "boost" || !card.equippedDevilFruit) return 0;

  const fruit =
    findBoostFruitByCode(card.equippedDevilFruit) ||
    findBoostFruitByCode(card.equippedDevilFruitCode) ||
    findBoostFruitByCode(card.equippedDevilFruitName);

  if (!fruit || !fruit.boostBonus) return 0;

  const boostType = normalizeBoostType(card.boostType);
  return Number(fruit.boostBonus[boostType] || 0);
}

function getEffectiveBoostValue(card) {
  const stage = Number(card?.evolutionStage || 1);
  return Number(getBoostStageValue(card, stage) || 0) + getFruitBonusForBoostCard(card);
}

function getUniqueBoostCards(player) {
  const boostCards = getBoostCards(player);
  const seen = new Map();

  for (const card of boostCards) {
    const key = `${String(card.code || "").toLowerCase()}_${normalizeBoostType(card.boostType)}`;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, card);
      continue;
    }

    const existingValue = getEffectiveBoostValue(existing);
    const currentValue = getEffectiveBoostValue(card);

    if (currentValue > existingValue) {
      seen.set(key, card);
    }
  }

  return Array.from(seen.values());
}

function getHighestBoost(cards, boostType) {
  const normalizedType = normalizeBoostType(boostType);
  const filtered = cards.filter((card) => normalizeBoostType(card.boostType) === normalizedType);

  if (!filtered.length) return null;

  return filtered.reduce((best, current) => {
    const bestValue = getEffectiveBoostValue(best);
    const currentValue = getEffectiveBoostValue(current);
    return currentValue > bestValue ? current : best;
  }, filtered[0]);
}

function sumBoost(cards, boostType) {
  const normalizedType = normalizeBoostType(boostType);

  return cards
    .filter((card) => normalizeBoostType(card.boostType) === normalizedType)
    .reduce((total, card) => total + getEffectiveBoostValue(card), 0);
}

function getFragmentStorageBonus(player) {
  const boostCards = getUniqueBoostCards(player);
  const total = boostCards
    .filter((card) => normalizeBoostType(card.boostType) === "fragmentStorage")
    .reduce((sum, card) => sum + getEffectiveBoostValue(card), 0);

  return Math.min(total, 250);
}

function getPassiveBoostSummary(player) {
  const boostCards = getUniqueBoostCards(player);
  const highestPullChance = getHighestBoost(boostCards, "pullChance");
  const highestDaily = getHighestBoost(boostCards, "daily");

  return {
    boostCards: boostCards.map((card) => ({
      ...card,
      boostType: normalizeBoostType(card.boostType),
      fruitBonus: getFruitBonusForBoostCard(card),
      effectiveBoostValue: getEffectiveBoostValue(card),
      equippedFruitData:
        findBoostFruitByCode(card.equippedDevilFruit) ||
        findBoostFruitByCode(card.equippedDevilFruitCode) ||
        findBoostFruitByCode(card.equippedDevilFruitName),
    })),

    pullChance: highestPullChance ? getEffectiveBoostValue(highestPullChance) : 0,
    pullChanceCard: highestPullChance || null,

    daily: highestDaily ? getEffectiveBoostValue(highestDaily) : 0,
    dailyCard: highestDaily || null,

    atk: sumBoost(boostCards, "atk"),
    hp: sumBoost(boostCards, "hp"),
    spd: sumBoost(boostCards, "spd"),
    exp: sumBoost(boostCards, "exp"),
    dmg: sumBoost(boostCards, "dmg"),

    fragmentStorageBonus: getFragmentStorageBonus(player),
  };
}

module.exports = {
  getBoostCards,
  getUniqueBoostCards,
  getPassiveBoostSummary,
  getFragmentStorageBonus,
  getFruitBonusForBoostCard,
  getEffectiveBoostValue,
  findBoostFruitByCode,
};