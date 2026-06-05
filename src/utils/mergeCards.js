const rawCards = require("../data/cards");
const { hydrateCard } = require("./evolution");

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

function getStageMaxLevel(stage) {
  const n = Math.max(1, Math.min(3, Number(stage || 1)));

  if (n === 1) return 50;
  if (n === 2) return 85;
  return 100;
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

function getOwnLevelFactor(stage, level) {
  const s = Math.max(1, Math.min(3, Number(stage || 1)));
  const lvl = Math.max(1, Math.min(100, Number(level || 1)));
  const maxLevel = getStageMaxLevel(s);

  if (lvl >= maxLevel) return 1;

  if (s === 1) {
    return 0.45 + ((Math.max(1, lvl) - 1) / 49) * 0.55;
  }

  if (s === 2) {
    return 0.78 + ((Math.max(50, lvl) - 50) / 35) * 0.22;
  }

  return 0.88 + ((Math.max(85, lvl) - 85) / 15) * 0.12;
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

function getAtk(card) {
  return getNumber(card, [
    "displayAtk",
    "combatAtk",
    "finalAtk",
    "atk",
    "baseAtk",
  ]);
}

function getHp(card) {
  return getNumber(card, [
    "displayHp",
    "combatHp",
    "finalHp",
    "hp",
    "baseHp",
  ]);
}

function getSpeed(card) {
  return getNumber(card, [
    "displaySpeed",
    "combatSpeed",
    "finalSpeed",
    "speed",
    "spd",
    "baseSpeed",
  ]);
}

function getPower(card) {
  return getNumber(card, [
    "currentPower",
    "power",
    "basePower",
    "finalPower",
  ]);
}

function buildTemplateSourceCard(code, stage, level) {
  const template = getTemplateByCode(code) || {};
  const form = getForm(template, stage);

  return hydrateCard({
    ...template,
    ...form,
    code: template.code || code,
    name: template.name,
    displayName: template.displayName || template.name,
    evolutionStage: stage,
    evolutionKey: `M${stage}`,
    level,
    currentLevel: level,
    lvl: level,
    raidPrestige: 0,
    prestige: 0,
  });
}

function buildLiveSourceCard(player, code) {
  const owned = findOwnedSource(player, code);

  if (owned) return hydrateCard(owned);

  const template = getTemplateByCode(code) || {};

  return hydrateCard({
    ...template,
    evolutionStage: 1,
    evolutionKey: "M1",
    level: 1,
    currentLevel: 1,
    lvl: 1,
  });
}

function getSourceWeaponText(card, templateCode, forcedStage = null, templateOnly = false) {
  const template = getTemplateByCode(templateCode) || {};
  const stage = forcedStage || getStage(card);
  const form = getForm(template, stage);

  if (templateOnly) {
    return (
      form?.weaponSet ||
      form?.weapon ||
      template.weaponSet ||
      template.weapon ||
      "None"
    );
  }

  return (
    card?.displayWeaponName ||
    card?.weaponSet ||
    card?.weapon ||
    card?.equippedWeaponName ||
    form?.weaponSet ||
    form?.weapon ||
    template.weaponSet ||
    template.weapon ||
    "None"
  );
}

function getSourceFruitText(card, templateCode, forcedStage = null, templateOnly = false) {
  const template = getTemplateByCode(templateCode) || {};
  const stage = forcedStage || getStage(card);
  const form = getForm(template, stage);

  if (templateOnly) {
    return (
      form?.devilFruitName ||
      form?.devilFruit ||
      template.devilFruitName ||
      template.devilFruit ||
      "None"
    );
  }

  return (
    card?.displayFruitName ||
    card?.equippedDevilFruitName ||
    card?.devilFruitName ||
    card?.devilFruit ||
    form?.devilFruitName ||
    form?.devilFruit ||
    template.devilFruitName ||
    template.devilFruit ||
    "None"
  );
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

function buildLzsSources(player, stage, options = {}) {
  const sourceStage = Math.max(
    1,
    Math.min(3, Number(options.sourceStage || options.displayStage || stage || 1))
  );

  const displayLevel = Number(options.displayLevel || getStageMaxLevel(sourceStage));
  const templateOnly = Boolean(options.templateOnly);

  return MERGE_SOURCE_CODES.map((code) => {
    const source = templateOnly
      ? buildTemplateSourceCard(code, sourceStage, displayLevel)
      : buildLiveSourceCard(player, code);

    return {
      code,
      card: source || {},
      atk: getAtk(source),
      hp: getHp(source),
      speed: getSpeed(source),
      power: getPower(source),
      weapon: getSourceWeaponText(source, code, sourceStage, templateOnly),
      devilFruit: getSourceFruitText(source, code, sourceStage, templateOnly),
    };
  });
}

function sumMergedStat(sources, key) {
  return Math.floor(
    sources.reduce(
      (sum, source) => sum + Number(source?.[key] || 0) * MERGE_RATIO,
      0
    )
  );
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

  const level = options.templateOnly
    ? Number(options.displayLevel || getStageMaxLevel(stage))
    : getLevel(ownedLzs);

  const prestige = options.templateOnly ? 0 : getRaidPrestige(ownedLzs);

  const sources = buildLzsSources(player, stage, {
    ...options,
    sourceStage: options.sourceStage || stage,
    displayLevel: options.displayLevel || getStageMaxLevel(stage),
  });

  const mergedAtk = sumMergedStat(sources, "atk");
  const mergedHp = sumMergedStat(sources, "hp");
  const mergedSpeed = sumMergedStat(sources, "speed");
  const mergedPower = sumMergedStat(sources, "power");

  const ownLevelFactor = options.templateOnly ? 1 : getOwnLevelFactor(stage, level);

  const scaledAtk = Math.floor(mergedAtk * ownLevelFactor);
  const scaledHp = Math.floor(mergedHp * ownLevelFactor);
  const scaledSpeed = Math.floor(mergedSpeed * ownLevelFactor);
  const scaledPower = Math.floor(mergedPower * ownLevelFactor);

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

    originalBaseAtk: mergedAtk,
    originalBaseHp: mergedHp,
    originalBaseSpeed: mergedSpeed,

    baseAtk: mergedAtk,
    baseHp: mergedHp,
    baseSpeed: mergedSpeed,

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

    basePower: mergedPower,
    power: finalPower,
    currentPower: finalPower,
    powerCaps: {
      M1: mergedPower,
      M2: mergedPower,
      M3: mergedPower,
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

    syncNote: options.templateOnly
      ? "30% signature stats from Monkey D. Luffy + Roronoa Zoro + Sanji"
      : "Live 30% owned stats from Monkey D. Luffy + Roronoa Zoro + Sanji",
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
  MERGE_RATIO,
  isLzsCard,
  buildMergedLzsCard,
  syncMergedCardsInPlayer,
  findOwnedCardByCodeOrName,
};