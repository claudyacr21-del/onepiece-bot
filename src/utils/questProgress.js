const { getPlayer, updatePlayer } = require("../playerStore");

const QUEST_POOL = [
  {
    id: "daily_claim_1",
    category: "daily_claim",
    label: "Claim Daily 1x",
    target: 1,
    counterKey: "dailyClaims",
    reward: { berries: 15000, gems: 5 },
  },
  {
    id: "pull_5",
    category: "pulls_used",
    label: "Pull 5x",
    target: 5,
    counterKey: "pullsUsed",
    reward: { berries: 25000, gems: 5 },
  },
  {
    id: "pull_10",
    category: "pulls_used",
    label: "Pull 10x",
    target: 10,
    counterKey: "pullsUsed",
    reward: { berries: 50000, gems: 10 },
  },
  {
    id: "box_open_3",
    category: "boxes_opened",
    label: "Open Box 3x",
    target: 3,
    counterKey: "boxesOpened",
    reward: { berries: 30000, gems: 5 },
  },
  {
    id: "box_open_5",
    category: "boxes_opened",
    label: "Open Box 5x",
    target: 5,
    counterKey: "boxesOpened",
    reward: { berries: 55000, gems: 10 },
  },
  {
    id: "fight_play_5",
    category: "fights_played",
    label: "Play Fight 5x",
    target: 5,
    counterKey: "fightsPlayed",
    reward: { berries: 40000, gems: 5 },
  },
  {
    id: "fight_win_3",
    category: "fights_won",
    label: "Win Fight 3x",
    target: 3,
    counterKey: "fightsWon",
    reward: { berries: 50000, gems: 8 },
  },
  {
    id: "boss_fight_1",
    category: "boss_fights",
    label: "Fight Boss 1x",
    target: 1,
    counterKey: "bossFights",
    reward: { berries: 65000, gems: 10 },
  },
  {
    id: "boss_clear_1",
    category: "bosses_defeated",
    label: "Defeat Boss 1x",
    target: 1,
    counterKey: "bossesDefeated",
    reward: { berries: 90000, gems: 12 },
  },
  {
    id: "craft_2",
    category: "crafts_done",
    label: "Craft 2x",
    target: 2,
    counterKey: "craftsDone",
    reward: { berries: 35000, gems: 5 },
  },
  {
    id: "ticket_reset_1",
    category: "reset_tickets_used",
    label: "Use Reset Ticket 1x",
    target: 1,
    counterKey: "resetTicketsUsed",
    reward: { berries: 30000, gems: 4 },
  },
];

const DAILY_FINAL_REWARD = {
  berries: 150000,
  gems: 25,
};

function getDateKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateDailyQuests(total = 5) {
  const chosen = [];
  const usedCategories = new Set();

  for (const quest of shuffle(QUEST_POOL)) {
    if (usedCategories.has(quest.category)) continue;
    chosen.push({
      ...quest,
      progress: 0,
      completed: false,
      claimed: false,
    });
    usedCategories.add(quest.category);
    if (chosen.length >= total) break;
  }

  return chosen;
}

function ensureDailyQuestState(player) {
  const dateKey = getDateKey();
  const current = player.quests?.dailyState || {};
  const needsRefresh = current.dateKey !== dateKey || !Array.isArray(current.quests) || !current.quests.length;

  if (!needsRefresh) return { player, changed: false };

  const quests = generateDailyQuests(player.quests?.daily?.total || 5);

  const next = {
    ...player,
    quests: {
      ...(player.quests || {}),
      daily: {
        total: 5,
        completed: 0,
      },
      dailyState: {
        dateKey,
        rewardClaimed: false,
        quests,
        counters: {
          dailyClaims: 0,
          pullsUsed: 0,
          boxesOpened: 0,
          resetTicketsUsed: 0,
          fightsPlayed: 0,
          fightsWon: 0,
          bossFights: 0,
          bossesDefeated: 0,
          craftsDone: 0,
        },
      },
    },
  };

  return { player: next, changed: true };
}

function applyQuestCounter(userId, username, counterKey, amount = 1) {
  let player = getPlayer(userId, username);
  const ensured = ensureDailyQuestState(player);
  player = ensured.player;

  const counters = {
    ...(player.quests?.dailyState?.counters || {}),
    [counterKey]: Number(player.quests?.dailyState?.counters?.[counterKey] || 0) + amount,
  };

  const quests = (player.quests?.dailyState?.quests || []).map((quest) => {
    if (quest.counterKey !== counterKey) return quest;
    const progress = Math.min(Number(quest.target || 0), Number(counters[counterKey] || 0));
    return {
      ...quest,
      progress,
      completed: progress >= Number(quest.target || 0),
    };
  });

  const completedCount = quests.filter((q) => q.completed).length;
  const allComplete = quests.length > 0 && completedCount === quests.length;
  let rewardClaimed = Boolean(player.quests?.dailyState?.rewardClaimed);
  let berries = Number(player.berries || 0);
  let gems = Number(player.gems || 0);

  if (allComplete && !rewardClaimed) {
    berries += Number(DAILY_FINAL_REWARD.berries || 0);
    gems += Number(DAILY_FINAL_REWARD.gems || 0);
    rewardClaimed = true;
  }

  updatePlayer(userId, {
    berries,
    gems,
    quests: {
      ...(player.quests || {}),
      daily: {
        total: quests.length,
        completed: completedCount,
      },
      dailyState: {
        ...(player.quests?.dailyState || {}),
        dateKey: getDateKey(),
        rewardClaimed,
        counters,
        quests,
      },
    },
  });

  return {
    quests,
    completedCount,
    total: quests.length,
    autoRewardGranted: allComplete && rewardClaimed,
  };
}

module.exports = {
  QUEST_POOL,
  DAILY_FINAL_REWARD,
  getDateKey,
  generateDailyQuests,
  ensureDailyQuestState,
  applyQuestCounter,
};