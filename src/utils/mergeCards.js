const rawCards = require("../data/cards");

const MERGE_SOURCE_CODES = [
  "luffy_straw_hat",
  "zoro_pirate_hunter",
  "sanji_black_leg",
];

const MERGE_RATIO = 0.5;

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeCode(value) {
  return normalize(value).replace(/\s+/g, "_");
}

function isLzsCard(card) {
  const code = normalizeCode(card?.code);
  const name = normalize(card?.displayName || card?.name || card?.title);
  return code === "lzs" || name === "monster trio";
}

function getTemplateByCode(code) {
  const target = normalizeCode(code);

  return (
    (Array.isArray(rawCards) ? rawCards : []).find(
      (card) => normalizeCode(card?.code) === target
    ) || null
  );
}

function getStage(card) {
  const n = Number(card?.evolutionStage || card?.stage || 0);
  if (n >= 1) return Math.max(1, Math.min(3, Math.floor(n)));

  const key = String(card?.evolutionKey || card?.form || "").toUpperCase();
  const matched = key.match(/M([123])/);
  return matched ? Number(matched[1]) : 1;
}

function findOwnedSource(player, code) {
  const target = normalizeCode(code);

  return (
    (Array.isArray(player?.cards) ? player.cards : []).find(
      (card) => normalizeCode(card?.code) === target
    ) || null
  );
}

function getForm(template, stage) {
  return Array.isArray(template?.evolutionForms)
    ? template.evolutionForms[stage - 1] || {}
    : {};
}

function getNumber(card, keys) {
  for (const key of keys) {
    const value = Number(card?.[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }

  return 0;
}

function getAtk(card) {
  return getNumber(card, [
    "atk",
    "currentAtk",
    "finalAtk",
    "totalAtk",
    "battleAtk",
    "baseAtk",
  ]);
}

function getHp(card) {
  return getNumber(card, [
    "hp",
    "maxHp",
    "currentHp",
    "finalHp",
    "totalHp",
    "battleHp",
    "baseHp",
  ]);
}

function getSpeed(card) {
  return getNumber(card, [
    "speed",
    "spd",
    "currentSpeed",
    "finalSpeed",
    "totalSpeed",
    "battleSpeed",
    "baseSpeed",
  ]);
}

function getPower(card) {
  return getNumber(card, [
    "currentPower",
    "basePower",
    "power",
    "finalPower",
    "totalPower",
    "battlePower",
  ]);
}

function getSourceMergedCard(player, code, stageOverride = null, options = {}) {
  const template = getTemplateByCode(code) || {};
  const owned = options.templateOnly ? null : findOwnedSource(player, code);

  const stage = Math.max(
    1,
    Math.min(3, Number(stageOverride || getStage(owned || template) || 1))
  );

  const form = getForm(template, stage);

  if (options.templateOnly) {
    return {
      ...template,
      ...form,
      code: template.code || code,
      name: template.name,
      displayName: template.displayName || template.name,
      evolutionStage: stage,
      evolutionKey: `M${stage}`,
    };
  }

  return {
    ...template,
    ...form,
    ...owned,
    code: template.code || owned?.code || code,
    name: template.name || owned?.name,
    displayName:
      template.displayName || template.name || owned?.displayName || owned?.name,
    evolutionStage: stage,
    evolutionKey: `M${stage}`,
  };
}

function cleanValue(value) {
  const text = String(value || "").trim();
  if (!text || text.toLowerCase() === "none") return "";
  if (text.toLowerCase().includes("synced from")) return "";
  return text;
}

function splitParts(value) {
  return cleanValue(value)
    .split(/\s*[,/]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function uniqueJoin(values) {
  const seen = new Set();
  const out = [];

  for (const value of values) {
    for (const part of splitParts(value)) {
      const key = normalize(part);
      if (!key || key === "none" || seen.has(key)) continue;
      seen.add(key);
      out.push(part);
    }
  }

  return out.length ? out.join(", ") : "None";
}

function buildMergedLzsCard(player, baseCard = null, stageOverride = null, options = {}) {
  const template = getTemplateByCode("lzs") || {};
  const ownedLzs =
    baseCard && isLzsCard(baseCard)
      ? baseCard
      : findOwnedSource(player, "lzs") || baseCard || template;

  const stage = Math.max(
    1,
    Math.min(3, Number(stageOverride || getStage(ownedLzs) || 1))
  );

  const sourceStage = options.sourceStage || options.displayStage || null;

  const sources = MERGE_SOURCE_CODES.map((code) =>
    getSourceMergedCard(player, code, sourceStage, options)
  );

  const atk = Math.floor(
    sources.reduce((sum, card) => sum + getAtk(card) * MERGE_RATIO, 0)
  );

  const hp = Math.floor(
    sources.reduce((sum, card) => sum + getHp(card) * MERGE_RATIO, 0)
  );

  const speed = Math.floor(
    sources.reduce((sum, card) => sum + getSpeed(card) * MERGE_RATIO, 0)
  );

  const currentPower = Math.floor(
    sources.reduce((sum, card) => sum + getPower(card) * MERGE_RATIO, 0)
  );

  const weapon = uniqueJoin(
    sources.map((card) =>
      options.templateOnly
        ? card.weaponSet || card.weapon
        : card.displayWeaponName ||
          card.equippedWeaponName ||
          card.equippedWeapon ||
          card.weaponSet ||
          card.weapon
    )
  );

  const devilFruit = uniqueJoin(
    sources.map((card) =>
      options.templateOnly
        ? card.devilFruitName || card.devilFruit
        : card.displayFruitName ||
          card.equippedDevilFruitName ||
          card.equippedDevilFruit ||
          card.devilFruitName ||
          card.devilFruit
    )
  );

  const form = getForm(template, stage);

  return {
    ...template,
    ...form,
    ...ownedLzs,

    code: "lzs",
    name: "Monster Trio",
    displayName: "Monster Trio",
    title: "Monster Trio",

    rarity: "M",
    baseTier: "M",
    currentTier: "M",
    tier: "M",

    cardRole: "battle",
    role: "battle",
    category: "battle",
    type: "Merge",

    canPull: false,
    canPA: false,
    summonOnly: true,
    mergeOnly: true,

    canEquipWeapon: false,
    canEquipDevilFruit: false,
    equipmentLocked: true,
    equipmentSyncOnly: true,

    mergeSourceCodes: MERGE_SOURCE_CODES,
    mergeStatRatio: MERGE_RATIO,

    evolutionStage: stage,
    evolutionKey: `M${stage}`,

    atk,
    hp,
    speed,
    spd: speed,

    basePower: currentPower,
    power: currentPower,
    currentPower,
    powerCaps: {
      M1: currentPower,
      M2: currentPower,
      M3: currentPower,
    },

    weapon,
    weaponSet: weapon,
    displayWeaponName: weapon,
    devilFruit,
    displayFruitName: devilFruit,

    equipType:
      weapon !== "None" && devilFruit !== "None"
        ? "Devil Fruit / Weapon"
        : devilFruit !== "None"
        ? "Devil Fruit"
        : weapon !== "None"
        ? "Weapon"
        : "None",

    syncNote: "50% Monkey D. Luffy + 50% Roronoa Zoro + 50% Sanji",
  };
}

function syncMergedCardsInPlayer(player) {
  if (!player || typeof player !== "object") return player;

  const cards = Array.isArray(player.cards) ? player.cards : [];
  if (!cards.some(isLzsCard)) return player;

  const basePlayer = {
    ...player,
    cards,
  };

  return {
    ...player,
    cards: cards.map((card) =>
      isLzsCard(card) ? buildMergedLzsCard(basePlayer, card) : card
    ),
  };
}

function findOwnedCardByCodeOrName(cards, query) {
  const q = normalize(query);
  const qCode = normalizeCode(query);

  if (!q) return null;

  return (
    (Array.isArray(cards) ? cards : []).find((card) => {
      const code = normalizeCode(card?.code);
      const name = normalize(card?.name);
      const displayName = normalize(card?.displayName);
      const title = normalize(card?.title);

      return (
        code === qCode ||
        name === q ||
        displayName === q ||
        title === q ||
        name.includes(q) ||
        displayName.includes(q)
      );
    }) || null
  );
}

module.exports = {
  MERGE_SOURCE_CODES,
  isLzsCard,
  buildMergedLzsCard,
  syncMergedCardsInPlayer,
  findOwnedCardByCodeOrName,
};