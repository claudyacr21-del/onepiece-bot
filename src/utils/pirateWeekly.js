const { readPirateState, writePirateState } = require("./pirateStore");
const { updatePlayerAtomic, flushPlayerStoreNow } = require("../playerStore");

const WEEKLY_RESET_TZ_OFFSET_HOURS = 7;

function getJakartaDateParts(date = new Date()) {
  const shifted = new Date(
    date.getTime() + WEEKLY_RESET_TZ_OFFSET_HOURS * 60 * 60 * 1000
  );

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    date: shifted.getUTCDate(),
    day: shifted.getUTCDay(),
  };
}

function getWeeklyResetBucket(date = new Date()) {
  const parts = getJakartaDateParts(date);

  const shifted = new Date(
    Date.UTC(parts.year, parts.month, parts.date, 0, 0, 0, 0)
  );

  const day = shifted.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  shifted.setUTCDate(shifted.getUTCDate() - daysSinceMonday);

  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function getRewardForRank(rank, role) {
  const isLeader = role === "leader";

  if (rank === 1) return isLeader ? 30 : 30;
  if (rank === 2) return isLeader ? 25: 25;
  if (rank === 3) return isLeader ? 20 : 20;

  return isLeader ? 15 : 15;
}

function getPirateMemberRole(pirate, userId) {
  if (String(pirate.leaderId || "") === String(userId || "")) return "leader";
  if (String(pirate.viceLeaderId || "") === String(userId || "")) return "vice";
  return "crew";
}

function resetPirateRaidState(pirate) {
  return {
    ...pirate,

    raids: {},

    bossActivity: {
      totalAttacks: 0,
      totalPoints: 0,
      lastAttackAt: 0,
      contributors: {},
    },
  };
}

async function addPirateTokens(userId, amount) {
  const safeAmount = Math.max(0, Math.floor(Number(amount || 0)));
  if (!safeAmount) return;

  await updatePlayerAtomic(
    String(userId),
    (fresh) => {
      const player = fresh || {};

      return {
        ...player,
        pirateTokens:
          Math.max(0, Math.floor(Number(player.pirateTokens || 0))) + safeAmount,
      };
    },
    "Unknown"
  );
}

async function runPirateWeeklyResetIfNeeded() {
  const state = readPirateState();
  const currentBucket = getWeeklyResetBucket();

  if (!state.lastWeeklyResetBucket) {
    state.lastWeeklyResetBucket = currentBucket;
    writePirateState(state);

    return {
      didReset: false,
      initialized: true,
      currentBucket,
      rewards: [],
    };
  }

  if (state.lastWeeklyResetBucket === currentBucket) {
    return {
      didReset: false,
      initialized: false,
      currentBucket,
      rewards: [],
    };
  }

  const pirates = Object.values(state.pirates || {})
    .filter((pirate) => Array.isArray(pirate.members) && pirate.members.length > 0)
    .sort((a, b) => Number(b.weeklyPoints || 0) - Number(a.weeklyPoints || 0));

  const rewards = [];

  for (let index = 0; index < pirates.length; index++) {
    const pirate = pirates[index];
    const rank = index + 1;
    const members = Array.isArray(pirate.members) ? pirate.members : [];

    for (const userId of members) {
      const role = getPirateMemberRole(pirate, userId);
      const tokens = getRewardForRank(rank, role);

      await addPirateTokens(userId, tokens);

      rewards.push({
        pirateId: pirate.id,
        pirateName: pirate.name,
        rank,
        userId: String(userId),
        role,
        tokens,
      });
    }

    const current = state.pirates[pirate.id];
    if (!current) continue;

    state.pirates[pirate.id] = resetPirateRaidState({
      ...current,
      weeklyPoints: 0,
      updatedAt: Date.now(),
      lastWeeklyReward: {
        rank,
        previousWeeklyPoints: Math.max(
          0,
          Math.floor(Number(pirate.weeklyPoints || 0))
        ),
        bucket: state.lastWeeklyResetBucket,
        rewardedAt: Date.now(),
      },
      logs: [
        ...(current.logs || []),
        {
          at: Date.now(),
          type: "weekly_reset",
          rank,
          previousWeeklyPoints: Math.max(
            0,
            Math.floor(Number(pirate.weeklyPoints || 0))
          ),
          resetRaidBosses: true,
        },
      ].slice(-25),
    });
  }

  if (typeof flushPlayerStoreNow === "function") {
    await flushPlayerStoreNow(30000);
  }

  state.lastWeeklyResetBucket = currentBucket;
  state.lastWeeklyResetAt = Date.now();
  state.lastWeeklyRewards = rewards.slice(-200);

  writePirateState(state);

  return {
    didReset: true,
    initialized: false,
    currentBucket,
    rewards,
  };
}

function getPirateWeeklyRewardPreview(rank) {
  return {
    rank,
    leader: getRewardForRank(rank, "leader"),
    member: getRewardForRank(rank, "crew"),
  };
}

module.exports = {
  getWeeklyResetBucket,
  getRewardForRank,
  getPirateWeeklyRewardPreview,
  runPirateWeeklyResetIfNeeded,
};