const { hydrateCard } = require("./evolution");
const { getPassiveBoostSummary } = require("./passiveBoosts");

const RAID_PRESTIGE_CAP = 200;
const RAID_PRESTIGE_ATK_PER_LEVEL = 0.25;
const RAID_PRESTIGE_HP_PER_LEVEL = 0.25;
const RAID_PRESTIGE_SPD_PER_LEVEL = 0.1;

function pct(value) {
  return Number(value || 0) / 100;
}

function applyPercent(value, percent) {
  return Math.floor(Number(value || 0) * (1 + pct(percent)));
}

function getRaidPrestigeLevel(card) {
  return Math.max(
    0,
    Math.min(RAID_PRESTIGE_CAP, Math.floor(Number(card?.raidPrestige || 0)))
  );
}

function getRaidPrestigeBonus(card) {
  const prestige = getRaidPrestigeLevel(card);

  return {
    prestige,
    atk: prestige * RAID_PRESTIGE_ATK_PER_LEVEL,
    hp: prestige * RAID_PRESTIGE_HP_PER_LEVEL,
    spd: prestige * RAID_PRESTIGE_SPD_PER_LEVEL,
  };
}

function applyRaidPrestigeStats(card) {
  if (!card || String(card.cardRole || "").toLowerCase() === "boost") return card;

  const bonus = getRaidPrestigeBonus(card);

  return {
    ...card,
    raidPrestige: bonus.prestige,
    atk: applyPercent(card.atk, bonus.atk),
    hp: applyPercent(card.hp, bonus.hp),
    speed: applyPercent(card.speed, bonus.spd),
    raidPrestigeBonus: bonus,
  };
}

function hydrateCombatCard(card, boosts = {}) {
  const synced = hydrateCard(card);
  if (!synced) return null;
  if (String(synced.cardRole || "").toLowerCase() === "boost") return synced;

  const prestiged = applyRaidPrestigeStats(synced);

  return {
    ...prestiged,
    atk: applyPercent(prestiged.atk, boosts.atk),
    hp: applyPercent(prestiged.hp, boosts.hp),
    speed: applyPercent(prestiged.speed, boosts.spd),
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
  RAID_PRESTIGE_CAP,
  RAID_PRESTIGE_ATK_PER_LEVEL,
  RAID_PRESTIGE_HP_PER_LEVEL,
  RAID_PRESTIGE_SPD_PER_LEVEL,
  getRaidPrestigeLevel,
  getRaidPrestigeBonus,
  applyRaidPrestigeStats,
  hydrateCombatCard,
  getPlayerCombatBoosts,
  getPlayerCombatCards,
  applyDamageBoost,
  applyExpBoost,
  applyDailyBoost,
};