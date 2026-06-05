const rawCards = require("../data/cards");
const { hydrateCard } = require("./evolution");

const MERGE_SOURCE_CODES = [
  "luffy_straw_hat",
  "zoro_pirate_hunter",
  "sanji_black_leg",
];

const MERGE_RATIO = 0.5;
const MERGE_FIXED_POWER = 100000;

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

  if (Number.isFinite(n) && n >= 1) {
    return Math.max(1, Math.min(3, Math.floor(n)));
  }

  const key = String(card?.evolutionKey || card?.form || "").toUpperCase();
  const matched = key.match(/M([123])/);

  return matched ? Number(matched[1]) : 1;
}

function getStageKey(stage) {
  return `M${Math.max(1, Math.min(3, Number(stage || 1)))}`;
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
    ? template.evolutionForms[Math.max(1, Math.min(3, Number(stage || 1))) - 1] || {}
    : {};
}

function getStageStatsBlock(source, stage) {
  const stageKey = getStageKey(stage);

  return (
    source?.stageStats?.[stageKey] ||
    source?.stats?.[stageKey] ||
    source?.masteryStats?.[stageKey] ||
    {}
  );
}

function firstPositiveNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return 0;
}

function getStageSpecificNumber(template, hydrated, stage, statType) {
  const safeStage = Math.max(1, Math.min(3, Number(stage || 1)));
  const stageKey = getStageKey(safeStage);
  const form = getForm(template, safeStage);
  const templateStageStats = getStageStatsBlock(template, safeStage);
  const hydratedStageStats = getStageStatsBlock(hydrated, safeStage);

  if (statType === "atk") {
    return firstPositiveNumber(
      form?.atk,
      form?.baseAtk,
      form?.displayAtk,
      form?.combatAtk,
      form?.finalAtk,

      templateStageStats?.atk,
      templateStageStats?.baseAtk,
      templateStageStats?.displayAtk,
      templateStageStats?.combatAtk,
      templateStageStats?.finalAtk,

      hydratedStageStats?.atk,
      hydratedStageStats?.baseAtk,
      hydratedStageStats?.displayAtk,
      hydratedStageStats?.combatAtk,
      hydratedStageStats?.finalAtk,

      template?.[`atk${stageKey}`],
      template?.[`baseAtk${stageKey}`],
      hydrated?.[`atk${stageKey}`],
      hydrated?.[`baseAtk${stageKey}`],

      hydrated?.displayAtk,
      hydrated?.combatAtk,
      hydrated?.finalAtk,
      hydrated?.currentAtk,
      hydrated?.totalAtk,
      hydrated?.battleAtk,
      hydrated?.baseAtk,
      hydrated?.atk,

      template?.displayAtk,
      template?.combatAtk,
      template?.finalAtk,
      template?.currentAtk,
      template?.totalAtk,
      template?.battleAtk,
      template?.baseAtk,
      template?.atk
    );
  }

  if (statType === "hp") {
    return firstPositiveNumber(
      form?.hp,
      form?.baseHp,
      form?.displayHp,
      form?.combatHp,
      form?.finalHp,
      form?.maxHp,

      templateStageStats?.hp,
      templateStageStats?.baseHp,
      templateStageStats?.displayHp,
      templateStageStats?.combatHp,
      templateStageStats?.finalHp,
      templateStageStats?.maxHp,

      hydratedStageStats?.hp,
      hydratedStageStats?.baseHp,
      hydratedStageStats?.displayHp,
      hydratedStageStats?.combatHp,
      hydratedStageStats?.finalHp,
      hydratedStageStats?.maxHp,

      template?.[`hp${stageKey}`],
      template?.[`baseHp${stageKey}`],
      hydrated?.[`hp${stageKey}`],
      hydrated?.[`baseHp${stageKey}`],

      hydrated?.displayHp,
      hydrated?.combatHp,
      hydrated?.finalHp,
      hydrated?.maxHp,
      hydrated?.currentHp,
      hydrated?.totalHp,
      hydrated?.battleHp,
      hydrated?.baseHp,
      hydrated?.hp,

      template?.displayHp,
      template?.combatHp,
      template?.finalHp,
      template?.maxHp,
      template?.currentHp,
      template?.totalHp,
      template?.battleHp,
      template?.baseHp,
      template?.hp
    );
  }

  if (statType === "speed") {
    return firstPositiveNumber(
      form?.speed,
      form?.spd,
      form?.baseSpeed,
      form?.displaySpeed,
      form?.combatSpeed,
      form?.finalSpeed,

      templateStageStats?.speed,
      templateStageStats?.spd,
      templateStageStats?.baseSpeed,
      templateStageStats?.displaySpeed,
      templateStageStats?.combatSpeed,
      templateStageStats?.finalSpeed,

      hydratedStageStats?.speed,
      hydratedStageStats?.spd,
      hydratedStageStats?.baseSpeed,
      hydratedStageStats?.displaySpeed,
      hydratedStageStats?.combatSpeed,
      hydratedStageStats?.finalSpeed,

      template?.[`speed${stageKey}`],
      template?.[`spd${stageKey}`],
      template?.[`baseSpeed${stageKey}`],
      hydrated?.[`speed${stageKey}`],
      hydrated?.[`spd${stageKey}`],
      hydrated?.[`baseSpeed${stageKey}`],

      hydrated?.displaySpeed,
      hydrated?.combatSpeed,
      hydrated?.finalSpeed,
      hydrated?.currentSpeed,
      hydrated?.totalSpeed,
      hydrated?.battleSpeed,
      hydrated?.baseSpeed,
      hydrated?.speed,
      hydrated?.spd,

      template?.displaySpeed,
      template?.combatSpeed,
      template?.finalSpeed,
      template?.currentSpeed,
      template?.totalSpeed,
      template?.battleSpeed,
      template?.baseSpeed,
      template?.speed,
      template?.spd
    );
  }

  return firstPositiveNumber(
    form?.currentPower,
    form?.power,
    form?.basePower,
    form?.finalPower,
    form?.powerCaps?.[stageKey],

    templateStageStats?.currentPower,
    templateStageStats?.power,
    templateStageStats?.basePower,
    templateStageStats?.finalPower,
    templateStageStats?.powerCaps?.[stageKey],

    hydratedStageStats?.currentPower,
    hydratedStageStats?.power,
    hydratedStageStats?.basePower,
    hydratedStageStats?.finalPower,
    hydratedStageStats?.powerCaps?.[stageKey],

    template?.powerCaps?.[stageKey],
    hydrated?.powerCaps?.[stageKey],

    hydrated?.currentPower,
    hydrated?.power,
    hydrated?.basePower,
    hydrated?.finalPower,
    hydrated?.totalPower,
    hydrated?.battlePower,

    template?.currentPower,
    template?.power,
    template?.basePower,
    template?.finalPower,
    template?.totalPower,
    template?.battlePower
  );
}

function getLiveNumber(card, templateCode, statType) {
  const stage = getStage(card);
  const template = getTemplateByCode(templateCode) || {};
  const hydrated = hydrateCard({
    ...card,
    evolutionStage: stage,
    evolutionKey: `M${stage}`,
  });

  return firstPositiveNumber(
    statType === "atk" ? card?.displayAtk : 0,
    statType === "atk" ? card?.combatAtk : 0,
    statType === "atk" ? card?.finalAtk : 0,
    statType === "atk" ? card?.currentAtk : 0,
    statType === "atk" ? card?.totalAtk : 0,
    statType === "atk" ? card?.battleAtk : 0,
    statType === "atk" ? card?.atk : 0,
    statType === "atk" ? card?.baseAtk : 0,

    statType === "hp" ? card?.displayHp : 0,
    statType === "hp" ? card?.combatHp : 0,
    statType === "hp" ? card?.finalHp : 0,
    statType === "hp" ? card?.maxHp : 0,
    statType === "hp" ? card?.currentHp : 0,
    statType === "hp" ? card?.totalHp : 0,
    statType === "hp" ? card?.battleHp : 0,
    statType === "hp" ? card?.hp : 0,
    statType === "hp" ? card?.baseHp : 0,

    statType === "speed" ? card?.displaySpeed : 0,
    statType === "speed" ? card?.combatSpeed : 0,
    statType === "speed" ? card?.finalSpeed : 0,
    statType === "speed" ? card?.currentSpeed : 0,
    statType === "speed" ? card?.totalSpeed : 0,
    statType === "speed" ? card?.battleSpeed : 0,
    statType === "speed" ? card?.speed : 0,
    statType === "speed" ? card?.spd : 0,
    statType === "speed" ? card?.baseSpeed : 0,

    statType === "power" ? card?.currentPower : 0,
    statType === "power" ? card?.power : 0,
    statType === "power" ? card?.basePower : 0,
    statType === "power" ? card?.finalPower : 0,
    statType === "power" ? card?.totalPower : 0,
    statType === "power" ? card?.battlePower : 0,

    getStageSpecificNumber(template, hydrated, stage, statType)
  );
}

function buildTemplateSourceCard(code, stage, level) {
  const template = getTemplateByCode(code) || {};
  const form = getForm(template, stage);

  const hydrated = hydrateCard({
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

  const atk = getStageSpecificNumber(template, hydrated, stage, "atk");
  const hp = getStageSpecificNumber(template, hydrated, stage, "hp");
  const speed = getStageSpecificNumber(template, hydrated, stage, "speed");
  const power = getStageSpecificNumber(template, hydrated, stage, "power");

  return {
    ...hydrated,

    atk,
    baseAtk: atk,
    displayAtk: atk,
    combatAtk: atk,
    finalAtk: atk,

    hp,
    baseHp: hp,
    displayHp: hp,
    combatHp: hp,
    finalHp: hp,

    speed,
    spd: speed,
    baseSpeed: speed,
    displaySpeed: speed,
    combatSpeed: speed,
    finalSpeed: speed,

    power,
    basePower: power,
    currentPower: power,
    finalPower: power,
  };
}

function buildLiveSourceCard(player, code) {
  const owned = findOwnedSource(player, code);

  if (owned) {
    const stage = getStage(owned);
    return hydrateCard({
      ...owned,
      evolutionStage: stage,
      evolutionKey: `M${stage}`,
    });
  }

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

function getTextFromSources(sources, keys) {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;

    for (const key of keys) {
      const value = source?.[key];
      const text = String(value || "").trim();

      if (text && text.toLowerCase() !== "none") return text;
    }
  }

  return "None";
}

function getSourceWeaponText(card, templateCode, forcedStage = null) {
  const template = getTemplateByCode(templateCode) || {};
  const stage = forcedStage || getStage(card);
  const form = getForm(template, stage);

  const sources = [
    card,
    form,
    template,
    ...(Array.isArray(card?.equippedWeapons) ? card.equippedWeapons : []),
    ...(Array.isArray(card?.evolutionForms) ? card.evolutionForms : []),
    ...(Array.isArray(template?.evolutionForms) ? template.evolutionForms : []),
  ];

  return getTextFromSources(sources, [
    "displayWeaponName",
    "weaponSet",
    "weapon",
    "equippedWeaponName",
    "equippedWeapon",
    "weaponName",
    "name",
  ]);
}

function getSourceFruitText(card, templateCode, forcedStage = null) {
  const template = getTemplateByCode(templateCode) || {};
  const stage = forcedStage || getStage(card);
  const form = getForm(template, stage);

  const sources = [
    card,
    form,
    template,
    ...(Array.isArray(card?.evolutionForms) ? card.evolutionForms : []),
    ...(Array.isArray(template?.evolutionForms) ? template.evolutionForms : []),
  ];

  return getTextFromSources(sources, [
    "displayFruitName",
    "equippedDevilFruitName",
    "equippedDevilFruit",
    "devilFruitName",
    "devilFruit",
    "devilfruitName",
    "devilfruit",
    "fruitName",
    "fruit",
    "df",
    "dfName",
  ]);
}

function cleanValue(value) {
  const text = String(value || "").trim();

  if (!text || text.toLowerCase() === "none") return "";
  if (text.toLowerCase().includes("synced from")) return "";

  return text;
}

function splitParts(value) {
  return cleanValue(value)
    .split(/\s*,\s*|\s+\/\s+/)
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
      atk: templateOnly
        ? getStageSpecificNumber(getTemplateByCode(code) || {}, source, sourceStage, "atk")
        : getLiveNumber(source, code, "atk"),
      hp: templateOnly
        ? getStageSpecificNumber(getTemplateByCode(code) || {}, source, sourceStage, "hp")
        : getLiveNumber(source, code, "hp"),
      speed: templateOnly
        ? getStageSpecificNumber(getTemplateByCode(code) || {}, source, sourceStage, "speed")
        : getLiveNumber(source, code, "speed"),
      power: templateOnly
        ? getStageSpecificNumber(getTemplateByCode(code) || {}, source, sourceStage, "power")
        : getLiveNumber(source, code, "power"),
      weapon: getSourceWeaponText(source, code, sourceStage),
      devilFruit: getSourceFruitText(source, code, sourceStage),
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

  const ownLevelFactor = options.templateOnly ? 1 : getOwnLevelFactor(stage, level);

  const scaledAtk = Math.floor(mergedAtk * ownLevelFactor);
  const scaledHp = Math.floor(mergedHp * ownLevelFactor);
  const scaledSpeed = Math.floor(mergedSpeed * ownLevelFactor);

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

    basePower: MERGE_FIXED_POWER,
    power: MERGE_FIXED_POWER,
    currentPower: MERGE_FIXED_POWER,
    finalPower: MERGE_FIXED_POWER,
    powerCaps: {
      M1: MERGE_FIXED_POWER,
      M2: MERGE_FIXED_POWER,
      M3: MERGE_FIXED_POWER,
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
      ? "30% max mastery stats from Monkey D. Luffy + Roronoa Zoro + Sanji"
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
  MERGE_FIXED_POWER,
  isLzsCard,
  buildMergedLzsCard,
  syncMergedCardsInPlayer,
  findOwnedCardByCodeOrName,
};