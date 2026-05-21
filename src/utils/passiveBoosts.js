const cards = require("../data/cards");
const devilFruits = require("../data/devilFruits");
const { hydrateCard, findCardTemplate, getBoostStageValue } = require("./evolution");

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]+/g, "");
}

function normalizeBoostType(value) {
  const type = normalize(value);

  if (
    type === "attack" ||
    type === "atk" ||
    type === "atkboost" ||
    type === "attackboost" ||
    type === "teamatk" ||
    type === "teamattack" ||
    type === "atkbuff" ||
    type === "attackbuff"
  ) {
    return "atk";
  }

  if (
    type === "health" ||
    type === "hp" ||
    type === "hpboost" ||
    type === "healthboost" ||
    type === "teamhp" ||
    type === "teammhealth" ||
    type === "hpbuff" ||
    type === "healthbuff"
  ) {
    return "hp";
  }

  if (
    type === "speed" ||
    type === "spd" ||
    type === "spdboost" ||
    type === "speedboost" ||
    type === "teamspd" ||
    type === "teamspeed" ||
    type === "spdbuff" ||
    type === "speedbuff"
  ) {
    return "spd";
  }

  if (
    type === "damage" ||
    type === "dmg" ||
    type === "dmgboost" ||
    type === "damageboost" ||
    type === "teamdmg" ||
    type === "teamdamage"
  ) {
    return "dmg";
  }

  if (
    type === "experience" ||
    type === "exp" ||
    type === "expboost" ||
    type === "experienceboost"
  ) {
    return "exp";
  }

  if (
    type === "daily" ||
    type === "dailyboost" ||
    type === "dailyreward" ||
    type === "dailyrewardboost"
  ) {
    return "daily";
  }

  if (
    type === "pullchance" ||
    type === "pullboost" ||
    type === "pullrate" ||
    type === "pitydrop"
  ) {
    return "pullChance";
  }

  if (
    type === "fragmentstorage" ||
    type === "fragmentstorageboost" ||
    type === "fragstorage" ||
    type === "storage"
  ) {
    return "fragmentStorage";
  }

  return type;
}

function findBoostTemplate(rawCard) {
  const code = normalize(rawCard?.code);
  const name = normalize(rawCard?.displayName || rawCard?.name);

  const byExactBoostCode = cards.find(
    (card) =>
      normalize(card?.code) === code &&
      String(card?.cardRole || "").toLowerCase() === "boost"
  );

  if (byExactBoostCode) return byExactBoostCode;

  const byExactBoostName = cards.find(
    (card) =>
      name &&
      normalize(card?.displayName || card?.name) === name &&
      String(card?.cardRole || "").toLowerCase() === "boost"
  );

  if (byExactBoostName) return byExactBoostName;

  const byBoostIncludes = cards.find((card) => {
    if (String(card?.cardRole || "").toLowerCase() !== "boost") return false;

    const fields = [card?.code, card?.displayName, card?.name]
      .map(normalize)
      .filter(Boolean);

    return fields.some(
      (field) =>
        (code && (field === code || field.includes(code) || code.includes(field))) ||
        (name && (field === name || field.includes(name) || name.includes(field)))
    );
  });

  if (byBoostIncludes) return byBoostIncludes;

  return findCardTemplate(rawCard?.code || rawCard?.displayName || rawCard?.name || "");
}

function getCardStage(card) {
  const direct = Number(card?.evolutionStage || 0);
  if (Number.isFinite(direct) && direct >= 1) {
    return Math.max(1, Math.min(3, Math.floor(direct)));
  }

  const keyMatch = String(card?.evolutionKey || "").match(/M([123])/i);
  if (keyMatch) {
    return Math.max(1, Math.min(3, Number(keyMatch[1])));
  }

  return 1;
}

function mergeBoostWithTemplate(rawCard) {
  const template = findBoostTemplate(rawCard);
  const stage = getCardStage(rawCard);
  const stageKey = `M${stage}`;

  const merged = template
    ? {
        ...template,

        instanceId: rawCard.instanceId,
        ownerId: rawCard.ownerId,

        level: rawCard.level,
        xp: rawCard.xp,
        exp: rawCard.exp,
        kills: rawCard.kills,
        fragments: rawCard.fragments,

        evolutionStage: stage,
        evolutionKey: stageKey,

        currentTier: rawCard.currentTier || template.currentTier || template.rarity,
        rarity: rawCard.rarity || rawCard.currentTier || template.currentTier || template.rarity,

        equippedDevilFruit: rawCard.equippedDevilFruit || null,
        equippedDevilFruitName: rawCard.equippedDevilFruitName || null,
        equippedDevilFruitCode: rawCard.equippedDevilFruitCode || null,

        cardRole: "boost",

        // Canonical boost data must come from the boost template, not old owned card cache.
        boostType: template.boostType || rawCard.boostType,
        boostValue: template.boostValue ?? rawCard.boostValue,
        boostValues: template.boostValues || rawCard.boostValues,
        stageBoostValues: template.stageBoostValues || rawCard.stageBoostValues,
        boostMultipliers: template.boostMultipliers || rawCard.boostMultipliers,
        stageBoostMultipliers: template.stageBoostMultipliers || rawCard.stageBoostMultipliers,
        boostStageMultipliers: template.boostStageMultipliers || rawCard.boostStageMultipliers,
        boostTarget: template.boostTarget || rawCard.boostTarget,
        boostDescription: template.boostDescription || rawCard.boostDescription,
      }
    : {
        ...rawCard,
        evolutionStage: stage,
        evolutionKey: stageKey,
      };

  return hydrateCard(merged);
}

function getBoostCards(player) {
  return (Array.isArray(player?.cards) ? player.cards : [])
    .map(mergeBoostWithTemplate)
    .filter((card) => String(card?.cardRole || "").toLowerCase() === "boost");
}

function findBoostFruitByCode(value) {
  const q = normalize(value);
  if (!q) return null;

  return (
    devilFruits.find((fruit) => normalize(fruit.code) === q) ||
    devilFruits.find((fruit) => normalize(fruit.name) === q) ||
    null
  );
}

function isBaccaratBoostCard(card) {
  const values = [
    card?.code,
    card?.name,
    card?.displayName,
    card?.title,
  ]
    .map(normalize)
    .filter(Boolean);

  return values.some((value) => value.includes("baccarat"));
}

function getFruitDataForBoostCard(card) {
  return (
    findBoostFruitByCode(card?.equippedDevilFruit) ||
    findBoostFruitByCode(card?.equippedDevilFruitCode) ||
    findBoostFruitByCode(card?.equippedDevilFruitName) ||
    null
  );
}

function getBoostFruitGlobalBonus(card) {
  if (!card || String(card.cardRole || "").toLowerCase() !== "boost") {
    return {
      atk: 0,
      hp: 0,
      spd: 0,
      dmg: 0,
      exp: 0,
      daily: 0,
      pullChance: 0,
      fragmentStorageBonus: 0,
    };
  }

  // Baccarat is excluded from devil fruit global conversion.
  if (isBaccaratBoostCard(card)) {
    return {
      atk: 0,
      hp: 0,
      spd: 0,
      dmg: 0,
      exp: 0,
      daily: 0,
      pullChance: 0,
      fragmentStorageBonus: 0,
    };
  }

  const fruit = getFruitDataForBoostCard(card);
  if (!fruit) {
    return {
      atk: 0,
      hp: 0,
      spd: 0,
      dmg: 0,
      exp: 0,
      daily: 0,
      pullChance: 0,
      fragmentStorageBonus: 0,
    };
  }

  const statPercent = fruit.statPercent || {};
  const amount = getBoostAmount(card);

  return {
    atk: Number(statPercent.atk || 0) * amount,
    hp: Number(statPercent.hp || 0) * amount,
    spd: Number(statPercent.speed || statPercent.spd || 0) * amount,
    dmg: Number(statPercent.dmg || 0) * amount,
    exp: Number(statPercent.exp || 0) * amount,
    daily: 0,
    pullChance: 0,
    fragmentStorageBonus: 0,
  };
}

function sumBoostFruitGlobalBonuses(cards) {
  return cards.reduce(
    (total, card) => {
      const bonus = getBoostFruitGlobalBonus(card);

      total.atk += Number(bonus.atk || 0);
      total.hp += Number(bonus.hp || 0);
      total.spd += Number(bonus.spd || 0);
      total.dmg += Number(bonus.dmg || 0);
      total.exp += Number(bonus.exp || 0);
      total.daily += Number(bonus.daily || 0);
      total.pullChance += Number(bonus.pullChance || 0);
      total.fragmentStorageBonus += Number(bonus.fragmentStorageBonus || 0);

      return total;
    },
    {
      atk: 0,
      hp: 0,
      spd: 0,
      dmg: 0,
      exp: 0,
      daily: 0,
      pullChance: 0,
      fragmentStorageBonus: 0,
    }
  );
}

function getFruitBonusForBoostCard(card) {
  if (!card || String(card.cardRole || "").toLowerCase() !== "boost") return 0;

  const fruit = getFruitDataForBoostCard(card);
  if (!fruit) return 0;

  const boostType = normalizeBoostType(card.boostType);

  // Custom boostBonus tetap berlaku ke boost card effect.
  // statPercent tidak lagi dipakai sebagai bonus boostType langsung,
  // karena statPercent sekarang dikonversi jadi global boost.
  if (fruit.boostBonus && fruit.boostBonus[boostType] != null) {
    return Number(fruit.boostBonus[boostType] || 0);
  }

  return 0;
}

function getEffectiveBoostValue(card) {
  const stage = getCardStage(card);
  const template = findBoostTemplate(card);

  const canonicalCard = template
    ? {
        ...template,
        evolutionStage: stage,
        evolutionKey: `M${stage}`,
        equippedDevilFruit: card?.equippedDevilFruit || null,
        equippedDevilFruitName: card?.equippedDevilFruitName || null,
        equippedDevilFruitCode: card?.equippedDevilFruitCode || null,
      }
    : card;

  return Number(getBoostStageValue(canonicalCard, stage) || 0) + getFruitBonusForBoostCard(card);
}

function getUniqueBoostCards(player) {
  const boostCards = getBoostCards(player);
  const seen = new Map();

  for (const card of boostCards) {
    const key = `${String(card.code || "").toLowerCase()}_${normalizeBoostType(card.boostType)}`;
    const existing = seen.get(key);

    if (!existing || getEffectiveBoostValue(card) > getEffectiveBoostValue(existing)) {
      seen.set(key, card);
    }
  }

  return [...seen.values()];
}

function getHighestBoost(cards, boostType) {
  const type = normalizeBoostType(boostType);
  const filtered = cards.filter((card) => normalizeBoostType(card.boostType) === type);
  if (!filtered.length) return null;

  return filtered.reduce((best, card) =>
    getEffectiveBoostValue(card) > getEffectiveBoostValue(best) ? card : best
  );
}

function getBoostAmount(card) {
  const rawAmount =
    card?.amount ??
    card?.count ??
    card?.qty ??
    card?.quantity ??
    card?.copies ??
    1;

  const amount = Math.floor(Number(rawAmount || 1));
  return Number.isFinite(amount) && amount > 0 ? amount : 1;
}

function sumBoost(cards, boostType) {
  const type = normalizeBoostType(boostType);

  return cards
    .filter((card) => normalizeBoostType(card.boostType) === type)
    .reduce((sum, card) => {
      const value = getEffectiveBoostValue(card);
      const amount = getBoostAmount(card);
      return sum + value * amount;
    }, 0);
}

function getFragmentStorageBonus(player) {
  const boostCards = getBoostCards(player);

  const total = boostCards
    .filter((card) => normalizeBoostType(card.boostType) === "fragmentStorage")
    .reduce((sum, card) => {
      const value = getEffectiveBoostValue(card);
      const amount = getBoostAmount(card);
      return sum + value * amount;
    }, 0);

  return Math.max(0, total);
}

function formatBoostValue(value, suffix = "") {
  const number = Number(value || 0);
  return number > 0 ? `+${number}${suffix}` : "None";
}

function buildBoostEffectLines(boosts = {}) {
  return [
    `↪ ATK Boost: ${formatBoostValue(boosts.atk, "%")}`,
    `↪ HP Boost: ${formatBoostValue(boosts.hp, "%")}`,
    `↪ SPD Boost: ${formatBoostValue(boosts.spd, "%")}`,
    `↪ EXP Boost: ${formatBoostValue(boosts.exp, "%")}`,
    `↪ DMG Boost: ${formatBoostValue(boosts.dmg, "%")}`,
    `↪ Daily Reward Boost: ${formatBoostValue(boosts.daily)}`,
    `↪ Fragment Storage Bonus: ${formatBoostValue(boosts.fragmentStorageBonus)}`,
  ];
}

function getPassiveBoostSummary(player) {
  const boostCards = getBoostCards(player);
  const uniqueBoostCards = getUniqueBoostCards(player);
  const highestPullChance = getHighestBoost(boostCards, "pullChance");
  const dailyCards = boostCards.filter(
    (card) => normalizeBoostType(card.boostType) === "daily"
  );
  const fruitGlobalBoosts = sumBoostFruitGlobalBonuses(boostCards);

  return {
    boostCards: boostCards.map((card) => ({
      ...card,
      boostType: normalizeBoostType(card.boostType),
      boostAmount: getBoostAmount(card),
      fruitBonus: getFruitBonusForBoostCard(card),
      fruitGlobalBonus: getBoostFruitGlobalBonus(card),
      effectiveBoostValue: getEffectiveBoostValue(card),
      totalBoostValue: getEffectiveBoostValue(card) * getBoostAmount(card),
      equippedFruitData: getFruitDataForBoostCard(card),
    })),

    uniqueBoostCards: uniqueBoostCards.map((card) => ({
      ...card,
      boostType: normalizeBoostType(card.boostType),
      boostAmount: getBoostAmount(card),
      fruitBonus: getFruitBonusForBoostCard(card),
      fruitGlobalBonus: getBoostFruitGlobalBonus(card),
      effectiveBoostValue: getEffectiveBoostValue(card),
      totalBoostValue: getEffectiveBoostValue(card) * getBoostAmount(card),
      equippedFruitData: getFruitDataForBoostCard(card),
    })),

    pullChance: highestPullChance ? getEffectiveBoostValue(highestPullChance) : 0,
    pullChanceCard: highestPullChance || null,

    daily: sumBoost(boostCards, "daily"),
    dailyCards,
    dailyCard: dailyCards.length ? dailyCards[0] : null,

    fruitGlobalBoosts,

    atk: sumBoost(boostCards, "atk") + Number(fruitGlobalBoosts.atk || 0),
    hp: sumBoost(boostCards, "hp") + Number(fruitGlobalBoosts.hp || 0),
    spd: sumBoost(boostCards, "spd") + Number(fruitGlobalBoosts.spd || 0),
    exp: sumBoost(boostCards, "exp") + Number(fruitGlobalBoosts.exp || 0),
    dmg: sumBoost(boostCards, "dmg") + Number(fruitGlobalBoosts.dmg || 0),
    fragmentStorageBonus: Math.max(
      0,
      getFragmentStorageBonus(player) + Number(fruitGlobalBoosts.fragmentStorageBonus || 0)
    ),
  };
}

module.exports = {
  getBoostCards,
  getUniqueBoostCards,
  getPassiveBoostSummary,
  getFragmentStorageBonus,
  getFruitBonusForBoostCard,
  getBoostFruitGlobalBonus,
  sumBoostFruitGlobalBonuses,
  getFruitDataForBoostCard,
  getEffectiveBoostValue,
  findBoostFruitByCode,
  formatBoostValue,
  buildBoostEffectLines,
  getBoostAmount,
};