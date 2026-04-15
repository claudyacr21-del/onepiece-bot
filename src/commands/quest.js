const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { ITEMS, cloneItem } = require("../data/items");
const {
  ensureDailyQuestState,
  getQuestProgress,
  isQuestDone,
  getQuestCompletionSummary
} = require("../utils/questProgress");

function addOrIncrease(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const index = arr.findIndex((entry) => entry.code === item.code);

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 1) + Number(item.amount || 1)
    };
    return arr;
  }

  arr.push({
    ...item,
    amount: Number(item.amount || 1)
  });

  return arr;
}

function getQuestClearReward() {
  return {
    berries: 9000,
    gems: 25,
    boxes: [cloneItem(ITEMS.basicResourceBox, 1)],
    tickets: Math.random() < 0.35 ? [cloneItem(ITEMS.pullResetTicket, 1)] : [],
    materials: Math.random() < 0.5 ? [cloneItem(ITEMS.enhancementStone, 3)] : []
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

    const summary = getQuestCompletionSummary(dailyState);
    const allComplete = summary.total > 0 && summary.completed === summary.total;

    let updatedBoxes = [...(player.boxes || [])];
    let updatedTickets = [...(player.tickets || [])];
    let updatedMaterials = [...(player.materials || [])];
    let berriesToAdd = 0;
    let gemsToAdd = 0;
    let totalClears = Number(player?.quests?.totalClears || 0);
    const rewardLines = [];

    if (allComplete && !dailyState.rewardClaimed) {
      const reward = getQuestClearReward();

      berriesToAdd = reward.berries;
      gemsToAdd = reward.gems;
      totalClears += 1;

      reward.boxes.forEach((item) => {
        updatedBoxes = addOrIncrease(updatedBoxes, item);
        rewardLines.push(`📦 ${item.name} x${item.amount}`);
      });

      reward.tickets.forEach((item) => {
        updatedTickets = addOrIncrease(updatedTickets, item);
        rewardLines.push(`🎟️ ${item.name} x${item.amount}`);
      });

      reward.materials.forEach((item) => {
        updatedMaterials = addOrIncrease(updatedMaterials, item);
        rewardLines.push(`🧱 ${item.name} x${item.amount}`);
      });

      dailyState = {
        ...dailyState,
        rewardClaimed: true
      };

      updatePlayer(message.author.id, {
        berries: Number(player.berries || 0) + berriesToAdd,
        gems: Number(player.gems || 0) + gemsToAdd,
        boxes: updatedBoxes,
        tickets: updatedTickets,
        materials: updatedMaterials,
        quests: {
          ...(player.quests || {}),
          daily: {
            total: summary.total,
            completed: summary.completed
          },
          dailyState,
          totalClears
        }
      });
    } else {
      updatePlayer(message.author.id, {
        quests: {
          ...(player.quests || {}),
          daily: {
            total: summary.total,
            completed: summary.completed
          },
          dailyState,
          totalClears
        }
      });
    }

    const questLines = dailyState.quests.map((quest, index) => {
      const done = isQuestDone(dailyState, quest);
      const progress = getQuestProgress(dailyState, quest);
      const status = done ? "✅" : "⬜";
      const bar = buildProgressBar(progress, quest.target, 8);

      return [
        `${status} **${index + 1}. ${quest.title}**`,
        `↪ ${bar}`
      ].join("\n");
    });

    const topSummary = [
      `**Completed:** \`${summary.completed}/${summary.total}\``,
      `**Quest Left:** \`${summary.left}/${summary.total}\``,
      `**Daily Clears:** \`${totalClears}\``
    ];

    if (allComplete) {
      topSummary.push(`**Reward Status:** \`${dailyState.rewardClaimed ? "Claimed" : "Ready"}\``);
    }

    const description = [
      ...topSummary,
      "",
      "## Daily Missions",
      ...questLines
    ];

    if (allComplete) {
      description.push("");
      description.push("## Quest Clear Reward");
      description.push(`🍇 Berries: +${berriesToAdd > 0 ? berriesToAdd.toLocaleString("en-US") : "9000"}`);
      description.push(`💎 Gems: +${gemsToAdd > 0 ? gemsToAdd : "25"}`);

      if (rewardLines.length) {
        description.push(...rewardLines);
      } else if (dailyState.rewardClaimed) {
        description.push("✅ Reward already claimed automatically.");
      }
    }

    const embed = new EmbedBuilder()
      .setColor(summary.left === 0 ? 0x2ecc71 : 0x9b59b6)
      .setTitle("📜 Daily Quest Board")
      .setDescription(description.join("\n"))
      .setFooter({ text: "One Piece Bot • Daily Quests" });

    return message.reply({ embeds: [embed] });
  }
};