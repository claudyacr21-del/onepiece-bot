const PULL_SLOT_SCHEMA_VERSION = 4;
const RESET_TIMEZONE = "Asia/Jakarta";

function getWibDateKey(now = Date.now()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: RESET_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date(now));
}

function getCurrentResetBucket(now = Date.now()) {
  return getWibDateKey(now);
}

function getNextResetTime(now = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: RESET_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));

  const data = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      data[part.type] = part.value;
    }
  }

  const year = Number(data.year);
  const month = Number(data.month);
  const day = Number(data.day);

  // 00:00 WIB = 17:00 UTC previous day.
  return Date.UTC(year, month - 1, day + 1, 17, 0, 0, 0);
}

function buildResetPullState(existingPulls = {}) {
  return {
    base: { ...(existingPulls?.base || {}), used: 0, max: 6 },
    supportMember: { ...(existingPulls?.supportMember || {}), used: 0, max: 1 },
    booster: { ...(existingPulls?.booster || {}), used: 0, max: 1 },
    owner: { ...(existingPulls?.owner || {}), used: 0, max: 1 },
    patreon: { ...(existingPulls?.patreon || {}), used: 0, max: 3 },
    vivreCard: { ...(existingPulls?.vivreCard || {}), used: 0, max: 1 },
    baccaratCard: { ...(existingPulls?.baccaratCard || {}), used: 0, max: 3 },
    baccaratFruit: { ...(existingPulls?.baccaratFruit || {}), used: 0, max: 2 },
    lastResetBucket: getCurrentResetBucket(),
    slotSchemaVersion: PULL_SLOT_SCHEMA_VERSION,
  };
}

function buildManualTicketResetPullState(existingPulls = {}) {
  return {
    ...existingPulls,
    base: { ...(existingPulls?.base || {}), used: 0, max: 6 },
    supportMember: { ...(existingPulls?.supportMember || {}), used: 0, max: 1 },
    booster: { ...(existingPulls?.booster || {}), used: 0, max: 1 },
    owner: { ...(existingPulls?.owner || {}), used: 0, max: 1 },
    patreon: { ...(existingPulls?.patreon || {}), used: 0, max: 3 },
    vivreCard: { ...(existingPulls?.vivreCard || {}), used: 0, max: 1 },
    baccaratCard: { ...(existingPulls?.baccaratCard || {}), used: 0, max: 3 },
    baccaratFruit: { ...(existingPulls?.baccaratFruit || {}), used: 0, max: 2 },
    lastResetBucket:
      typeof existingPulls?.lastResetBucket === "string" &&
      existingPulls.lastResetBucket.trim()
        ? existingPulls.lastResetBucket.trim()
        : getCurrentResetBucket(),
    slotSchemaVersion: PULL_SLOT_SCHEMA_VERSION,
  };
}

function applyGlobalPullReset(player) {
  const currentBucket = getCurrentResetBucket();
  const pulls = player?.pulls || {};
  const savedBucket = pulls?.lastResetBucket || null;
  const savedSchemaVersion = Number(pulls?.slotSchemaVersion || 0);

  if (
    savedBucket === currentBucket &&
    savedSchemaVersion === PULL_SLOT_SCHEMA_VERSION
  ) {
    return {
      wasReset: false,
      pulls,
      nextResetAt: getNextResetTime(),
    };
  }

  return {
    wasReset: true,
    pulls: buildResetPullState(pulls),
    nextResetAt: getNextResetTime(),
  };
}

function applyManualPullReset(existingPulls = {}) {
  return {
    pulls: buildManualTicketResetPullState(existingPulls),
    nextResetAt: getNextResetTime(),
  };
}

module.exports = {
  PULL_SLOT_SCHEMA_VERSION,
  RESET_TIMEZONE,
  getCurrentResetBucket,
  getNextResetTime,
  buildResetPullState,
  buildManualTicketResetPullState,
  applyGlobalPullReset,
  applyManualPullReset,
};