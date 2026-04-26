const DAILY_QUEST_COUNT = 5;

const QUEST_POOL = [
  {
    id: "open_box_3",
    key: "boxesOpened",
    category: "box",
    title: "Open 3 boxes",
    target: 3,
  },
  {
    id: "weapon_upgrade_1",
    key: "weaponUpgrades",
    category: "weapon",
    title: "Upgrade 1 weapon",
    target: 1,
  },
  {
    id: "fight_played_3",
    key: "fightsPlayed",
    category: "fight_played",
    title: "Play 3 fights",
    target: 3,
  },
  {
    id: "fight_win_2",
    key: "fightsWon",
    category: "fight_win",
    title: "Win 2 fights",
    target: 2,
  },
  {
    id: "boss_fight_1",
    key: "bossFights",
    category: "boss_played",
    title: "Challenge 1 boss",
    target: 1,
  },
  {
    id: "boss_defeat_1",
    key: "bossesDefeated",
    category: "boss_win",
    title: "Defeat 1 boss",
    target: 1,
  },
  {
    id: "arena_match_2",
    key: "arenaMatches",
    category: "arena_played",
    title: "Play 2 arena matches",
    target: 2,
  },
  {
    id: "arena_win_1",
    key: "arenaWins",
    category: "arena_win",
    title: "Win 1 arena match",
    target: 1,
  },
  {
    id: "pull_5",
    key: "pullsUsed",
    category: "pull",
    title: "Use 5 pulls",
    target: 5,
  },
  {
    id: "level_card_3",
    key: "cardLevels",
    category: "level",
    title: "Level up cards 3 times",
    target: 3,
  },
];

function getTodayKey() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function shuffle(array) {
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function buildQuestSet() {
  const usedCategories = new Set();
  const picked = [];

  for (const quest of shuffle(QUEST_POOL)) {
    if (usedCategories.has(quest.category)) continue;

    usedCategories.add(quest.category);

    picked.push({
      id: quest.id,
      key: quest.key,
      category: quest.category,
      title: quest.title,
      target: quest.target,
    });

    if (picked.length >= DAILY_QUEST_COUNT) break;
  }

  return picked;
}

function normalizeDailyState(state) {
  return {
    dayKey: state?.dayKey || getTodayKey(),
    quests: Array.isArray(state?.quests) ? state.quests : [],
    progress:
      typeof state?.progress === "object" && state?.progress
        ? { ...state.progress }
        : {},
    rewardClaimed: Boolean(state?.rewardClaimed),
  };
}

function sanitizeDailyState(state) {
  const current = normalizeDailyState(state);
  const validQuestIds = new Set(QUEST_POOL.map((quest) => quest.id));
  const quests = current.quests.filter((quest) => validQuestIds.has(quest.id));

  return {
    ...current,
    quests,
  };
}

function ensureDailyQuestState(player) {
  const current = sanitizeDailyState(player?.quests?.dailyState);
  const todayKey = getTodayKey();

  if (current.dayKey !== todayKey || current.quests.length < DAILY_QUEST_COUNT) {
    return {
      dayKey: todayKey,
      quests: buildQuestSet(),
      progress: {},
      rewardClaimed: false,
    };
  }

  return current;
}

function getQuestProgress(dailyState, quest) {
  return Number(dailyState?.progress?.[quest.key] || 0);
}

function isQuestDone(dailyState, quest) {
  return getQuestProgress(dailyState, quest) >= Number(quest.target || 0);
}

function getQuestCompletionSummary(dailyState) {
  const quests = Array.isArray(dailyState?.quests) ? dailyState.quests : [];
  const completed = quests.filter((quest) => isQuestDone(dailyState, quest)).length;
  const total = quests.length;

  return {
    completed,
    total,
    left: Math.max(0, total - completed),
  };
}

function incrementQuestCounter(player, key, amount = 1) {
  const dailyState = ensureDailyQuestState(player);

  return {
    ...dailyState,
    progress: {
      ...(dailyState.progress || {}),
      [key]: Number(dailyState.progress?.[key] || 0) + Number(amount || 0),
    },
  };
}

module.exports = {
  DAILY_QUEST_COUNT,
  QUEST_POOL,
  ensureDailyQuestState,
  getQuestProgress,
  isQuestDone,
  getQuestCompletionSummary,
  incrementQuestCounter,
};