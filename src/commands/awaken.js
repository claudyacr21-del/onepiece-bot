const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const {
  hydrateCard,
  getBoostStageValue,
} = require("../utils/evolution");
const { getCardImage } = require("../config/assetLinks");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const {
  isMergeCard,
  getMergeFixedPower,
  buildMergedCard,
} = require("../utils/mergeCards");
const rawCards = require("../data/cards");

function cloneDeep(value) {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
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

function isExactRawCardCodeMatch(card, query) {
  const q = normalizeCode(query);
  if (!q) return false;

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
    .some((value) => normalizeCode(value) === q);
}

function isLzsQuery(query) {
  const q = normalizeCode(query);

  return [
    "lzs",
    "monster_trio",
    "monstertrio",
    "luffy_zoro_sanji",
    "luffy_zoro_sanji_combined",
  ].includes(q);
}

function isLzsCard(card) {
  const code = normalizeCode(card?.code);
  const baseCode = normalizeCode(card?.baseCode);
  const cardCode = normalizeCode(card?.cardCode);
  const sourceCode = normalizeCode(card?.sourceCode);
  const name = normalizeName(card?.displayName || card?.name || card?.title);
  const compactName = name.replace(/\s+/g, "");

  return (
    code === "lzs" ||
    baseCode === "lzs" ||
    cardCode === "lzs" ||
    sourceCode === "lzs" ||
    name === "monster trio" ||
    compactName === "monstertrio"
  );
}

function getNameFields(card) {
  return [
    card?.displayName,
    card?.name,
    card?.title,
    card?.variant,
  ]
    .map(normalizeName)
    .filter(Boolean);
}

function getMainNameFields(card) {
  return [
    card?.displayName,
    card?.name,
    card?.title,
  ]
    .map(normalizeName)
    .filter(Boolean);
}

function isExplicitMergeSearchQuery(query, card) {
  const qName = normalizeName(query);
  const qCode = normalizeCode(query);

  if (!qName && !qCode) return false;

  if (isExactRawCardCodeMatch(card, query)) return true;

  if (isLzsQuery(query) && isLzsCard(card)) return true;

  const mainFields = getMainNameFields(card);

  return mainFields.some((field) => {
    if (!field) return false;

    return (
      field === qName ||
      field.startsWith(qName) ||
      qName === field.replace(/\s+/g, "")
    );
  });
}

function scoreNameOnly(query, card) {
  const q = normalizeName(query);

  if (!q) return 0;

  if (isExactRawCardCodeMatch(card, query)) {
    return 999999;
  }

  if (isLzsQuery(query) && isLzsCard(card)) {
    return 999998;
  }

  // Merge cards must not be selected by component names like:
  // "luffy", "zoro", or "sanji".
  // They should only be selected by explicit merge query:
  // "lzs", "monster trio", exact code, or main merge card name.
  if ((isMergeCard(card) || isLzsCard(card)) && !isExplicitMergeSearchQuery(query, card)) {
    return 0;
  }

  let best = 0;

  for (const field of getNameFields(card)) {
    if (field === q) {
      best = Math.max(best, 3000 + field.length);
    } else if (field.startsWith(q)) {
      best = Math.max(best, 1600 + q.length);
    } else if (field.includes(q)) {
      best = Math.max(best, 900 + q.length);
    } else {
      const words = q.split(" ").filter(Boolean);

      if (words.length && words.every((word) => field.includes(word))) {
        best = Math.max(best, 500 + words.join("").length);
      }
    }
  }

  return best;
}

function findOwnedIndexByNameOnly(cardsOwned, query) {
  const list = safeArray(cardsOwned);

  const scored = list
    .map((card, index) => ({
      index,
      score: scoreNameOnly(query, card),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    });

  return scored.length ? scored[0].index : -1;
}

function findTemplateByNameOnly(ownedCard, query) {
  const templates = safeArray(rawCards);

  const exactTemplate = templates.find((card) =>
    isExactRawCardCodeMatch(card, ownedCard?.code || query)
  );

  if (exactTemplate) return exactTemplate;

  if (isLzsQuery(query) || isLzsCard(ownedCard)) {
    return (
      templates.find((card) => isLzsCard(card)) ||
      null
    );
  }

  if (isMergeCard(ownedCard)) {
    const ownedCode = normalizeCode(ownedCard?.code);

    const mergeTemplate =
      templates.find((card) => {
        if (!isMergeCard(card)) return false;

        const templateCode = normalizeCode(card?.code);
        return ownedCode && templateCode && ownedCode === templateCode;
      }) ||
      templates.find((card) => isMergeCard(card) && scoreNameOnly(query, card) > 0) ||
      null;

    if (mergeTemplate) return mergeTemplate;
  }

  const target =
    ownedCard?.displayName ||
    ownedCard?.name ||
    ownedCard?.title ||
    query;

  const scored = templates
    .map((card) => ({
      card,
      score: Math.max(
        scoreNameOnly(target, card),
        scoreNameOnly(query, card)
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].card : null;
}

function stripOwnedTemplateFields(card) {
  const clean = cloneDeep(card || {});

  delete clean.awakenRequirements;
  delete clean.evolutionRequirements;
  delete clean.requirements;
  delete clean.requiredCards;
  delete clean.requiredBoosts;
  delete clean.cardsText;
  delete clean.boostsText;
  delete clean.evolutionForms;
  delete clean.stageStats;
  delete clean.stats;
  delete clean.forms;

  return clean;
}

function mergeOwnedWithTemplateForAwaken(ownedCard, template) {
  const owned = stripOwnedTemplateFields(ownedCard);

  if (!template) {
    return owned;
  }

  return {
    ...cloneDeep(template),

    instanceId: owned.instanceId,
    ownerId: owned.ownerId,

    level: owned.level,
    currentLevel: owned.currentLevel,
    lvl: owned.lvl,
    xp: owned.xp,
    exp: owned.exp,
    kills: owned.kills,
    fragments: owned.fragments,
    raidPrestige: owned.raidPrestige,

    evolutionStage: owned.evolutionStage,
    evolutionKey: owned.evolutionKey,

    currentTier: owned.currentTier || template.currentTier || template.rarity,
    rarity: owned.rarity || template.rarity,

    equippedWeapons: owned.equippedWeapons || [],
    equippedWeapon: owned.equippedWeapon || null,
    equippedWeaponName: owned.equippedWeaponName || null,
    equippedWeaponCode: owned.equippedWeaponCode || null,
    equippedWeaponLevel: owned.equippedWeaponLevel || 0,

    equippedDevilFruit: owned.equippedDevilFruit || null,
    equippedDevilFruitName: owned.equippedDevilFruitName || null,
    equippedDevilFruitCode: owned.equippedDevilFruitCode || null,

    cardRole: template.cardRole || owned.cardRole,
    role: template.role || owned.role,
    category: template.category || owned.category,
  };
}

function getStageKey(stage) {
  return `M${Number(stage || 1)}`;
}

function getStageForm(template, stage) {
  const index = Number(stage || 1) - 1;
  return safeArray(template?.evolutionForms)[index] || null;
}

function isMergeCardTemplate(template) {
  return isMergeCard(template);
}

function isAwakenMergeCard(card, template = null) {
  return isMergeCard(card) || isMergeCard(template);
}

function getAwakenMergeFixedPower(card, template = null) {
  return getMergeFixedPower({
    ...(template || {}),
    ...(card || {}),
  });
}

function applyAwakenMergeFixedPower(card, template = null) {
  if (!isAwakenMergeCard(card, template)) return card;

  const fixedPower = getAwakenMergeFixedPower(card, template);

  return {
    ...card,
    mergeOnly: card?.mergeOnly ?? template?.mergeOnly ?? true,
    mergeFixedPower: fixedPower,

    power: fixedPower,
    basePower: fixedPower,
    currentPower: fixedPower,
    finalPower: fixedPower,
    displayPower: fixedPower,
    combatPower: fixedPower,
    teamPower: fixedPower,
    battlePower: fixedPower,
    totalPower: fixedPower,

    powerCaps: {
      ...(card?.powerCaps || {}),
      M1: fixedPower,
      M2: fixedPower,
      M3: fixedPower,
    },
  };
}

function buildAwakenedMergeCardForDisplay(player, card, template = null, stage = null) {
  if (!isAwakenMergeCard(card, template)) return card;

  const targetStage = Math.max(
    1,
    Math.min(3, Number(stage || card?.evolutionStage || 1))
  );

  const stageKey = getStageKey(targetStage);
  const stageForm = getStageForm(template, targetStage);

  const merged = buildMergedCard(
    player || { cards: [] },
    {
      ...(template || {}),
      ...(card || {}),
      evolutionStage: targetStage,
      evolutionKey: stageKey,
    },
    targetStage,
    {
      sourceStage: targetStage,
      displayLevel: targetStage === 1 ? 50 : targetStage === 2 ? 85 : 100,
    }
  );

  const stageImage =
    stageForm?.image ||
    merged?.stageImages?.[stageKey] ||
    card?.stageImages?.[stageKey] ||
    template?.stageImages?.[stageKey] ||
    "";

  return applyAwakenMergeFixedPower(
    {
      ...(card || {}),
      ...(merged || {}),
      evolutionStage: targetStage,
      evolutionKey: stageKey,
      image:
        stageImage ||
        merged?.image ||
        card?.image ||
        template?.image ||
        "",
      atk: Number(merged?.atk || merged?.finalAtk || merged?.baseAtk || card?.atk || 0),
      hp: Number(merged?.hp || merged?.finalHp || merged?.baseHp || card?.hp || 0),
      speed: Number(
        merged?.speed ||
          merged?.spd ||
          merged?.finalSpeed ||
          merged?.baseSpeed ||
          card?.speed ||
          card?.spd ||
          0
      ),
      spd: Number(
        merged?.speed ||
          merged?.spd ||
          merged?.finalSpeed ||
          merged?.baseSpeed ||
          card?.speed ||
          card?.spd ||
          0
      ),
    },
    template
  );
}

function uniqReqCardsForAwaken(cards = []) {
  const out = [];
  const seen = new Set();

  for (const entry of Array.isArray(cards) ? cards : []) {
    if (!entry) continue;

    const code = normalizeCode(entry.code || "");
    const name = normalizeName(entry.name || entry.displayName || entry.cardName || "");
    const stage = Number(entry.stage || entry.minStage || entry.evolutionStage || 1);
    const key = `${code || name}:m${stage}`;

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }

  return out;
}

function getMergeRoadPoneglyphReq(stage) {
  return {
    code: "road_poneglyph",
    name: "Road Poneglyph",
    stage,
    minStage: stage,
    evolutionStage: stage,
  };
}

function normalizeMergeAwakenRequirement(template, nextStage, req) {
  if (!isMergeCardTemplate(template)) return req;

  const stage = Number(nextStage || 1);

  if (stage < 2) return req;

  const baseReq = req || {};

  return {
    ...baseReq,
    berries: 2000000,
    gems: 2000,
    selfFragments: 0,
    cards: uniqReqCardsForAwaken([
      ...(Array.isArray(baseReq.cards) ? baseReq.cards : []),
      getMergeRoadPoneglyphReq(stage),
    ]),
    cardsText: [
      ...(Array.isArray(baseReq.cardsText) ? baseReq.cardsText : []),
      `Road Poneglyph M${stage}`,
    ].filter((value, index, arr) => arr.indexOf(value) === index),
    fragments: Array.isArray(baseReq.fragments) ? baseReq.fragments : [],
    boosts: Array.isArray(baseReq.boosts) ? baseReq.boosts : [],
    boostsText: Array.isArray(baseReq.boostsText) ? baseReq.boostsText : [],
  };
}

function getAwakenRequirement(template, nextStage) {
  if (!template) return null;

  const stageKey = getStageKey(nextStage);
  const form = getStageForm(template, nextStage);

  const req =
    form?.require ||
    template.awakenRequirements?.[stageKey] ||
    template.evolutionRequirements?.[stageKey] ||
    template.requirements?.[stageKey] ||
    null;

  return normalizeMergeAwakenRequirement(template, nextStage, req);
}

function getCurrentStage(card) {
  const stage = Number(card?.evolutionStage || 1);
  return Math.max(1, Math.min(3, Number.isFinite(stage) ? Math.floor(stage) : 1));
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

function getAwakenCostBaseTierForAwaken(card, template) {
  const role = String(card?.cardRole || template?.cardRole || card?.role || template?.role || "")
    .toLowerCase();

  const tierCandidates =
    role === "boost"
      ? [
          card?.baseTier,
          template?.baseTier,
          card?.rarity,
          template?.rarity,
          card?.currentTier,
          template?.currentTier,
          card?.originalTier,
          template?.originalTier,
          card?.baseRarity,
          template?.baseRarity,
        ]
      : [
          card?.baseTier,
          template?.baseTier,
          card?.originalTier,
          template?.originalTier,
          card?.baseRarity,
          template?.baseRarity,
          card?.rarity,
          template?.rarity,
          card?.currentTier,
          template?.currentTier,
        ];

  const tier = String(tierCandidates.find(Boolean) || "C").toUpperCase();

  if (tier === "UR" || tier === "SS") return "S";
  if (["S", "A", "B", "C"].includes(tier)) return tier;

  return "C";
}

function getAwakenGemsCostForAwaken(req, nextStage, card, template) {
  const direct = Number(req?.gems || 0);
  if (direct > 0) return direct;

  if (isMergeCardTemplate(template)) {
    return Number(req?.gems || 2000);
  }

  const baseTier = getAwakenCostBaseTierForAwaken(card, template);
  const costs = AWAKEN_GEMS_COST_BY_BASE_TIER[baseTier] || AWAKEN_GEMS_COST_BY_BASE_TIER.C;

  return Number(costs[Number(nextStage || 1)] || 0);
}

function getOwnedFragmentAmount(player, target) {
  const code = normalizeCode(target?.code);
  const name = normalizeName(target?.displayName || target?.name || target?.title);
  const fragments = safeArray(player?.fragments);

  const globalAmount = fragments.reduce((sum, entry) => {
    const entryCode = normalizeCode(entry?.code);
    const entryName = normalizeName(entry?.name || entry?.displayName);

    const matched =
      (code && entryCode === code) ||
      (name && entryName === name) ||
      (code && entryName === code) ||
      (name && entryCode === name);

    return matched ? sum + Number(entry.amount || 0) : sum;
  }, 0);

  return globalAmount + Number(target?.fragments || 0);
}

function consumeFragmentAmount(player, targetIndex, target, amount) {
  let remaining = Number(amount || 0);
  if (remaining <= 0) {
    return {
      cards: safeArray(player?.cards),
      fragments: safeArray(player?.fragments),
    };
  }
  const code = normalizeCode(target?.code);
  const name = normalizeName(target?.displayName || target?.name || target?.title);

  const updatedFragments = safeArray(player?.fragments)
    .map((entry) => {
      if (remaining <= 0) return entry;

      const entryCode = normalizeCode(entry?.code);
      const entryName = normalizeName(entry?.name || entry?.displayName);

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
    })
    .filter((entry) => Number(entry.amount || 0) > 0);

  const updatedCards = safeArray(player?.cards).map((card, index) => {
    if (index !== targetIndex || remaining <= 0) return card;

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
    cards: updatedCards,
    fragments: updatedFragments,
  };
}

function consumeExternalFragments(player, targetIndex, fragmentsReq) {
  let nextCards = safeArray(player?.cards);
  let nextFragments = safeArray(player?.fragments);

  for (const req of safeArray(fragmentsReq)) {
    const amount = Number(req?.amount || 0);
    if (amount <= 0) continue;

    const target = {
      code: req.code,
      name: req.name,
      displayName: req.displayName || req.name,
      title: req.title,
    };

    const consumed = consumeFragmentAmount(
      {
        ...player,
        cards: nextCards,
        fragments: nextFragments,
      },
      targetIndex,
      target,
      amount
    );

    nextCards = consumed.cards;
    nextFragments = consumed.fragments;
  }

  return {
    cards: nextCards,
    fragments: nextFragments,
  };
}

function requirementNameCandidates(req) {
  if (!req) return [];

  if (typeof req === "string") {
    return [normalizeName(req)].filter(Boolean);
  }

  return [
    req.displayName,
    req.name,
    req.cardName,
    req.title,
    req.variant,
  ]
    .map(normalizeName)
    .filter(Boolean);
}

function requirementCodeCandidates(req) {
  if (!req || typeof req === "string") return [];

  return [
    req.code,
    req.baseCode,
  ]
    .map(normalizeCode)
    .filter(Boolean);
}

function doesRequirementMatchCard(card, req) {
  const reqCodes = requirementCodeCandidates(req);
  const cardCodes = [
    card?.code,
    card?.baseCode,
  ]
    .map(normalizeCode)
    .filter(Boolean);

  for (const reqCode of reqCodes) {
    for (const cardCode of cardCodes) {
      if (reqCode && cardCode && reqCode === cardCode) return true;
    }
  }

  const reqNames = requirementNameCandidates(req);
  const cardNames = [
    card?.displayName,
    card?.name,
    card?.title,
    card?.variant,
  ]
    .map(normalizeName)
    .filter(Boolean);

  for (const reqName of reqNames) {
    for (const cardName of cardNames) {
      if (reqName && cardName && reqName === cardName) return true;
    }
  }

  return false;
}

function findRequirementOwnedCard(player, req) {
  return (
    safeArray(player?.cards)
      .map((card) => hydrateCard(card))
      .filter(Boolean)
      .find((card) => doesRequirementMatchCard(card, req)) || null
  );
}

function validateRequirement(player, targetIndex, targetCard, req) {
  const missing = [];

  const berriesNeed = Number(req?.berries || 0);
  const berriesOwned = Number(player?.berries || 0);

  if (berriesOwned < berriesNeed) {
    missing.push(
      `Berries ${berriesOwned.toLocaleString("en-US")}/${berriesNeed.toLocaleString("en-US")}`
    );
  }

  const template = findTemplateByNameOnly(targetCard, targetCard?.displayName || targetCard?.name || "");
  const nextStage = Math.min(3, getCurrentStage(targetCard) + 1);
  const gemsNeed = getAwakenGemsCostForAwaken(req, nextStage, targetCard, template);
  const gemsOwned = Number(player?.gems || 0);

  if (gemsOwned < gemsNeed) {
    missing.push(
      `Gems ${gemsOwned.toLocaleString("en-US")}/${gemsNeed.toLocaleString("en-US")}`
    );
  }

  const selfFragmentsNeed = Number(req?.selfFragments || 0);

  if (selfFragmentsNeed > 0) {
    const selfFragmentsOwned = getOwnedFragmentAmount(player, targetCard);

    if (selfFragmentsOwned < selfFragmentsNeed) {
      missing.push(
        `Self fragments ${selfFragmentsOwned}/${selfFragmentsNeed}x ${targetCard.displayName || targetCard.name}`
      );
    }
  }

  for (const fragReq of safeArray(req?.fragments)) {
    const amount = Number(fragReq?.amount || 0);
    const owned = getOwnedFragmentAmount(player, fragReq);

    if (owned < amount) {
      missing.push(
        `${fragReq.name || fragReq.displayName || fragReq.code || "Fragment"} fragments ${owned}/${amount}`
      );
    }
  }

  const isBattle = String(targetCard?.cardRole || "").toLowerCase() === "battle";

  if (isBattle) {
    const levelNeed = Number(req?.minLevel || 0);
    const levelOwned = Number(targetCard?.level || 1);

    if (levelOwned < levelNeed) {
      missing.push(`Level ${levelOwned}/${levelNeed}`);
    }
  }

  for (const cardReq of safeArray(req?.cards)) {
    const owned = findRequirementOwnedCard(player, cardReq);
    const stageNeed = Number(cardReq?.stage || cardReq?.minStage || cardReq?.evolutionStage || 1);

    if (!owned) {
      missing.push(
        `${cardReq.displayName || cardReq.name || cardReq.cardName || cardReq.title || cardReq.code || "Required Card"} M${stageNeed}`
      );
      continue;
    }

    const ownedStage = Number(owned.evolutionStage || 1);
    if (ownedStage < stageNeed) {
      missing.push(`${owned.displayName || owned.name} M${ownedStage}/M${stageNeed}`);
    }
  }

  for (const boostReq of safeArray(req?.boosts)) {
    const owned = findRequirementOwnedCard(player, boostReq);
    const stageNeed = Number(boostReq?.stage || boostReq?.minStage || boostReq?.evolutionStage || 1);

    if (!owned) {
      missing.push(
        `${boostReq.displayName || boostReq.name || boostReq.cardName || boostReq.title || boostReq.code || "Required Boost"} M${stageNeed}`
      );
      continue;
    }

    const ownedStage = Number(owned.evolutionStage || 1);
    if (ownedStage < stageNeed) {
      missing.push(`${owned.displayName || owned.name} M${ownedStage}/M${stageNeed}`);
    }
  }

  if (missing.length) {
    throw new Error(missing.join("\n"));
  }
}

function makeAwakenedCard(rawCard, template, nextStage) {
  const clean = stripOwnedTemplateFields(rawCard);
  const form = getStageForm(template, nextStage);

  const next = {
    ...cloneDeep(template || {}),
    ...clean,

    code: template?.code || clean.code,
    name: template?.name || clean.name,
    displayName: template?.displayName || clean.displayName,
    title: template?.title || clean.title,

    cardRole: template?.cardRole || clean.cardRole,
    role: template?.role || clean.role,
    category: template?.category || clean.category,

    currentTier:
      form?.tier ||
      template?.currentTier ||
      template?.rarity ||
      clean.currentTier ||
      clean.rarity,

    rarity:
      form?.tier ||
      template?.currentTier ||
      template?.rarity ||
      clean.currentTier ||
      clean.rarity,

    evolutionStage: nextStage,
    evolutionKey: getStageKey(nextStage),
  };

  const stripped = stripOwnedTemplateFields(next);

  return isAwakenMergeCard(stripped, template)
    ? buildAwakenedMergeCardForDisplay({ cards: [] }, stripped, template, nextStage)
    : applyAwakenMergeFixedPower(stripped, template);
}


function findAwakenTargetIndex(cardsOwned, query, targetSelector = null) {
  const list = safeArray(cardsOwned);

  const instanceId = String(targetSelector?.instanceId || "").trim();

  if (instanceId) {
    const byInstance = list.findIndex((card) => String(card?.instanceId || "").trim() === instanceId);

    if (byInstance !== -1) return byInstance;
  }

  const exactCodeIndex = list.findIndex((card) => {
    const hydrated = hydrateCard(card) || card;
    return isExactRawCardCodeMatch(card, query) || isExactRawCardCodeMatch(hydrated, query);
  });

  if (exactCodeIndex !== -1) return exactCodeIndex;

  const index = Number(targetSelector?.index);

  if (Number.isInteger(index) && index >= 0 && index < list.length) {
    const card = list[index];

    if (scoreNameOnly(query, card) > 0) return index;
  }

  const scored = list
    .map((card, cardIndex) => {
      const hydrated = hydrateCard(card) || card;

      const stage = getCurrentStage(hydrated);

      return {
        index: cardIndex,

        score: Math.max(
          scoreNameOnly(query, hydrated),
          scoreNameOnly(query, card)
        ),

        stage,

        awakenable: stage < 3,
      };
    })

    .filter((entry) => entry.score > 0)

    .sort((a, b) => {
      if (a.awakenable !== b.awakenable) return a.awakenable ? -1 : 1;

      if (b.score !== a.score) return b.score - a.score;

      if (a.stage !== b.stage) return a.stage - b.stage;

      return a.index - b.index;
    });

  return scored.length ? scored[0].index : -1;
}

function runAwaken(player, query, targetSelector = null) {
  const cardsOwned = safeArray(player?.cards);
  const targetIndex = findAwakenTargetIndex(cardsOwned, query, targetSelector);

  if (targetIndex === -1) {
    throw new Error("You do not own that card.");
  }

  const originalCard = cardsOwned[targetIndex];
  const hydratedOriginal = hydrateCard(originalCard) || originalCard;

  const template =
    findTemplateByNameOnly(originalCard, query) ||
    findTemplateByNameOnly(hydratedOriginal, query);

  if (!template) {
    throw new Error(
      `Card template could not be loaded for ${hydratedOriginal?.displayName || hydratedOriginal?.name || hydratedOriginal?.code || query}.`
    );
  }

  const targetCard = hydrateCard(mergeOwnedWithTemplateForAwaken(originalCard, template));

  if (!targetCard) {
    throw new Error("Card data could not be loaded.");
  }

  const currentStage = getCurrentStage(targetCard);

  if (currentStage >= 3) {
    throw new Error("This card is already at M3.");
  }

  const nextStage = currentStage + 1;
  const req = getAwakenRequirement(template, nextStage);

  if (!req) {
    throw new Error("No awaken requirement found.");
  }

  const validationPlayer = {
    ...player,
    cards: cardsOwned,
  };

  validateRequirement(validationPlayer, targetIndex, targetCard, req);

  const berriesNeed = Number(req?.berries || 0);
  const gemsNeed = getAwakenGemsCostForAwaken(req, nextStage, targetCard, template);

  const afterSelfFragments = consumeFragmentAmount(
    validationPlayer,
    targetIndex,
    targetCard,
    Number(req?.selfFragments || 0)
  );

  const afterExternalFragments = consumeExternalFragments(
    {
      ...validationPlayer,
      cards: afterSelfFragments.cards,
      fragments: afterSelfFragments.fragments,
    },
    targetIndex,
    req?.fragments
  );

  const updatedCards = afterExternalFragments.cards.map((card, index) => {
    if (index !== targetIndex) return stripOwnedTemplateFields(card);
    return makeAwakenedCard(card, template, nextStage);
  });

  const updatedPlayer = {
    ...player,
    cards: updatedCards,
    fragments: afterExternalFragments.fragments,
    berries: Number(player?.berries || 0) - berriesNeed,
    gems: Number(player?.gems || 0) - gemsNeed,
  };

  const resultTarget = isAwakenMergeCard(updatedCards[targetIndex], template)
    ? buildAwakenedMergeCardForDisplay(
        updatedPlayer,
        updatedCards[targetIndex],
        template,
        nextStage
      )
    : hydrateCard(updatedCards[targetIndex]);

  return {
    updatedPlayer,
    target: resultTarget,
    updatedCards,
    updatedFragments: afterExternalFragments.fragments,
    berries: updatedPlayer.berries,
    gems: updatedPlayer.gems,
    currentStage,
    nextStage,
    requirement: req,
    template,
  };
}

function isIgnorableInteractionError(error) {
  const code = Number(error?.code || error?.rawError?.code || 0);
  const message = String(error?.message || "");

  return (
    code === 10062 ||
    code === 40060 ||
    message.includes("Unknown interaction") ||
    message.includes("Interaction has already been acknowledged")
  );
}

async function safeInteractionReply(interaction, payload = {}) {
  try {
    if (!interaction) return null;

    const cleanPayload = {
      ...payload,
      flags: payload.flags || MessageFlags.Ephemeral,
    };

    delete cleanPayload.ephemeral;

    if (interaction.replied || interaction.deferred) {
      return await interaction.followUp(cleanPayload).catch(() => null);
    }

    return await interaction.reply(cleanPayload);
  } catch (error) {
    if (!isIgnorableInteractionError(error)) {
      console.error("[AWAKEN INTERACTION REPLY ERROR]", error);
    }

    return null;
  }
}

async function safeInteractionUpdate(interaction, payload = {}) {
  try {
    if (!interaction) return null;

    if (!interaction.replied && !interaction.deferred) {
      return await interaction.update(payload);
    }

    if (interaction.message) {
      return await interaction.message.edit(payload);
    }

    return await interaction.editReply(payload);
  } catch (error) {
    if (!isIgnorableInteractionError(error)) {
      console.error("[AWAKEN INTERACTION UPDATE ERROR]", error);
    }

    try {
      if (interaction?.message) {
        return await interaction.message.edit(payload);
      }
    } catch (editError) {
      if (!isIgnorableInteractionError(editError)) {
        console.error("[AWAKEN MESSAGE EDIT FALLBACK ERROR]", editError);
      }
    }

    return null;
  }
}

async function safeStopCollector(collector, reason) {
  try {
    if (collector && !collector.ended) {
      collector.stop(reason);
    }
  } catch (_) {}
}

function getStageImage(card, stage) {
  const targetStage = Math.max(1, Math.min(3, Math.floor(Number(stage || 1))));
  const stageKey = getStageKey(targetStage);

  const template =
    findTemplateByNameOnly(card, card?.displayName || card?.name || "") || card;

  const form = getStageForm(template, targetStage);

  const image =
    form?.image ||
    form?.img ||
    form?.url ||
    template?.stageImages?.[stageKey] ||
    template?.images?.[stageKey] ||
    template?.forms?.[stageKey]?.image ||
    template?.forms?.[stageKey]?.img ||
    card?.stageImages?.[stageKey] ||
    card?.images?.[stageKey] ||
    card?.forms?.[stageKey]?.image ||
    "";

  if (image) return image;

  const code = String(template?.code || card?.code || "").trim();

  if (code) {
    const linkedImage = getCardImage(code, stageKey, "");
    if (linkedImage) return linkedImage;
  }

  return "";
}

function getFormName(card, stage) {
  const template = findTemplateByNameOnly(card, card?.displayName || card?.name || "");
  const form = getStageForm(template, stage);

  return (
    form?.name ||
    form?.formTitle ||
    form?.specialName ||
    template?.variant ||
    card?.variant ||
    card?.displayName ||
    card?.name ||
    "Unknown"
  );
}

function getBoostEffectText(card, stage = 1) {
  if (!card || String(card.cardRole || "").toLowerCase() !== "boost") return "";

  const template = findTemplateByNameOnly(card, card?.displayName || card?.name || "") || card;
  const form = getStageForm(template, stage);

  const boostType = String(
    form?.boostType ||
      template?.boostType ||
      card?.boostType ||
      ""
  )
    .toLowerCase()
    .trim();

  const target =
    form?.boostTarget ||
    template?.boostTarget ||
    card?.boostTarget ||
    "team";

  const value = getBoostStageValue(
    {
      ...template,
      ...card,
      stageStats: template?.stageStats || card?.stageStats,
      evolutionForms: template?.evolutionForms || card?.evolutionForms,
    },
    stage
  );

  if (boostType === "fragmentstorage" || boostType === "fragment_storage") {
    return `Increase ${target} fragment storage by ${value}.`;
  }

  if (boostType === "pullchance" || boostType === "pull_chance") {
    return `Increase ${target} pull chance by ${value}%.`;
  }

  if (boostType === "daily") {
    return `Increase ${target} daily reward quality by ${value}.`;
  }

  const suffix = ["atk", "hp", "spd", "speed", "exp", "dmg"].includes(boostType)
    ? "%"
    : "";

  if (!boostType) {
    const fallbackText =
      form?.effectText ||
      form?.boostDescription ||
      template?.effectText ||
      template?.boostDescription ||
      card?.effectText ||
      card?.boostDescription ||
      "";

    return fallbackText || "No boost effect description.";
  }

  return `Increase ${target} ${boostType.toUpperCase()} by ${value}${suffix}.`;
}

function formatAwakenErrorDetail(error) {
  const raw = String(error?.message || "Unknown awaken requirement error.")
    .replace(/^Missing requirements:\s*/i, "")
    .replace(/^\*\*?Missing \/ Error Detail\*\*?\s*/i, "")
    .trim();

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const seen = new Set();
  const unique = [];

  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(line);
  }

  return unique.length ? unique.join("\n") : "Unknown awaken requirement error.";
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function applyBoostedDisplayStats(card, boosts = {}) {
  if (!card || String(card.cardRole || "").toLowerCase() === "boost") {
    return card;
  }

  return {
    ...card,
    atk: Math.floor(Number(card.atk || 0) * (1 + Number(boosts.atk || 0) / 100)),
    hp: Math.floor(Number(card.hp || 0) * (1 + Number(boosts.hp || 0) / 100)),
    speed: Math.floor(Number(card.speed || 0) * (1 + Number(boosts.spd || 0) / 100)),
  };
}

function buildAwakenPreviewCard(owned, nextStage) {
  const template =
    findTemplateByNameOnly(owned, owned?.displayName || owned?.name || "") ||
    owned;

  return makeAwakenedCard(owned, template, nextStage);
}

function buildConfirmEmbed(owned, currentStage, nextStage) {
  const previewCard = buildAwakenPreviewCard(owned, nextStage);
  const nextImage = getStageImage(previewCard, nextStage);

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`✨ Awaken ${owned.displayName || owned.name}`)
    .setDescription(
      [
        `Current: **M${currentStage}**`,
        `Next: **M${nextStage}** • ${getFormName(previewCard, nextStage)}`,
        "",
        "All requirements are ready.",
        "Press **Yes** to awaken or **Cancel** to stop.",
      ].join("\n")
    );

  if (nextImage) embed.setImage(nextImage);

  return embed;
}

function buildSuccessEmbed(result, player) {
  const template = result.template || findTemplateByNameOnly(
    result.target,
    result.target?.displayName || result.target?.name || result.target?.code || ""
  );

  const rawCard = isAwakenMergeCard(result.target, template)
    ? buildAwakenedMergeCardForDisplay(
        player,
        result.target,
        template,
        result.nextStage || result.target?.evolutionStage || 1
      )
    : hydrateCard(result.target);

  const boosts = getPassiveBoostSummary(player);
  const card = applyBoostedDisplayStats(rawCard, boosts);
  const targetStage = Number(card.evolutionStage || result.nextStage || 1);

  const targetImage =
    isAwakenMergeCard(card, template)
      ? card.image ||
        card.stageImages?.[getStageKey(targetStage)] ||
        getStageImage(card, targetStage)
      : getStageImage(card, targetStage);

  const baseLines = [
    `**${card.displayName || card.name}** reached **M${targetStage}**`,
    `**Form:** ${getFormName(card, targetStage)}`,
    `**Tier:** ${card.currentTier || card.rarity}`,
    `**Power:** ${Number(
      isAwakenMergeCard(card) ? getAwakenMergeFixedPower(card) : card.currentPower || card.power || 0
    ).toLocaleString("en-US")}`,
    "",
  ];

  const description =
    String(card.cardRole || "").toLowerCase() === "boost"
      ? [
          ...baseLines,
          "**Boost Effect**",
          getBoostEffectText(card, targetStage),
        ].join("\n")
      : [
          ...baseLines,
          `ATK: ${formatAtkRange(card.atk)}`,
          `HP: ${Number(card.hp || 0).toLocaleString("en-US")}`,
          `SPD: ${Number(card.speed || 0).toLocaleString("en-US")}`,
        ].join("\n");

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("✨ Awaken Success")
    .setDescription(description);

  if (targetImage) embed.setImage(targetImage);

  return embed;
}

function getCiQueryText(card, query) {
  if (isLzsQuery(query) || isLzsCard(card)) return "lzs";
  if (isMergeCard(card)) return card?.code || card?.displayName || card?.name || query;
  return card?.displayName || card?.name || card?.title || query;
}

module.exports = {
  name: "awaken",
  aliases: ["evolve"],

  async execute(message, args) {
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply("Usage: `op awaken <card name>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const targetIndex = findOwnedIndexByNameOnly(player.cards || [], query);

    if (targetIndex === -1) {
      return message.reply({
        content: "You do not own that card.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const ownedRaw = safeArray(player.cards)[targetIndex];
    const template = findTemplateByNameOnly(ownedRaw, query);
    const owned = hydrateCard(mergeOwnedWithTemplateForAwaken(ownedRaw, template));
    const currentStage = getCurrentStage(owned);
    const nextStage = currentStage + 1;
    const ciQueryText = getCiQueryText(owned, query);

    if (currentStage >= 3) {
      return message.reply("This card is already at M3.");
    }

    try {
      runAwaken(player, ciQueryText, { index: targetIndex, instanceId: ownedRaw?.instanceId || null });
    } catch (error) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("Awaken Failed")
            .setDescription(
              [
                `**${owned.displayName || owned.name || owned.code}** cannot awaken to **M${nextStage}** yet.`,
                "",
                "**Missing / Error Detail**",
                formatAwakenErrorDetail(error),
                "",
                `Use \`op ci ${ciQueryText}\` then press **(i)** to check the same requirement panel.`,
              ].join("\n")
            ),
        ],
      });
    }

    const sent = await message.reply({
      embeds: [buildConfirmEmbed(owned, currentStage, nextStage)],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("awaken_yes")
            .setLabel("Yes")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("awaken_cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Danger)
        ),
      ],
    });

    const collector = sent.createMessageComponentCollector({
      time: 10 * 60 * 1000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return safeInteractionReply(interaction, {
          content: "Only you can control this awaken action.",
        });
      }

      if (interaction.customId === "awaken_cancel") {
        await safeInteractionUpdate(interaction, {
          embeds: [
            new EmbedBuilder()
              .setColor(0x95a5a6)
              .setTitle("Awaken Cancelled")
              .setDescription("No changes were made."),
          ],
          components: [],
        });

        await safeStopCollector(collector, "cancel");
        return;
      }

      if (interaction.customId !== "awaken_yes") {
        return safeInteractionReply(interaction, {
          content: "Invalid awaken action.",
        });
      }

      try {
        let awakenResult = null;
        let freshPlayerForDisplay = null;

        updatePlayerAtomic(
          message.author.id,
          (fresh) => {
            awakenResult = runAwaken(fresh, ciQueryText, { index: targetIndex, instanceId: ownedRaw?.instanceId || null });
            freshPlayerForDisplay = awakenResult.updatedPlayer;
            return awakenResult.updatedPlayer;
          },
          message.author.username
        );

        await safeInteractionUpdate(interaction, {
          embeds: [buildSuccessEmbed(awakenResult, freshPlayerForDisplay)],
          components: [],
        });

        await safeStopCollector(collector, "done");
      } catch (error) {
        await safeInteractionUpdate(interaction, {
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("Awaken Failed")
              .setDescription(
                [
                  `**${owned.displayName || owned.name || owned.code}** cannot awaken right now.`,
                  "",
                  "**Missing / Error Detail**",
                  formatAwakenErrorDetail(error),
                  "",
                  `Use \`op ci ${ciQueryText}\` then press **(i)** to check the same requirement panel.`,
                ].join("\n")
              ),
          ],
          components: [],
        });

        await safeStopCollector(collector, "fail");
      }
    });
  },
};