const PULL_SLOT_SCHEMA_VERSION = 6;
const RESET_TIMEZONE = "Asia/Jakarta";
const RESET_INTERVAL_HOURS = 8;
const RESET_INTERVAL_MS = RESET_INTERVAL_HOURS * 60 * 60 * 1000;

function getWibDateParts(now = Date.now()) {
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

  return {
    year: Number(data.year),
    month: Number(data.month),
    day: Number(data.day),
    key: `${data.year}-${data.month}-${data.day}`,
  };
}

function getWibMidnightUtcMs(now = Date.now()) {
  const { year, month, day } = getWibDateParts(now);

  // 00:00 WIB = 17:00 UTC on the previous UTC day.
  return Date.UTC(year, month - 1, day - 1, 17, 0, 0, 0);
}

function getCurrentResetSlot(now = Date.now()) {
  const anchor = getWibMidnightUtcMs(now);
  const elapsed = Math.max(0, Number(now) - anchor);

  return Math.floor(elapsed / RESET_INTERVAL_MS);
}

function getCurrentResetBucket(now = Date.now()) {
  const { key } = getWibDateParts(now);
  const slot = getCurrentResetSlot(now);

  return `${key}:${slot}`;
}

function getCurrentResetStartTime(now = Date.now()) {
  const anchor = getWibMidnightUtcMs(now);
  const slot = getCurrentResetSlot(now);

  return anchor + slot * RESET_INTERVAL_MS;
}

function getNextResetTime(now = Date.now()) {
  return getCurrentResetStartTime(now) + RESET_INTERVAL_MS;
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
  RESET_INTERVAL_HOURS,
  RESET_INTERVAL_MS,
  getCurrentResetBucket,
  getCurrentResetStartTime,
  getNextResetTime,
  buildResetPullState,
  buildManualTicketResetPullState,
  applyGlobalPullReset,
  applyManualPullReset,
};