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
    lastResetBucket: getCurrentResetBucket()
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

module.exports = {
  RESET_INTERVAL_MS,
  getCurrentResetBucket,
  getNextResetTime,
  buildResetPullState,
  applyGlobalPullReset
};