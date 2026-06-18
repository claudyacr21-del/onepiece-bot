const rawCards = require("../data/cards");
const { hydrateCard } = require("./evolution");

const MERGE_SOURCE_CODES = [
  "luffy_straw_hat",
  "zoro_pirate_hunter",
  "sanji_black_leg",
];

const MERGE_RATIO = 0.35;
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

function isMergeCard(card) {
  const type = String(card?.type || "").toLowerCase().trim();

  return Boolean(
    card &&
      (
        isLzsCard(card) ||
        card.mergeOnly === true ||
        Array.isArray(card.mergeSourceCodes) ||
        type === "merge"
      )
  );
}

function getMergeSourceCodes(card) {
  if (Array.isArray(card?.mergeSourceCodes) && card.mergeSourceCodes.length) {
    return card.mergeSourceCodes.map((code) => String(code || "").trim()).filter(Boolean);
  }

  if (isLzsCard(card)) {
    return MERGE_SOURCE_CODES;
  }

  return [];
}

function getMergeRatio() {
  return MERGE_RATIO;
}

function getMergeFixedPower(card) {
  const power = Number(
    card?.mergeFixedPower ||
      card?.fixedPower ||
      card?.mergePower ||
      MERGE_FIXED_POWER
  );

  if (!Number.isFinite(power) || power <= 0) return MERGE_FIXED_POWER;

  return Math.floor(power);
}

function getMergeTemplateCode(card) {
  return normalizeCode(card?.code || "");
}

function getMergeDisplayName(card, template = {}) {
  return (
    card?.displayName ||
    card?.name ||
    template?.displayName ||
    template?.name ||
    "Merge Card"
  );
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

function lerpMergeLevelFactor(startLevel, endLevel, startFactor, endFactor, level) {
  const safeStart = Number(startLevel || 1);
  const safeEnd = Number(endLevel || safeStart);
  const safeLevel = Number(level || safeStart);

  if (safeEnd <= safeStart) return endFactor;

  const clampedLevel = Math.max(safeStart, Math.min(safeEnd, safeLevel));
  const progress = (clampedLevel - safeStart) / (safeEnd - safeStart);

  return startFactor + progress * (endFactor - startFactor);
}

function getOwnLevelFactor(stage, level) {
  const s = Math.max(1, Math.min(3, Number(stage || 1)));
  const lvl = Math.max(1, Math.min(100, Number(level || 1)));

  // Merge card level scaling must never reset downward after awaken.
  // M1 Lv50 is the baseline, M2 continues from Lv50, and M3 continues from Lv85.
  if (s === 1) {
    return lerpMergeLevelFactor(1, 50, 0.45, 1.0, lvl);
  }

  if (s === 2) {
    return lerpMergeLevelFactor(50, 85, 1.0, 1.22, lvl);
  }

  return lerpMergeLevelFactor(85, 100, 1.22, 1.35, lvl);
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

  const equippedWeapons = Array.isArray(card?.equippedWeapons)
    ? card.equippedWeapons
    : [];

  const equippedNames = equippedWeapons
    .map((weapon) => {
      return (
        weapon?.displayName ||
        weapon?.name ||
        weapon?.weaponName ||
        weapon?.code ||
        ""
      );
    })
    .map((value) => String(value || "").trim())
    .filter((value) => value && value.toLowerCase() !== "none");

  if (equippedNames.length) {
    return equippedNames.join(", ");
  }

  const singleEquipped =
    card?.equippedWeaponName ||
    card?.equippedWeaponDisplayName ||
    card?.equippedWeapon;

  if (singleEquipped && String(singleEquipped).trim().toLowerCase() !== "none") {
    return String(singleEquipped).trim();
  }

  // Owned/live merge: jangan fallback ke form/template weapon.
  // Kalau source card player belum equip weapon, harus None.
  return "None";
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

  const ownedFruit =
    card?.displayFruitName ||
    card?.equippedDevilFruitName ||
    card?.equippedDevilFruitDisplayName ||
    card?.equippedDevilFruit ||
    card?.devilFruitName ||
    card?.devilFruit;

  if (ownedFruit && String(ownedFruit).trim().toLowerCase() !== "none") {
    return String(ownedFruit).trim();
  }

  // Fruit bawaan canon masih boleh fallback dari form/template.
  return (
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

function buildMergeSources(player, mergeCard, stage, options = {}) {
  const sourceCodes = getMergeSourceCodes(mergeCard);

  const sourceStage = Math.max(
    1,
    Math.min(3, Number(options.sourceStage || options.displayStage || stage || 1))
  );

  const displayLevel = Number(options.displayLevel || getStageMaxLevel(sourceStage));
  const templateOnly = Boolean(options.templateOnly);

  return sourceCodes.map((code) => {
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
      weapon: getSourceWeaponText(source, code, sourceStage, templateOnly),
      devilFruit: getSourceFruitText(source, code, sourceStage, templateOnly),
    };
  });
}

function buildMergedCard(player, baseCard = null, stageOverride = null, options = {}) {
  const baseTemplateCode = getMergeTemplateCode(baseCard);
  const template = getTemplateByCode(baseTemplateCode) || {};
  const templateCard = {
    ...template,
    ...baseCard,
  };

  if (!isMergeCard(templateCard)) {
    return hydrateCard(baseCard) || baseCard;
  }

  const sourceCodes = getMergeSourceCodes(templateCard);
  if (!sourceCodes.length) {
    return hydrateCard(baseCard) || baseCard;
  }

  const ownedMerge =
    baseCard && isMergeCard(baseCard)
      ? baseCard
      : findOwnedSource(player, templateCard.code) || baseCard || templateCard;

  const stage = Math.max(
    1,
    Math.min(3, Number(stageOverride || getStage(ownedMerge) || 1))
  );

  const level = options.templateOnly
    ? Number(options.displayLevel || getStageMaxLevel(stage))
    : getLevel(ownedMerge);

  const prestige = options.templateOnly ? 0 : getRaidPrestige(ownedMerge);

  const sources = buildMergeSources(player, templateCard, stage, {
    ...options,
    sourceStage: options.sourceStage || stage,
    displayLevel: options.displayLevel || getStageMaxLevel(stage),
  });

  const ratio = getMergeRatio();
  const fixedPower = getMergeFixedPower(templateCard);

  const mergedAtk = Math.floor(
    sources.reduce((sum, source) => sum + Number(source?.atk || 0) * ratio, 0)
  );

  const mergedHp = Math.floor(
    sources.reduce((sum, source) => sum + Number(source?.hp || 0) * ratio, 0)
  );

  const mergedSpeed = Math.floor(
    sources.reduce((sum, source) => sum + Number(source?.speed || 0) * ratio, 0)
  );

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
  const displayName = getMergeDisplayName(ownedMerge, template);

  return {
    ...template,
    ...form,
    ...ownedMerge,

    code: templateCard.code || ownedMerge.code,
    name: displayName,
    displayName,
    title: ownedMerge.title || template.title || displayName,

    rarity: ownedMerge.rarity || template.rarity || "M",
    baseTier: ownedMerge.baseTier || template.baseTier || "M",
    currentTier: ownedMerge.currentTier || ownedMerge.rarity || template.currentTier || template.rarity || "M",
    tier: ownedMerge.tier || ownedMerge.currentTier || ownedMerge.rarity || template.tier || "M",

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

    mergeSourceCodes: sourceCodes,
    mergeStatRatio: ratio,
    mergeFixedPower: fixedPower,

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
    maxHp: finalHp,
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

    battleAtk: finalAtk,
    battleHp: finalHp,
    battleSpeed: finalSpeed,

    teamAtk: finalAtk,
    teamHp: finalHp,
    teamSpeed: finalSpeed,

    totalAtk: finalAtk,
    totalHp: finalHp,
    totalSpeed: finalSpeed,

    currentAtk: finalAtk,
    currentHp: finalHp,
    currentSpeed: finalSpeed,

    basePower: fixedPower,
    power: fixedPower,
    currentPower: fixedPower,
    finalPower: fixedPower,
    displayPower: fixedPower,
    combatPower: fixedPower,
    teamPower: fixedPower,
    battlePower: fixedPower,
    totalPower: fixedPower,

    powerCaps: {
      ...(ownedMerge.powerCaps || {}),
      M1: fixedPower,
      M2: fixedPower,
      M3: fixedPower,
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
      ? `${Math.floor(ratio * 100)}% max mastery stats from ${sourceCodes.join(" + ")}`
      : `Live ${Math.floor(ratio * 100)}% owned stats from ${sourceCodes.join(" + ")}`,
  };
}

function buildMergedLzsCard(player, baseCard = null, stageOverride = null, options = {}) {
  return buildMergedCard(player, baseCard, stageOverride, options);
}

function syncMergedCardsInPlayer(player) {
  if (!player || typeof player !== "object") return player;

  const cards = Array.isArray(player.cards) ? player.cards : [];
  if (!cards.some(isMergeCard)) return player;

  const basePlayer = {
    ...player,
    cards,
  };

  return {
    ...player,
    cards: cards.map((card) =>
      isMergeCard(card) ? buildMergedCard(basePlayer, card) : card
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
  isMergeCard,

  getMergeSourceCodes,
  getMergeRatio,
  getMergeFixedPower,

  buildMergedCard,
  buildMergedLzsCard,

  syncMergedCardsInPlayer,
  findOwnedCardByCodeOrName,
};