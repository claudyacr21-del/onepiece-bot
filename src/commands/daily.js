const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
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
      amount: Number(arr[index].amount || 1) + Number(item.amount || 1),
    };

    return arr;
  }

  arr.push({
    ...item,
    amount: Number(item.amount || 1),
  });

  return arr;
}

function randomPick(items) {
  const validItems = (Array.isArray(items) ? items : []).filter(
    (item) => item && item.name && item.code
  );

  if (!validItems.length) return null;

  return validItems[Math.floor(Math.random() * validItems.length)];
}

function addReward(rewards, reward) {
  if (!reward || !reward.name || !reward.code) return;
  rewards.push(reward);
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

function getGlobalDailyReadyAt(player) {
  const cooldownReadyAt = Number(player?.cooldowns?.daily || 0);
  const lastClaimAt = Number(player?.dailyLastClaim || 0);
  const legacyReadyAt = lastClaimAt > 0 ? lastClaimAt + DAILY_COOLDOWN_MS : 0;

  return Math.max(cooldownReadyAt, legacyReadyAt);
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
      addReward(
        rewards,
        randomPick([
          cloneItem(ITEMS.rareResourceBox, 1),
          cloneItem(ITEMS.eliteResourceBox, 1),
          cloneItem(ITEMS.pullResetTicket, 1),
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
        cloneItem(ITEMS.woodenMaterialBox, 1),
        cloneItem(ITEMS.pullResetTicket, 1),
      ])
    );

    return { berries, gems, rewards };
  }

  if (dailyTier === 3) {
    berries = 11000;
    gems = 55;

    rewards.push(
      randomPick([
        cloneItem(ITEMS.eliteResourceBox, 1),
        cloneItem(ITEMS.rareResourceBox, 1),
        cloneItem(ITEMS.pullResetTicket, 1),
      ])
    );

    if (Math.random() < 0.4) {
      addReward(rewards, cloneItem(ITEMS.basicResourceBox, 1));
    }

    return { berries, gems, rewards };
  }

  berries = 14000;
  gems = 75;

  addReward(
    rewards,
    randomPick([
      cloneItem(ITEMS.legendResourceBox, 1),
      cloneItem(ITEMS.eliteResourceBox, 1),
      cloneItem(ITEMS.pullResetTicket, 1),
    ])
  );

  addReward(
    rewards,
    randomPick([
      cloneItem(ITEMS.rareResourceBox, 1),
      cloneItem(ITEMS.rumBeer, 4),
      cloneItem(ITEMS.enhancementStone, 4),
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

  if (reward.type === "Consumable" || reward.type === "Item") {
    return { items: addOrIncrease(player.items, reward) };
  }

  return { materials: addOrIncrease(player.materials, reward) };
}

module.exports = {
  name: "daily",

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const boosts = getPassiveBoostSummary(player);
    const dailyTier = Number(boosts.daily || 0);
    const now = Date.now();
    const nextDailyAt = getGlobalDailyReadyAt(player);

    if (nextDailyAt > now) {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const freshNextDailyAt = getGlobalDailyReadyAt(fresh);

          return {
            ...fresh,
            cooldowns: {
              ...(fresh.cooldowns || {}),
              daily: freshNextDailyAt,
            },
          };
        },
        message.author.username
      );

      return message.reply(
        `You already claimed your daily reward.\nNext daily: ${formatRemaining(
          nextDailyAt - now
        )}`
      );
    }

    const rewardBundle = getDailyTierRewards(dailyTier);
    const nextReadyAt = now + DAILY_COOLDOWN_MS;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const freshNextDailyAt = getGlobalDailyReadyAt(fresh);

          if (freshNextDailyAt > now) {
            throw new Error(
              `You already claimed your daily reward.\nNext daily: ${formatRemaining(
                freshNextDailyAt - now
              )}`
            );
          }

          let updatedBoxes = [...(fresh.boxes || [])];
          let updatedTickets = [...(fresh.tickets || [])];
          let updatedMaterials = [...(fresh.materials || [])];
          let updatedItems = [...(fresh.items || [])];

          for (const reward of rewardBundle.rewards) {
            const result = applyRewardToInventory(
              {
                boxes: updatedBoxes,
                tickets: updatedTickets,
                materials: updatedMaterials,
                items: updatedItems,
              },
              reward
            );

            if (result.boxes) updatedBoxes = result.boxes;
            if (result.tickets) updatedTickets = result.tickets;
            if (result.materials) updatedMaterials = result.materials;
            if (result.items) updatedItems = result.items;
          }

          const updatedDailyState = incrementQuestCounter(fresh, "dailyClaims", 1);

          return {
            ...fresh,
            berries: Number(fresh.berries || 0) + rewardBundle.berries,
            gems: Number(fresh.gems || 0) + rewardBundle.gems,
            boxes: updatedBoxes,
            tickets: updatedTickets,
            materials: updatedMaterials,
            items: updatedItems,
            dailyLastClaim: now,
            quests: {
              ...(fresh.quests || {}),
              dailyState: updatedDailyState,
            },
            cooldowns: {
              ...(fresh.cooldowns || {}),
              daily: nextReadyAt,
            },
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply(error.message || "Failed to claim daily reward.");
    }

    const extraLines = rewardBundle.rewards.length
      ? rewardBundle.rewards.map((reward) => `↪ ${reward.name} x${reward.amount}`)
      : ["↪ No extra reward this time"];

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(" Daily Reward Claimed")
      .setDescription(
        [
          `↪ Daily Tier: ${dailyTier}`,
          `↪ Berries: +${Number(rewardBundle.berries).toLocaleString("en-US")}`,
          `↪ Gems: +${Number(rewardBundle.gems).toLocaleString("en-US")}`,
          "",
          "**Extra Rewards**",
          ...extraLines,
          "",
          `↪ Next Daily: ${formatRemaining(DAILY_COOLDOWN_MS)}`,
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Daily Reward",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};