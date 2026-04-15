const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { incrementQuestCounter } = require("../utils/questProgress");
const { ITEMS, cloneItem } = require("../data/items");

const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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

function randomPick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function formatRemaining(ms) {
  if (ms <= 0) return "Now";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "Now";
}

function getDailyTierRewards(dailyTier) {
  const baseBerries = 5000;
  const baseGems = 20;

  let berries = baseBerries;
  let gems = baseGems;
  const rewards = [];

  if (dailyTier <= 0) {
    return { berries, gems, rewards };
  }

  if (dailyTier === 1) {
    berries = 6500;
    gems = 30;

    if (Math.random() < 0.35) {
      rewards.push(
        randomPick([
          cloneItem(ITEMS.basicResourceBox, 1),
          cloneItem(ITEMS.enhancementStone, 2)
        ])
      );
    }

    return { berries, gems, rewards };
  }

  if (dailyTier === 2) {
    berries = 8500;
    gems = 40;

    rewards.push(
      randomPick([
        cloneItem(ITEMS.basicResourceBox, 1),
        cloneItem(ITEMS.treasureMaterialPack, 3),
        cloneItem(ITEMS.pullResetTicket, 1)
      ])
    );

    return { berries, gems, rewards };
  }

  if (dailyTier === 3) {
    berries = 11000;
    gems = 55;

    rewards.push(
      randomPick([
        cloneItem(ITEMS.rareResourceBox, 1),
        cloneItem(ITEMS.treasureMaterialPack, 5),
        cloneItem(ITEMS.pullResetTicket, 1)
      ])
    );

    if (Math.random() < 0.4) {
      rewards.push(cloneItem(ITEMS.basicResourceBox, 1));
    }

    return { berries, gems, rewards };
  }

  berries = 14000;
  gems = 75;

  rewards.push(
    randomPick([
      cloneItem(ITEMS.rareResourceBox, 1),
      cloneItem(ITEMS.treasureMaterialPack, 6),
      cloneItem(ITEMS.pullResetTicket, 2)
    ])
  );

  rewards.push(
    randomPick([
      cloneItem(ITEMS.basicResourceBox, 1),
      cloneItem(ITEMS.enhancementStone, 4)
    ])
  );

  return { berries, gems, rewards };
}

function applyRewardToInventory(player, reward) {
  if (reward.type === "Box") {
    return { boxes: addOrIncrease(player.boxes, reward) };
  }

  if (reward.type === "Ticket") {
    return { tickets: addOrIncrease(player.tickets, reward) };
  }

  return { materials: addOrIncrease(player.materials, reward) };
}

module.exports = {
  name: "daily",
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const boosts = getPassiveBoostSummary(player);
    const dailyTier = Number(boosts.daily || 0);

    const cooldowns = player.cooldowns || {};
    const now = Date.now();
    const nextDailyAt = Number(cooldowns.daily || 0);

    if (nextDailyAt > now) {
      return message.reply(`You already claimed your daily reward. Next daily: ${formatRemaining(nextDailyAt - now)}`);
    }

    const rewardBundle = getDailyTierRewards(dailyTier);

    let updatedBoxes = [...(player.boxes || [])];
    let updatedTickets = [...(player.tickets || [])];
    let updatedMaterials = [...(player.materials || [])];

    for (const reward of rewardBundle.rewards) {
      const result = applyRewardToInventory(
        {
          boxes: updatedBoxes,
          tickets: updatedTickets,
          materials: updatedMaterials
        },
        reward
      );

      if (result.boxes) updatedBoxes = result.boxes;
      if (result.tickets) updatedTickets = result.tickets;
      if (result.materials) updatedMaterials = result.materials;
    }

    const updatedDailyState = incrementQuestCounter(player, "dailyClaims", 1);

    updatePlayer(message.author.id, {
      berries: Number(player.berries || 0) + rewardBundle.berries,
      gems: Number(player.gems || 0) + rewardBundle.gems,
      boxes: updatedBoxes,
      tickets: updatedTickets,
      materials: updatedMaterials,
      dailyLastClaim: now,
      quests: {
        ...(player.quests || {}),
        dailyState: updatedDailyState
      },
      cooldowns: {
        ...cooldowns,
        daily: now + DAILY_COOLDOWN_MS
      }
    });

    const extraLines = rewardBundle.rewards.length
      ? rewardBundle.rewards.map((reward) => `↪ ${reward.name} x${reward.amount}`)
      : ["↪ No extra reward this time"];

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("🎁 Daily Reward Claimed")
      .setDescription(
        [
          `↪ Daily Tier: ${dailyTier}`,
          `↪ Berries: +${Number(rewardBundle.berries).toLocaleString("en-US")}`,
          `↪ Gems: +${Number(rewardBundle.gems).toLocaleString("en-US")}`,
          "",
          "**Extra Rewards**",
          ...extraLines,
          "",
          `↪ Next Daily: ${formatRemaining(DAILY_COOLDOWN_MS)}`
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Daily Reward" });

    return message.reply({ embeds: [embed] });
  }
};