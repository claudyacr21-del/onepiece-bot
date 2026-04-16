const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { ITEMS, cloneItem } = require("../data/items");
const {
  ensureDailyQuestState,
  getQuestProgress,
  isQuestDone,
  getQuestCompletionSummary,
} = require("../utils/questProgress");

function addOrIncrease(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const index = arr.findIndex((entry) => entry.code === item.code);

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 1) + Number(item.amount || 1),
    };
    return arr;
  }

  arr.push({ ...item, amount: Number(item.amount || 1) });
  return arr;
}

function getQuestClearReward() {
  return {
    berries: 9000,
    gems: 25,
    boxes: [cloneItem(ITEMS.basicResourceBox, 1)],
    tickets: Math.random() < 0.35 ? [cloneItem(ITEMS.pullResetTicket, 1)] : [],
    materials: Math.random() < 0.5 ? [cloneItem(ITEMS.enhancementStone, 3)] : [],
  };
}

function buildProgressBar(progress, target, size = 10) {
  const safeTarget = Math.max(1, Number(target || 1));
  const safeProgress = Math.max(0, Math.min(Number(progress || 0), safeTarget));
  const filled = Math.round((safeProgress / safeTarget) * size);
  const safeFilled = Math.max(0, Math.min(size, filled));
  return `${"█".repeat(safeFilled)}${"░".repeat(size - safeFilled)} ${safeProgress}/${safeTarget}`;
}

module.exports = {
  name: "quest",
  aliases: ["quests"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    let dailyState = ensureDailyQuestState(player);
    let totalClears = Number(player?.quests?.totalClears || 0);

    const summaryBefore = getQuestCompletionSummary(dailyState);
    const allCompleteBefore = summaryBefore.total > 0 && summaryBefore.completed === summaryBefore.total;

    let updatedBoxes = [...(player.boxes || [])];
    let updatedTickets = [...(player.tickets || [])];
    let updatedMaterials = [...(player.materials || [])];
    let berriesToAdd = 0;
    let gemsToAdd = 0;
    const rewardLines = [];

    if (allCompleteBefore && !dailyState.rewardClaimed) {
      const reward = getQuestClearReward();
      berriesToAdd = reward.berries;
      gemsToAdd = reward.gems;
      totalClears += 1;

      reward.boxes.forEach((item) => {
        updatedBoxes = addOrIncrease(updatedBoxes, item);
        rewardLines.push(`${item.name} x${item.amount}`);
      });

      reward.tickets.forEach((item) => {
        updatedTickets = addOrIncrease(updatedTickets, item);
        rewardLines.push(`${item.name} x${item.amount}`);
      });

      reward.materials.forEach((item) => {
        updatedMaterials = addOrIncrease(updatedMaterials, item);
        rewardLines.push(`${item.name} x${item.amount}`);
      });

      dailyState = { ...dailyState, rewardClaimed: true };
    }

    updatePlayer(message.author.id, {
      berries: Number(player.berries || 0) + berriesToAdd,
      gems: Number(player.gems || 0) + gemsToAdd,
      boxes: updatedBoxes,
      tickets: updatedTickets,
      materials: updatedMaterials,
      quests: {
        ...(player.quests || {}),
        daily: {
          total: dailyState.quests.length,
          completed: getQuestCompletionSummary(dailyState).completed,
        },
        dailyState,
        totalClears,
      },
    });

    const summary = getQuestCompletionSummary(dailyState);

    const questLines = (dailyState.quests || []).map((quest, index) => {
      const done = isQuestDone(dailyState, quest);
      const progress = getQuestProgress(dailyState, quest);
      const status = done ? "✅" : "⬜";
      const bar = buildProgressBar(progress, quest.target, 8);
      return [`${status} **${index + 1}. ${quest.title || "Quest"}**`, `↪ ${bar}`].join("\n");
    });

    const description = [
      `**Completed:** \`${summary.completed}/${summary.total}\``,
      `**Quest Left:** \`${summary.left}/${summary.total}\``,
      `**Daily Clears:** \`${totalClears}\``,
      "",
      "## Daily Missions",
      ...questLines,
    ];

    if (berriesToAdd > 0 || gemsToAdd > 0 || rewardLines.length) {
      description.push("");
      description.push("## Clear Reward Received");
      if (berriesToAdd > 0) description.push(`Berries: +${berriesToAdd.toLocaleString("en-US")}`);
      if (gemsToAdd > 0) description.push(`Gems: +${gemsToAdd}`);
      if (rewardLines.length) description.push(...rewardLines);
    }

    const embed = new EmbedBuilder()
      .setColor(summary.left === 0 ? 0x2ecc71 : 0x9b59b6)
      .setTitle("📜 Daily Quest Board")
      .setDescription(description.join("\n"))
      .setFooter({ text: "One Piece Bot • Daily quests reset on first trigger of the new day" });

    return message.reply({ embeds: [embed] });
  },
};