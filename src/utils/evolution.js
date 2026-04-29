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
  const stageValue = getBoostStageValue(card, stage);
  const suffix = ["atk", "hp", "spd", "exp", "dmg"].includes(boostType) ? "%" : "";

  if (boostType === "fragmentstorage" || boostType === "fragment_storage") {
    return `Increase ${target} fragment storage by ${stageValue}.`;
  }

  if (boostType === "pullchance" || boostType === "pull_chance") {
    return `Increase ${target} pull chance by ${stageValue}.`;
  }

  if (boostType === "daily") {
    return `Increase ${target} daily reward quality by ${stageValue}.`;
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
      {
        name: "Base",
        tier: "A",
      },
      {
        name: "Gear 4",
        tier: "SS",
      },
      {
        name: "Gear 5",
        tier: "UR",
      },
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

const LEVEL_RANGES_BY_STAGE = {
  1: {
    min: 1,
    max: 50,
    fromStage: 1,
    toStage: 2,
  },
  2: {
    min: 50,
    max: 85,
    fromStage: 2,
    toStage: 3,
  },
  3: {
    min: 85,
    max: 100,
    fromStage: 3,
    toStage: 3,
    finalBonus: 1.18,
  },
};

function getCardLevel(card) {
  return Math.max(1, Math.min(100, Number(card?.level || 1)));
}

function getLevelProgressForStage(card, stage) {
  const range = LEVEL_RANGES_BY_STAGE[stage] || LEVEL_RANGES_BY_STAGE[1];
  const level = getCardLevel(card);

  if (level <= range.min) return 0;
  if (level >= range.max) return 1;

  return (level - range.min) / (range.max - range.min);
}

function getLevelScaledMultiplier(card, stage) {
  const range = LEVEL_RANGES_BY_STAGE[stage] || LEVEL_RANGES_BY_STAGE[1];
  const progress = getLevelProgressForStage(card, stage);

  const fromMult = getStageMultiplier(card, range.fromStage);
  const toMult =
    stage === 3
      ? getStageMultiplier(card, 3) * Number(range.finalBonus || 1)
      : getStageMultiplier(card, range.toStage);

  return fromMult + (toMult - fromMult) * progress;
}

function scaleStatByLevel(base, card, stage) {
  return Math.floor(Number(base || 0) * getLevelScaledMultiplier(card, stage));
}

function scalePowerByLevel(basePower, card, stage) {
  return Math.floor(Number(basePower || 0) * getLevelScaledMultiplier(card, stage));
}

function getRarityPower(rarity) {
  return (
    {
      C: 400,
      B: 800,
      A: 1400,
      S: 2400,
      SS: 3800,
      UR: 5600,
    }[String(rarity || "").toUpperCase()] || 400
  );
}

function getWeaponPower(weapon, level = 0) {
  const explicit = Number(weapon?.power || 0);

  if (explicit > 0) return explicit + Math.max(0, Number(level || 0)) * 250;

  return getRarityPower(weapon?.rarity) + Math.max(0, Number(level || 0)) * 250;
}

function getFruitPower(fruit) {
  const explicit = Number(fruit?.power || 0);

  if (explicit > 0) return explicit;

  return getRarityPower(fruit?.rarity);
}

function findCardTemplate(query) {
  const q = normalize(query);

  return (
    cards.find((card) => {
      const fields = [card.code, card.name, card.displayName, card.title, card.variant]
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
    exp: ownedCard.exp,
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
        baseStatPercent: entry?.baseStatPercent || found?.statPercent || {
          atk: 0,
          hp: 0,
          speed: 0,
        },
        ownerBonusPercent: found?.ownerBonusPercent || entry?.ownerBonusPercent || {
          atk: 0,
          hp: 0,
          speed: 0,
        },
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
        baseStatPercent: found?.statPercent || {
          atk: 0,
          hp: 0,
          speed: 0,
        },
        ownerBonusPercent: found?.ownerBonusPercent || {
          atk: 0,
          hp: 0,
          speed: 0,
        },
      });
    }
  }

  return equipped;
}

function resolveEquippedFruit(card) {
  if (!card?.equippedDevilFruit || card.equippedDevilFruit === "None") return null;

  return findByCodeOrName(devilFruits, card.equippedDevilFruit);
}

function isWeaponOwnerBonusActive(card, weapon) {
  return Array.isArray(weapon?.owners) && weapon.owners.includes(card?.code);
}

function getWeaponPercentFromData(card) {
  const equipped = resolveEquippedWeapons(card);
  let atk = 0;
  let hp = 0;
  let speed = 0;

  for (const item of equipped) {
    const level = Math.max(0, Number(item.upgradeLevel || 0));
    const base = item?.statPercent || item?.baseStatPercent || {};
    const ownerBonus = item?.ownerBonusPercent || {};
    const ownerActive = isWeaponOwnerBonusActive(card, item);

    atk += Number(base.atk || 0) + level * 1 + (ownerActive ? Number(ownerBonus.atk || 0) : 0);
    hp += Number(base.hp || 0) + level * 1 + (ownerActive ? Number(ownerBonus.hp || 0) : 0);
    speed += Number(base.speed || 0) + (ownerActive ? Number(ownerBonus.speed || 0) : 0);
  }

  return {
    atk,
    hp,
    speed,
    equipped,
  };
}

function getFruitPercentFromData(card) {
  const fruit = resolveEquippedFruit(card);

  if (!fruit) {
    return {
      atk: 0,
      hp: 0,
      speed: 0,
      fruit: null,
    };
  }

  const percent = fruit?.statPercent || {};

  return {
    atk: Number(percent.atk || 0),
    hp: Number(percent.hp || 0),
    speed: Number(percent.speed || 0),
    fruit,
  };
}

function getEquipmentPowerBonus(card, equippedWeapons, equippedFruit) {
  const weaponPower = safeArray(equippedWeapons).reduce(
    (sum, weapon) => sum + getWeaponPower(weapon, weapon?.upgradeLevel || 0),
    0
  );
  const fruitPower = equippedFruit ? getFruitPower(equippedFruit) : 0;

  return {
    weaponPower,
    fruitPower,
    total: weaponPower + fruitPower,
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

  return card.cardRole === "boost" ? computeBoostBasePower(card) : computeBattleBasePower(card);
}

function getPowerCaps(card) {
  const base = getBasePower(card);

  return {
    M1: Math.floor(base * getStageMultiplier(card, 1)),
    M2: Math.floor(base * getStageMultiplier(card, 2)),
    M3: Math.floor(base * getStageMultiplier(card, 3) * 1.18),
  };
}

function getCurrentPower(card) {
  const stage = Math.max(1, Math.min(3, Number(card?.evolutionStage || 1)));
  const base = getBasePower(card);
  const stagePower = scalePowerByLevel(base, card, stage);
  const equippedWeapons = card.equippedWeaponsResolved || resolveEquippedWeapons(card);
  const equippedFruit = card.equippedDevilFruitData || resolveEquippedFruit(card);
  const equipPower = getEquipmentPowerBonus(card, equippedWeapons, equippedFruit);

  return stagePower + equipPower.total;
}

function hydrateCard(card) {
  if (!card) return null;

  let next = normalizeRequirementPair(clone(card));

  next.image = getCardImage(next.code, next.image || "");

  const special = getLuffySpecialPath(next);
  const stage = Math.max(1, Math.min(3, Number(next.evolutionStage || 1)));

  next.level = Math.max(1, Math.min(100, Number(next.level || 1)));
  next.baseAtk = Number(next.baseAtk ?? next.atk ?? 0);
  next.baseHp = Number(next.baseHp ?? next.hp ?? 0);
  next.baseSpeed = Number(next.baseSpeed ?? next.speed ?? 0);

  let scaledAtk = 0;
  let scaledHp = 0;
  let scaledSpeed = 0;

  if (special) {
    next.evolutionForms = [
      {
        ...special.forms[0],
        require: null,
        badgeImage: getRarityBadge(special.forms[0].tier),
      },
      {
        ...special.forms[1],
        require: next.awakenRequirements?.M2 || null,
        badgeImage: getRarityBadge(special.forms[1].tier),
      },
      {
        ...special.forms[2],
        require: next.awakenRequirements?.M3 || null,
        badgeImage: getRarityBadge(special.forms[2].tier),
      },
    ];

    next.baseTier = "A";
    next.evolutionStage = stage;
    next.evolutionKey = `M${stage}`;
    next.currentTier = special.forms[stage - 1].tier;
    next.rarity = special.forms[stage - 1].tier;

    scaledAtk = scaleStatByLevel(next.baseAtk, next, stage);
    scaledHp = scaleStatByLevel(next.baseHp, next, stage);
    scaledSpeed = scaleStatByLevel(next.baseSpeed, next, stage);
  } else {
    next.evolutionStage = stage;
    next.evolutionKey = `M${stage}`;

    const forms = Array.isArray(next.evolutionForms) ? next.evolutionForms : [];
    const activeForm = forms[stage - 1] || null;

    next.currentTier = activeForm?.tier || next.currentTier || next.rarity;
    next.rarity = next.currentTier || next.rarity;

    scaledAtk = scaleStatByLevel(next.baseAtk, next, stage);
    scaledHp = scaleStatByLevel(next.baseHp, next, stage);
    scaledSpeed = scaleStatByLevel(next.baseSpeed, next, stage);
  }

  const weaponPercent = getWeaponPercentFromData(next);
  const fruitPercent = getFruitPercentFromData(next);

  const weaponBonus = {
    atk: Math.floor((scaledAtk * Number(weaponPercent.atk || 0)) / 100),
    hp: Math.floor((scaledHp * Number(weaponPercent.hp || 0)) / 100),
    speed: Math.floor((scaledSpeed * Number(weaponPercent.speed || 0)) / 100),
  };

  const fruitBonus = {
    atk: Math.floor((scaledAtk * Number(fruitPercent.atk || 0)) / 100),
    hp: Math.floor((scaledHp * Number(fruitPercent.hp || 0)) / 100),
    speed: Math.floor((scaledSpeed * Number(fruitPercent.speed || 0)) / 100),
  };

  next.weaponBonus = weaponBonus;
  next.fruitBonus = fruitBonus;

  next.weaponBonusPercent = {
    atk: Number(weaponPercent.atk || 0),
    hp: Number(weaponPercent.hp || 0),
    speed: Number(weaponPercent.speed || 0),
  };

  next.fruitBonusPercent = {
    atk: Number(fruitPercent.atk || 0),
    hp: Number(fruitPercent.hp || 0),
    speed: Number(fruitPercent.speed || 0),
  };

  next.atk = scaledAtk + weaponBonus.atk + fruitBonus.atk;
  next.hp = scaledHp + weaponBonus.hp + fruitBonus.hp;
  next.speed = scaledSpeed + weaponBonus.speed + fruitBonus.speed;

  next.equippedWeaponsResolved = weaponPercent.equipped;
  next.equippedDevilFruitData = fruitPercent.fruit;
  next.displayWeaponName = getDisplayWeaponName(next, weaponPercent.equipped);
  next.displayFruitName = getDisplayFruitName(next, fruitPercent.fruit);

  const equipmentPower = getEquipmentPowerBonus(next, weaponPercent.equipped, fruitPercent.fruit);

  next.weaponPowerBonus = equipmentPower.weaponPower;
  next.fruitPowerBonus = equipmentPower.fruitPower;
  next.totalEquipmentPowerBonus = equipmentPower.total;
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
    const fields = [card.code, card.name, card.displayName, card.title, card.variant]
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
      level: 100,
    })
  );
}

function createOwnedCard(template) {
  const owned = hydrateCard({
    ...clone(template),
    instanceId: `${template.code}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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

  return owned;
}

function getBoostStageValue(card, stage = 1) {
  const safeStage = Math.max(1, Math.min(3, Number(stage || 1)));
  const base = Number(card?.boostValue || 0);
  const explicitValues = card?.boostValues || card?.stageBoostValues || null;
  const key = `M${safeStage}`;

  if (explicitValues && Number.isFinite(Number(explicitValues[key]))) {
    return Number(explicitValues[key]);
  }

  const cardCode = String(card?.code || "").toLowerCase();
  const cardName = String(card?.name || card?.displayName || "").toLowerCase();

  const isBaccarat =
    cardCode.includes("baccarat") || cardName.includes("baccarat");

  if (isBaccarat) {
    return safeStage;
  }

  if (safeStage === 1) return base;
  if (safeStage === 2) {
    return Number(card?.boostValueM2 ?? card?.m2BoostValue ?? base + 2);
  }

  return Number(card?.boostValueM3 ?? card?.m3BoostValue ?? base + 4);
}

function getOwnedFragmentAmount(player, targetCard) {
  const code = normalize(targetCard?.code);
  const name = normalize(targetCard?.displayName || targetCard?.name);

  const globalAmount = safeArray(player?.fragments)
    .filter((entry) => {
      const entryCode = normalize(entry.code);
      const entryName = normalize(entry.name || entry.displayName);

      return (
        (code && entryCode === code) ||
        (name && entryName === name) ||
        (code && entryName === code) ||
        (name && entryCode === name)
      );
    })
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  return globalAmount + Number(targetCard?.fragments || 0);
}

function consumeOwnedFragments(player, targetIndex, targetCard, amount) {
  let remaining = Number(amount || 0);
  const code = normalize(targetCard?.code);
  const name = normalize(targetCard?.displayName || targetCard?.name);

  const updatedFragments = safeArray(player?.fragments).map((entry) => {
    if (remaining <= 0) return entry;

    const entryCode = normalize(entry.code);
    const entryName = normalize(entry.name || entry.displayName);

    const matched =
      (code && entryCode === code) ||
      (name && entryName === name) ||
      (code && entryName === code) ||
      (name && entryCode === name);

    if (!matched) return entry;

    const current = Number(entry.amount || 0);
    const taken = Math.min(current, remaining);
    remaining -= taken;

    return {
      ...entry,
      amount: current - taken,
    };
  }).filter((entry) => Number(entry.amount || 0) > 0);

  const updatedCards = safeArray(player?.cards).map((card, index) => {
    if (index !== targetIndex) return card;
    if (remaining <= 0) return card;

    const current = Number(card.fragments || 0);
    const taken = Math.min(current, remaining);
    remaining -= taken;

    return {
      ...card,
      fragments: current - taken,
    };
  });

  if (remaining > 0) {
    throw new Error("Not enough self fragments.");
  }

  return {
    updatedCards,
    updatedFragments,
  };
}

function findOwnedCardIndexForAwaken(cardsOwned, query) {
  const q = normalize(query);

  return safeArray(cardsOwned).findIndex((card) => {
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
}

function findOwnedRequirementCard(player, code) {
  const q = normalize(code);

  return safeArray(player?.cards)
    .map((card) => hydrateCard(mergeOwnedCardWithTemplate(card)))
    .filter(Boolean)
    .find((card) => normalize(card.code) === q) || null;
}

function validateAwakenRequirement(player, targetCard, req) {
  const missing = [];

  const berriesNeed = Number(req?.berries || 0);
  const berriesOwned = Number(player?.berries || 0);

  if (berriesOwned < berriesNeed) {
    missing.push(
      `Berries ${berriesOwned.toLocaleString("en-US")}/${berriesNeed.toLocaleString("en-US")}`
    );
  }

  const fragmentsNeed = Number(req?.selfFragments || 0);
  const fragmentsOwned = getOwnedFragmentAmount(player, targetCard);

  if (fragmentsOwned < fragmentsNeed) {
    missing.push(
      `Self fragments ${fragmentsOwned}/${fragmentsNeed}x ${targetCard.displayName || targetCard.name}`
    );
  }

  if (targetCard.cardRole === "battle") {
    const levelNeed = Number(req?.minLevel || 0);
    const levelOwned = Number(targetCard.level || 1);

    if (levelOwned < levelNeed) {
      missing.push(`Level ${levelOwned}/${levelNeed}`);
    }
  }

  for (const entry of safeArray(req?.cards)) {
    const owned = findOwnedRequirementCard(player, entry.code);
    const stageNeed = Number(entry.stage || 1);

    if (!owned) {
      missing.push(`${entry.name || entry.code} M${stageNeed}`);
      continue;
    }

    if (Number(owned.evolutionStage || 1) < stageNeed) {
      missing.push(
        `${owned.displayName || owned.name} M${Number(owned.evolutionStage || 1)}/M${stageNeed}`
      );
    }
  }

  for (const entry of safeArray(req?.boosts)) {
    const owned = findOwnedRequirementCard(player, entry.code);
    const stageNeed = Number(entry.stage || 1);

    if (!owned) {
      missing.push(`${entry.name || entry.code} M${stageNeed}`);
      continue;
    }

    if (Number(owned.evolutionStage || 1) < stageNeed) {
      missing.push(
        `${owned.displayName || owned.name} M${Number(owned.evolutionStage || 1)}/M${stageNeed}`
      );
    }
  }

  if (missing.length) {
    throw new Error(`Missing requirements:\n${missing.map((line) => `↪ ${line}`).join("\n")}`);
  }
}

function awakenOwnedCard(player, query) {
  const cardsOwned = safeArray(player?.cards);
  const targetIndex = findOwnedCardIndexForAwaken(cardsOwned, query);

  if (targetIndex === -1) {
    throw new Error("You do not own that card.");
  }

  const originalCard = cardsOwned[targetIndex];
  const target = hydrateCard(mergeOwnedCardWithTemplate(originalCard));

  if (!target) {
    throw new Error("Card data could not be loaded.");
  }

  const currentStage = Math.max(1, Math.min(3, Number(target.evolutionStage || 1)));

  if (currentStage >= 3) {
    throw new Error("This card is already at M3.");
  }

  const nextStage = currentStage + 1;
  const req = target.awakenRequirements?.[`M${nextStage}`];

  if (!req) {
    throw new Error("No awaken requirement found.");
  }

  validateAwakenRequirement(player, target, req);

  const afterFragmentConsume = consumeOwnedFragments(
    player,
    targetIndex,
    target,
    Number(req.selfFragments || 0)
  );

  const nextCards = afterFragmentConsume.updatedCards.map((card, index) => {
    if (index !== targetIndex) return card;

    const awakened = hydrateCard({
      ...card,
      evolutionStage: nextStage,
      evolutionKey: `M${nextStage}`,
    });

    return {
      ...card,
      evolutionStage: nextStage,
      evolutionKey: `M${nextStage}`,
      currentTier: awakened.currentTier,
      rarity: awakened.rarity,
      baseAtk: awakened.baseAtk,
      baseHp: awakened.baseHp,
      baseSpeed: awakened.baseSpeed,
      atk: awakened.atk,
      hp: awakened.hp,
      speed: awakened.speed,
      currentPower: awakened.currentPower,
      powerCaps: awakened.powerCaps,
    };
  });

  const updatedTarget = hydrateCard(mergeOwnedCardWithTemplate(nextCards[targetIndex]));

  return {
    updatedCards: nextCards,
    updatedFragments: afterFragmentConsume.updatedFragments,
    berries: Number(player.berries || 0) - Number(req.berries || 0),
    target: updatedTarget,
  };
}

module.exports = {
  hydrateCard,
  findCardTemplate,
  findOwnedCard,
  getAllCards,
  getStageMultiplier,
  getLevelScaledMultiplier,
  scaleStatByLevel,
  scalePowerByLevel,
  getBasePower,
  getPowerCaps,
  getCurrentPower,
  getRarityPower,
  getWeaponPower,
  getFruitPower,
  createOwnedCard,
  getBoostStageValue,
  awakenOwnedCard,
};