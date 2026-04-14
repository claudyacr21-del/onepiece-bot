const devilFruits = require("../data/devilFruits");

function getOwnedCards(player) {
  return Array.isArray(player?.cards) ? player.cards : [];
}

function getBoostCards(player) {
  return getOwnedCards(player).filter((card) => card.cardRole === "boost");
}

function findBoostFruitByCode(code) {
  if (!code) return null;
  return devilFruits.find((fruit) => fruit.code === code) || null;
}

function getFruitBonusForBoostCard(card) {
  if (!card || card.cardRole !== "boost" || !card.equippedDevilFruit) {
    return 0;
  }

  const fruit = findBoostFruitByCode(card.equippedDevilFruit);
  if (!fruit || !fruit.boostBonus) return 0;

  return Number(fruit.boostBonus[card.boostType] || 0);
}

function getEffectiveBoostValue(card) {
  return Number(card?.boostValue || 0) + getFruitBonusForBoostCard(card);
}

function getUniqueBoostCards(player) {
  const boostCards = getBoostCards(player);
  const seen = new Map();

  for (const card of boostCards) {
    const existing = seen.get(card.code);

    if (!existing) {
      seen.set(card.code, card);
      continue;
    }

    const existingValue = getEffectiveBoostValue(existing);
    const currentValue = getEffectiveBoostValue(card);

    if (currentValue > existingValue) {
      seen.set(card.code, card);
    }
  }

  return Array.from(seen.values());
}

function getHighestBoost(cards, boostType) {
  const filtered = cards.filter((card) => card.boostType === boostType);
  if (!filtered.length) return null;

  return filtered.reduce((best, current) => {
    const bestValue = getEffectiveBoostValue(best);
    const currentValue = getEffectiveBoostValue(current);
    return currentValue > bestValue ? current : best;
  }, filtered[0]);
}

function sumBoost(cards, boostType) {
  return cards
    .filter((card) => card.boostType === boostType)
    .reduce((total, card) => total + getEffectiveBoostValue(card), 0);
}

function getFragmentStorageBonus(player) {
  const boostCards = getUniqueBoostCards(player);
  const storageCards = boostCards.filter((card) => card.boostType === "fragmentStorage");
  const total = storageCards.reduce((sum, card) => sum + getEffectiveBoostValue(card), 0);
  return Math.min(total, 250);
}

function getPassiveBoostSummary(player) {
  const boostCards = getUniqueBoostCards(player);

  const highestPullChance = getHighestBoost(boostCards, "pullChance");
  const highestDaily = getHighestBoost(boostCards, "daily");

  return {
    boostCards: boostCards.map((card) => ({
      ...card,
      fruitBonus: getFruitBonusForBoostCard(card),
      effectiveBoostValue: getEffectiveBoostValue(card),
      equippedFruitData: findBoostFruitByCode(card.equippedDevilFruit)
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
    fragmentStorageBonus: getFragmentStorageBonus(player)
  };
}

module.exports = {
  getBoostCards,
  getUniqueBoostCards,
  getPassiveBoostSummary,
  getFragmentStorageBonus,
  getFruitBonusForBoostCard,
  getEffectiveBoostValue,
  findBoostFruitByCode
};