const rawCards = require("../data/cards");

const MERGE_SOURCE_CODES = [
  "luffy_straw_hat",
  "zoro_pirate_hunter",
  "sanji_black_leg",
];

const MERGE_RATIO = 0.3;
const RAID_PRESTIGE_CAP = 200;
const RAID_PRESTIGE_ATK_PER_LEVEL = 0.25;
const RAID_PRESTIGE_HP_PER_LEVEL = 0.25;
const RAID_PRESTIGE_SPD_PER_LEVEL = 0.1;

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

  if (n >= 1) {
    return Math.max(1, Math.min(3, Math.floor(n)));
  }

  const key = String(card?.evolutionKey || card?.form || "").toUpperCase();
  const matched = key.match(/M([123])/);

  return matched ? Number(matched[1]) : 1;
}

function getLevel(card) {
  const level = Number(card?.level || card?.currentLevel || card?.lvl || 1);

  if (!Number.isFinite(level)) return 1;

  return Math.max(1, Math.min(100, Math.floor(level)));
}

function getRaidPrestige(card) {
  const prestige = Number(
    card?.raidPrestige ||
      card?.prestige ||
      card?.bossPrestige ||
      card?.arenaPrestige ||
      0
  );

  if (!Number.isFinite(prestige)) return 0;

  return Math.max(0, Math.min(RAID_PRESTIGE_CAP, Math.floor(prestige)));
}

function getLevelMultiplier(stage, level) {
  const s = Math.max(1, Math.min(3, Number(stage || 1)));
  const lvl = Math.max(1, Math.min(100, Number(level || 1)));

  if (s === 1) {
    if (lvl <= 1) return 1;
    if (lvl >= 50) return 3;

    return 1 + ((lvl - 1) / 49) * 2;
  }

  if (s === 2) {
    if (lvl <= 50) return 3;
    if (lvl >= 85) return 3.8;

    return 3 + ((lvl - 50) / 35) * 0.8;
  }

  if (lvl <= 85) return 3.8;
  if (lvl >= 100) return 3.8 * 1.18;

  return 3.8 + ((lvl - 85) / 15) * (3.8 * 1.18 - 3.8);
}

function applyPrestige(value, percent) {
  return Math.floor(Number(value || 0) * (1 + Number(percent || 0) / 100));
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

function getNumber(source, keys) {
  for (const key of keys) {
    const value = Number(source?.[key]);

    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return 0;
}

function getBaseAtk(template, form) {
  return getNumber(form, ["baseAtk", "atk"]) || getNumber(template, ["baseAtk", "atk"]);
}

function getBaseHp(template, form) {
  return getNumber(form, ["baseHp", "hp"]) || getNumber(template, ["baseHp", "hp"]);
}

function getBaseSpeed(template, form) {
  return (
    getNumber(form, ["baseSpeed", "speed", "spd"]) ||
    getNumber(template, ["baseSpeed", "speed", "spd"])
  );
}

function getBasePower(template, form) {
  return (
    getNumber(form, ["basePower", "power", "currentPower"]) ||
    getNumber(template, ["basePower", "power", "currentPower"])
  );
}

function buildSourceTemplateSnapshot(code, stageOverride = 1) {
  const template = getTemplateByCode(code) || {};
  const stage = Math.max(1, Math.min(3, Number(stageOverride || 1)));
  const form = getForm(template, stage);

  return {
    code: template.code || code,
    name: template.name,
    displayName: template.displayName || template.name,
    stage,
    baseAtk: getBaseAtk(template, form),
    baseHp: getBaseHp(template, form),
    baseSpeed: getBaseSpeed(template, form),
    basePower: getBasePower(template, form),
    weapon: form?.weaponSet || form?.weapon || template.weaponSet || template.weapon,
    devilFruit:
      form?.devilFruitName ||
      form?.devilFruit ||
      template.devilFruitName ||
      template.devilFruit,
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

  const level = getLevel(ownedLzs);
  const prestige = getRaidPrestige(ownedLzs);

  const sourceStage =
    options.sourceStage ||
    options.displayStage ||
    stage;

  const sources = MERGE_SOURCE_CODES.map((code) =>
    buildSourceTemplateSnapshot(code, sourceStage)
  );

  const mergedBaseAtk = Math.floor(
    sources.reduce((sum, source) => sum + source.baseAtk * MERGE_RATIO, 0)
  );

  const mergedBaseHp = Math.floor(
    sources.reduce((sum, source) => sum + source.baseHp * MERGE_RATIO, 0)
  );

  const mergedBaseSpeed = Math.floor(
    sources.reduce((sum, source) => sum + source.baseSpeed * MERGE_RATIO, 0)
  );

  const mergedBasePower = Math.floor(
    sources.reduce((sum, source) => sum + source.basePower * MERGE_RATIO, 0)
  );

  const levelMultiplier = getLevelMultiplier(stage, level);

  const scaledAtk = Math.floor(mergedBaseAtk * levelMultiplier);
  const scaledHp = Math.floor(mergedBaseHp * levelMultiplier);
  const scaledSpeed = Math.floor(mergedBaseSpeed * levelMultiplier);
  const scaledPower = Math.floor(mergedBasePower * levelMultiplier);

  const finalAtk = applyPrestige(
    scaledAtk,
    prestige * RAID_PRESTIGE_ATK_PER_LEVEL
  );

  const finalHp = applyPrestige(
    scaledHp,
    prestige * RAID_PRESTIGE_HP_PER_LEVEL
  );

  const finalSpeed = applyPrestige(
    scaledSpeed,
    prestige * RAID_PRESTIGE_SPD_PER_LEVEL
  );

  const finalPower = Math.floor(
    scaledPower *
      (1 +
        prestige *
          ((RAID_PRESTIGE_ATK_PER_LEVEL +
            RAID_PRESTIGE_HP_PER_LEVEL +
            RAID_PRESTIGE_SPD_PER_LEVEL) /
            3) /
          100)
  );

  const weapon = uniqueJoin(sources.map((source) => source.weapon));
  const devilFruit = uniqueJoin(sources.map((source) => source.devilFruit));

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

    level,
    currentLevel: level,
    lvl: level,

    raidPrestige: prestige,
    prestige,

    originalBaseAtk: mergedBaseAtk,
    originalBaseHp: mergedBaseHp,
    originalBaseSpeed: mergedBaseSpeed,

    baseAtk: mergedBaseAtk,
    baseHp: mergedBaseHp,
    baseSpeed: mergedBaseSpeed,

    atk: finalAtk,
    hp: finalHp,
    speed: finalSpeed,
    spd: finalSpeed,

    finalAtk,
    finalHp,
    finalSpeed,

    displayAtk: finalAtk,
    displayHp: finalHp,
    displaySpeed: finalSpeed,

    combatAtk: finalAtk,
    combatHp: finalHp,
    combatSpeed: finalSpeed,

    basePower: mergedBasePower,
    power: finalPower,
    currentPower: finalPower,
    powerCaps: {
      M1: Math.floor(mergedBasePower * getLevelMultiplier(1, 50)),
      M2: Math.floor(mergedBasePower * getLevelMultiplier(2, 85)),
      M3: Math.floor(mergedBasePower * getLevelMultiplier(3, 100)),
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

    syncNote: "30% Monkey D. Luffy + 30% Roronoa Zoro + 30% Sanji",
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