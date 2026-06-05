const cards = require("../data/cards");
const weapons = require("../data/weapons");
const devilFruits = require("../data/devilFruits");
const { getCardImage, getRarityBadge } = require("../config/assetLinks");

const RAID_PRESTIGE_CAP = 200;
const RAID_PRESTIGE_ATK_PER_LEVEL = 0.25;
const RAID_PRESTIGE_HP_PER_LEVEL = 0.25;
const RAID_PRESTIGE_SPD_PER_LEVEL = 0.1;

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

function clone(value) {
  return value && typeof value === "object"
    ? JSON.parse(JSON.stringify(value))
    : value;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function titleCaseWords(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
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

  if (Number(stage) === 1) return 1;
  if (Number(stage) === 2) return 3;

  return 3.8;
}

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
    Number(stage) === 3
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

function getRaidPrestigeLevel(card) {
  return Math.max(
    0,
    Math.min(RAID_PRESTIGE_CAP, Math.floor(Number(card?.raidPrestige || 0)))
  );
}

function getRaidPrestigeBonus(card) {
  const prestige = getRaidPrestigeLevel(card);

  return {
    prestige,
    atk: prestige * RAID_PRESTIGE_ATK_PER_LEVEL,
    hp: prestige * RAID_PRESTIGE_HP_PER_LEVEL,
    speed: prestige * RAID_PRESTIGE_SPD_PER_LEVEL,
  };
}

function applyPrestigePercent(value, percent) {
  return Math.floor(Number(value || 0) * (1 + Number(percent || 0) / 100));
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
      M: 9000,
    }[String(rarity || "").toUpperCase()] || 400
  );
}

function getWeaponPower(weapon, level = 0) {
  const explicit = Number(weapon?.power || 0);

  if (explicit > 0) {
    return explicit + Math.max(0, Number(level || 0)) * 250;
  }

  return getRarityPower(weapon?.rarity) + Math.max(0, Number(level || 0)) * 250;
}

function getFruitPower(fruit) {
  const explicit = Number(fruit?.power || 0);

  if (explicit > 0) return explicit;

  return getRarityPower(fruit?.rarity);
}

function findCardTemplate(query) {
  const q = normalize(query);
  if (!q) return null;

  return (
    safeArray(cards).find((card) => {
      const fields = [
        card?.code,
        String(card?.code || "").replace(/_/g, " "),
        card?.baseCode,
        card?.name,
        card?.displayName,
        card?.title,
        card?.variant,
      ]
        .map(normalize)
        .filter(Boolean);

      return fields.some(
        (field) => field === q || field.includes(q) || q.includes(field)
      );
    }) || null
  );
}

function findTemplateByCode(code) {
  const q = normalizeCode(code);
  if (!q) return null;

  return (
    safeArray(cards).find((card) => normalizeCode(card?.code) === q) ||
    safeArray(cards).find((card) => normalizeCode(card?.baseCode) === q) ||
    null
  );
}

function getTemplateAliases(card) {
  return [
    card?.code,
    card?.baseCode,
    card?.id,
    card?.name,
    card?.displayName,
    card?.cardName,
    card?.title,
    card?.variant,
    String(card?.code || "").replace(/_/g, " "),
    `${card?.name || ""} ${card?.title || ""}`,
    `${card?.name || ""} ${card?.variant || ""}`,
    `${card?.displayName || ""} ${card?.title || ""}`,
    `${card?.displayName || ""} ${card?.variant || ""}`,
  ]
    .map(normalizeCode)
    .filter(Boolean);
}

function compactTemplateIdentity(value) {
  return normalizeCode(value).replace(/_/g, "");
}

function getTemplateCompactAliases(card) {
  return getTemplateAliases(card).map(compactTemplateIdentity).filter(Boolean);
}

function findTemplateForOwnedCard(ownedCard) {
  if (!ownedCard) return null;

  const byCode = findTemplateByCode(ownedCard.code || ownedCard.baseCode);
  if (byCode) return byCode;

  const ownedAliases = getTemplateAliases(ownedCard);
  const ownedCompactAliases = getTemplateCompactAliases(ownedCard);

  if (!ownedAliases.length && !ownedCompactAliases.length) return null;

  let best = null;
  let bestScore = 0;

  for (const template of safeArray(cards)) {
    const templateAliases = getTemplateAliases(template);
    const templateCompactAliases = getTemplateCompactAliases(template);

    let score = 0;

    for (const ownedAlias of ownedAliases) {
      for (const templateAlias of templateAliases) {
        if (!ownedAlias || !templateAlias) continue;

        if (ownedAlias === templateAlias) {
          score = Math.max(score, 1000 + templateAlias.length);
        } else if (ownedAlias.includes(templateAlias)) {
          score = Math.max(score, 700 + templateAlias.length);
        } else if (templateAlias.includes(ownedAlias)) {
          score = Math.max(score, 500 + ownedAlias.length);
        }
      }
    }

    for (const ownedAlias of ownedCompactAliases) {
      for (const templateAlias of templateCompactAliases) {
        if (!ownedAlias || !templateAlias) continue;

        if (ownedAlias === templateAlias) {
          score = Math.max(score, 900 + templateAlias.length);
        } else if (ownedAlias.includes(templateAlias)) {
          score = Math.max(score, 650 + templateAlias.length);
        } else if (templateAlias.includes(ownedAlias)) {
          score = Math.max(score, 450 + ownedAlias.length);
        }
      }
    }

    if (score > bestScore) {
      best = template;
      bestScore = score;
    }
  }

  return bestScore > 0 ? best : null;
}

function stripOwnedTemplateOnlyFields(card) {
  const cleaned = clone(card || {});

  delete cleaned.awakenRequirements;
  delete cleaned.evolutionRequirements;
  delete cleaned.requirements;
  delete cleaned.requiredCards;
  delete cleaned.requiredBoosts;
  delete cleaned.cardsText;
  delete cleaned.boostsText;

  return cleaned;
}

function mergeOwnedCardWithTemplate(ownedCard) {
  if (!ownedCard) return null;

  const template = findTemplateForOwnedCard(ownedCard);
  const cleanOwned = stripOwnedTemplateOnlyFields(ownedCard);

  if (!template) return cleanOwned;

  return {
    ...clone(template),

    instanceId: cleanOwned.instanceId,
    ownerId: cleanOwned.ownerId,

    level: cleanOwned.level,
    currentLevel: cleanOwned.currentLevel,
    lvl: cleanOwned.lvl,
    xp: cleanOwned.xp,
    exp: cleanOwned.exp,
    kills: cleanOwned.kills,
    fragments: cleanOwned.fragments,

    raidPrestige: Math.max(0, Math.min(200, Number(cleanOwned.raidPrestige || 0))),

    evolutionStage: cleanOwned.evolutionStage,
    evolutionKey: cleanOwned.evolutionKey,

    currentTier: cleanOwned.currentTier || template.currentTier || template.rarity,
    rarity: cleanOwned.rarity || template.rarity,

    equippedWeapons: clone(cleanOwned.equippedWeapons || []),
    equippedWeapon: cleanOwned.equippedWeapon || null,
    equippedWeaponName: cleanOwned.equippedWeaponName || null,
    equippedWeaponCode: cleanOwned.equippedWeaponCode || null,
    equippedWeaponLevel: cleanOwned.equippedWeaponLevel || 0,

    equippedDevilFruit: cleanOwned.equippedDevilFruit || null,
    equippedDevilFruitName: cleanOwned.equippedDevilFruitName || null,
    equippedDevilFruitCode: cleanOwned.equippedDevilFruitCode || null,

    cardRole: template.cardRole || cleanOwned.cardRole,
    role: template.role || cleanOwned.role,
    category: template.category || cleanOwned.category,
  };
}

function findByCodeOrName(list, value) {
  const q = normalize(value);
  if (!q) return null;

  return (
    safeArray(list).find((item) => normalize(item?.code) === q) ||
    safeArray(list).find((item) => normalize(item?.name) === q) ||
    safeArray(list).find((item) => normalize(item?.code).includes(q)) ||
    safeArray(list).find((item) => normalize(item?.name).includes(q)) ||
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
        ownerBonusPercent: found?.ownerBonusPercent ||
          entry?.ownerBonusPercent || {
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
  if (!card?.equippedDevilFruit || card.equippedDevilFruit === "None") {
    return null;
  }

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
      .map((weapon) =>
        `${weapon.name}${Number(weapon.upgradeLevel || 0) > 0 ? ` +${weapon.upgradeLevel}` : ""}`
      )
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

  return String(card?.cardRole || "").toLowerCase() === "boost"
    ? computeBoostBasePower(card)
    : computeBattleBasePower(card);
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

  const equippedWeapons =
    card.equippedWeaponsResolved || resolveEquippedWeapons(card);

  const equippedFruit =
    card.equippedDevilFruitData || resolveEquippedFruit(card);

  const equipPower = getEquipmentPowerBonus(card, equippedWeapons, equippedFruit);

  return stagePower + equipPower.total;
}

function getBoostStageValue(card, stage = 1) {
  const safeStage = Math.max(1, Math.min(3, Number(stage || 1)));
  const base = Number(card?.boostValue || 0);
  const key = `M${safeStage}`;

  const explicitValues = card?.boostValues || card?.stageBoostValues || null;

  if (explicitValues && Number.isFinite(Number(explicitValues[key]))) {
    return Number(explicitValues[key]);
  }

  const explicitMultipliers =
    card?.boostMultipliers ||
    card?.stageBoostMultipliers ||
    card?.boostStageMultipliers ||
    null;

  if (explicitMultipliers && Number.isFinite(Number(explicitMultipliers[key]))) {
    return Math.floor(base * Number(explicitMultipliers[key]));
  }

  const directMultiplier =
    safeStage === 1
      ? card?.boostMultiplierM1 ?? card?.m1BoostMultiplier
      : safeStage === 2
      ? card?.boostMultiplierM2 ?? card?.m2BoostMultiplier
      : card?.boostMultiplierM3 ?? card?.m3BoostMultiplier;

  if (Number.isFinite(Number(directMultiplier))) {
    return Math.floor(base * Number(directMultiplier));
  }

  const cardCode = String(card?.code || "").toLowerCase();
  const cardName = String(card?.name || card?.displayName || "").toLowerCase();
  const boostType = String(card?.boostType || "")
    .toLowerCase()
    .replace(/[_\-\s]+/g, "");

  const isBaccarat = cardCode.includes("baccarat") || cardName.includes("baccarat");

  if (isBaccarat) {
    return safeStage;
  }

  if (
    boostType === "fragmentstorage" ||
    boostType === "fragstorage" ||
    boostType === "storage"
  ) {
    if (safeStage === 1) return base;
    if (safeStage === 2) return Number(card?.boostValueM2 ?? card?.m2BoostValue ?? base * 2);
    return Number(card?.boostValueM3 ?? card?.m3BoostValue ?? base * 3);
  }

  if (safeStage === 1) return base;

  if (safeStage === 2) {
    return Number(card?.boostValueM2 ?? card?.m2BoostValue ?? base + 2);
  }

  return Number(card?.boostValueM3 ?? card?.m3BoostValue ?? base + 4);
}

function getBoostEffectText(card, stage = 1) {
  if (!card || String(card.cardRole || "").toLowerCase() !== "boost") {
    return "";
  }

  const boostType = String(card.boostType || "").toLowerCase();
  const target = card.boostTarget || "team";
  const stageValue = getBoostStageValue(card, stage);
  const suffix = ["atk", "hp", "spd", "speed", "exp", "dmg"].includes(boostType)
    ? "%"
    : "";

  if (boostType === "fragmentstorage" || boostType === "fragment_storage") {
    return `Increase ${target} fragment storage by ${stageValue}.`;
  }

  if (boostType === "pullchance" || boostType === "pull_chance") {
    return `Increase ${target} pull chance by ${stageValue}%.`;
  }

  if (boostType === "daily") {
    return `Increase ${target} daily reward quality by ${stageValue}.`;
  }

  if (!boostType) return card.boostDescription || "";

  return `Increase ${target} ${boostType.toUpperCase()} by ${stageValue}${suffix}.`;
}

function hydrateCard(card) {
  if (!card) return null;

  let next = normalizeRequirementPair(clone(card));

  next.image = getCardImage(next.code, next.image || "");

  const special = getLuffySpecialPath(next);
  const stage = Math.max(1, Math.min(3, Number(next.evolutionStage || 1)));

  next.level = Math.max(1, Math.min(100, Number(next.level || 1)));

  const templateForBase = findTemplateByCode(next.code);

  const canonicalBaseAtk = Number(
    templateForBase?.baseAtk ??
      templateForBase?.atk ??
      next.originalBaseAtk ??
      next.baseRawAtk ??
      next.baseAtk ??
      next.atk ??
      0
  );

  const canonicalBaseHp = Number(
    templateForBase?.baseHp ??
      templateForBase?.hp ??
      next.originalBaseHp ??
      next.baseRawHp ??
      next.baseHp ??
      next.hp ??
      0
  );

  const canonicalBaseSpeed = Number(
    templateForBase?.baseSpeed ??
      templateForBase?.speed ??
      next.originalBaseSpeed ??
      next.baseRawSpeed ??
      next.baseSpeed ??
      next.speed ??
      0
  );

  next.originalBaseAtk = canonicalBaseAtk;
  next.originalBaseHp = canonicalBaseHp;
  next.originalBaseSpeed = canonicalBaseSpeed;

  next.baseAtk = canonicalBaseAtk;
  next.baseHp = canonicalBaseHp;
  next.baseSpeed = canonicalBaseSpeed;

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

  const prestigeBonus = getRaidPrestigeBonus(next);

  const finalAtkBeforePrestige = scaledAtk + weaponBonus.atk + fruitBonus.atk;
  const finalHpBeforePrestige = scaledHp + weaponBonus.hp + fruitBonus.hp;
  const finalSpeedBeforePrestige = scaledSpeed + weaponBonus.speed + fruitBonus.speed;

  const isBoostCard = String(next.cardRole || "").toLowerCase() === "boost";

  const finalAtk = isBoostCard
    ? finalAtkBeforePrestige
    : applyPrestigePercent(finalAtkBeforePrestige, prestigeBonus.atk);

  const finalHp = isBoostCard
    ? finalHpBeforePrestige
    : applyPrestigePercent(finalHpBeforePrestige, prestigeBonus.hp);

  const finalSpeed = isBoostCard
    ? finalSpeedBeforePrestige
    : applyPrestigePercent(finalSpeedBeforePrestige, prestigeBonus.speed);

  next.raidPrestige = prestigeBonus.prestige;
  next.raidPrestigeBonus = prestigeBonus;

  next.atk = finalAtk;
  next.hp = finalHp;
  next.speed = finalSpeed;

  next.finalAtk = finalAtk;
  next.finalHp = finalHp;
  next.finalSpeed = finalSpeed;

  next.displayAtk = finalAtk;
  next.displayHp = finalHp;
  next.displaySpeed = finalSpeed;

  next.combatAtk = finalAtk;
  next.combatHp = finalHp;
  next.combatSpeed = finalSpeed;

  next.equippedWeaponsResolved = weaponPercent.equipped;
  next.equippedDevilFruitData = fruitPercent.fruit;
  next.displayWeaponName = getDisplayWeaponName(next, weaponPercent.equipped);
  next.displayFruitName = getDisplayFruitName(next, fruitPercent.fruit);

  const equipmentPower = getEquipmentPowerBonus(
    next,
    weaponPercent.equipped,
    fruitPercent.fruit
  );

  next.weaponPowerBonus = equipmentPower.weaponPower;
  next.fruitPowerBonus = equipmentPower.fruitPower;
  next.totalEquipmentPowerBonus = equipmentPower.total;
  next.badgeImage = getRarityBadge(next.currentTier || next.rarity || "");

  next.evolutionForms = safeArray(next.evolutionForms).map((form, index) => ({
    ...form,
    badgeImage: getRarityBadge(form.tier || form.rarity || next.rarity),
    effectText:
      String(next.cardRole || "").toLowerCase() === "boost"
        ? getBoostEffectText(next, index + 1)
        : "",
  }));

  next.basePower = getBasePower(next);
  next.powerCaps = getPowerCaps(next);
  next.currentPower = getCurrentPower(next);
  next.power = next.currentPower;
  next.effectText =
    String(next.cardRole || "").toLowerCase() === "boost"
      ? getBoostEffectText(next, stage)
      : "";

  return next;
}

function findOwnedCard(cardsOwned, query) {
  const q = normalize(query);
  if (!q) return null;

  const found = safeArray(cardsOwned).find((card) => {
    const fields = [
      card?.displayName,
      card?.name,
      card?.title,
      card?.variant,
      card?.code,
      String(card?.code || "").replace(/_/g, " "),
    ]
      .map(normalize)
      .filter(Boolean);

    return fields.some(
      (field) => field === q || field.includes(q) || q.includes(field)
    );
  });

  if (!found) return null;

  return hydrateCard(mergeOwnedCardWithTemplate(found));
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
  return hydrateCard({
    ...clone(template),
    instanceId: `${template.code}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    level: 1,
    currentLevel: 1,
    lvl: 1,
    xp: 0,
    exp: 0,
    kills: 0,
    fragments: 0,
    raidPrestige: 0,
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
    equippedDevilFruitCode: null,
  });
}

module.exports = {
  hydrateCard,
  findCardTemplate,
  findOwnedCard,
  getAllCards,

  RAID_PRESTIGE_CAP,
  RAID_PRESTIGE_ATK_PER_LEVEL,
  RAID_PRESTIGE_HP_PER_LEVEL,
  RAID_PRESTIGE_SPD_PER_LEVEL,

  getRaidPrestigeLevel,
  getRaidPrestigeBonus,

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
};