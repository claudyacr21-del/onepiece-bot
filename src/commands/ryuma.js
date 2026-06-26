const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");

const {
  readPlayers,
  writePlayers,
  getPlayer,
} = require("../playerStore");
const { getPlayerCombatCards } = require("../utils/combatStats");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { hydrateCard } = require("../utils/evolution");
const { isMergeCard, buildMergedCard } = require("../utils/mergeCards");
const EVENT_ID = "ryuma_global_boss";
const GLOBAL_STORE_ID = "__ryuma_global_boss_event";

const EVENT_NAME = "Ryuma Global Boss Event";
const BOSS_NAME = "Ryuma";

const MAX_HP = 600000000;
const BOSS_DAMAGE = 5000;
const ATTACK_LIMIT = 20;
const ACTIVE_RYUMA_BATTLES = new Set();
const DAMAGE_VARIANCE_MIN = 0.85;
const DAMAGE_VARIANCE_MAX = 1.15;

const PHASE_DAMAGE_MULTIPLIER = {
  1: 1,
  2: 1.15,
  3: 1.3,
  4: 1.5,
};

const BOSS_PHASES = [
  {
    phase: 1,
    name: "Shusui Awakening",
    minHpExclusive: 450000000,
    description: "Ryuma enters the battlefield with calm sword pressure.",
  },
  {
    phase: 2,
    name: "Dragon Slayer",
    minHpExclusive: 300000000,
    description: "Ryuma's sword aura grows stronger.",
  },
  {
    phase: 3,
    name: "Black Blade Legend",
    minHpExclusive: 150000000,
    description: "Ryuma unleashes the power of a legendary black blade.",
  },
  {
    phase: 4,
    name: "Final Samurai Spirit",
    minHpExclusive: -1,
    description: "Ryuma fights with his final legendary spirit.",
  },
];
const ATTACK_WINDOW_MS = 6 * 60 * 60 * 1000;
const EVENT_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const EVENT_START_AT = process.env.RYUMA_EVENT_START_AT
  ? Date.parse(process.env.RYUMA_EVENT_START_AT)
  : 0;

const EVENT_END_AT = process.env.RYUMA_EVENT_END_AT
  ? Date.parse(process.env.RYUMA_EVENT_END_AT)
  : 0;

const RYUMA_ATTACK_GIF = process.env.RYUMA_ATTACK_GIF || "";
const RYUMA_EVENT_TIME_ZONE = process.env.RYUMA_EVENT_TIME_ZONE || "Asia/Jakarta";
const RYUMA_EVENT_START_LABEL =
  process.env.RYUMA_EVENT_START_LABEL || "26 June 2026, 00:00 WIB";
const GLOBAL_MILESTONES = [
  5000000,
  10000000,
  15000000,
  20000000,
  25000000,
  30000000,
  35000000,
  40000000,
  45000000,
  50000000,
  55000000,
  60000000,
  65000000,
  70000000,
  75000000,
];

const PITY_CHARM_MILESTONES = new Set([
  25000000,
  50000000,
  75000000,
]);

const PERSONAL_MILESTONES = [
  {
    damage: 25000,
    rewards: {
      ryumaTokens: 25,
    },
  },
  {
    damage: 75000,
    rewards: {
      ryumaTokens: 50,
    },
  },
  {
    damage: 150000,
    rewards: {
      ryumaTokens: 100,
      berries: 500000,
    },
  },
  {
    damage: 300000,
    rewards: {
      ryumaTokens: 150,
      berries: 1000000,
    },
  },
  {
    damage: 600000,
    rewards: {
      ryumaTokens: 250,
      berries: 2000000,
    },
  },
  {
    damage: 1000000,
    rewards: {
      ryumaTokens: 400,
      gems: 5,
    },
  },
  {
    damage: 1750000,
    rewards: {
      ryumaTokens: 600,
      berries: 3000000,
    },
  },
  {
    damage: 2750000,
    rewards: {
      ryumaTokens: 900,
      gems: 10,
    },
  },
  {
    damage: 4000000,
    rewards: {
      ryumaTokens: 1250,
      berries: 5000000,
    },
  },
  {
    damage: 5500000,
    rewards: {
      ryumaTokens: 2000,
      boxes: [
        {
          code: "exclusive_event_chest",
          name: "Exclusive Event Chest",
          amount: 1,
          type: "Box",
          description: "A premium chest from the Ryuma Global Boss Event.",
        },
      ],
    },
  },
];

const BONUS_START_DAMAGE = 5500000;
const BONUS_STEP_DAMAGE = 1000000;

const BONUS_REWARD = {
  ryumaTokens: 500,
  berries: 1000000,
  gems: 500,
  tickets: [
    {
      code: "pull_reset_ticket",
      name: "Pull Reset Ticket",
      amount: 1,
      type: "Ticket",
    },
    {
      code: "raid_ticket",
      name: "Raid Ticket",
      amount: 1,
      type: "Ticket",
    },
  ],
};

const SHOP_ITEMS = [
  {
    key: "berries_500k",
    name: "500,000 Berries",
    price: 150,
    limit: 10,
    aliases: ["berries", "berry", "500k berries", "500000 berries"],
    rewards: {
      berries: 500000,
    },
  },
  {
    key: "berries_1m",
    name: "1,000,000 Berries",
    price: 275,
    limit: 5,
    aliases: ["1m berries", "1000000 berries", "1 million berries"],
    rewards: {
      berries: 1000000,
    },
  },
  {
    key: "gems_500",
    name: "500 Gems",
    price: 350,
    limit: 8,
    aliases: ["gems", "gem", "500 gems"],
    rewards: {
      gems: 500,
    },
  },
  {
    key: "gems_1000",
    name: "1,000 Gems",
    price: 650,
    limit: 4,
    aliases: ["1000 gems", "1k gems", "1000 gem", "1k gem"],
    rewards: {
      gems: 1000,
    },
  },
  {
    key: "raid_ticket",
    name: "Raid Ticket",
    price: 500,
    limit: 5,
    aliases: ["raid", "raid ticket", "raid tickets"],
    rewards: {
      tickets: [
        {
          code: "raid_ticket",
          name: "Raid Ticket",
          amount: 1,
          type: "Ticket",
        },
      ],
    },
  },
  {
    key: "gold_raid_ticket",
    name: "Gold Raid Ticket",
    price: 1200,
    limit: 3,
    aliases: ["gold raid", "gold raid ticket", "gold raid tickets", "grt"],
    rewards: {
      tickets: [
        {
          code: "gold_raid_ticket",
          name: "Gold Raid Ticket",
          amount: 1,
          type: "Ticket",
        },
      ],
    },
  },
  {
    key: "mythic_raid_ticket",
    name: "Mythic Raid Ticket",
    price: 2500,
    limit: 2,
    aliases: ["mythic raid", "mythic raid ticket", "mythic raid tickets", "mrt"],
    rewards: {
      tickets: [
        {
          code: "mythic_raid_ticket",
          name: "Mythic Raid Ticket",
          amount: 1,
          type: "Ticket",
        },
      ],
    },
  },
  {
    key: "pull_reset_ticket",
    name: "Pull Reset Ticket",
    price: 900,
    limit: 3,
    aliases: ["pull reset", "pull reset ticket", "pull reset tickets", "reset"],
    rewards: {
      tickets: [
        {
          code: "pull_reset_ticket",
          name: "Pull Reset Ticket",
          amount: 1,
          type: "Ticket",
        },
      ],
    },
  },
];

function fmt(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function now() {
  return Date.now();
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getRyumaPlayerFromStore(players, message) {
  const userId = String(message.author.id);

  if (!players[userId] || typeof players[userId] !== "object") {
    players[userId] = {
      username: message.author.username || "Unknown",
      berries: 0,
      gems: 0,
      ryumaTokens: 0,
      cards: [],
      fragments: [],
      boxes: [],
      tickets: [],
      materials: [],
      items: [],
      weapons: [],
      devilFruits: [],
      events: {},
    };
  }

  players[userId].username = message.author.username || players[userId].username || "Unknown";
  players[userId].berries = Math.max(0, Math.floor(Number(players[userId].berries || 0)));
  players[userId].gems = Math.max(0, Math.floor(Number(players[userId].gems || 0)));
  players[userId].ryumaTokens = Math.max(0, Math.floor(Number(players[userId].ryumaTokens || 0)));
  players[userId].cards = Array.isArray(players[userId].cards) ? players[userId].cards : [];
  players[userId].fragments = Array.isArray(players[userId].fragments) ? players[userId].fragments : [];
  players[userId].boxes = Array.isArray(players[userId].boxes) ? players[userId].boxes : [];
  players[userId].tickets = Array.isArray(players[userId].tickets) ? players[userId].tickets : [];
  players[userId].materials = Array.isArray(players[userId].materials) ? players[userId].materials : [];
  players[userId].items = Array.isArray(players[userId].items) ? players[userId].items : [];
  players[userId].weapons = Array.isArray(players[userId].weapons) ? players[userId].weapons : [];
  players[userId].devilFruits = Array.isArray(players[userId].devilFruits) ? players[userId].devilFruits : [];
  players[userId].events =
    players[userId].events && typeof players[userId].events === "object"
      ? players[userId].events
      : {};

  return players[userId];
}

function isRyumaAttackDisabled(message) {
  const players = readPlayers();
  const globalState = getGlobalState(players);

  if (!isEventStarted(globalState) || isEventEnded(globalState)) {
    return true;
  }

  const player = getRyumaPlayerFromStore(players, message);
  const eventData = getEventData(player);
  const attackWindow = getAttackWindow(eventData);

  return attackWindow.attacksLeft <= 0;
}

function buildMainRowsForMessage(message, disabled = false) {
  return buildMainRows(disabled, disabled || isRyumaAttackDisabled(message));
}

function getDefaultGlobalState() {
  const startedAt = Number.isFinite(EVENT_START_AT) && EVENT_START_AT > 0
    ? EVENT_START_AT
    : now();

  const endsAt = Number.isFinite(EVENT_END_AT) && EVENT_END_AT > 0
    ? EVENT_END_AT
    : startedAt + EVENT_DURATION_MS;

  return {
    id: EVENT_ID,
    name: EVENT_NAME,
    bossName: BOSS_NAME,
    maxHp: MAX_HP,
    totalDamage: 0,
    startedAt,
    endsAt,
  };
}

function getGlobalState(players) {
  const raw = players[GLOBAL_STORE_ID] || {};
  const fallback = getDefaultGlobalState();

  return {
    ...fallback,
    ...raw,
    id: EVENT_ID,
    name: EVENT_NAME,
    bossName: BOSS_NAME,
    maxHp: MAX_HP,
    totalDamage: Math.max(0, Number(raw.totalDamage || 0)),
    startedAt: Number(raw.startedAt || fallback.startedAt),
    endsAt: Number(raw.endsAt || fallback.endsAt),
  };
}

function saveGlobalState(players, state) {
  players[GLOBAL_STORE_ID] = {
    ...getGlobalState(players),
    ...(state || {}),
  };
  writePlayers(players);
}

function getHpLeft(globalState) {
  return Math.max(0, MAX_HP - Math.max(0, Number(globalState.totalDamage || 0)));
}

function getBossPhase(globalState) {
  const hpLeft = getHpLeft(globalState);

  return (
    BOSS_PHASES.find((phase) => hpLeft > phase.minHpExclusive) ||
    BOSS_PHASES[BOSS_PHASES.length - 1]
  );
}

function getRyumaTeamCards(player) {
  const ownedCards = Array.isArray(player?.cards) ? player.cards : [];
  const combatCards = Array.isArray(getPlayerCombatCards(player))
    ? getPlayerCombatCards(player)
    : [];

  const cardSources = ownedCards.length ? ownedCards : combatCards;

  const rawTeam = player?.team;
  const slotSources = [];

  if (Array.isArray(rawTeam?.slots)) slotSources.push(...rawTeam.slots);
  if (Array.isArray(rawTeam?.cards)) slotSources.push(...rawTeam.cards);
  if (Array.isArray(rawTeam?.members)) slotSources.push(...rawTeam.members);
  if (Array.isArray(rawTeam?.lineup)) slotSources.push(...rawTeam.lineup);
  if (Array.isArray(rawTeam?.main)) slotSources.push(...rawTeam.main);
  if (Array.isArray(rawTeam?.deck)) slotSources.push(...rawTeam.deck);
  if (Array.isArray(rawTeam?.active)) slotSources.push(...rawTeam.active);
  if (Array.isArray(rawTeam)) slotSources.push(...rawTeam);

  if (Array.isArray(player?.teamSlots)) slotSources.push(...player.teamSlots);
  if (Array.isArray(player?.teamCards)) slotSources.push(...player.teamCards);
  if (Array.isArray(player?.teamCardIds)) slotSources.push(...player.teamCardIds);

  const normalizeId = (value) => String(value || "").trim().toLowerCase();

  const getSlotId = (slot) => {
    if (!slot) return "";

    if (typeof slot === "string" || typeof slot === "number") {
      return normalizeId(slot);
    }

    return normalizeId(
      slot.instanceId ||
        slot.cardInstanceId ||
        slot.cardId ||
        slot.id ||
        slot.code ||
        slot.name ||
        slot.displayName
    );
  };

  const getCardIds = (card) => {
    return [
      card?.instanceId,
      card?.cardInstanceId,
      card?.cardId,
      card?.id,
      card?.code,
      card?.name,
      card?.displayName,
      card?.title,
    ]
      .map(normalizeId)
      .filter(Boolean);
  };

  const isBattleCard = (card) => {
    return String(card?.cardRole || "").toLowerCase() !== "boost";
  };

  const syncCard = (card) => {
    if (!card) return null;

    const hydrated = hydrateCard(card) || card;

    if (isMergeCard(hydrated)) {
      return buildMergedCard(player, hydrated);
    }

    return hydrated;
  };

  const result = [];
  const used = new Set();

  for (const slot of slotSources) {
    if (!slot || result.length >= 3) continue;

    const slotIds =
      typeof slot === "object"
        ? getCardIds(slot)
        : [getSlotId(slot)].filter(Boolean);

    if (!slotIds.length) continue;

    const matchedCard = cardSources.find((card) => {
      if (!isBattleCard(card)) return false;

      const cardIds = getCardIds(card);
      return slotIds.some((id) => cardIds.includes(id));
    });

    if (!matchedCard) continue;

    const synced = syncCard(matchedCard);
    if (!synced) continue;

    const key = normalizeId(
      synced.instanceId ||
        synced.id ||
        synced.cardId ||
        synced.code ||
        synced.name ||
        synced.displayName
    );

    if (used.has(key)) continue;

    used.add(key);
    result.push(synced);
  }

  if (result.length) {
    return result.slice(0, 3);
  }

  const equippedCards = cardSources
    .filter(isBattleCard)
    .filter((card) => {
      return (
        card?.inTeam === true ||
        card?.equipped === true ||
        card?.isTeam === true ||
        card?.team === true ||
        Number.isFinite(Number(card?.teamSlot)) ||
        Number.isFinite(Number(card?.slot))
      );
    })
    .sort((a, b) => {
      const aSlot = Number(a?.teamSlot ?? a?.slot ?? 999);
      const bSlot = Number(b?.teamSlot ?? b?.slot ?? 999);
      return aSlot - bSlot;
    })
    .map(syncCard)
    .filter(Boolean);

  if (equippedCards.length) {
    return equippedCards.slice(0, 3);
  }

  return cardSources.filter(isBattleCard).map(syncCard).filter(Boolean).slice(0, 3);
}

function getRyumaCardName(card) {
  return String(
    card?.displayName ||
      card?.name ||
      card?.code ||
      "Unknown Card"
  );
}

function getRyumaCardKey(card, index = 0) {
  const raw =
    card?.instanceId ||
    card?.cardInstanceId ||
    card?.id ||
    card?.cardId ||
    card?.code ||
    getRyumaCardName(card);

  return `${index}:${String(raw || "card").toLowerCase().trim()}`;
}

function firstPositiveRyumaNumber(...values) {
  for (const value of values) {
    const n = Number(value || 0);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return 0;
}

function resolveRyumaCurrentStageBaseStats(card) {
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
      atk: firstPositiveRyumaNumber(
        card?.finalAtk,
        card?.combatAtk,
        card?.displayAtk,
        card?.atk,
        card?.baseAtk
      ),
      hp: firstPositiveRyumaNumber(
        card?.finalHp,
        card?.combatHp,
        card?.displayHp,
        card?.hp,
        card?.baseHp
      ),
      speed: firstPositiveRyumaNumber(
        card?.finalSpeed,
        card?.combatSpeed,
        card?.displaySpeed,
        card?.speed,
        card?.spd,
        card?.baseSpeed
      ),
      power: firstPositiveRyumaNumber(
        card?.finalPower,
        card?.currentPower,
        card?.power,
        card?.basePower
      ),
    };
  }

  return {
    atk: firstPositiveRyumaNumber(
      card?.atk,
      card?.displayAtk,
      card?.combatAtk,
      form.atk,
      form.baseAtk,
      stageStats.atk,
      stageStats.baseAtk
    ),
    hp: firstPositiveRyumaNumber(
      card?.hp,
      card?.displayHp,
      card?.combatHp,
      form.hp,
      form.baseHp,
      stageStats.hp,
      stageStats.baseHp
    ),
    speed: firstPositiveRyumaNumber(
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
    power: firstPositiveRyumaNumber(
      card?.currentPower,
      form.currentPower,
      form.power,
      stageStats.currentPower,
      stageStats.power,
      card?.powerCaps?.[stageKey]
    ),
  };
}

function applyRyumaMciStats(card, boosts = {}) {
  if (!card || String(card.cardRole || "").toLowerCase() === "boost") {
    return card;
  }

  const base = resolveRyumaCurrentStageBaseStats(card);

  const boostedAtk = Math.floor(base.atk * (1 + Number(boosts.atk || 0) / 100));
  const boostedHp = Math.floor(base.hp * (1 + Number(boosts.hp || 0) / 100));
  const boostedSpeed = Math.floor(base.speed * (1 + Number(boosts.spd || 0) / 100));

  return {
    ...card,
    atk: boostedAtk,
    hp: boostedHp,
    speed: boostedSpeed,
    spd: boostedSpeed,
    displayAtk: boostedAtk,
    displayHp: boostedHp,
    displaySpeed: boostedSpeed,
    combatAtk: boostedAtk,
    combatHp: boostedHp,
    combatSpeed: boostedSpeed,
    currentPower: Math.max(Number(card.currentPower || 0), Number(base.power || 0)),
  };
}

function getRawRyumaCardAtk(card) {
  return Math.max(1, Math.floor(Number(card?.atk || 0)));
}

function getRawRyumaCardHp(card) {
  return Math.max(1, Math.floor(Number(card?.hp || 0)));
}

function getRawRyumaCardSpeed(card) {
  return Math.max(0, Math.floor(Number(card?.speed || card?.spd || 0)));
}

function normalizeRyumaBoostType(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]+/g, "");
}

function getRyumaBoostCardPercent(boostCard) {
  const result = {
    atk: 0,
    hp: 0,
    spd: 0,
  };

  const stage = Math.max(1, Math.min(3, Math.floor(Number(boostCard?.evolutionStage || 1))));
  const form =
    Array.isArray(boostCard?.evolutionForms)
      ? boostCard.evolutionForms[Math.max(0, stage - 1)]
      : null;

  const sources = [
    boostCard?.boostBonus,
    form?.boostBonus,
    boostCard,
    form,
  ];

  for (const source of sources) {
    if (!source || typeof source !== "object") continue;

    result.atk += Number(source.atk || source.attack || 0);
    result.hp += Number(source.hp || source.health || 0);
    result.spd += Number(source.spd || source.speed || 0);

    const boostType = normalizeRyumaBoostType(source.boostType || source.boostTarget);
    const boostValue = Number(source.boostValue ?? source.value ?? source.percent ?? 0);

    if (!boostValue) continue;

    if (["atk", "attack", "atkboost", "attackboost"].includes(boostType)) {
      result.atk += boostValue;
    }

    if (["hp", "health", "hpboost", "healthboost"].includes(boostType)) {
      result.hp += boostValue;
    }

    if (["spd", "speed", "spdboost", "speedboost"].includes(boostType)) {
      result.spd += boostValue;
    }

    // intentionally ignore dmg/damage boost for Ryuma card stat scaling
  }

  return result;
}

function getRyumaTeamBoosts(player) {
  const cards = Array.isArray(player?.cards) ? player.cards : [];
  const boosts = {
    atk: 0,
    hp: 0,
    spd: 0,
  };

  for (const card of cards) {
    if (String(card?.cardRole || "").toLowerCase() !== "boost") continue;

    const bonus = getRyumaBoostCardPercent(card);
    boosts.atk += Number(bonus.atk || 0);
    boosts.hp += Number(bonus.hp || 0);
    boosts.spd += Number(bonus.spd || 0);
  }

  return boosts;
}

function applyRyumaBoostedStats(card, boosts = {}) {
  const rawAtk = getRawRyumaCardAtk(card);
  const rawHp = getRawRyumaCardHp(card);
  const rawSpeed = getRawRyumaCardSpeed(card);

  return {
    atk: Math.max(1, Math.floor(rawAtk * (1 + Number(boosts.atk || 0) / 100))),
    hp: Math.max(1, Math.floor(rawHp * (1 + Number(boosts.hp || 0) / 100))),
    speed: Math.max(0, Math.floor(rawSpeed * (1 + Number(boosts.spd || 0) / 100))),
  };
}

function getRyumaDamageRange(card, bossPhase, boosts = {}) {
  const stats = applyRyumaBoostedStats(card, boosts);
  const phase = Number(bossPhase?.phase || 1);
  const phaseMultiplier = Number(PHASE_DAMAGE_MULTIPLIER[phase] || 1);

  const min = Math.max(1, Math.floor(stats.atk * phaseMultiplier * DAMAGE_VARIANCE_MIN));
  const max = Math.max(min, Math.floor(stats.atk * phaseMultiplier * DAMAGE_VARIANCE_MAX));

  return {
    min,
    max,
    roll: min,
  };
}

function rollRyumaEntryDamage(entry) {
  const min = Math.max(1, Math.floor(Number(entry?.damage?.min || entry?.damage?.roll || 1)));
  const max = Math.max(min, Math.floor(Number(entry?.damage?.max || min)));

  return Math.max(
    1,
    Math.floor(min + Math.random() * Math.max(1, max - min + 1))
  );
}

function snapshotRyumaCardHp(selectedCards) {
  const hp = {};

  for (const entry of selectedCards || []) {
    hp[entry.key] = Math.max(0, Math.floor(Number(entry.currentHp || 0)));
  }

  return hp;
}

function buildRyumaBattleCards(player, eventData, attackWindow, globalState) {
  const teamCards = getRyumaTeamCards(player);
  const mciBoosts = getPassiveBoostSummary(player);
  const bossPhase = getBossPhase(globalState);

  const boosts = {
    atk: Number(mciBoosts?.atk || 0),
    hp: Number(mciBoosts?.hp || 0),
    spd: Number(mciBoosts?.spd || 0),
  };

  const currentHp =
    eventData.cardHp && typeof eventData.cardHp === "object"
      ? eventData.cardHp
      : {};

  const shouldReset =
    Number(eventData.cardHpWindowStartedAt || 0) !==
    Number(attackWindow.attackWindowStartedAt || 0);

  return teamCards.slice(0, 3).map((rawCard, index) => {
    const card = applyRyumaMciStats(rawCard, boosts);
    const key = getRyumaCardKey(card, index);
    const stats = applyRyumaBoostedStats(card, {});
    const savedHp = shouldReset ? stats.hp : Number(currentHp[key] ?? stats.hp);

    return {
      key,
      card,
      atk: stats.atk,
      maxHp: stats.hp,
      speed: stats.speed,
      currentHp: Math.max(0, Math.min(stats.hp, Math.floor(Number(savedHp || 0)))),
      damage: getRyumaDamageRange(card, bossPhase, {}),
    };
  });
}

function areAllRyumaCardsDead(selectedCards) {
  return selectedCards.every((entry) => Number(entry.currentHp || 0) <= 0);
}

function buildRyumaCardRows(selectedCards, disabled = false) {
  const row = new ActionRowBuilder();

  selectedCards.slice(0, 3).forEach((entry, index) => {
    const card = entry.card;
    const dead = Number(entry.currentHp || 0) <= 0;
    const label = String(card?.displayName || card?.name || `Card ${index + 1}`).slice(0, 70);

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`ryuma_card_${index}`)
        .setLabel(`${index + 1}. ${label}`)
        .setStyle(dead ? ButtonStyle.Secondary : ButtonStyle.Danger)
        .setDisabled(Boolean(disabled || dead))
    );
  });

  return [row];
}

function buildRyumaCardSelectEmbed({
  globalState,
  selectedCards,
  turnCount = 0,
  totalDamage = 0,
  battleLog = [],
  ended = false,
}) {
  const hpLeft = getHpLeft(globalState);
  const bossPhase = getBossPhase(globalState);

  const cardLines = selectedCards.map((entry, index) => {
    const card = entry.card;
    const dead = Number(entry.currentHp || 0) <= 0;
    const atkText =
      Number(entry.damage?.max || 0) > Number(entry.damage?.min || 0)
        ? `${fmt(entry.damage.min)}-${fmt(entry.damage.max)}`
        : fmt(entry.damage?.roll || entry.atk || 1);

    return `${dead ? "💀" : "⚔️"} ${index + 1}. ${
      card?.displayName || card?.name || card?.code || "Unknown"
    } — ATK ${atkText} | HP ${fmt(entry.currentHp)}/${fmt(entry.maxHp)} | SPD ${fmt(entry.speed)}`;
  });

  return new EmbedBuilder()
    .setColor(ended ? 0x2ecc71 : 0xe74c3c)
    .setTitle(`${BOSS_NAME} Manual Fight`)
    .setDescription(
      [
        `**Boss HP:** ${fmt(hpLeft)} / ${fmt(MAX_HP)}`,
        `**Boss ATK:** ${fmt(BOSS_DAMAGE)}`,
        `**Phase:** ${bossPhase.phase}/4 — ${bossPhase.name}`,
        `**Turn:** ${fmt(turnCount)}/${fmt(ATTACK_LIMIT)}`,
        "",
        `**Total Damage This Session:** ${fmt(totalDamage)}`,
        "",
        "**Your Cards:**",
        ...cardLines,
        battleLog.length ? "" : null,
        battleLog.length ? "**Battle Log:**" : null,
        ...battleLog.slice(-4),
      ]
        .filter(Boolean)
        .join("\n")
    )
    .setFooter({
      text: ended
        ? "Ryuma fight ended."
        : "Choose a card to attack. Damage is randomly rolled from the card ATK range.",
    })
    .setTimestamp();
}

function isEventStarted(globalState) {
  return now() >= Number(globalState.startedAt || 0);
}

function isEventEnded(globalState) {
  return now() >= Number(globalState.endsAt || 0);
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatEventDateTime(timestamp) {
  const value = Number(timestamp || 0);
  if (!value) return "N/A";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: RYUMA_EVENT_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function getEventData(player) {
  const events = player?.events && typeof player.events === "object" ? player.events : {};
  const data = events[EVENT_ID] && typeof events[EVENT_ID] === "object" ? events[EVENT_ID] : {};

  return {
    damage: Math.max(0, Number(data.damage || 0)),
    joinedAt: Number(data.joinedAt || 0),
    attackWindowStartedAt: Number(data.attackWindowStartedAt || 0),
    attacksUsed: Math.max(0, Number(data.attacksUsed || 0)),
    claimedPersonalMilestones: Array.isArray(data.claimedPersonalMilestones)
      ? data.claimedPersonalMilestones.map(Number)
      : [],
    claimedBonusMilestones: Array.isArray(data.claimedBonusMilestones)
      ? data.claimedBonusMilestones.map(Number)
      : [],
    claimedGlobalMilestones: Array.isArray(data.claimedGlobalMilestones)
      ? data.claimedGlobalMilestones.map(Number)
      : [],
    shopPurchases:
      data.shopPurchases && typeof data.shopPurchases === "object"
        ? data.shopPurchases
        : {},
    cardHp:
      data.cardHp && typeof data.cardHp === "object"
        ? data.cardHp
        : {},
    cardHpWindowStartedAt: Number(data.cardHpWindowStartedAt || 0),
  };
}

function setEventData(player, eventData) {
  return {
    ...player,
    events: {
      ...(player.events || {}),
      [EVENT_ID]: {
        ...getEventData(player),
        ...(eventData || {}),
      },
    },
  };
}

function getAttackWindow(eventData) {
  const current = now();
  const startedAt = Number(eventData.attackWindowStartedAt || 0);
  const used = Math.max(0, Number(eventData.attacksUsed || 0));

  if (!startedAt || current - startedAt >= ATTACK_WINDOW_MS) {
    return {
      attackWindowStartedAt: current,
      attacksUsed: 0,
      attacksLeft: ATTACK_LIMIT,
      resetAt: current + ATTACK_WINDOW_MS,
    };
  }

  return {
    attackWindowStartedAt: startedAt,
    attacksUsed: used,
    attacksLeft: Math.max(0, ATTACK_LIMIT - used),
    resetAt: startedAt + ATTACK_WINDOW_MS,
  };
}

function addStack(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = String(item?.code || item?.name || "").toLowerCase();
  const amount = Math.max(1, Math.floor(Number(item?.amount || 1)));

  if (!code) return arr;

  const index = arr.findIndex((entry) => {
    return String(entry?.code || entry?.name || "").toLowerCase() === code;
  });

  if (index === -1) {
    arr.push({
      ...item,
      amount,
    });
  } else {
    arr[index] = {
      ...arr[index],
      ...item,
      amount: Math.max(0, Number(arr[index].amount || 0)) + amount,
    };
  }

  return arr;
}

function applyRewards(player, rewards = {}) {
  let next = { ...player };

  if (rewards.berries) {
    next.berries = Math.max(0, Number(next.berries || 0)) + Number(rewards.berries || 0);
  }

  if (rewards.gems) {
    next.gems = Math.max(0, Number(next.gems || 0)) + Number(rewards.gems || 0);
  }

  if (rewards.ryumaTokens) {
    next.ryumaTokens = Math.max(0, Number(next.ryumaTokens || 0)) + Number(rewards.ryumaTokens || 0);
  }

  for (const item of rewards.items || []) {
    next.items = addStack(next.items, item);
  }

  for (const ticket of rewards.tickets || []) {
    next.tickets = addStack(next.tickets, ticket);
  }

  for (const box of rewards.boxes || []) {
    next.boxes = addStack(next.boxes, box);
  }

  return next;
}

function rewardLines(rewards = {}) {
  const lines = [];

  if (rewards.ryumaTokens) lines.push(`+${fmt(rewards.ryumaTokens)} Ryuma Tokens`);
  if (rewards.berries) lines.push(`+${fmt(rewards.berries)} berries`);
  if (rewards.gems) lines.push(`+${fmt(rewards.gems)} gems`);

  for (const item of rewards.items || []) {
    lines.push(`+${fmt(item.amount)} ${item.name}`);
  }

  for (const ticket of rewards.tickets || []) {
    lines.push(`+${fmt(ticket.amount)} ${ticket.name}`);
  }

  for (const box of rewards.boxes || []) {
    lines.push(`+${fmt(box.amount)} ${box.name}`);
  }

  return lines;
}

function multiplyRewards(rewards = {}, amount = 1) {
  const qty = Math.max(1, Math.floor(Number(amount || 1)));

  return {
    berries: rewards.berries ? Number(rewards.berries) * qty : 0,
    gems: rewards.gems ? Number(rewards.gems) * qty : 0,
    ryumaTokens: rewards.ryumaTokens ? Number(rewards.ryumaTokens) * qty : 0,
    items: (rewards.items || []).map((item) => ({
      ...item,
      amount: Math.max(1, Number(item.amount || 1)) * qty,
    })),
    tickets: (rewards.tickets || []).map((ticket) => ({
      ...ticket,
      amount: Math.max(1, Number(ticket.amount || 1)) * qty,
    })),
    boxes: (rewards.boxes || []).map((box) => ({
      ...box,
      amount: Math.max(1, Number(box.amount || 1)) * qty,
    })),
  };
}

function getUnlockedGlobalMilestones(totalDamage) {
  const damage = Math.max(0, Number(totalDamage || 0));
  return GLOBAL_MILESTONES.filter((milestone) => damage >= milestone);
}

function getNextGlobalMilestone(totalDamage) {
  const damage = Math.max(0, Number(totalDamage || 0));
  return GLOBAL_MILESTONES.find((milestone) => milestone > damage) || null;
}

function getUnlockedBonusCount(damage) {
  const personalDamage = Math.max(0, Number(damage || 0));
  if (personalDamage < BONUS_START_DAMAGE + BONUS_STEP_DAMAGE) return 0;
  return Math.floor((personalDamage - BONUS_START_DAMAGE) / BONUS_STEP_DAMAGE);
}

function getNextPersonalMilestone(damage) {
  const personalDamage = Math.max(0, Number(damage || 0));
  const next = PERSONAL_MILESTONES.find((milestone) => milestone.damage > personalDamage);

  if (next) return next.damage;

  const bonusCount = getUnlockedBonusCount(personalDamage);
  return BONUS_START_DAMAGE + ((bonusCount + 1) * BONUS_STEP_DAMAGE);
}

function getPersonalClaims(eventData) {
  const claimed = new Set(eventData.claimedPersonalMilestones || []);
  return PERSONAL_MILESTONES.filter((milestone) => {
    return eventData.damage >= milestone.damage && !claimed.has(milestone.damage);
  });
}

function getBonusClaims(eventData) {
  const claimed = new Set(eventData.claimedBonusMilestones || []);
  const unlockedCount = getUnlockedBonusCount(eventData.damage);
  const claims = [];

  for (let index = 1; index <= unlockedCount; index += 1) {
    const milestoneDamage = BONUS_START_DAMAGE + (index * BONUS_STEP_DAMAGE);

    if (!claimed.has(milestoneDamage)) {
      claims.push(milestoneDamage);
    }
  }

  return claims;
}

function buildMainRows(disabled = false, attackDisabled = disabled) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ryuma_attack")
        .setLabel("Attack")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(Boolean(attackDisabled)),
      new ButtonBuilder()
        .setCustomId("ryuma_rewards")
        .setLabel("Rewards")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("ryuma_claim")
        .setLabel("Claim")
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("ryuma_shop")
        .setLabel("Shop")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
    ),
  ];
}

function buildPanelEmbed(message) {
  const players = readPlayers();
  const globalState = getGlobalState(players);
  const player = getRyumaPlayerFromStore(players, message);
  const eventData = getEventData(player);
  const attackWindow = getAttackWindow(eventData);
  const hpLeft = getHpLeft(globalState);
  const bossPhase = getBossPhase(globalState);
  const nextGlobal = getNextGlobalMilestone(globalState.totalDamage);
  const nextPersonal = getNextPersonalMilestone(eventData.damage);
  const eventStarted = isEventStarted(globalState);
  const eventEnded = isEventEnded(globalState);

  const timeText = !eventStarted
    ? `Starts ${RYUMA_EVENT_START_LABEL}`
    : eventEnded
        ? "Event ended"
        : formatDuration(Math.max(0, Number(globalState.endsAt || 0) - now()));

  const embed = new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle(EVENT_NAME)
    .setDescription(
      [
        `**Status:** ${!eventStarted ? "Not Started" : eventEnded ? "Ended" : "Active"}`,
        `**Boss:** ${BOSS_NAME}`,
        `**Boss HP:** ${fmt(hpLeft)} / ${fmt(MAX_HP)}`,
        `**Boss Damage:** ${fmt(BOSS_DAMAGE)}`,
        `**Phase:** ${bossPhase.phase}/4 — ${bossPhase.name}`,
        `**Global Damage:** ${fmt(globalState.totalDamage)}`,
        `**Time:** ${timeText}`,
        "",
        `**Your Damage:** ${fmt(eventData.damage)}`,
        `**Your Ryuma Tokens:** ${fmt(player.ryumaTokens || 0)}`,
        `**Your Attacks:** ${attackWindow.attacksLeft} / ${ATTACK_LIMIT}`,
        `**Attack Reset:** <t:${Math.floor(attackWindow.resetAt / 1000)}:R>`,
        "",
        `**Next Global Milestone:** ${nextGlobal ? fmt(nextGlobal) : "All global milestones unlocked"}`,
        `**Next Personal Milestone:** ${fmt(nextPersonal)} damage`,
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Ryuma Event",
    })
    .setTimestamp();

  if (RYUMA_ATTACK_GIF) {
    embed.setImage(RYUMA_ATTACK_GIF);
  }

  return embed;
}

function buildRewardsEmbed(message) {
  const players = readPlayers();
  const globalState = getGlobalState(players);
  const player = getRyumaPlayerFromStore(players, message);
  const eventData = getEventData(player);

  const unlockedGlobal = getUnlockedGlobalMilestones(globalState.totalDamage);
  const claimedGlobal = new Set(eventData.claimedGlobalMilestones || []);

  const personalLines = PERSONAL_MILESTONES.map((milestone) => {
    const done = eventData.damage >= milestone.damage;
    const claimed = eventData.claimedPersonalMilestones.includes(milestone.damage);
    return `${done ? "✅" : "❌"} ${fmt(milestone.damage)} damage${claimed ? " — claimed" : ""}`;
  });

  const globalLines = GLOBAL_MILESTONES.map((milestone) => {
    const unlocked = unlockedGlobal.includes(milestone);
    const claimed = claimedGlobal.has(milestone);
    const charm = PITY_CHARM_MILESTONES.has(milestone) ? " + Ryuma Pity Charm" : "";
    return `${unlocked ? "✅" : "❌"} ${fmt(milestone)} global damage${charm}${claimed ? " — claimed" : ""}`;
  });

  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("Ryuma Event Rewards")
    .setDescription(
      [
        `**Your Damage:** ${fmt(eventData.damage)}`,
        `**Global Damage:** ${fmt(globalState.totalDamage)}`,
        "",
        "**Personal Milestones**",
        personalLines.join("\n"),
        "",
        "**Global Milestones**",
        globalLines.join("\n"),
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Ryuma Event",
    });
}

function findShopItem(query) {
  const normalized = normalizeText(query);

  if (!normalized) return null;

  let best = null;

  for (const item of SHOP_ITEMS) {
    const aliases = [
      item.key,
      item.name,
      ...(item.aliases || []),
    ].map(normalizeText);

    if (aliases.includes(normalized)) {
      return item;
    }

    for (const alias of aliases) {
      if (!alias) continue;

      if (alias.includes(normalized) || normalized.includes(alias)) {
        const score = alias.length;
        if (!best || score > best.score) {
          best = {
            item,
            score,
          };
        }
      }
    }
  }

  return best?.item || null;
}

function parseBuyArgs(args) {
  const raw = Array.isArray(args) ? [...args] : [];
  let amount = 1;

  if (raw.length) {
    const last = String(raw[raw.length - 1] || "").trim();

    if (/^\d+$/.test(last)) {
      amount = Math.max(1, Math.min(99, Math.floor(Number(last))));
      raw.pop();
    }
  }

  return {
    query: raw.join(" "),
    amount,
  };
}

function buildShopEmbed(message) {
  const players = readPlayers();
  const player = getRyumaPlayerFromStore(players, message);
  const eventData = getEventData(player);

  const lines = SHOP_ITEMS.map((item) => {
    const bought = Math.max(0, Number(eventData.shopPurchases?.[item.key] || 0));

    return [
      `**${item.name}**`,
      `Price: ${fmt(item.price)} Ryuma Tokens | Limit: ${bought}/${item.limit}`,
      `Buy: \`op ryuma shop buy ${item.name.toLowerCase()} <amount>\``,
    ].join("\n");
  });

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle("Ryuma Event Shop")
    .setDescription(
      [
        `**Your Ryuma Tokens:** ${fmt(player.ryumaTokens || 0)}`,
        "",
        lines.join("\n\n"),
        "",
        "**Examples:**",
        "`op ryuma shop buy raid ticket 3`",
      ].join("\n")
    )
    .setFooter({
      text: "Purchase limits are per user for the whole event.",
    });
}

async function buyShopItem(message, buyArgs = []) {
  const parsed = parseBuyArgs(buyArgs);
  const item = findShopItem(parsed.query);
  const requestedAmount = parsed.amount;

  if (!item) {
    return message.reply({
      content: [
        "Invalid shop item.",
        "",
        "**Examples:**",
        "`op ryuma shop buy gold raid ticket 2`",
      ].join("\n"),
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  const players = readPlayers();
  let player = getRyumaPlayerFromStore(players, message);
  const eventData = getEventData(player);
  const bought = Math.max(0, Number(eventData.shopPurchases?.[item.key] || 0));
  const remainingLimit = Math.max(0, item.limit - bought);
  const buyAmount = Math.min(requestedAmount, remainingLimit);
  const totalPrice = item.price * buyAmount;
  const tokens = Math.max(0, Number(player.ryumaTokens || 0));

  if (remainingLimit <= 0) {
    return message.reply({
      content: `You already reached the purchase limit for **${item.name}**.`,
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  if (tokens < totalPrice) {
    return message.reply({
      content: [
        `Not enough Ryuma Tokens to buy **${fmt(buyAmount)}x ${item.name}**.`,
        `Required: **${fmt(totalPrice)}**`,
        `You have: **${fmt(tokens)}**`,
      ].join("\n"),
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  player = {
    ...player,
    ryumaTokens: tokens - totalPrice,
  };

  player = applyRewards(player, multiplyRewards(item.rewards, buyAmount));

  const nextEventData = {
    ...eventData,
    shopPurchases: {
      ...(eventData.shopPurchases || {}),
      [item.key]: bought + buyAmount,
    },
  };

  player = setEventData(player, nextEventData);
  players[String(message.author.id)] = player;
  writePlayers(players);

  const clippedText =
    requestedAmount > buyAmount
      ? `\nYou requested **${fmt(requestedAmount)}**, but only **${fmt(buyAmount)}** could be bought because of the purchase limit.`
      : "";

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("Shop Purchase Complete")
    .setDescription(
      [
        `You bought **${fmt(buyAmount)}x ${item.name}**.`,
        `Total Price: **${fmt(totalPrice)} Ryuma Tokens**`,
        `Remaining Ryuma Tokens: **${fmt(player.ryumaTokens)}**`,
        `Purchase Count: **${bought + buyAmount}/${item.limit}**`,
        clippedText,
      ].filter(Boolean).join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Ryuma Event Shop",
    });

  return message.reply({
    embeds: [embed],
    allowedMentions: {
      repliedUser: false,
    },
  });
}

async function performAttack(message) {
  const userId = String(message.author.id);
  const battleKey = userId;

  if (ACTIVE_RYUMA_BATTLES.has(battleKey)) {
    return message.reply({
      content: "You already have an active Ryuma fight. Finish that fight first.",
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  const players = readPlayers();
  const globalState = getGlobalState(players);

  if (!isEventStarted(globalState)) {
    return message.reply({
      content: `The Ryuma Global Boss Event has not started yet.\nStarts: ${RYUMA_EVENT_START_LABEL}`,
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  if (isEventEnded(globalState)) {
    return message.reply({
      content: "The Ryuma Global Boss Event has ended.",
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  let player = getRyumaPlayerFromStore(players, message);
  let eventData = getEventData(player);
  const attackWindow = getAttackWindow(eventData);

  if (attackWindow.attacksLeft <= 0) {
    return message.reply({
      content: `You have no attacks left. Your attacks reset <t:${Math.floor(attackWindow.resetAt / 1000)}:R>.`,
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  const selectedCards = buildRyumaBattleCards(player, eventData, attackWindow, globalState);

  if (!selectedCards.length) {
    return message.reply({
      content: "You need at least 1 battle card in your team before attacking Ryuma.",
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  if (areAllRyumaCardsDead(selectedCards)) {
    return message.reply({
      content: `All your team cards are knocked out. Your team HP resets <t:${Math.floor(attackWindow.resetAt / 1000)}:R>.`,
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  ACTIVE_RYUMA_BATTLES.add(battleKey);

  let sessionEventData = {
    ...eventData,
    attackWindowStartedAt: attackWindow.attackWindowStartedAt,
    attacksUsed: attackWindow.attacksUsed,
    cardHp: snapshotRyumaCardHp(selectedCards),
    cardHpWindowStartedAt: attackWindow.attackWindowStartedAt,
  };

  player = setEventData(player, sessionEventData);
  players[userId] = player;
  writePlayers(players);

  let turnCount = Math.max(0, Number(sessionEventData.attacksUsed || 0));
  let totalDamage = 0;
  let battleLog = [];
  let ended = false;
  let turnBusy = false;

  const sent = await message.reply({
    embeds: [
      buildRyumaCardSelectEmbed({
        globalState,
        selectedCards,
        turnCount,
        totalDamage,
        battleLog,
      }),
    ],
    components: buildRyumaCardRows(selectedCards),
    allowedMentions: {
      repliedUser: false,
    },
  });

  const collector = sent.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 10 * 60 * 1000,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      return interaction.reply({
        content: "Only the Ryuma attacker can use these buttons.",
        ephemeral: true,
      });
    }

    if (turnBusy) {
      return interaction.reply({
        content: "Previous Ryuma attack is still being processed. Please wait.",
        ephemeral: true,
      });
    }

    turnBusy = true;

    try {
      const cardIndex = Number(String(interaction.customId || "").replace("ryuma_card_", ""));

      if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= selectedCards.length) {
        return interaction.reply({
          content: "Invalid Ryuma battle button.",
          ephemeral: true,
        });
      }

      const selected = selectedCards[cardIndex];

      if (Number(selected.currentHp || 0) <= 0) {
        return interaction.reply({
          content: "This card is already defeated.",
          ephemeral: true,
        });
      }

      if (ended) {
        return interaction.reply({
          content: "This Ryuma fight already ended.",
          ephemeral: true,
        });
      }

      const freshPlayers = readPlayers();
      const freshGlobalState = getGlobalState(freshPlayers);

      if (!isEventStarted(freshGlobalState)) {
        ended = true;
        collector.stop("event_not_started");

        return interaction.update({
          content: `The Ryuma Global Boss Event has not started yet.\nStarts: ${RYUMA_EVENT_START_LABEL}`,
          embeds: [],
          components: [],
        });
      }

      if (isEventEnded(freshGlobalState)) {
        ended = true;
        collector.stop("event_ended");

        return interaction.update({
          content: "The Ryuma Global Boss Event has ended.",
          embeds: [],
          components: [],
        });
      }

      let freshPlayer = getRyumaPlayerFromStore(freshPlayers, message);
      const storedEventData = getEventData(freshPlayer);
      const freshAttackWindow = getAttackWindow(storedEventData);

      if (
        Number(sessionEventData.attackWindowStartedAt || 0) !==
        Number(freshAttackWindow.attackWindowStartedAt || 0)
      ) {
        sessionEventData = {
          ...storedEventData,
          attackWindowStartedAt: freshAttackWindow.attackWindowStartedAt,
          attacksUsed: freshAttackWindow.attacksUsed,
          cardHp: snapshotRyumaCardHp(selectedCards),
          cardHpWindowStartedAt: freshAttackWindow.attackWindowStartedAt,
        };

        turnCount = Math.max(0, Number(sessionEventData.attacksUsed || 0));
      }

      const currentUsed = Math.max(
        Number(sessionEventData.attacksUsed || 0),
        Number(storedEventData.attacksUsed || 0)
      );

      if (currentUsed >= ATTACK_LIMIT) {
        ended = true;
        collector.stop("no_attacks");

        return interaction.update({
          content: `You have no attacks left. Your attacks reset <t:${Math.floor(freshAttackWindow.resetAt / 1000)}:R>.`,
          embeds: [],
          components: [],
        });
      }

      const bossPhaseBeforeAttack = getBossPhase(freshGlobalState);
      const damage = Math.min(getHpLeft(freshGlobalState), rollRyumaEntryDamage(selected));
      const nextBossDefeated = getHpLeft(freshGlobalState) - damage <= 0;

      let bossCounterDamage = 0;

      if (!nextBossDefeated) {
        bossCounterDamage = Math.min(
          Number(selected.currentHp || 0),
          BOSS_DAMAGE
        );

        selected.currentHp = Math.max(
          0,
          Math.floor(Number(selected.currentHp || 0)) - bossCounterDamage
        );
      }

      const nextEventData = {
        ...sessionEventData,
        joinedAt: sessionEventData.joinedAt || now(),
        damage: Math.max(0, Number(sessionEventData.damage || 0)) + damage,
        attackWindowStartedAt: freshAttackWindow.attackWindowStartedAt,
        attacksUsed: currentUsed + 1,
        claimedPersonalMilestones: [...sessionEventData.claimedPersonalMilestones],
        claimedBonusMilestones: [...sessionEventData.claimedBonusMilestones],
        claimedGlobalMilestones: [...sessionEventData.claimedGlobalMilestones],
        shopPurchases: {
          ...(sessionEventData.shopPurchases || {}),
        },
        cardHp: snapshotRyumaCardHp(selectedCards),
        cardHpWindowStartedAt: freshAttackWindow.attackWindowStartedAt,
      };

      const claimedLines = [];

      for (const milestone of getPersonalClaims(nextEventData)) {
        freshPlayer = applyRewards(freshPlayer, milestone.rewards);
        nextEventData.claimedPersonalMilestones.push(milestone.damage);
        claimedLines.push(`Personal ${fmt(milestone.damage)} damage: ${rewardLines(milestone.rewards).join(", ")}`);
      }

      for (const bonusDamage of getBonusClaims(nextEventData)) {
        freshPlayer = applyRewards(freshPlayer, BONUS_REWARD);
        nextEventData.claimedBonusMilestones.push(bonusDamage);
        claimedLines.push(`Bonus ${fmt(bonusDamage)} damage: ${rewardLines(BONUS_REWARD).join(", ")}`);
      }

      sessionEventData = nextEventData;
      freshPlayer = setEventData(freshPlayer, sessionEventData);

      freshGlobalState.totalDamage =
        Math.max(0, Number(freshGlobalState.totalDamage || 0)) + damage;

      freshPlayers[GLOBAL_STORE_ID] = freshGlobalState;
      freshPlayers[userId] = freshPlayer;
      writePlayers(freshPlayers);

      turnCount = sessionEventData.attacksUsed;
      totalDamage += damage;

      battleLog.push(
        `⚔️ ${
          selected.card?.displayName ||
          selected.card?.name ||
          selected.card?.code ||
          "Card"
        } dealt **${fmt(damage)}** damage.`
      );

      if (bossCounterDamage > 0) {
        battleLog.push(
          `☠️ ${BOSS_NAME} countered for **${fmt(bossCounterDamage)}** damage.`
        );
      }

      if (Number(selected.currentHp || 0) <= 0) {
        battleLog.push(
          `💀 ${
            selected.card?.displayName ||
            selected.card?.name ||
            selected.card?.code ||
            "Card"
          } was defeated.`
        );
      }

      for (const line of claimedLines) {
        battleLog.push(`🎁 ${line}`);
      }

      ended =
        nextBossDefeated ||
        areAllRyumaCardsDead(selectedCards) ||
        turnCount >= ATTACK_LIMIT;

      await interaction.update({
        content: null,
        embeds: [
          buildRyumaCardSelectEmbed({
            globalState: freshGlobalState,
            selectedCards,
            turnCount,
            totalDamage,
            battleLog,
            ended,
          }),
        ],
        components: buildRyumaCardRows(selectedCards, ended),
      });

      if (ended) {
        collector.stop(
          nextBossDefeated
            ? "boss_defeated"
            : areAllRyumaCardsDead(selectedCards)
              ? "all_cards_dead"
              : "turn_limit"
        );
      }
    } catch (error) {
      console.error("[Ryuma] attack failed:", error);

      await interaction.reply({
        content: "Ryuma attack failed. Please try again.",
        ephemeral: true,
      }).catch(() => null);
    } finally {
      turnBusy = false;
    }
  });

  collector.on("end", async () => {
    ACTIVE_RYUMA_BATTLES.delete(battleKey);

    try {
      await sent.edit({
        components: buildRyumaCardRows(selectedCards, true),
      });
    } catch {}
  });

  return sent;
}

async function claimGlobalRewards(message, editableMessage = null) {
  const players = readPlayers();
  const globalState = getGlobalState(players);
  let player = getRyumaPlayerFromStore(players, message);
  const eventData = getEventData(player);

  if (!eventData.joinedAt || eventData.damage < 25000) {
    return message.reply({
      content: `You need to join the event and deal at least **25,000 damage** first.\nYour damage: **${fmt(eventData.damage)}**`,
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  const unlocked = getUnlockedGlobalMilestones(globalState.totalDamage);
  const claimed = new Set(eventData.claimedGlobalMilestones || []);
  const claimable = unlocked.filter((milestone) => !claimed.has(milestone));

  if (!claimable.length) {
    return message.reply({
      content: "You have no global milestone rewards to claim.",
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  let totalBerries = 0;
  let totalTokens = 0;
  let totalCharms = 0;

  const nextEventData = {
    ...eventData,
    claimedGlobalMilestones: [...eventData.claimedGlobalMilestones],
  };

  for (const milestone of claimable) {
    totalBerries += 1000000;
    totalTokens += 50;

    if (PITY_CHARM_MILESTONES.has(milestone)) {
      totalCharms += 1;
    }

    nextEventData.claimedGlobalMilestones.push(milestone);
  }

  player = applyRewards(player, {
    berries: totalBerries,
    ryumaTokens: totalTokens,
    items: totalCharms > 0
      ? [
          {
            code: "ryuma_pity_charm",
            name: "Ryuma Pity Charm",
            amount: totalCharms,
            type: "Event Item",
            description: "Reduces pull pity requirement during the Ryuma event.",
          },
        ]
      : [],
  });

  player = setEventData(player, nextEventData);
  players[String(message.author.id)] = player;
  writePlayers(players);

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("Global Rewards Claimed")
    .setDescription(
      [
        `You claimed **${claimable.length}** global milestone reward(s).`,
        "",
        `+${fmt(totalBerries)} berries`,
        `+${fmt(totalTokens)} Ryuma Tokens`,
        totalCharms > 0 ? `+${fmt(totalCharms)} Ryuma Pity Charm` : null,
      ].filter(Boolean).join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Ryuma Event",
    });

  const payload = {
    embeds: [embed],
    components: buildMainRowsForMessage(message),
    allowedMentions: {
      repliedUser: false,
    },
  };

  if (editableMessage?.edit) {
    return editableMessage.edit(payload).catch(() => message.reply(payload));
  }

  return message.reply(payload);
}

function buildLeaderboardEmbed() {
  const players = readPlayers();

  const rows = Object.entries(players || {})
    .filter(([userId]) => !String(userId).startsWith("__"))
    .map(([userId, player]) => {
      const eventData = getEventData(player);

      return {
        userId,
        username: player?.username || `User ${userId}`,
        damage: eventData.damage,
      };
    })
    .filter((entry) => entry.damage > 0)
    .sort((a, b) => b.damage - a.damage)
    .slice(0, 10);

  const lines = rows.length
    ? rows.map((entry, index) => {
        return `**${index + 1}.** <@${entry.userId}> — ${fmt(entry.damage)} damage`;
      })
    : ["No players have joined the event yet."];

  return new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle("Ryuma Damage Leaderboard")
    .setDescription(lines.join("\n"))
    .setFooter({
      text: "One Piece Bot • Ryuma Event",
    });
}

async function sendPanel(message) {
  const sent = await message.reply({
    embeds: [buildPanelEmbed(message)],
    components: buildMainRowsForMessage(message),
    allowedMentions: {
      repliedUser: false,
    },
  });

  const collector = sent.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 10 * 60 * 1000,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      return interaction.reply({
        content: "This Ryuma event panel is not yours.",
        ephemeral: true,
      });
    }

    await interaction.deferUpdate().catch(() => null);

    if (interaction.customId === "ryuma_attack") {
      return performAttack(message);
    }

    if (interaction.customId === "ryuma_rewards") {
      return sent.edit({
        embeds: [buildRewardsEmbed(message)],
        components: buildMainRowsForMessage(message),
      });
    }

    if (interaction.customId === "ryuma_claim") {
      return claimGlobalRewards(message, sent);
    }

    if (interaction.customId === "ryuma_shop") {
      return sent.edit({
        embeds: [buildShopEmbed(message)],
        components: buildMainRowsForMessage(message),
      });
    }

    return null;
  });

  collector.on("end", async () => {
    await sent.edit({
      components: buildMainRows(true),
    }).catch(() => null);
  });

  return sent;
}

module.exports = {
  name: "ryuma",
  aliases: ["ryumaevent", "ryumaboss"],

  async execute(message, args = []) {
    if (!message.guild) {
      return message.reply({
        content: "This command can only be used in a server.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const subcommand = normalizeText(args[0]);

    if (!subcommand) {
      return sendPanel(message);
    }

    if (subcommand === "attack" || subcommand === "fight") {
      return performAttack(message);
    }

    if (subcommand === "lb" || subcommand === "leaderboard") {
      return message.reply({
        embeds: [buildLeaderboardEmbed()],
        allowedMentions: {
          repliedUser: false,
          parse: [],
        },
      });
    }

    if (subcommand === "rewards" || subcommand === "reward") {
      return message.reply({
        embeds: [buildRewardsEmbed(message)],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (subcommand === "claim") {
      return claimGlobalRewards(message);
    }

    if (subcommand === "reset") {
      const isAdmin =
        message.guild?.ownerId === message.author.id ||
        message.member?.permissions?.has?.("Administrator") ||
        String(process.env.BOT_OWNER_ID || "") === String(message.author.id) ||
        String(process.env.DISCORD_OWNER_ID || "") === String(message.author.id) ||
        String(process.env.ADMIN_USER_IDS || "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
          .includes(String(message.author.id));

      if (!isAdmin) {
        return message.reply({
          content: "Only admins can reset the Ryuma event.",
          allowedMentions: {
            repliedUser: false,
          },
        });
      }

      const players = readPlayers();

      delete players[GLOBAL_STORE_ID];

      for (const [userId, player] of Object.entries(players || {})) {
        if (String(userId).startsWith("__")) continue;

        const nextEvents = { ...(player.events || {}) };
        delete nextEvents[EVENT_ID];

        players[userId] = {
          ...player,
          ryumaTokens: 0,
          events: nextEvents,
        };
      }

      writePlayers(players);

      return message.reply({
        content: "Ryuma event has been reset. Boss HP, global damage, personal damage, attack count, team HP, claims, shop purchases, and Ryuma Tokens are now reset.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (subcommand === "shop") {
      const action = normalizeText(args[1]);

      if (action === "buy") {
        return buyShopItem(message, args.slice(2));
      }

      return message.reply({
        embeds: [buildShopEmbed(message)],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    return message.reply({
      content: [
        "**Ryuma Event Commands**",
        "`op ryuma`",
        "`op ryuma attack`",
        "`op ryuma lb`",
        "`op ryuma rewards`",
        "`op ryuma claim`",
        "`op ryuma shop`",
        "`op ryuma shop buy <item name> <amount>`",
        "",
        "**Examples:**",
        "`op ryuma shop buy raid ticket 3`",
        "`op ryuma shop buy gold raid ticket 2`",
        "`op ryuma shop buy pull reset ticket 1`",
      ].join("\n"),
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};