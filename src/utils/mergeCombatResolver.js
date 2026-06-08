const {
  isLzsCard,
  buildMergedLzsCard,
  syncMergedCardsInPlayer,
} = require("./mergeCards");
const { hydrateCard } = require("./evolution");

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

function getCardStage(card) {
  const n = Number(card?.evolutionStage || card?.stage || 0);
  if (Number.isFinite(n) && n >= 1) return Math.max(1, Math.min(3, Math.floor(n)));

  const key = String(card?.evolutionKey || card?.form || "").toUpperCase();
  const match = key.match(/M([123])/);
  return match ? Number(match[1]) : 1;
}

function getCardIdentity(card) {
  return {
    instanceId: String(card?.instanceId || card?.uid || card?.uniqueId || card?.cardInstanceId || "").trim(),
    code: normalizeCode(card?.code || card?.baseCode),
    name: normalize(card?.displayName || card?.name || card?.title || card?.cardName),
  };
}

function findMatchingOwnedCard(player, cardOrSlot) {
  const cards = Array.isArray(player?.cards) ? player.cards : [];
  const wanted = getCardIdentity(cardOrSlot);

  if (wanted.instanceId) {
    const byInstance = cards.find((card) => getCardIdentity(card).instanceId === wanted.instanceId);
    if (byInstance) return byInstance;
  }

  if (wanted.code) {
    const byCode = cards.find((card) => getCardIdentity(card).code === wanted.code);
    if (byCode) return byCode;
  }

  if (wanted.name) {
    const byName = cards.find((card) => {
      const id = getCardIdentity(card);
      return id.name === wanted.name || id.name.includes(wanted.name) || wanted.name.includes(id.name);
    });
    if (byName) return byName;
  }

  return null;
}

function syncMergeCombatCard(player, cardOrSlot) {
  if (!cardOrSlot || typeof cardOrSlot !== "object") return cardOrSlot;

  const syncedPlayer = syncMergedCardsInPlayer(player || {});
  const ownedMatch = findMatchingOwnedCard(syncedPlayer, cardOrSlot);
  const sourceCard = ownedMatch || cardOrSlot;

  if (!isLzsCard(sourceCard) && !isLzsCard(cardOrSlot)) {
    return hydrateCard(sourceCard) || sourceCard;
  }

  const stage = Math.max(getCardStage(cardOrSlot), getCardStage(sourceCard));
  const merged = buildMergedLzsCard(syncedPlayer, sourceCard, stage);

  return {
    ...cardOrSlot,
    ...merged,
    code: "lzs",
    name: "Monster Trio",
    displayName: "Monster Trio",
    rarity: "M",
    currentTier: "M",
    baseTier: "M",
    tier: "M",

    power: 100000,
    basePower: 100000,
    currentPower: 100000,
    finalPower: 100000,
    combatPower: 100000,
    teamPower: 100000,
    battlePower: 100000,
    totalPower: 100000,

    atk: Number(merged.atk || merged.finalAtk || merged.combatAtk || 1),
    hp: Number(merged.hp || merged.finalHp || merged.combatHp || 1),
    speed: Number(merged.speed || merged.finalSpeed || merged.combatSpeed || 1),
    spd: Number(merged.speed || merged.finalSpeed || merged.combatSpeed || 1),

    finalAtk: Number(merged.finalAtk || merged.atk || 1),
    finalHp: Number(merged.finalHp || merged.hp || 1),
    finalSpeed: Number(merged.finalSpeed || merged.speed || 1),
    combatAtk: Number(merged.combatAtk || merged.atk || 1),
    combatHp: Number(merged.combatHp || merged.hp || 1),
    combatSpeed: Number(merged.combatSpeed || merged.speed || 1),
    displayAtk: Number(merged.displayAtk || merged.atk || 1),
    displayHp: Number(merged.displayHp || merged.hp || 1),
    displaySpeed: Number(merged.displaySpeed || merged.speed || 1),
  };
}

function syncMergeCombatPlayer(player) {
  if (!player || typeof player !== "object") return player;

  const synced = syncMergedCardsInPlayer(player);

  return {
    ...synced,
    cards: Array.isArray(synced.cards)
      ? synced.cards.map((card) => syncMergeCombatCard(synced, card))
      : synced.cards,
  };
}

function syncMergeCombatTeam(player, teamCards) {
  if (!Array.isArray(teamCards)) return teamCards;
  const syncedPlayer = syncMergeCombatPlayer(player);
  return teamCards.map((card) => syncMergeCombatCard(syncedPlayer, card));
}

function getCombatNumber(card, keys, fallback = 0) {
  for (const key of keys) {
    const n = Number(card?.[key] || 0);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return Math.floor(Number(fallback || 0));
}

function getCombatPower(card) {
  if (isLzsCard(card)) return 100000;
  return getCombatNumber(card, [
    "combatPower",
    "teamPower",
    "battlePower",
    "finalPower",
    "currentPower",
    "power",
    "basePower",
  ], 0);
}

function getCombatAtk(card) {
  return getCombatNumber(card, [
    "combatAtk",
    "battleAtk",
    "finalAtk",
    "displayAtk",
    "atk",
    "baseAtk",
  ], 1);
}

function getCombatHp(card) {
  return getCombatNumber(card, [
    "combatHp",
    "battleHp",
    "finalHp",
    "displayHp",
    "maxHp",
    "hp",
    "baseHp",
  ], 1);
}

function getCombatSpeed(card) {
  return getCombatNumber(card, [
    "combatSpeed",
    "battleSpeed",
    "finalSpeed",
    "displaySpeed",
    "speed",
    "spd",
    "baseSpeed",
  ], 1);
}

module.exports = {
  syncMergeCombatCard,
  syncMergeCombatPlayer,
  syncMergeCombatTeam,
  getCombatPower,
  getCombatAtk,
  getCombatHp,
  getCombatSpeed,
};
