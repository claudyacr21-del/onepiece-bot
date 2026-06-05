const { isLzsCard } = require("../utils/mergeCards");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const {
  findOwnedCard,
  hydrateCard,
  getAllCards,
} = require("../utils/evolution");
const { buildCardStyleEmbed } = require("../utils/cardView");
const { getCardImage, getRarityBadge } = require("../config/assetLinks");

const cardsData = require("../data/cards");
const SPECIAL_FORMS = cardsData.SPECIAL_FORMS || cardsData.specialForms || {
  luffy_straw_hat: ["The Beginning", "Revival", "Gear 5"],
};

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

function normalizeNameSearch(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function scoreNameOnly(query, names) {
  const q = normalizeNameSearch(query);
  if (!q) return 0;

  let best = 0;

  for (const raw of names) {
    const name = normalizeNameSearch(raw);
    if (!name) continue;

    if (name === q) best = Math.max(best, 1000 + name.length);
    else if (name.startsWith(q)) best = Math.max(best, 700 + q.length);
    else if (name.includes(q)) best = Math.max(best, 400 + q.length);
    else {
      const words = q.split(" ").filter(Boolean);
      if (words.length && words.every((word) => name.includes(word))) {
        best = Math.max(best, 250 + words.join("").length);
      }
    }
  }

  return best;
}

function isLzsQuery(query) {
  const q = normalizeNameSearch(query).replace(/\s+/g, "_");
  return q === "lzs" || q === "monster_trio";
}

function findCardTemplateByNameOnly(query) {
  if (isLzsQuery(query)) {
    const lzs = getAllCards().find((card) => {
      const code = String(card?.code || "").toLowerCase().trim();
      const name = normalizeNameSearch(card?.displayName || card?.name || card?.title);
      return code === "lzs" || name === "monster trio";
    });

    if (lzs) return lzs;
  }

  const scored = getAllCards()
    .map((card) => ({
      card,
      score: scoreNameOnly(query, [card.displayName, card.name]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].card : null;
}

function getAllGlobalCard(card) {
  const code = String(card?.code || "").toLowerCase();

  if (!code) return card;

  return (
    getAllCards().find(
      (entry) => String(entry.code || "").toLowerCase() === code
    ) || card
  );
}

function getDirectDevilFruitName(...sources) {
  const keys = [
    "displayFruitName",
    "devilFruit",
    "devilfruit",
    "devil_fruit",
    "devilFruitName",
    "devilfruitName",
    "devil_fruit_name",
    "fruitName",
    "fruit",
    "df",
    "dfName",
  ];

  for (const source of sources) {
    if (!source || typeof source !== "object") continue;

    for (const key of keys) {
      const value = source[key];
      if (!value) continue;

      const text = String(value).trim();

      if (text && text.toLowerCase() !== "none") {
        return text;
      }
    }
  }

  return null;
}

function getBoostDevilFruitForCi(card, stageCard = null, form = null) {
  const allGlobalCard = getAllGlobalCard(card);

  const sources = [
    form,
    ...(Array.isArray(stageCard?.evolutionForms) ? stageCard.evolutionForms : []),
    ...(Array.isArray(card?.evolutionForms) ? card.evolutionForms : []),
    ...(Array.isArray(allGlobalCard?.evolutionForms) ? allGlobalCard.evolutionForms : []),
    stageCard,
    card,
    allGlobalCard,
    stageCard?.source,
    card?.source,
    allGlobalCard?.source,
    stageCard?.template,
    card?.template,
    allGlobalCard?.template,
  ];

  return getDirectDevilFruitName(...sources) || "None";
}

function getStageRawForm(card, stage) {
  return card?.evolutionForms?.[stage - 1] || {};
}

function getStageRawStat(card, stageCard, stage, key, fallbackKey = key) {
  const form = getStageRawForm(card, stage);

  return (
    form?.[key] ??
    form?.[fallbackKey] ??
    card?.stageStats?.[`M${stage}`]?.[key] ??
    card?.stageStats?.[`M${stage}`]?.[fallbackKey] ??
    card?.stats?.[`M${stage}`]?.[key] ??
    card?.stats?.[`M${stage}`]?.[fallbackKey] ??
    stageCard?.[key] ??
    stageCard?.[fallbackKey] ??
    card?.[key] ??
    card?.[fallbackKey] ??
    0
  );
}

function getStageRawPower(card, stageCard, stage) {
  const form = getStageRawForm(card, stage);
  const stageKey = `M${stage}`;

  return Number(
    form?.currentPower ??
      form?.power ??
      form?.powerCaps?.[stageKey] ??
      card?.powerCaps?.[stageKey] ??
      stageCard?.currentPower ??
      card?.currentPower ??
      card?.powerCaps?.M3 ??
      0
  );
}

function firstPositiveNumber(...values) {
  for (const value of values) {
    const n = Number(value || 0);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function getStageStatObject(source, stage) {
  const safeStage = Math.max(1, Math.min(3, Number(stage || 1)));
  const stageKey = `M${safeStage}`;
  const form = source?.evolutionForms?.[safeStage - 1] || {};
  const stageStats =
    source?.stageStats?.[stageKey] ||
    source?.stats?.[stageKey] ||
    source?.masteryStats?.[stageKey] ||
    {};

  return {
    source,
    atk: firstPositiveNumber(
      form.atk,
      form.baseAtk,
      stageStats.atk,
      stageStats.baseAtk,
      source?.[`atk${stageKey}`],
      source?.atk,
      source?.baseAtk
    ),
    hp: firstPositiveNumber(
      form.hp,
      form.baseHp,
      stageStats.hp,
      stageStats.baseHp,
      source?.[`hp${stageKey}`],
      source?.hp,
      source?.baseHp
    ),
    speed: firstPositiveNumber(
      form.speed,
      form.spd,
      form.baseSpeed,
      stageStats.speed,
      stageStats.spd,
      stageStats.baseSpeed,
      source?.[`speed${stageKey}`],
      source?.speed,
      source?.spd,
      source?.baseSpeed
    ),
    power: firstPositiveNumber(
      form.currentPower,
      form.power,
      form.powerCaps?.[stageKey],
      stageStats.currentPower,
      stageStats.power,
      stageStats.powerCaps?.[stageKey],
      source?.powerCaps?.[stageKey],
      source?.currentPower,
      source?.power
    ),
  };
}

function getStatScore(stats) {
  return (
    Number(stats?.power || 0) * 1000000 +
    Number(stats?.hp || 0) * 1000 +
    Number(stats?.atk || 0) * 10 +
    Number(stats?.speed || 0)
  );
}

function getStageDisplayStats(card, stageCard, stage) {
  const safeStage = Math.max(1, Math.min(3, Number(stage || 1)));

  const candidates = [
    getStageStatObject(card, safeStage),
    getStageStatObject(stageCard, safeStage),
  ];

  if (safeStage === 3) {
    candidates.push(getStageStatObject(getAllGlobalCard(card), safeStage));
  }

  const best = candidates
    .filter((entry) => entry && (entry.atk || entry.hp || entry.speed || entry.power))
    .sort((a, b) => getStatScore(b) - getStatScore(a))[0];

  return (
    best || {
      source: card,
      atk: Number(getStageRawStat(card, stageCard, safeStage, "atk") || 0),
      hp: Number(getStageRawStat(card, stageCard, safeStage, "hp") || 0),
      speed: Number(getStageRawStat(card, stageCard, safeStage, "speed", "spd") || 0),
      power: getStageRawPower(card, stageCard, safeStage),
    }
  );
}

const LZS_SOURCE_CODES = [
  "luffy_straw_hat",
  "zoro_pirate_hunter",
  "sanji_black_leg",
];

function normalizeCiCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, "_");
}

function findTemplateByCodeForCi(code) {
  const target = normalizeCiCode(code);

  return (
    getAllCards().find((card) => normalizeCiCode(card?.code) === target) ||
    null
  );
}

function getCiStageForm(template, stage = 1) {
  const n = Math.max(1, Math.min(3, Number(stage || 1)));

  return Array.isArray(template?.evolutionForms)
    ? template.evolutionForms[n - 1] || null
    : null;
}

function cleanCiText(value) {
  const text = String(value || "").trim();
  if (!text || text.toLowerCase() === "none") return "";
  if (text.toLowerCase().includes("synced from")) return "";
  return text;
}

function joinUniqueCiText(values) {
  const seen = new Set();
  const out = [];

  for (const value of values) {
    const text = cleanCiText(value);
    if (!text) continue;

    const parts = text
      .split(/\s*[,/]\s*/)
      .map((part) => part.trim())
      .filter(Boolean);

    for (const part of parts) {
      const key = normalizeNameSearch(part);
      if (!key || key === "none" || seen.has(key)) continue;

      seen.add(key);
      out.push(part);
    }
  }

  return out.length ? out.join(", ") : "None";
}

function pickPositiveNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return 0;
}

function getStageSpecificSourceStatsForLzs(template, stage = 1) {
  const targetStage = Math.max(1, Math.min(3, Number(stage || 1)));
  const stageKey = `M${targetStage}`;

  const stageCard = getStageCard(template, targetStage);
  const form =
    stageCard?.evolutionForms?.[targetStage - 1] ||
    template?.evolutionForms?.[targetStage - 1] ||
    {};

  const stageStats =
    template?.stageStats?.[stageKey] ||
    stageCard?.stageStats?.[stageKey] ||
    template?.stats?.[stageKey] ||
    stageCard?.stats?.[stageKey] ||
    template?.masteryStats?.[stageKey] ||
    stageCard?.masteryStats?.[stageKey] ||
    {};

  const ciStats = getStageDisplayStats(template, stageCard, targetStage);

  // IMPORTANT:
  // Untuk LZS, jangan ambil stageCard.atk/hp/speed dulu.
  // stageCard bisa masih bawa top-level M1 dari hydrateCard.
  // Jadi prioritas wajib stage-specific: form M1/M2/M3 -> stageStats.Mx -> explicit atkM2/atkM3 -> baru fallback.
  const atk = pickPositiveNumber(
    form?.atk,
    form?.baseAtk,
    form?.displayAtk,
    form?.combatAtk,
    form?.finalAtk,
    stageStats?.atk,
    stageStats?.baseAtk,
    stageStats?.displayAtk,
    stageStats?.combatAtk,
    stageStats?.finalAtk,
    template?.[`atk${stageKey}`],
    template?.[`baseAtk${stageKey}`],
    stageCard?.[`atk${stageKey}`],
    stageCard?.[`baseAtk${stageKey}`],
    ciStats?.atk,
    stageCard?.displayAtk,
    stageCard?.combatAtk,
    stageCard?.finalAtk,
    stageCard?.baseAtk,
    stageCard?.atk,
    template?.displayAtk,
    template?.combatAtk,
    template?.finalAtk,
    template?.baseAtk,
    template?.atk
  );

  const hp = pickPositiveNumber(
    form?.hp,
    form?.baseHp,
    form?.displayHp,
    form?.combatHp,
    form?.finalHp,
    stageStats?.hp,
    stageStats?.baseHp,
    stageStats?.displayHp,
    stageStats?.combatHp,
    stageStats?.finalHp,
    template?.[`hp${stageKey}`],
    template?.[`baseHp${stageKey}`],
    stageCard?.[`hp${stageKey}`],
    stageCard?.[`baseHp${stageKey}`],
    ciStats?.hp,
    stageCard?.displayHp,
    stageCard?.combatHp,
    stageCard?.finalHp,
    stageCard?.baseHp,
    stageCard?.hp,
    template?.displayHp,
    template?.combatHp,
    template?.finalHp,
    template?.baseHp,
    template?.hp
  );

  const speed = pickPositiveNumber(
    form?.speed,
    form?.spd,
    form?.baseSpeed,
    form?.displaySpeed,
    form?.combatSpeed,
    form?.finalSpeed,
    stageStats?.speed,
    stageStats?.spd,
    stageStats?.baseSpeed,
    stageStats?.displaySpeed,
    stageStats?.combatSpeed,
    stageStats?.finalSpeed,
    template?.[`speed${stageKey}`],
    template?.[`spd${stageKey}`],
    template?.[`baseSpeed${stageKey}`],
    stageCard?.[`speed${stageKey}`],
    stageCard?.[`spd${stageKey}`],
    stageCard?.[`baseSpeed${stageKey}`],
    ciStats?.speed,
    stageCard?.displaySpeed,
    stageCard?.combatSpeed,
    stageCard?.finalSpeed,
    stageCard?.baseSpeed,
    stageCard?.speed,
    stageCard?.spd,
    template?.displaySpeed,
    template?.combatSpeed,
    template?.finalSpeed,
    template?.baseSpeed,
    template?.speed,
    template?.spd
  );

  const power = pickPositiveNumber(
    form?.currentPower,
    form?.power,
    form?.basePower,
    form?.finalPower,
    form?.powerCaps?.[stageKey],
    stageStats?.currentPower,
    stageStats?.power,
    stageStats?.basePower,
    stageStats?.finalPower,
    stageStats?.powerCaps?.[stageKey],
    template?.powerCaps?.[stageKey],
    stageCard?.powerCaps?.[stageKey],
    ciStats?.power,
    stageCard?.currentPower,
    stageCard?.power,
    stageCard?.finalPower,
    stageCard?.basePower,
    template?.currentPower,
    template?.power,
    template?.finalPower,
    template?.basePower
  );

  return {
    stageCard,
    form,
    atk,
    hp,
    speed,
    power,
    weapon:
      form?.weaponSet ||
      form?.weapon ||
      stageCard?.weaponSet ||
      stageCard?.weapon ||
      template?.weaponSet ||
      template?.weapon ||
      "None",
    devilFruit:
      form?.devilFruitName ||
      form?.devilFruit ||
      stageCard?.devilFruit ||
      stageCard?.displayFruitName ||
      template?.devilFruitName ||
      template?.devilFruit ||
      "None",
  };
}

function buildCiLzsFromCiBattleStats(stage = 1) {
  const targetStage = Math.max(1, Math.min(3, Number(stage || 1)));
  const stageKey = `M${targetStage}`;
  const template = findTemplateByCodeForCi("lzs") || {};
  const form = getCiStageForm(template, targetStage) || {};

  const sourceRows = LZS_SOURCE_CODES.map((code) => {
    const sourceTemplate = findTemplateByCodeForCi(code) || {};
    const sourceStats = getStageSpecificSourceStatsForLzs(sourceTemplate, targetStage);

    return {
      code,
      template: sourceTemplate,
      ...sourceStats,
    };
  });

  const mergedAtk = Math.floor(
    sourceRows.reduce((sum, source) => sum + Number(source.atk || 0) * 0.3, 0)
  );

  const mergedHp = Math.floor(
    sourceRows.reduce((sum, source) => sum + Number(source.hp || 0) * 0.3, 0)
  );

  const mergedSpeed = Math.floor(
    sourceRows.reduce((sum, source) => sum + Number(source.speed || 0) * 0.3, 0)
  );

  const mergedPower = Math.floor(
    sourceRows.reduce((sum, source) => sum + Number(source.power || 0) * 0.3, 0)
  );

  const weapon = joinUniqueCiText(sourceRows.map((source) => source.weapon));
  const devilFruit = joinUniqueCiText(sourceRows.map((source) => source.devilFruit));

  return {
    ...template,
    ...form,

    code: "lzs",
    name: "Monster Trio",
    displayName: "Monster Trio",
    title: "Monster Trio",

    rarity: "M",
    currentTier: "M",
    tier: "M",
    baseTier: "M",

    cardRole: "battle",
    role: "battle",
    category: "battle",
    type: "Merge",

    summonOnly: true,
    mergeOnly: true,
    mergeSourceCodes: LZS_SOURCE_CODES,
    mergeStatRatio: 0.3,

    evolutionStage: targetStage,
    evolutionKey: stageKey,

    atk: mergedAtk,
    baseAtk: mergedAtk,
    displayAtk: mergedAtk,
    combatAtk: mergedAtk,
    finalAtk: mergedAtk,

    hp: mergedHp,
    baseHp: mergedHp,
    displayHp: mergedHp,
    combatHp: mergedHp,
    finalHp: mergedHp,

    speed: mergedSpeed,
    spd: mergedSpeed,
    baseSpeed: mergedSpeed,
    displaySpeed: mergedSpeed,
    combatSpeed: mergedSpeed,
    finalSpeed: mergedSpeed,

    power: mergedPower,
    basePower: mergedPower,
    currentPower: mergedPower,
    finalPower: mergedPower,
    powerCaps: {
      ...(template.powerCaps || {}),
      [stageKey]: mergedPower,
    },

    weapon,
    weaponSet: weapon,
    displayWeaponName: weapon,

    devilFruit,
    displayFruitName: devilFruit,
  };
}

function getCiLzsDisplayStats(card) {
  return {
    source: card,
    atk: Number(card?.atk || card?.displayAtk || card?.combatAtk || card?.finalAtk || 0),
    hp: Number(card?.hp || card?.displayHp || card?.combatHp || card?.finalHp || 0),
    speed: Number(card?.speed || card?.spd || card?.displaySpeed || card?.combatSpeed || card?.finalSpeed || 0),
    power: Number(card?.currentPower || card?.power || card?.finalPower || card?.basePower || 0),
  };
}

function getLzsRequirementForCi(stage) {
  const n = Number(stage || 1);

  if (n === 2) {
    return normalizeMergeRequirementForCi(
      {
        code: "lzs",
        name: "Monster Trio",
        displayName: "Monster Trio",
        type: "Merge",
        mergeOnly: true,
        summonOnly: true,
        mergeSourceCodes: ["luffy_straw_hat", "zoro_pirate_hunter", "sanji_black_leg"],
      },
      2,
      {
        berries: 2000000,
        gems: 2000,
        selfFragments: 0,
        fragments: [
          { code: "luffy_straw_hat", name: "Monkey D. Luffy", amount: 75 },
          { code: "zoro_pirate_hunter", name: "Roronoa Zoro", amount: 75 },
          { code: "sanji_black_leg", name: "Sanji", amount: 75 },
        ],
        cards: [
          { code: "luffy_straw_hat", name: "Monkey D. Luffy", stage: 3 },
          { code: "zoro_pirate_hunter", name: "Roronoa Zoro", stage: 3 },
          { code: "sanji_black_leg", name: "Sanji", stage: 3 },
        ],
        boosts: [],
      }
    );
  }

  if (n === 3) {
    return normalizeMergeRequirementForCi(
      {
        code: "lzs",
        name: "Monster Trio",
        displayName: "Monster Trio",
        type: "Merge",
        mergeOnly: true,
        summonOnly: true,
        mergeSourceCodes: ["luffy_straw_hat", "zoro_pirate_hunter", "sanji_black_leg"],
      },
      3,
      {
        berries: 2000000,
        gems: 2000,
        selfFragments: 0,
        fragments: [
          { code: "luffy_straw_hat", name: "Monkey D. Luffy", amount: 100 },
          { code: "zoro_pirate_hunter", name: "Roronoa Zoro", amount: 100 },
          { code: "sanji_black_leg", name: "Sanji", amount: 100 },
        ],
        cards: [
          { code: "luffy_straw_hat", name: "Monkey D. Luffy", stage: 3 },
          { code: "zoro_pirate_hunter", name: "Roronoa Zoro", stage: 3 },
          { code: "sanji_black_leg", name: "Sanji", stage: 3 },
        ],
        boosts: [],
      }
    );
  }

  return null;
}

function prettifyCode(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatReqEntry(entry) {
  if (!entry) return "Unknown";

  if (typeof entry === "string") {
    return prettifyCode(entry);
  }

  const name = entry.name || entry.displayName || prettifyCode(entry.code);
  const stage = Number(entry.stage || 1);

  return `${name} M${stage}`;
}

function getStageCard(card, stage) {
  return hydrateCard({
    ...card,
    evolutionStage: stage,
    evolutionKey: `M${stage}`,
  });
}

const AWAKEN_GEMS_COST_BY_BASE_TIER = {
  S: {
    2: 750,
    3: 1500,
  },
  A: {
    2: 500,
    3: 1000,
  },
  B: {
    2: 350,
    3: 700,
  },
  C: {
    2: 250,
    3: 500,
  },
};

function getAwakenCostBaseTier(card, stageCard) {
  const role = String(
    stageCard?.cardRole ||
      card?.cardRole ||
      stageCard?.role ||
      card?.role ||
      ""
  ).toLowerCase();

  const tierCandidates =
    role === "boost"
      ? [
          card?.baseTier,
          stageCard?.baseTier,
          card?.rarity,
          stageCard?.rarity,
          card?.currentTier,
          stageCard?.currentTier,
          card?.originalTier,
          stageCard?.originalTier,
          card?.baseRarity,
          stageCard?.baseRarity,
        ]
      : [
          card?.baseTier,
          stageCard?.baseTier,
          card?.originalTier,
          stageCard?.originalTier,
          card?.baseRarity,
          stageCard?.baseRarity,
          card?.rarity,
          stageCard?.rarity,
          card?.currentTier,
          stageCard?.currentTier,
        ];

  const tier = String(tierCandidates.find(Boolean) || "C").toUpperCase();

  if (tier === "UR" || tier === "SS") {
    return "S";
  }

  if (["S", "A", "B", "C"].includes(tier)) {
    return tier;
  }

  return "C";
}

function getDisplayAwakenGemsCost(_req, stage, card, stageCard) {
  const targetStage = Number(stage || 1);
  const baseTier = getAwakenCostBaseTier(card, stageCard);
  const costs = AWAKEN_GEMS_COST_BY_BASE_TIER[baseTier] || AWAKEN_GEMS_COST_BY_BASE_TIER.C;

  return Number(costs[targetStage] || 0);
}

function getStageImage(card, stageCard, stage) {
  const stageKey = `M${stage}`;

  return (
    stageCard?.evolutionForms?.[stage - 1]?.image ||
    card.evolutionForms?.[stage - 1]?.image ||
    stageCard?.stageImages?.[stageKey] ||
    card.stageImages?.[stageKey] ||
    getCardImage(
      card.code,
      stageKey,
      stageCard?.stageImages?.[stageKey] ||
        card.stageImages?.[stageKey] ||
        stageCard?.image ||
        card.image ||
        ""
    ) ||
    stageCard?.image ||
    card.image ||
    ""
  );
}

function getStageBadge(card, stageCard, stage) {
  const form =
    stageCard?.evolutionForms?.[stage - 1] || card.evolutionForms?.[stage - 1];

  return (
    form?.badgeImage ||
    getRarityBadge(form?.tier || stageCard?.currentTier || card.rarity)
  );
}

function getStageLabel(stage) {
  return `M${Number(stage || 1)}`;
}

function isBadSpecialFormName(value) {
  const text = String(value || "").trim().toLowerCase();
  return !text || ["base", "m1", "m2", "m3", "unknown form"].includes(text);
}

function getSpecialFormName(card, stageCard, form, stage) {
  const stageIndex = Math.max(0, Number(stage || 1) - 1);
  const code = String(card?.code || stageCard?.code || "").trim();

  const candidates = [
    stageCard?.specialForms?.[stageIndex],
    stageCard?.special_forms?.[stageIndex],
    card?.specialForms?.[stageIndex],
    card?.special_forms?.[stageIndex],
    SPECIAL_FORMS?.[code]?.[stageIndex],
    stageCard?.evolutionForms?.[stageIndex]?.specialName,
    card?.evolutionForms?.[stageIndex]?.specialName,
    stageCard?.evolutionForms?.[stageIndex]?.formTitle,
    card?.evolutionForms?.[stageIndex]?.formTitle,
    form?.specialName,
    form?.formTitle,
    form?.name,
    form?.formName,
    stageCard?.evolutionForms?.[stageIndex]?.name,
    card?.evolutionForms?.[stageIndex]?.name,
    stageCard?.evolutionForms?.[stageIndex]?.formName,
    card?.evolutionForms?.[stageIndex]?.formName,
  ];

  const found = candidates.find((value) => !isBadSpecialFormName(value));
  return found || getStageLabel(stage);
}

function normalizeCompare(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getOwnedEvolutionStage(item) {
  if (!item) return 1;

  if (Number.isFinite(Number(item.evolutionStage)) && Number(item.evolutionStage) > 0) {
    return Number(item.evolutionStage);
  }

  const evoKey = String(item.evolutionKey || item.form || item.stage || "").toUpperCase();
  const matched = evoKey.match(/M([123])/);

  if (matched) {
    return Number(matched[1]);
  }

  return 1;
}

function getPlayerBoostRequirementPool(player) {
  const cards = Array.isArray(player?.cards) ? player.cards : [];
  const boostCards = Array.isArray(player?.boostCards) ? player.boostCards : [];
  const boosts = Array.isArray(player?.boosts) ? player.boosts : [];

  return [...cards, ...boostCards, ...boosts].filter((entry) => {
    const role = String(entry?.cardRole || entry?.role || "").toLowerCase();
    const category = String(entry?.category || "").toLowerCase();

    return (
      role === "boost" ||
      category === "boost" ||
      Boolean(entry?.boostType) ||
      Boolean(entry?.boostTarget) ||
      Boolean(entry?.effectText)
    );
  });
}

function doesEntryMatchRequirement(entry, requirement) {
  const requirementNames = [
    requirement?.code,
    requirement?.name,
    requirement?.displayName,
    requirement?.cardName,
  ]
    .map(normalizeCompare)
    .filter(Boolean);

  const entryNames = [
    entry?.code,
    entry?.name,
    entry?.displayName,
    entry?.cardName,
    entry?.title,
  ]
    .map(normalizeCompare)
    .filter(Boolean);

  if (!requirementNames.length || !entryNames.length) return false;

  return requirementNames.some((reqName) =>
    entryNames.some((entryName) => {
      if (entryName === reqName) return true;
      return entryName.includes(reqName) || reqName.includes(entryName);
    })
  );
}

function findOwnedRequirementEntry(collection, requirement) {
  const list = Array.isArray(collection) ? collection : [];
  return list.find((entry) => doesEntryMatchRequirement(entry, requirement)) || null;
}

function getOwnedBaseCard(player, card) {
  return (
    findOwnedRequirementEntry(player?.cards || [], {
      code: card?.code,
      name: card?.name,
      displayName: card?.displayName,
    }) || null
  );
}

function getFragmentAmount(fragment) {
  const amount = Number(fragment?.amount ?? fragment?.count ?? fragment?.quantity ?? 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function getFragmentMatchKeys(source) {
  return [
    source?.code,
    source?.name,
    source?.displayName,
    source?.cardName,
    source?.title,
    source?.baseCode,
    source?.cardCode,
    source?.characterCode,
    source?.sourceCode,
    source?.key,
    source?.id,
    String(source?.code || "").replace(/^fragment_/i, ""),
    String(source?.code || "").replace(/_fragment$/i, ""),
  ]
    .map(normalizeCompare)
    .filter(Boolean);
}

function doesFragmentMatchCard(fragment, card) {
  const fragmentKeys = getFragmentMatchKeys(fragment);
  const cardKeys = getFragmentMatchKeys(card);

  if (!fragmentKeys.length || !cardKeys.length) return false;

  return cardKeys.some((cardKey) =>
    fragmentKeys.some((fragmentKey) => {
      if (fragmentKey === cardKey) return true;
      if (fragmentKey.includes(cardKey)) return true;
      if (cardKey.includes(fragmentKey)) return true;
      return false;
    })
  );
}

function getOwnedSelfFragmentAmount(player, card, ownedBaseCard = null) {
  const fragments = Array.isArray(player?.fragments) ? player.fragments : [];

  const inventoryAmount = fragments
    .filter((fragment) => doesFragmentMatchCard(fragment, card))
    .reduce((total, fragment) => total + getFragmentAmount(fragment), 0);

  if (fragments.length) return inventoryAmount;

  return Number(ownedBaseCard?.fragments || 0);
}

function formatCheckedLine(text, ok) {
  return ok ? `${text} ✅` : text;
}

function getRequirementStatusLines(req, key, textKey, collection) {
  if (Array.isArray(req?.[key]) && req[key].length) {
    return req[key].map((entry) => {
      const ownedEntry = findOwnedRequirementEntry(collection, entry);
      const ownedStage = getOwnedEvolutionStage(ownedEntry);
      const requiredStage = Number(entry?.stage || 1);
      const ok = Boolean(ownedEntry) && ownedStage >= requiredStage;

      return formatCheckedLine(`↪ ${formatReqEntry(entry)}`, ok);
    });
  }

  if (Array.isArray(req?.[textKey]) && req[textKey].length) {
    return req[textKey].map((entry) => `↪ ${entry}`);
  }

  return ["↪ None"];
}

function getRequirementEntries(req) {
  return [
    ...((Array.isArray(req?.cards) && req.cards) || []).map((entry) => ({
      ...entry,
      reqType: "card",
    })),
    ...((Array.isArray(req?.boosts) && req.boosts) || []).map((entry) => ({
      ...entry,
      reqType: "boost",
    })),
  ];
}

function requirementMatchesCurrentCard(requirement, currentCard, currentStage) {
  const requiredStage = Number(requirement?.stage || 1);
  const viewedStage = Number(currentStage || 1);

  if (requiredStage !== viewedStage) return false;

  const requirementNames = [
    requirement?.code,
    requirement?.name,
    requirement?.displayName,
    requirement?.cardName,
  ]
    .map(normalizeCompare)
    .filter(Boolean);

  const currentNames = [
    currentCard?.code,
    currentCard?.name,
    currentCard?.displayName,
  ]
    .map(normalizeCompare)
    .filter(Boolean);

  if (!requirementNames.length || !currentNames.length) return false;

  return requirementNames.some((reqName) =>
    currentNames.some(
      (currentName) =>
        reqName === currentName ||
        reqName.includes(currentName) ||
        currentName.includes(reqName)
    )
  );
}

function getRequiredForTargets(currentCard, currentStage) {
  const results = [];

  for (const targetCard of getAllCards()) {
    const requirements = targetCard?.awakenRequirements || {};

    for (const stageKey of ["M2", "M3"]) {
      const targetStage = Number(String(stageKey).replace("M", ""));
      let req = requirements?.[stageKey];
      req = mergeCanonRequirementsIntoReq(req, targetCard, targetStage);

      if (!req) continue;

      const entries = getRequirementEntries(req);
      const matched = entries.some((entry) =>
        requirementMatchesCurrentCard(entry, currentCard, currentStage)
      );

      if (!matched) continue;

      results.push({
        targetName: targetCard.displayName || targetCard.name || "Unknown",
        targetStage: stageKey,
        targetRole: targetCard.cardRole || "battle",
      });
    }
  }

  return results.sort((a, b) => {
    const nameA = normalizeCompare(a.targetName);
    const nameB = normalizeCompare(b.targetName);

    if (nameA !== nameB) return nameA.localeCompare(nameB);

    return String(a.targetStage).localeCompare(String(b.targetStage));
  });
}

function buildRequiredForEmbed(card, stage) {
  const stageCard = getStageCard(card, stage);
  const stageLabel = getStageLabel(stage);
  const displayName = stageCard.displayName || card.displayName || card.name;
  const targets = getRequiredForTargets(card, stage);

  const lines = targets.length
    ? targets.map((target) => `↪ ${target.targetName} ${target.targetStage}`)
    : ["This card/form is not required by any other card yet."];

  return new EmbedBuilder()
    .setColor(0xe91e63)
    .setTitle("⭐ Required For")
    .setDescription(
      [
        `**${displayName} ${stageLabel}** is required for:`,
        "",
        ...lines,
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Requirement Lookup",
    });
}

function normalizeRequirementCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function getCanonLinksForCard(card) {
  const links = cardsData.CANON_LINKS || cardsData.canon_links || cardsData.canonLinks || {};
  const keys = [
    card?.code,
    card?.id,
    card?.name,
    card?.displayName,
  ]
    .map(normalizeRequirementCode)
    .filter(Boolean);

  for (const key of keys) {
    if (links[key]) return links[key];
  }

  return null;
}

function normalizeCanonRequirementList(list, targetStage) {
  if (!Array.isArray(list)) return [];

  return list
    .filter((entry) => Array.isArray(entry) || entry)
    .map((entry) => {
      if (Array.isArray(entry)) {
        return {
          code: entry[0],
          name: entry[0],
          stage: Number(entry[2] || entry[1] || targetStage || 1),
          amount: Number(entry[1] || 1),
        };
      }

      return {
        ...entry,
        code: entry.code || entry.card || entry.id || entry.name,
        name: entry.name || entry.displayName || entry.code || entry.card || entry.id,
        stage: Number(entry.stage || entry.toStage || targetStage || 1),
        amount: Number(entry.amount || entry.count || 1),
      };
    })
    .filter((entry) => entry.code || entry.name);
}

function mergeCanonRequirementsIntoReq(req, card, targetStage) {
  const canon = getCanonLinksForCard(card);
  if (!canon) return req;

  const canonCards = normalizeCanonRequirementList(canon.cards, targetStage);
  const canonBoosts = normalizeCanonRequirementList(canon.boosts, targetStage);

  return {
    ...req,
    cards: [
      ...(Array.isArray(req?.cards) ? req.cards : []),
      ...canonCards,
    ],
    boosts: [
      ...(Array.isArray(req?.boosts) ? req.boosts : []),
      ...canonBoosts,
    ],
    cardsText: [
      ...(Array.isArray(req?.cardsText) ? req.cardsText : []),
      ...canonCards.map((entry) => {
        const label = entry.name || entry.code;
        return entry.stage ? `${label} M${entry.stage}` : String(label);
      }),
    ],
    boostsText: [
      ...(Array.isArray(req?.boostsText) ? req.boostsText : []),
      ...canonBoosts.map((entry) => {
        const label = entry.name || entry.code;
        return entry.stage ? `${label} M${entry.stage}` : String(label);
      }),
    ],
  };
}

function isGenericMergeCardForCi(card) {
  const type = String(card?.type || "").toLowerCase().trim();

  return Boolean(
    card &&
      (card.mergeOnly === true ||
        (card.summonOnly === true && Array.isArray(card.mergeSourceCodes)) ||
        type === "merge")
  );
}

function makeRoadPoneglyphRequirementForCi(stage) {
  return {
    code: "road_poneglyph",
    name: "Road Poneglyph",
    displayName: "Road Poneglyph",
    stage,
    minStage: stage,
    evolutionStage: stage,
  };
}

function uniqCiRequirementCards(cards = []) {
  const out = [];
  const seen = new Set();

  for (const entry of Array.isArray(cards) ? cards : []) {
    if (!entry) continue;

    const code = String(entry.code || "").toLowerCase().trim();
    const name = String(entry.name || entry.displayName || entry.cardName || "").toLowerCase().trim();
    const stage = Number(entry.stage || entry.minStage || entry.evolutionStage || 1);
    const key = `${code || name}:m${stage}`;

    if (seen.has(key)) continue;

    seen.add(key);
    out.push({
      ...entry,
      stage,
      minStage: stage,
      evolutionStage: stage,
    });
  }

  return out;
}

function normalizeMergeRequirementForCi(card, stage, req) {
  if (!isGenericMergeCardForCi(card)) return req;

  const nextStage = Number(stage || 1);

  if (nextStage < 2) return req;

  const baseReq = req || {};
  const roadStage = nextStage;

  return {
    ...baseReq,
    berries: 2000000,
    gems: 2000,
    selfFragments: 0,
    cards: uniqCiRequirementCards([
      ...(Array.isArray(baseReq.cards) ? baseReq.cards : []),
      makeRoadPoneglyphRequirementForCi(roadStage),
    ]),
    cardsText: [
      ...(Array.isArray(baseReq.cardsText) ? baseReq.cardsText : []),
      `Road Poneglyph M${roadStage}`,
    ].filter((value, index, arr) => arr.indexOf(value) === index),
    fragments: Array.isArray(baseReq.fragments) ? baseReq.fragments : [],
    boosts: Array.isArray(baseReq.boosts) ? baseReq.boosts : [],
    boostsText: Array.isArray(baseReq.boostsText) ? baseReq.boostsText : [],
  };
}

function buildReqEmbed(card, stage, player) {
  const isLzs = isLzsCard(card);

  if (isLzs) {
    card = buildCiLzsFromCiBattleStats(stage);
  }

  const stageCard = getStageCard(card, stage);
  const isMergeCard = isGenericMergeCardForCi(card);

  let req = isLzs
    ? getLzsRequirementForCi(stage)
    : stageCard.awakenRequirements?.[`M${stage}`] ||
      card.awakenRequirements?.[`M${stage}`];

  if (!isLzs) {
    req = mergeCanonRequirementsIntoReq(req, card, stage);
  }

  req = normalizeMergeRequirementForCi(card, stage, req);

  if (!req) {
    return new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(
        `ℹ️ Requirement • ${
          stageCard.displayName || card.displayName || card.name
        } • M${stage}`
      )
      .setDescription("Base form.\nNo requirement.");
  }

  const ownedBaseCard = getOwnedBaseCard(player, card);
  const playerBerries = Number(player?.berries || 0);
  const playerGems = Number(player?.gems || 0);
  const ownedFragments = getOwnedSelfFragmentAmount(player, card, ownedBaseCard);
  const ownedLevel = Number(
    ownedBaseCard?.level ||
      ownedBaseCard?.currentLevel ||
      ownedBaseCard?.lvl ||
      0
  );

  const requiredBerries = Number(req.berries || 0);

  const requiredGems = isMergeCard
    ? Number(req.gems || 0)
    : getDisplayAwakenGemsCost(req, stage, card, stageCard);

  const requiredFragments = isMergeCard ? 0 : Number(req.selfFragments || 0);

  const requiredLevel = isMergeCard
    ? 0
    : stageCard.cardRole === "battle"
    ? Number(req.minLevel || 0)
    : 0;

  const berriesOk = playerBerries >= requiredBerries;
  const gemsOk = playerGems >= requiredGems;
  const fragmentsOk = isMergeCard ? true : ownedFragments >= requiredFragments;

  const levelOk = isMergeCard
    ? true
    : stageCard.cardRole === "battle"
    ? ownedLevel >= requiredLevel
    : true;

  const fragmentRequiredLines =
    isMergeCard && Array.isArray(req.fragments) && req.fragments.length
      ? req.fragments.map((entry) => {
          const owned = getOwnedSelfFragmentAmount(player, entry, null);
          const amount = Number(entry.amount || 0);

          return formatCheckedLine(
            `↪ ${owned}/${amount}x ${
              entry.name || prettifyCode(entry.code)
            } Fragment`,
            owned >= amount
          );
        })
      : [];

  const cardsRequiredLines = getRequirementStatusLines(
    req,
    "cards",
    "cardsText",
    player?.cards || []
  );

  const boostsRequiredLines = getRequirementStatusLines(
    req,
    "boosts",
    "boostsText",
    getPlayerBoostRequirementPool(player)
  );

  const descriptionLines = [
    "**Requirement Panel**",
    "",
    "**Berries Required**",
    formatCheckedLine(
      `↪ ${requiredBerries.toLocaleString("en-US")}`,
      berriesOk
    ),
    "",
    "**Gems Required**",
    formatCheckedLine(`↪ ${requiredGems.toLocaleString("en-US")}`, gemsOk),
    "",
  ];

  if (isMergeCard) {
    descriptionLines.push(
      "**Fragments Required**",
      ...(fragmentRequiredLines.length ? fragmentRequiredLines : ["↪ None"]),
      "",
      "**Cards Required**",
      ...cardsRequiredLines,
      "",
      "✨ **Boosts Required**",
      ...boostsRequiredLines
    );
  } else {
    descriptionLines.push(
      "**Self Fragments Required**",
      formatCheckedLine(
        `↪ ${ownedFragments}/${requiredFragments}x ${
          stageCard.displayName || card.displayName || card.name
        }`,
        fragmentsOk
      ),
      "",
      "**Level Requirement**",
      formatCheckedLine(
        `↪ ${
          stageCard.cardRole === "battle" ? requiredLevel : "Not required"
        }`,
        levelOk
      ),
      "",
      "**Cards Required**",
      ...cardsRequiredLines,
      "",
      "✨ **Boosts Required**",
      ...boostsRequiredLines
    );
  }

  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(
      `ℹ️ Requirement • ${
        stageCard.displayName || card.displayName || card.name
      } • M${stage}`
    )
    .setDescription(descriptionLines.join("\n"));
}

function buildEmbed(card, owned, stage, player = null) {
  const isLzs = isLzsCard(card) || isLzsCard(owned);

  if (isLzs) {
    card = buildCiLzsFromCiBattleStats(stage);
    owned = card;
  }

  const stageCard = isLzs ? card : getStageCard(card, stage);
  const form =
    stageCard.evolutionForms?.[stage - 1] ||
    card.evolutionForms?.[stage - 1] ||
    {};

  const stageLabel = getStageLabel(stage);
  const specialFormName = getSpecialFormName(card, stageCard, form, stage);
  const stageImage = getStageImage(card, stageCard, stage);
  const stageBadge = getStageBadge(card, stageCard, stage);
  const displayStats = isLzs
    ? getCiLzsDisplayStats(stageCard)
    : getStageDisplayStats(card, stageCard, stage);

  const statSource = displayStats.source || card;

  if (isRoadPoneglyphCard(stageCard)) {
    stageCard.effectText = getRoadPoneglyphEffect(stage);
    stageCard.boostDescription = getRoadPoneglyphEffect(stage);

    if (form) {
      form.effectText = getRoadPoneglyphEffect(stage);
      form.boostDescription = getRoadPoneglyphEffect(stage);
    }
  }

  const extraLines =
    stageCard.cardRole === "boost"
      ? [
          `Form: ${stageLabel}`,
          `Tier: ${form?.tier || stageCard.currentTier || stageCard.rarity}`,
          `Role: ${stageCard.cardRole}`,
          `Power: ${displayStats.power}`,
          `Effect: ${getRoadPoneglyphDisplayEffect(
            stageCard,
            stage,
            form?.effectText || stageCard.effectText || "No effect text"
          )}`,
          `Target: ${stageCard.boostTarget || "team"}`,
          `Boost Type: ${stageCard.boostType || "unknown"}`,
          `Devil Fruit: ${getBoostDevilFruitForCi(card, stageCard, form)}`,
          `Fragments: ${Number(owned?.fragments || 0)}`,
        ]
      : [
          `Form: ${stageLabel}`,
          `Tier: ${form?.tier || stageCard.currentTier || stageCard.rarity}`,
          `Role: ${statSource.cardRole || card.cardRole || stageCard.cardRole}`,
          `Power: ${displayStats.power}`,
          `Type: ${statSource.type || card.type || stageCard.type || "Battle"}`,
          "",
          `ATK: ${formatAtkRange(displayStats.atk)}`,
          `HP: ${Number(displayStats.hp || 0)}`,
          `SPD: ${Number(displayStats.speed || 0)}`,
          `Weapon Set: ${statSource.weaponSet || statSource.weapon || "None"}`,
          `Devil Fruit: ${statSource.devilFruit || statSource.displayFruitName || "None"}`,
        ];

  return buildCardStyleEmbed({
    color: 0x5865f2,
    header: "Global Card Viewer",
    card: stageCard,
    image: stageImage,
    badgeImage: stageBadge,
    formName: specialFormName,
    tier: form?.tier || stageCard.currentTier || stageCard.rarity,
    footerText: "Global Card Viewer • Not required to own the card",
    extraLines,
  });
}

function buildRows(stage) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ci_prev")
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(stage <= 1),
      new ButtonBuilder()
        .setCustomId("ci_info")
        .setLabel("(i)")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(stage <= 1),
      new ButtonBuilder()
        .setCustomId("ci_required_for")
        .setLabel("★")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("ci_next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(stage >= 3)
    ),
  ];
}

module.exports = {
  name: "ci",
  aliases: ["cardinfo"],

  async execute(message, args) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("Usage: `op ci <card>`");

    const player = getPlayer(message.author.id, message.author.username);

    const globalCard = findCardTemplateByNameOnly(query);
    if (!globalCard) return message.reply("Card not found in global database.");

    const owned = findOwnedCard(player.cards || [], query);
    let stage = 1;

    const sent = await message.reply({
      embeds: [buildEmbed(globalCard, owned, stage, player)],
      components: buildRows(stage),
    });

    const collector = sent.createMessageComponentCollector({
      time: 10 * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({
          content: "Only you can control this card viewer.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (i.customId === "ci_prev") stage = Math.max(1, stage - 1);
      if (i.customId === "ci_next") stage = Math.min(3, stage + 1);

      if (i.customId === "ci_info") {
        await i.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => null);

        try {
          const freshPlayer = getPlayer(message.author.id, message.author.username);
          return await i.editReply({
            embeds: [buildReqEmbed(globalCard, stage, freshPlayer)],
          });
        } catch (error) {
          console.error("[CI INFO INTERACTION ERROR]", error);

          return i.editReply({
            content: "❌ Failed to load requirement panel. Please try again.",
            embeds: [],
            components: [],
          }).catch(() => null);
        }
      }

      if (i.customId === "ci_required_for") {
        await i.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => null);

        try {
          return await i.editReply({
            embeds: [buildRequiredForEmbed(globalCard, stage)],
          });
        } catch (error) {
          console.error("[CI REQUIRED FOR INTERACTION ERROR]", error);

          return i.editReply({
            content: "❌ Failed to load required-for panel. Please try again.",
            embeds: [],
            components: [],
          }).catch(() => null);
        }
      }

      const freshPlayer = getPlayer(message.author.id, message.author.username);
      const freshOwned = isLzsCard(globalCard)
        ? buildCiLzsFromCiBattleStats(stage)
        : findOwnedCard(freshPlayer.cards || [], query);

      return i.update({
        embeds: [buildEmbed(globalCard, freshOwned, stage, freshPlayer)],
        components: buildRows(stage),
      });
    });
  },
};