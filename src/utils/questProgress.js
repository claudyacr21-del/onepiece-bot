function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

const QUEST_POOL = [
  { id: "claim_daily", title: "Claim Daily Reward", type: "counter", key: "dailyClaims", target: 1 },
  { id: "use_pulls_10", title: "Use 10 Pulls", type: "counter", key: "pullsUsed", target: 10 },
  { id: "open_boxes_5", title: "Open 5 Boxes", type: "counter", key: "boxesOpened", target: 5 },
  { id: "fight_5_times", title: "Fight 5 Times", type: "counter", key: "fightsPlayed", target: 5 },
  { id: "win_3_fights", title: "Win 3 Fights", type: "counter", key: "fightsWon", target: 3 }
];

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createDailyQuestState() {
  const selected = shuffle(QUEST_POOL).slice(0, 5);

  return {
    dateKey: getTodayDateKey(),
    rewardClaimed: false,
    quests: selected.map((quest) => ({
      id: quest.id,
      title: quest.title,
      type: quest.type,
      key: quest.key,
      target: quest.target
    })),
    counters: {
      dailyClaims: 0,
      pullsUsed: 0,
      boxesOpened: 0,
      resetTicketsUsed: 0,
      fightsPlayed: 0,
      fightsWon: 0,
      bossFights: 0,
      bossesDefeated: 0,
      craftsDone: 0
    }
  };
}

function ensureDailyQuestState(player) {
  const existing = player?.quests?.dailyState;
  const today = getTodayDateKey();

  if (!existing || existing.dateKey !== today || !Array.isArray(existing.quests)) {
    return createDailyQuestState();
  }

  return {
    dateKey: existing.dateKey,
    rewardClaimed: Boolean(existing.rewardClaimed),
    quests: Array.isArray(existing.quests) ? existing.quests : [],
    counters: {
      dailyClaims: Number(existing?.counters?.dailyClaims || 0),
      pullsUsed: Number(existing?.counters?.pullsUsed || 0),
      boxesOpened: Number(existing?.counters?.boxesOpened || 0),
      resetTicketsUsed: Number(existing?.counters?.resetTicketsUsed || 0),
      fightsPlayed: Number(existing?.counters?.fightsPlayed || 0),
      fightsWon: Number(existing?.counters?.fightsWon || 0),
      bossFights: Number(existing?.counters?.bossFights || 0),
      bossesDefeated: Number(existing?.counters?.bossesDefeated || 0),
      craftsDone: Number(existing?.counters?.craftsDone || 0)
    }
  };
}

function incrementQuestCounter(player, key, amount = 1) {
  const dailyState = ensureDailyQuestState(player);
  dailyState.counters[key] = Number(dailyState.counters[key] || 0) + Number(amount || 0);
  return dailyState;
}

function setQuestCounter(player, key, value) {
  const dailyState = ensureDailyQuestState(player);
  dailyState.counters[key] = Number(value || 0);
  return dailyState;
}

function getQuestProgress(dailyState, quest) {
  const value = Number(dailyState?.counters?.[quest.key] || 0);
  return Math.min(value, Number(quest.target || 1));
}

function isQuestDone(dailyState, quest) {
  return getQuestProgress(dailyState, quest) >= Number(quest.target || 1);
}

function getQuestCompletionSummary(dailyState) {
  const quests = Array.isArray(dailyState?.quests) ? dailyState.quests : [];
  const completed = quests.filter((quest) => isQuestDone(dailyState, quest)).length;
  const total = quests.length;

  return {
    completed,
    total,
    left: Math.max(0, total - completed)
  };
}

module.exports = {
  QUEST_POOL,
  getTodayDateKey,
  createDailyQuestState,
  ensureDailyQuestState,
  incrementQuestCounter,
  setQuestCounter,
  getQuestProgress,
  isQuestDone,
  getQuestCompletionSummary
};