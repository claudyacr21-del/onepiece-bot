const { readPlayers, writePlayers } = require("../playerStore");

const LUCKY_WEEK_STORE_KEY = "__lucky_week_event__";
const LUCKY_WEEK_MULTIPLIER = 1.5;

function getLuckyWeekState() {
  const players = readPlayers();
  const state = players[LUCKY_WEEK_STORE_KEY];

  if (!state || typeof state !== "object") {
    return {
      enabled: false,
      multiplier: LUCKY_WEEK_MULTIPLIER,
      updatedAt: 0,
      updatedBy: "",
      updatedByName: "",
    };
  }

  return {
    enabled: Boolean(state.enabled),
    multiplier: Number(state.multiplier || LUCKY_WEEK_MULTIPLIER),
    updatedAt: Number(state.updatedAt || 0),
    updatedBy: String(state.updatedBy || ""),
    updatedByName: String(state.updatedByName || ""),
  };
}

function setLuckyWeekState(enabled, user = null) {
  const players = readPlayers();

  const nextState = {
    enabled: Boolean(enabled),
    multiplier: LUCKY_WEEK_MULTIPLIER,
    updatedAt: Date.now(),
    updatedBy: String(user?.id || ""),
    updatedByName: String(user?.username || user?.tag || ""),
  };

  players[LUCKY_WEEK_STORE_KEY] = nextState;
  writePlayers(players);

  return nextState;
}

function isLuckyWeekActive() {
  return getLuckyWeekState().enabled;
}

function getLuckyWeekPullMultiplier() {
  const state = getLuckyWeekState();

  if (!state.enabled) return 1;

  return Math.max(1, Number(state.multiplier || LUCKY_WEEK_MULTIPLIER));
}

function getLuckyWeekBonusLine() {
  const state = getLuckyWeekState();

  if (!state.enabled) return null;

  return `🍀 Lucky Week Active: Pull rarity rate x${Number(
    state.multiplier || LUCKY_WEEK_MULTIPLIER
  )}`;
}

module.exports = {
  LUCKY_WEEK_STORE_KEY,
  LUCKY_WEEK_MULTIPLIER,
  getLuckyWeekState,
  setLuckyWeekState,
  isLuckyWeekActive,
  getLuckyWeekPullMultiplier,
  getLuckyWeekBonusLine,
};