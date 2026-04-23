const cards = require("../data/cards");
const weapons = require("../data/weapons");
const devilFruits = require("../data/devilFruits");
const { getCardImage, getRarityBadge } = require("../config/assetLinks");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function titleCaseWords(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeRequirementPair(card) {
  if (!card) return card;

  const next = clone(card);

  if (!next.awakenRequirements) {
    next.awakenRequirements = {
      M2: null,
      M3: null,
    };
  }

  return next;
}

function getBoostEffectText(card, stage = 1) {
  if (!card || card.cardRole !== "boost") return "";
  const boostType = String(card.boostType || "").toLowerCase();
  const target = card.boostTarget || "team";
  const stageValue = Number(card.boostValue || 0);
  const suffix = ["atk", "hp", "spd", "exp", "dmg"].includes(boostType) ? "%" : "";

  if (boostType === "fragmentstorage") {
    return `Increase ${target} fragment storage by ${stageValue}.`;
  }

  if (boostType === "pullchance") {
    return `Increase ${target} pull chance by ${stageValue}.`;
  }

  if (boostType === "daily") {
    return `Increase ${target} daily reward quality by ${stageValue} tier${stageValue > 1 ? "s" : ""}.`;
  }

  if (!boostType) return card.boostDescription || "";

  return `Increase ${target} ${boostType.toUpperCase()} by ${stageValue}${suffix}.`;
}

function getLuffySpecialPath(card) {
  if (!card) return null;
  if (String(card.code || "").toLowerCase() !== "luffy_straw_hat") return null;

  return {
    mults: {
      1: 1,
      2: 3.8,
      3: 4.745,
    },
    forms: [
      { name: "Base", tier: "A" },
      { name: "Gear 4", tier: "SS" },
      { name: "Gear 5", tier: "UR" },
    ],
  };
}

function getStageMultiplier(card, stage) {
  const special = getLuffySpecialPath(card);
  if (special) return special.mults[stage] || 1;
  if (stage === 1) return 1;
  if (stage === 2) return 3;
  return 3.8;
}

function findCardTemplate(query) {
  const q = normalize(query);
  return (
    cards.find((card) => {
      const fields = [
        card.code,
        card.name,
        card.displayName,
        card.title,
        card.variant,
      ]
        .filter(Boolean)
        .map(normalize);

      return fields.some(
        (field) => field === q || field.includes(q) || q.includes(field)
      );
    }) || null
  );
}

function findTemplateByCode(code) {
  const q = normalize(code);
  return safeArray(cards).find((card) => normalize(card.code) === q) || null;
}

function mergeOwnedCardWithTemplate(ownedCard) {
  if (!ownedCard) return null;

  const template = findTemplateByCode(ownedCard.code);
  if (!template) return clone(ownedCard);

  return {
    ...clone(template),

    instanceId: ownedCard.instanceId,
    ownerId: ownedCard.ownerId,

    level: ownedCard.level,
    xp: ownedCard.xp,
    kills: ownedCard.kills,
    fragments: ownedCard.fragments,

    evolutionStage: ownedCard.evolutionStage,
    evolutionKey: ownedCard.evolutionKey,
    currentTier: ownedCard.currentTier || template.currentTier,
    rarity: ownedCard.rarity || template.rarity,

    equippedWeapons: clone(ownedCard.equippedWeapons || []),
    equippedWeapon: ownedCard.equippedWeapon || null,
    equippedWeaponName: ownedCard.equippedWeaponName || null,
    equippedWeaponCode: ownedCard.equippedWeaponCode || null,
    equippedWeaponLevel: ownedCard.equippedWeaponLevel || 0,

    equippedDevilFruit: ownedCard.equippedDevilFruit || null,
    equippedDevilFruitName: ownedCard.equippedDevilFruitName || null,

    cardRole: ownedCard.cardRole || template.cardRole,
  };
}

function findByCodeOrName(list, value) {
  const q = normalize(value);
  if (!q) return null;

  return (
    list.find((item) => normalize(item.code) === q) ||
    list.find((item) => normalize(item.name) === q) ||
    list.find((item) => normalize(item.code).includes(q)) ||
    list.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

function resolveEquippedWeapons(card) {
  const equipped = [];

  if (Array.isArray(card?.equippedWeapons) && card.equippedWeapons.length) {
    for (const entry of card.equippedWeapons) {
      const found = findByCodeOrName(weapons, entry?.code || entry?.name) || null;
      if (!found) continue;

      equipped.push({
        ...found,
        upgradeLevel: Number(entry?.upgradeLevel || 0),
      });
    }
    return equipped;
  }

  if (card?.equippedWeapon && card.equippedWeapon !== "None") {
    const found = findByCodeOrName(weapons, card.equippedWeapon);
    if (found) {
      equipped.push({
        ...found,
        upgradeLevel: Number(card?.equippedWeaponLevel || 0),
      });
    }
  }

  return equipped;
}

function resolveEquippedFruit(card) {
  if (!card?.equippedDevilFruit || card.equippedDevilFruit === "None") return null;
  return findByCodeOrName(devilFruits, card.equippedDevilFruit);
}

function getWeaponBonusFromData(card) {
  const equipped = resolveEquippedWeapons(card);

  let atk = 0;
  let hp = 0;
  let speed = 0;

  for (const item of equipped) {
    const level = Math.max(0, Number(item.upgradeLevel || 0));
    atk += Number(item?.statBonus?.atk || 0) + level * 3;
    hp += Number(item?.statBonus?.hp || 0) + level * 8;
    speed += Number(item?.statBonus?.speed || 0) + level * 1;
  }

  return { atk, hp, speed, equipped };
}

function getFruitBonusFromData(card) {
  const fruit = resolveEquippedFruit(card);

  if (!fruit) {
    return {
      atk: 0,
      hp: 0,
      speed: 0,
      fruit: null,
    };
  }

  return {
    atk: Number(fruit?.statBonus?.atk || 0),
    hp: Number(fruit?.statBonus?.hp || 0),
    speed: Number(fruit?.statBonus?.speed || 0),
    fruit,
  };
}

function getDisplayWeaponName(card, equippedWeapons) {
  const equipped = equippedWeapons || resolveEquippedWeapons(card);

  if (equipped.length) {
    return equipped
      .map((w) => `${w.name}${Number(w.upgradeLevel || 0) > 0 ? ` +${w.upgradeLevel}` : ""}`)
      .join(", ");
  }

  if (card?.equippedWeaponName) return String(card.equippedWeaponName);

  return "None";
}

function getDisplayFruitName(card, equippedFruit) {
  const fruit = equippedFruit || resolveEquippedFruit(card);

  if (fruit?.name) return fruit.name;
  if (card?.equippedDevilFruitName) return String(card.equippedDevilFruitName);
  if (card?.equippedDevilFruit && card.equippedDevilFruit !== "None") {
    return titleCaseWords(card.equippedDevilFruit);
  }

  return "None";
}

function computeBattleBasePower(card) {
  return Number(card.basePower || 0);
}

function computeBoostBasePower(card) {
  return Number(card.basePower || 0);
}

function getBasePower(card) {
  if (Number.isFinite(Number(card?.basePower))) {
    return Number(card.basePower);
  }

  return card.cardRole === "boost"
    ? computeBoostBasePower(card)
    : computeBattleBasePower(card);
}

function getPowerCaps(card) {
  const base = getBasePower(card);
  return {
    M1: Math.floor(base),
    M2: Math.floor(base * getStageMultiplier(card, 2)),
    M3: Math.floor(base * getStageMultiplier(card, 3)),
  };
}

function getCurrentPower(card) {
  const stage = Math.max(1, Math.min(3, Number(card?.evolutionStage || 1)));
  const caps = card.powerCaps || getPowerCaps(card);
  return Number(caps[`M${stage}`] || caps.M1 || 0);
}

function hydrateCard(card) {
  if (!card) return null;

  let next = normalizeRequirementPair(clone(card));
  next.image = getCardImage(next.code, next.image || "");

  const special = getLuffySpecialPath(next);
  const stage = Math.max(1, Math.min(3, Number(next.evolutionStage || 1)));

  const weaponData = getWeaponBonusFromData(next);
  const fruitData = getFruitBonusFromData(next);

  next.weaponBonus = {
    atk: weaponData.atk,
    hp: weaponData.hp,
    speed: weaponData.speed,
  };

  next.fruitBonus = {
    atk: fruitData.atk,
    hp: fruitData.hp,
    speed: fruitData.speed,
  };

  next.baseAtk = Number(next.baseAtk ?? next.atk ?? 0);
  next.baseHp = Number(next.baseHp ?? next.hp ?? 0);
  next.baseSpeed = Number(next.baseSpeed ?? next.speed ?? 0);

  if (special) {
    const mult = special.mults[stage];

    next.evolutionForms = [
      { ...special.forms[0], require: null, badgeImage: getRarityBadge(special.forms[0].tier) },
      { ...special.forms[1], require: next.awakenRequirements?.M2 || null, badgeImage: getRarityBadge(special.forms[1].tier) },
      { ...special.forms[2], require: next.awakenRequirements?.M3 || null, badgeImage: getRarityBadge(special.forms[2].tier) },
    ];

    next.baseTier = "A";
    next.evolutionStage = stage;
    next.evolutionKey = `M${stage}`;
    next.currentTier = special.forms[stage - 1].tier;
    next.rarity = special.forms[stage - 1].tier;

    next.atk = Math.floor(next.baseAtk * mult) + next.weaponBonus.atk + next.fruitBonus.atk;
    next.hp = Math.floor(next.baseHp * mult) + next.weaponBonus.hp + next.fruitBonus.hp;
    next.speed = Math.floor(next.baseSpeed * mult) + next.weaponBonus.speed + next.fruitBonus.speed;
  } else {
    const mult = getStageMultiplier(next, stage);

    next.evolutionStage = stage;
    next.evolutionKey = `M${stage}`;

    const forms = Array.isArray(next.evolutionForms) ? next.evolutionForms : [];
    const activeForm = forms[stage - 1] || null;

    next.currentTier = activeForm?.tier || next.currentTier || next.rarity;
    next.rarity = next.currentTier || next.rarity;

    next.atk = Math.floor(next.baseAtk * mult) + next.weaponBonus.atk + next.fruitBonus.atk;
    next.hp = Math.floor(next.baseHp * mult) + next.weaponBonus.hp + next.fruitBonus.hp;
    next.speed = Math.floor(next.baseSpeed * mult) + next.weaponBonus.speed + next.fruitBonus.speed;
  }

  next.equippedWeapons = weaponData.equipped;
  next.equippedDevilFruitData = fruitData.fruit;
  next.displayWeaponName = getDisplayWeaponName(next, weaponData.equipped);
  next.displayFruitName = getDisplayFruitName(next, fruitData.fruit);

  next.badgeImage = getRarityBadge(next.currentTier || next.rarity || "");

  next.evolutionForms = (next.evolutionForms || []).map((form, index) => ({
    ...form,
    badgeImage: getRarityBadge(form.tier),
    effectText: next.cardRole === "boost" ? getBoostEffectText(next, index + 1) : "",
  }));

  next.basePower = getBasePower(next);
  next.powerCaps = getPowerCaps(next);
  next.currentPower = getCurrentPower(next);
  next.effectText = next.cardRole === "boost" ? getBoostEffectText(next, stage) : "";

  return next;
}

function findOwnedCard(cardsOwned, query) {
  const q = normalize(query);
  const found = safeArray(cardsOwned).find((card) => {
    const fields = [
      card.code,
      card.name,
      card.displayName,
      card.title,
      card.variant,
    ]
      .filter(Boolean)
      .map(normalize);

    return fields.some(
      (field) => field === q || field.includes(q) || q.includes(field)
    );
  });

  if (!found) return null;

  const merged = mergeOwnedCardWithTemplate(found);
  return hydrateCard(merged);
}

function getAllCards() {
  return safeArray(cards).map((card) =>
    hydrateCard({
      ...card,
      evolutionStage: 3,
      evolutionKey: "M3",
    })
  );
}

module.exports = {
  hydrateCard,
  findCardTemplate,
  findOwnedCard,
  getAllCards,
  getStageMultiplier,
  getBasePower,
  getPowerCaps,
  getCurrentPower,
};