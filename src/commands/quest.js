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
    berries: 7000,
    gems: 20,
    boxes: [cloneItem(ITEMS.basicResourceBox, 1)],
    tickets: Math.random() < 0.35 ? [cloneItem(ITEMS.pullResetTicket, 1)] : [],
    materials: Math.random() < 0.5 ? [cloneItem(ITEMS.enhancementStone, 3)] : []
  };
}

module.exports = {
  name: "quest",
  aliases: ["quests"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    let dailyState = ensureDailyQuestState(player);

    const summary = getQuestCompletionSummary(dailyState);
    const allComplete = summary.total > 0 && summary.completed === summary.total;

    const rewardLines = [];
    let updatedBoxes = [...(player.boxes || [])];
    let updatedTickets = [...(player.tickets || [])];
    let updatedMaterials = [...(player.materials || [])];
    let berriesToAdd = 0;
    let gemsToAdd = 0;
    let totalClears = Number(player?.quests?.totalClears || 0);

    if (allComplete && !dailyState.rewardClaimed) {
      const reward = getQuestClearReward();

      berriesToAdd = reward.berries;
      gemsToAdd = reward.gems;
      totalClears += 1;

      reward.boxes.forEach((item) => {
        updatedBoxes = addOrIncrease(updatedBoxes, item);
        rewardLines.push(`↪ ${item.name} x${item.amount}`);
      });

      reward.tickets.forEach((item) => {
        updatedTickets = addOrIncrease(updatedTickets, item);
        rewardLines.push(`↪ ${item.name} x${item.amount}`);
      });

      reward.materials.forEach((item) => {
        updatedMaterials = addOrIncrease(updatedMaterials, item);
        rewardLines.push(`↪ ${item.name} x${item.amount}`);
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
      return `${status} ${index + 1}. ${quest.title} — \`${progress}/${quest.target}\``;
    });

    const description = [
      `**Completed:** \`${summary.completed}/${summary.total}\``,
      `**Quest Left:** \`${summary.left}/${summary.total}\``,
      `**Daily Clears:** \`${totalClears}\``,
      "",
      ...questLines
    ];

    if (allComplete) {
      description.push("");
      description.push(dailyState.rewardClaimed ? "🎁 **Daily Quest Reward:** `Claimed`" : "🎁 **Daily Quest Reward:** `Ready`");
    }

    if (berriesToAdd > 0 || gemsToAdd > 0 || rewardLines.length > 0) {
      description.push("");
      description.push("## Quest Clear Reward");
      description.push(`↪ Berries: +${berriesToAdd.toLocaleString("en-US")}`);
      description.push(`↪ Gems: +${gemsToAdd.toLocaleString("en-US")}`);
      description.push(...rewardLines);
    }

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle("📜 Daily Quest List")
      .setDescription(description.join("\n"))
      .setFooter({ text: "One Piece Bot • Quests" });

    return message.reply({ embeds: [embed] });
  }
};