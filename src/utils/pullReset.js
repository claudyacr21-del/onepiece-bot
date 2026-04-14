const RESET_INTERVAL_MS = 8 * 60 * 60 * 1000;

function getCurrentResetBucket(now = Date.now()) {
  return Math.floor(now / RESET_INTERVAL_MS);
}

function getNextResetTime(now = Date.now()) {
  return (getCurrentResetBucket(now) + 1) * RESET_INTERVAL_MS;
}

function buildResetPullState(existingPulls = {}) {
  return {
    base: {
      used: 0,
      max: Number(existingPulls?.base?.max || 6)
    },
    supportMember: {
      used: 0,
      max: Number(existingPulls?.supportMember?.max || 1)
    },
    booster: {
      used: 0,
      max: Number(existingPulls?.booster?.max || 1)
    },
    owner: {
      used: 0,
      max: Number(existingPulls?.owner?.max || 1)
    },
    patreon: {
      used: 0,
      max: Number(existingPulls?.patreon?.max || 3)
    },
    baccaratCard: {
      used: 0,
      max: Number(existingPulls?.baccaratCard?.max || 1)
    },
    baccaratFruit: {
      used: 0,
      max: Number(existingPulls?.baccaratFruit?.max || 1)
    },
    lastResetBucket: getCurrentResetBucket()
  };
}

function buildManualTicketResetPullState(existingPulls = {}) {
  return {
    ...existingPulls,
    base: {
      ...(existingPulls?.base || {}),
      used: 0,
      max: Number(existingPulls?.base?.max || 6)
    },
    supportMember: {
      ...(existingPulls?.supportMember || {}),
      used: 0,
      max: Number(existingPulls?.supportMember?.max || 1)
    },
    booster: {
      ...(existingPulls?.booster || {}),
      used: 0,
      max: Number(existingPulls?.booster?.max || 1)
    },
    owner: {
      ...(existingPulls?.owner || {}),
      used: 0,
      max: Number(existingPulls?.owner?.max || 1)
    },
    patreon: {
      ...(existingPulls?.patreon || {}),
      used: 0,
      max: Number(existingPulls?.patreon?.max || 3)
    },
    baccaratCard: {
      ...(existingPulls?.baccaratCard || {}),
      used: 0,
      max: Number(existingPulls?.baccaratCard?.max || 1)
    },
    baccaratFruit: {
      ...(existingPulls?.baccaratFruit || {}),
      used: 0,
      max: Number(existingPulls?.baccaratFruit?.max || 1)
    },
    lastResetBucket: Number.isInteger(existingPulls?.lastResetBucket)
      ? existingPulls.lastResetBucket
      : getCurrentResetBucket()
  };
}

function applyGlobalPullReset(player) {
  const currentBucket = getCurrentResetBucket();
  const pulls = player?.pulls || {};
  const savedBucket = Number.isInteger(pulls?.lastResetBucket)
    ? pulls.lastResetBucket
    : null;

  if (savedBucket === currentBucket) {
    return {
      wasReset: false,
      pulls,
      nextResetAt: getNextResetTime()
    };
  }

  return {
    wasReset: true,
    pulls: buildResetPullState(pulls),
    nextResetAt: getNextResetTime()
  };
}

function applyManualPullReset(existingPulls = {}) {
  return {
    pulls: buildManualTicketResetPullState(existingPulls),
    nextResetAt: getNextResetTime()
  };
}

module.exports = {
  RESET_INTERVAL_MS,
  getCurrentResetBucket,
  getNextResetTime,
  buildResetPullState,
  buildManualTicketResetPullState,
  applyGlobalPullReset,
  applyManualPullReset
};