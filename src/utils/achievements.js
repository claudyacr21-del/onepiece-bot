// Lifetime achievement counters + Saint mastery reward helpers.

const ACHIEVEMENT_DEFAULTS = {
  bossDefeated: 0,
  fightWon: 0,
  raidCompleted: 0,
  pullsUsed: 0,
  claimed: { killingham: 0, sommers: 0 },
};

function safeCount(value) {
  const n = Math.floor(Number(value || 0));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function safeTier(value) {
  return Math.max(0, Math.min(3, safeCount(value)));
}

function normalizeAchievements(value) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const claimed = raw.claimed && typeof raw.claimed === "object" ? raw.claimed : {};

  return {
    bossDefeated: safeCount(raw.bossDefeated),
    fightWon: safeCount(raw.fightWon),
    raidCompleted: safeCount(raw.raidCompleted),
    pullsUsed: safeCount(raw.pullsUsed),
    claimed: {
      killingham: safeTier(claimed.killingham),
      sommers: safeTier(claimed.sommers),
    },
  };
}

// Returns a NEW achievements object with the given counter increased.
function bumpAchievement(player, key, amount = 1) {
  const current = normalizeAchievements(player && player.achievements);

  if (
    key === "bossDefeated" ||
    key === "fightWon" ||
    key === "raidCompleted" ||
    key === "pullsUsed"
  ) {
    current[key] = Math.max(0, current[key] + Math.floor(Number(amount || 0)));
  }

  return current;
}

module.exports = {
  ACHIEVEMENT_DEFAULTS,
  normalizeAchievements,
  bumpAchievement,
};