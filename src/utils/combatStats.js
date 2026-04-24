const { hydrateCard } = require("./evolution");
const { getPassiveBoostSummary } = require("./passiveBoosts");

function pct(value) {
  return Number(value || 0) / 100;
}

function applyPercent(value, percent) {
  return Math.floor(Number(value || 0) * (1 + pct(percent)));
}

function hydrateCombatCard(card, boosts = {}) {
  const synced = hydrateCard(card);
  if (!synced) return null;

  if (String(synced.cardRole || "").toLowerCase() === "boost") return synced;

  return {
    ...synced,
    atk: applyPercent(synced.atk, boosts.atk),
    hp: applyPercent(synced.hp, boosts.hp),
    speed: applyPercent(synced.speed, boosts.spd),
    passiveBoostsApplied: {
      atk: Number(boosts.atk || 0),
      hp: Number(boosts.hp || 0),
      spd: Number(boosts.spd || 0),
      dmg: Number(boosts.dmg || 0),
      exp: Number(boosts.exp || 0),
      daily: Number(boosts.daily || 0),
      fragmentStorageBonus: Number(boosts.fragmentStorageBonus || 0),
    },
  };
}

function getPlayerCombatBoosts(player) {
  return getPassiveBoostSummary(player);
}

function getPlayerCombatCards(player) {
  const boosts = getPlayerCombatBoosts(player);

  return (Array.isArray(player.cards) ? player.cards : [])
    .map((card) => hydrateCombatCard(card, boosts))
    .filter(Boolean);
}

function applyDamageBoost(damage, boosts = {}) {
  return Math.max(1, Math.floor(Number(damage || 1) * (1 + pct(boosts.dmg))));
}

function applyExpBoost(exp, boosts = {}) {
  return Math.max(0, Math.floor(Number(exp || 0) * (1 + pct(boosts.exp))));
}

function applyDailyBoost(value, boosts = {}) {
  return Math.max(
    0,
    Math.floor(Number(value || 0) * (1 + Number(boosts.daily || 0) * 0.1))
  );
}

module.exports = {
  hydrateCombatCard,
  getPlayerCombatBoosts,
  getPlayerCombatCards,
  applyDamageBoost,
  applyExpBoost,
  applyDailyBoost,
};