const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const {
  isMergeCard,
  buildMergedCard,
  getMergeSourceCodes,
  findOwnedCardByCodeOrName,
} = require("../utils/mergeCards");
const {
  hydrateCard,
  getWeaponPower,
  getFruitPower,
} = require("../utils/evolution");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { buildCardStyleEmbed } = require("../utils/cardView");
const {
  applyCustomSkinToCard,
  findSkinSetByQuery,
  normalizeCode: normalizeSkinCode,
  normalizeName: normalizeSkinName,
} = require("../utils/customSkins");
const {
  getCardImage,
  getDevilFruitImage,
  getWeaponImage,
  getRarityBadge,
} = require("../config/assetLinks");
const { formatCardLevelLine } = require("../utils/cardExp");

const devilFruitsDb = require("../data/devilFruits");
const weaponsDb = require("../data/weapons");
const cardsData = require("../data/cards");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/^model:\s*/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}


function isRoadPoneglyphCard(card) {
  const code = String(card?.code || "").toLowerCase().trim();
  const name = String(card?.displayName || card?.name || card?.title || "")
    .toLowerCase()
    .trim();

  return code === "road_poneglyph" || name === "road poneglyph";
}

function getRoadPoneglyphEffect(stage) {
  const n = Math.max(1, Math.min(3, Number(stage || 1)));

  if (n === 1) return "Allows you to summon Merged cards!";
  if (n === 2) return "Allows you to evolve Merged cards to Mastery 2!";
  return "Allows you to evolve Merged cards to Mastery 3!";
}

function getRoadPoneglyphDisplayEffect(card, stage, fallback = "No effect text") {
  if (isRoadPoneglyphCard(card)) {
    return getRoadPoneglyphEffect(stage);
  }

  return fallback;
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function firstPositiveNumber(...values) {
  for (const value of values) {
    const n = Number(value || 0);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function resolveCurrentStageBaseStats(card) {
  const stage = Math.max(1, Math.min(3, Number(card?.evolutionStage || 1)));
  const stageKey = `M${stage}`;
  const form = card?.evolutionForms?.[stage - 1] || {};
  const stageStats =
    card?.stageStats?.[stageKey] ||
    card?.stats?.[stageKey] ||
    card?.masteryStats?.[stageKey] ||
    {};

  if (isMergeCard(card)) {
    return {
      atk: firstPositiveNumber(card?.finalAtk, card?.combatAtk, card?.displayAtk, card?.atk, card?.baseAtk),
      hp: firstPositiveNumber(card?.finalHp, card?.combatHp, card?.displayHp, card?.hp, card?.baseHp),
      speed: firstPositiveNumber(card?.finalSpeed, card?.combatSpeed, card?.displaySpeed, card?.speed, card?.spd, card?.baseSpeed),
      power: firstPositiveNumber(card?.finalPower, card?.currentPower, card?.power, card?.basePower),
    };
  }

  return {
    atk: firstPositiveNumber(
      card?.atk,
      card?.displayAtk,
      card?.combatAtk,
      form.atk,
      form.baseAtk,
      stageStats.atk,
      stageStats.baseAtk
    ),
    hp: firstPositiveNumber(
      card?.hp,
      card?.displayHp,
      card?.combatHp,
      form.hp,
      form.baseHp,
      stageStats.hp,
      stageStats.baseHp
    ),
    speed: firstPositiveNumber(
      card?.speed,
      card?.spd,
      card?.displaySpeed,
      card?.combatSpeed,
      form.speed,
      form.spd,
      form.baseSpeed,
      stageStats.speed,
      stageStats.spd,
      stageStats.baseSpeed
    ),
    power: firstPositiveNumber(
      card?.currentPower,
      form.currentPower,
      form.power,
      stageStats.currentPower,
      stageStats.power,
      card?.powerCaps?.[stageKey]
    ),
  };
}

function applyBoostedDisplayStats(card, boosts = {}) {
  if (!card || String(card.cardRole || "").toLowerCase() === "boost") return card;

  const base = resolveCurrentStageBaseStats(card);
  const boostedAtk = Math.floor(base.atk * (1 + Number(boosts.atk || 0) / 100));
  const boostedHp = Math.floor(base.hp * (1 + Number(boosts.hp || 0) / 100));
  const boostedSpeed = Math.floor(base.speed * (1 + Number(boosts.spd || 0) / 100));

  return {
    ...card,
    atk: boostedAtk,
    hp: boostedHp,
    speed: boostedSpeed,
    displayAtk: boostedAtk,
    displayHp: boostedHp,
    displaySpeed: boostedSpeed,
    combatAtk: boostedAtk,
    combatHp: boostedHp,
    combatSpeed: boostedSpeed,
    currentPower: Math.max(Number(card.currentPower || 0), Number(base.power || 0)),
  };
}

function getCurrentForm(card) {
  const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
  
  if (isRoadPoneglyphCard(card)) {
    const roadEffect = getRoadPoneglyphEffect(stage);
    card.effectText = roadEffect;
    card.boostDescription = roadEffect;
    card.description = roadEffect;
    if (Array.isArray(card.evolutionForms) && card.evolutionForms[stage - 1]) {
      card.evolutionForms[stage - 1].effectText = roadEffect;
      card.evolutionForms[stage - 1].boostDescription = roadEffect;
      card.evolutionForms[stage - 1].description = roadEffect;
    }
  }
return card.evolutionForms?.[stage - 1] || null;
}

function getCurrentStageImage(card) {
  if (card?.hasCustomSkin && card?.skinImage) {
    return card.skinImage;
  }

  const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
  const stageKey = `M${stage}`;

  return (
    card.evolutionForms?.[stage - 1]?.image ||
    card.stageImages?.[stageKey] ||
    getCardImage(card.code, stageKey, card.image) ||
    card.image ||
    ""
  );
}

function scoreQuery(query, candidates) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;

  for (const raw of candidates) {
    const candidate = normalize(raw);
    if (!candidate) continue;

    if (candidate === q) best = Math.max(best, 1000 + candidate.length);
    else if (candidate.startsWith(q)) best = Math.max(best, 700 + q.length);
    else if (candidate.includes(q)) best = Math.max(best, 400 + q.length);
    else {
      const qWords = q.split(" ").filter(Boolean);

      if (qWords.length && qWords.every((word) => candidate.includes(word))) {
        best = Math.max(best, 250 + qWords.join("").length);
      }
    }
  }

  return best;
}

function normalizeCodeOnly(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function findExactOwnedCardByRawCode(cards, query) {
  const q = normalizeCodeOnly(query);
  if (!q) return null;

  const matches = cards.filter((card) => {
    return [
      card?.code,
      card?.baseCode,
      card?.cardCode,
      card?.sourceCode,
      card?.instanceId,
      card?.id,
      card?.key,
    ]
      .filter(Boolean)
      .some((value) => normalizeCodeOnly(value) === q);
  });

  return matches.length === 1 ? matches[0] : null;
}

function getOwnedCards(player) {
  return (Array.isArray(player.cards) ? player.cards : [])
    .map((rawCard, sourceIndex) => {
      const card = hydrateCard(rawCard);
      if (!card) return null;

      return {
        ...card,
        sourceIndex,
      };
    })
    .filter(Boolean);
}

function findOwnedCardByNameOnly(player, query) {
  const cards = getOwnedCards(player);
  const exactCode = findExactOwnedCardByRawCode(cards, query);
  if (exactCode) return exactCode;
  const direct = findOwnedCardByCodeOrName(cards, query);
  if (direct) return direct;

  const scored = cards
    .map((card) => ({
      card,
      score: scoreQuery(query, [
        card.code,
        card.name,
        card.displayName,
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].card : null;
}

function findOwnedCardBySkinQuery(player, query) {
  const foundSkin = findSkinSetByQuery(player, query);

  if (!foundSkin) return null;

  const cards = getOwnedCards(player);

  const targetCode = normalizeSkinCode(
    foundSkin.skinSet?.cardCode || foundSkin.key || ""
  );

  const targetOriginalName = normalizeSkinName(
    foundSkin.skinSet?.originalName || ""
  );

  return (
    cards.find((card) => {
      const code = normalizeSkinCode(card?.code || "");
      const name = normalizeSkinName(card?.name || "");
      const displayName = normalizeSkinName(card?.displayName || "");

      return (
        (targetCode && code === targetCode) ||
        (targetOriginalName &&
          (name === targetOriginalName || displayName === targetOriginalName))
      );
    }) || null
  );
}

function findOwnedCardOrSkinByQuery(player, query) {
  return (
    findOwnedCardByNameOnly(player, query) ||
    findOwnedCardBySkinQuery(player, query)
  );
}

function findFruitTemplate(value) {
  const q = normalize(value);
  if (!q) return null;

  return (
    devilFruitsDb.find((item) => normalize(item.code) === q) ||
    devilFruitsDb.find((item) => normalize(item.name) === q) ||
    devilFruitsDb.find((item) => normalize(item.code).includes(q)) ||
    devilFruitsDb.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

function findWeaponTemplate(value) {
  const q = normalize(value);
  if (!q) return null;

  return (
    weaponsDb.find((item) => normalize(item.code) === q) ||
    weaponsDb.find((item) => normalize(item.name) === q) ||
    weaponsDb.find((item) => normalize(item.code).includes(q)) ||
    weaponsDb.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

function getFragmentAmount(player, target) {
  const code = normalize(target?.code);
  const name = normalize(target?.displayName || target?.name);
  const fragments = Array.isArray(player?.fragments) ? player.fragments : [];

  const possibleCodes = [
    code,
    code ? `weapon_fragment_${code}` : null,
    code ? `weapon fragment ${code}` : null,
  ]
    .filter(Boolean)
    .map(normalize);

  const found = fragments.find((entry) => {
    const entryCode = normalize(entry.code);
    const entryName = normalize(entry.name || entry.displayName);

    return (
      possibleCodes.includes(entryCode) ||
      possibleCodes.includes(entryName) ||
      (name && entryName === name) ||
      (name && entryCode === name)
    );
  });

  return Math.max(0, Number(found?.amount || 0));
}

function pushUnique(list, value) {
  const clean = String(value || "").trim();
  if (!clean) return list;

  if (!list.some((entry) => normalize(entry) === normalize(clean))) {
    list.push(clean);
  }

  return list;
}

function findCardDisplayNameByOwnerCode(value) {
  const target = normalize(value);
  if (!target) return null;

  const found = (Array.isArray(cardsData) ? cardsData : []).find((card) => {
    const code = normalize(card?.code);
    const name = normalize(card?.name);
    const displayName = normalize(card?.displayName);

    return code === target || name === target || displayName === target;
  });

  return found?.displayName || found?.name || null;
}

function formatOwnerSignatureValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  return findCardDisplayNameByOwnerCode(raw) || raw;
}

function getOwnerSignature(item) {
  const owners = Array.isArray(item?.owners) ? item.owners.filter(Boolean) : [];

  if (owners.length) {
    return owners
      .map(formatOwnerSignatureValue)
      .filter(Boolean)
      .join(", ");
  }

  if (item?.ownerSignature) return formatOwnerSignatureValue(item.ownerSignature);
  if (item?.signature) return formatOwnerSignatureValue(item.signature);
  if (item?.owner) return formatOwnerSignatureValue(item.owner);

  return "None";
}

function getWeaponPercentAtLevel(basePercent, level) {
  const lv = Math.max(0, Number(level || 0));

  return {
    atk: Number(basePercent?.atk || 0) + lv * 1,
    hp: Number(basePercent?.hp || 0) + lv * 1,
    speed: Number(basePercent?.speed || 0),
  };
}

function buildOwnedFruitPool(player) {
  const fruits = new Map();

  for (const entry of Array.isArray(player.devilFruits) ? player.devilFruits : []) {
    const template = findFruitTemplate(entry.code || entry.name);
    if (!template) continue;

    const key = String(template.code);
    const existing = fruits.get(key) || {
      ...template,
      amount: 0,
      equippedOn: [],
    };

    existing.amount += Math.max(1, Number(entry.amount || 1));
    fruits.set(key, existing);
  }

  for (const rawCard of Array.isArray(player.cards) ? player.cards : []) {
    if (!rawCard.equippedDevilFruit) continue;

    const template = findFruitTemplate(
      rawCard.equippedDevilFruitName || rawCard.equippedDevilFruit
    );

    if (!template) continue;

    const key = String(template.code);
    const existing = fruits.get(key) || {
      ...template,
      amount: 0,
      equippedOn: [],
    };

    pushUnique(existing.equippedOn, rawCard.displayName || rawCard.name || rawCard.code);
    fruits.set(key, existing);
  }

  return [...fruits.values()];
}

function buildOwnedWeaponPool(player) {
  const pool = new Map();

  for (const entry of Array.isArray(player.weapons) ? player.weapons : []) {
    const template = findWeaponTemplate(entry.code || entry.name);
    if (!template) continue;

    const key = String(template.code);
    const existing =
      pool.get(key) || {
        ...template,
        amount: 0,
        equippedOn: [],
        bestUpgradeLevel: 0,
      };

    existing.amount += Math.max(1, Number(entry.amount || 1));
    existing.bestUpgradeLevel = Math.max(
      existing.bestUpgradeLevel,
      Number(entry.upgradeLevel || 0)
    );

    pool.set(key, existing);
  }

  for (const rawCard of Array.isArray(player.cards) ? player.cards : []) {
    const equipped = Array.isArray(rawCard.equippedWeapons)
      ? rawCard.equippedWeapons
      : [];

    for (const entry of equipped) {
      const template = findWeaponTemplate(entry.code || entry.name);
      if (!template) continue;

      const key = String(template.code);
      const existing =
        pool.get(key) || {
          ...template,
          amount: 0,
          equippedOn: [],
          bestUpgradeLevel: 0,
        };

      pushUnique(existing.equippedOn, rawCard.displayName || rawCard.name || rawCard.code);
      existing.bestUpgradeLevel = Math.max(
        existing.bestUpgradeLevel,
        Number(entry.upgradeLevel || 0)
      );

      pool.set(key, existing);
    }
  }

  return [...pool.values()];
}

function findOwnedFruit(player, query) {
  const pool = buildOwnedFruitPool(player);

  const scored = pool
    .map((fruit) => ({
      fruit,
      score: scoreQuery(query, [fruit.name, fruit.code, fruit.type]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].fruit : null;
}

function findOwnedWeapon(player, query) {
  const pool = buildOwnedWeaponPool(player);

  const scored = pool
    .map((weapon) => ({
      weapon,
      score: scoreQuery(query, [weapon.name, weapon.code, weapon.type]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].weapon : null;
}

function findOwnedWeaponByExactNameOnly(player, query) {
  const q = normalize(query);
  if (!q) return null;

  const pool = buildOwnedWeaponPool(player);

  return (
    pool.find((weapon) => normalize(weapon.name) === q) ||
    pool.find((weapon) => normalize(weapon.displayName) === q) ||
    null
  );
}

function buildOwnedFruitEmbed(ownerName, player, fruit) {
  const percent = fruit.statPercent || fruit.statBonus || {
    atk: 0,
    hp: 0,
    speed: 0,
  };

  const equippedText =
    Array.isArray(fruit.equippedOn) && fruit.equippedOn.length
      ? fruit.equippedOn.join(", ")
      : "Not equipped";

  const fragments = getFragmentAmount(player, fruit);

  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`${ownerName}'s Devil Fruit`)
    .setDescription(
      [
        `**${fruit.name}**`,
        `${fruit.type || "Devil Fruit"}`,
        "",
        `Rarity: ${String(fruit.rarity || "B").toUpperCase()}`,
        `Power: ${Number(getFruitPower(fruit) || 0)}`,
        `ATK: +${Number(percent.atk || 0)}%`,
        `HP: +${Number(percent.hp || 0)}%`,
        `SPD: +${Number(percent.speed || 0)}%`,
        `Owner Signature: ${getOwnerSignature(fruit)}`,
        `Equipped On: ${equippedText}`,
        "",
        `${fruit.description || "No description."}`,
        "",
      ].join("\n")
    )
    .setThumbnail(getRarityBadge(fruit.rarity || "B") || null)
    .setImage(getDevilFruitImage(fruit.code, fruit.image || "") || null)
    .setFooter({
      text: `Owned devil fruit info • ${ownerName}`,
    });
}

function buildOwnedWeaponEmbed(ownerName, player, weapon) {
  const percent = getWeaponPercentAtLevel(
    weapon.statPercent || weapon.statBonus || {
      atk: 0,
      hp: 0,
      speed: 0,
    },
    weapon.bestUpgradeLevel || 0
  );

  const equippedText =
    Array.isArray(weapon.equippedOn) && weapon.equippedOn.length
      ? [...new Set(weapon.equippedOn.map((x) => String(x).trim()).filter(Boolean))].join(", ")
      : "Not equipped";

  const fragments = getFragmentAmount(player, weapon);

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`${ownerName}'s Weapon`)
    .setDescription(
      [
        `**${weapon.name}**`,
        `${weapon.type || "Weapon"}`,
        "",
        `Rarity: ${String(weapon.rarity || "B").toUpperCase()}`,
        `Power: ${Number(getWeaponPower(weapon, weapon.bestUpgradeLevel || 0) || 0)}`,
        `ATK: +${Number(percent.atk || 0)}%`,
        `HP: +${Number(percent.hp || 0)}%`,
        `SPD: +${Number(percent.speed || 0)}%`,
        `Owner Signature: ${getOwnerSignature(weapon)}`,
        `Best Upgrade: +${Math.max(0, Number(weapon.bestUpgradeLevel || 0))}`,
        `Equipped On: ${equippedText}`,
        "",
        `${weapon.description || "No description."}`,
        "",
        `Fragment: ${fragments}`,
      ].join("\n")
    )
    .setThumbnail(getRarityBadge(weapon.rarity || "B") || null)
    .setImage(getWeaponImage(weapon.code, weapon.image || "") || null)
    .setFooter({
      text: `Owned weapon info • ${ownerName}`,
    });
}







function findTemplateNameByCode(list, value) {
  const q = normalize(value);
  if (!q) return null;

  const found = (Array.isArray(list) ? list : []).find((item) => {
    return (
      normalize(item?.code) === q ||
      normalize(item?.name) === q ||
      normalize(item?.displayName) === q
    );
  });

  return found?.name || found?.displayName || null;
}

function isNoneText(value) {
  const text = String(value || "").trim().toLowerCase();
  return !text || text === "none" || text === "not equipped" || text === "null" || text === "undefined";
}

function getEquipmentBaseName(value) {
  return String(value || "")
    .trim()
    .replace(/\s*\+\d+\s*$/g, "");
}

function getEquipmentUpgradeLevel(value) {
  const match = String(value || "").match(/\+(\d+)\s*$/);
  return match ? Number(match[1] || 0) : 0;
}

function pushUniqueDisplay(list, value) {
  const clean = String(value || "").trim();
  if (isNoneText(clean)) return;

  const base = normalize(getEquipmentBaseName(clean));
  const level = getEquipmentUpgradeLevel(clean);

  const existingIndex = list.findIndex((entry) => {
    return normalize(getEquipmentBaseName(entry)) === base;
  });

  if (existingIndex === -1) {
    list.push(clean);
    return;
  }

  const existingLevel = getEquipmentUpgradeLevel(list[existingIndex]);

  if (level > existingLevel) {
    list[existingIndex] = clean;
  }
}

function getLiveSourceCardsForMerge(player, mergeCard) {
  const ownedCards = Array.isArray(player?.cards)
    ? player.cards.map((card) => hydrateCard(card)).filter(Boolean)
    : [];

  const sourceCodes = getMergeSourceCodes(mergeCard);

  return sourceCodes
    .map((code) => {
      const target = normalize(code);

      return (
        ownedCards.find((card) => normalize(card?.code) === target) ||
        ownedCards.find((card) => normalize(card?.baseCode) === target) ||
        ownedCards.find((card) => normalize(card?.displayName || card?.name).includes(target)) ||
        null
      );
    })
    .filter(Boolean);
}

function getLiveWeaponsFromCard(card) {
  const names = [];
  const equippedWeapons = Array.isArray(card?.equippedWeapons) ? card.equippedWeapons : [];

  // Merge equipment must follow real equipped weapons only.
  for (const entry of equippedWeapons) {
    const level = Math.max(0, Number(entry?.upgradeLevel || entry?.level || 0));
    const baseName =
      entry?.displayName ||
      entry?.name ||
      entry?.weaponName ||
      findTemplateNameByCode(weaponsDb, entry?.code || entry?.weaponCode);

    if (!isNoneText(baseName)) {
      pushUniqueDisplay(names, level > 0 ? `${baseName} +${level}` : baseName);
    }
  }

  // Legacy equipped fields are allowed, but template/canon fields are not.
  if (!names.length) {
    pushUniqueDisplay(names, card?.equippedWeaponName);
    pushUniqueDisplay(names, card?.equippedWeaponDisplayName);
    pushUniqueDisplay(
      names,
      findTemplateNameByCode(
        weaponsDb,
        card?.equippedWeaponCode || card?.equippedWeapon
      )
    );
  }

  return names;
}

function getLiveFruitsFromCard(card) {
  const names = [];

  // Merge fruit display must follow real equipped fruit only.
  // Do not read displayFruitName/devilFruit because those can be template/canon fields after hydrateCard.
  pushUniqueDisplay(names, card?.equippedDevilFruitName);
  pushUniqueDisplay(names, card?.equippedDevilFruitDisplayName);
  pushUniqueDisplay(
    names,
    findTemplateNameByCode(
      devilFruitsDb,
      card?.equippedDevilFruitCode || card?.equippedDevilFruit
    )
  );

  return names;
}

function isMergeInfoCard(card) {
  return isMergeCard(card);
}

function enrichMergedCardLiveEquipment(player, card) {
  if (!card || !isMergeInfoCard(card)) return card;

  const sourceCards = getLiveSourceCardsForMerge(player, card);
  const weaponNames = [];
  const fruitNames = [];

  for (const sourceCard of sourceCards) {
    for (const name of getLiveWeaponsFromCard(sourceCard)) {
      pushUniqueDisplay(weaponNames, name);
    }

    for (const name of getLiveFruitsFromCard(sourceCard)) {
      pushUniqueDisplay(fruitNames, name);
    }
  }

  return {
    ...card,

    displayWeaponName: weaponNames.length ? weaponNames.join(", ") : "None",
    weaponSet: weaponNames.length ? weaponNames.join(", ") : "None",
    weapon: weaponNames.length ? weaponNames.join(", ") : "None",

    displayFruitName: fruitNames.length ? fruitNames.join(", ") : "None",
    devilFruit: fruitNames.length ? fruitNames.join(", ") : "None",
  };
}


function buildOwnedCardEmbed(ownerName, player, card) {
  card = applyCustomSkinToCard(player, card);
  const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
  const form = getCurrentForm(card);
  const stageImage = getCurrentStageImage(card);
  const atkRange = formatAtkRange(card.atk);
  const syncedFragments = getFragmentAmount(player, card);

  const extraLines = card.cardRole === "boost" ? [
    `Form: ${card.evolutionKey || `M${stage}`}`,
    `Tier: ${card.currentTier || card.rarity}`,
    card.hasCustomSkin
      ? `Skinned Character: ${card.skinnedCharacter || card.originalDisplayName || "Unknown"}`
      : null,
    `Power: ${Number(card.currentPower || 0)}`,
    `Effect: ${getRoadPoneglyphDisplayEffect(card || stageCard || form, stage || card?.evolutionStage || 1, card.effectText || "No effect text")}`,
    `Target: ${card.boostTarget || "team"}`,
    `Boost Type: ${card.boostType || "unknown"}`,
    `Devil Fruit: ${card.displayFruitName || "None"}`,
    `Fragments: ${syncedFragments}`,
  ] : [
          `Form: ${card.evolutionKey || `M${stage}`}`,
          `Tier: ${card.currentTier || card.rarity}`,
          card.hasCustomSkin
            ? `Skinned Character: ${card.skinnedCharacter || card.originalDisplayName || "Unknown"}`
            : null,
          formatCardLevelLine(card),
          `Raid Prestige: ${Math.max(0, Math.min(200, Number(card.raidPrestige || 0)))}/200`,
          `Power: ${Number(card.currentPower || 0)}`,
          `Health: ${Number(card.hp || 0)}`,
          `Speed: ${Number(card.speed || 0)}`,
          `Attack: ${atkRange}`,
          `Weapons: ${card.displayWeaponName || card.weaponSet || card.weapon || "None"}`,
          `Devil Fruit: ${card.displayFruitName || card.devilFruit || "None"}`,
          `Type: ${card.type || card.cardRole}`,
          `Kills: ${Number(card.kills || 0)}`,
          `Fragments: ${syncedFragments}`,
        ];

  return buildCardStyleEmbed({
    color: 0x1abc9c,
    ownerName,
    card,
    image: stageImage,
    badgeImage: form?.badgeImage || card.badgeImage || "",
    formName: card.hasCustomSkin
      ? card.skinTitle
      : form?.name || card.variant || "Unknown Form",
    tier: card.currentTier || card.rarity,
    footerText: `Owned card info • ${ownerName}`,
    extraLines,
  });
}

module.exports = {
  name: "mci",
  aliases: ["mycardinfo"],

  async execute(message, args) {
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply("Usage: `op mci <card/weapon/fruit name>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const boosts = getPassiveBoostSummary(player);

    const exactWeapon = findOwnedWeaponByExactNameOnly(player, query);
    if (exactWeapon) {
      return message.reply({
        embeds: [buildOwnedWeaponEmbed(message.author.username, player, exactWeapon)],
      });
    }

    const ownedCard = findOwnedCardOrSkinByQuery(player, query);

    let syncedOwnedCard = ownedCard;

    if (isMergeCard(ownedCard)) {
      syncedOwnedCard = buildMergedCard(player, ownedCard);
    }

    syncedOwnedCard = enrichMergedCardLiveEquipment(player, syncedOwnedCard);

    const card = applyBoostedDisplayStats(syncedOwnedCard, boosts);

    if (card) {
      return message.reply({
        embeds: [buildOwnedCardEmbed(message.author.username, player, card)],
      });
    }

    const ownedFruit = findOwnedFruit(player, query);
    if (ownedFruit) {
      return message.reply({
        embeds: [buildOwnedFruitEmbed(message.author.username, player, ownedFruit)],
      });
    }

    const ownedWeapon = findOwnedWeapon(player, query);
    if (ownedWeapon) {
      return message.reply({
        embeds: [buildOwnedWeaponEmbed(message.author.username, player, ownedWeapon)],
      });
    }

    return message.reply("You do not own that card, devil fruit, or weapon.");
  },
};