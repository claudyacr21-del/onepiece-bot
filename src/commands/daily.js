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

  const index = rewards.findIndex((entry) => entry.code === reward.code);

  if (index !== -1) {
    rewards[index] = {
      ...rewards[index],
      amount: Number(rewards[index].amount || 1) + Number(reward.amount || 1),
    };
    return;
  }

  rewards.push({
    ...reward,
    amount: Number(reward.amount || 1),
  });
}

function makeReward(item, amount = 1) {
  if (!item) return null;
  return cloneItem(item, amount);
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

function getShipMaterialPool(amount) {
  return [
    makeReward(ITEMS.hardwood, amount),
    makeReward(ITEMS.sailCloth, amount),
  ];
}

function getDailyTierRewards(dailyTier) {
  const tier = Math.max(0, Math.floor(Number(dailyTier || 0)));
  const milestone = Math.floor(tier / 5);
  const highMilestone = Math.floor(tier / 10);

  const berries = 5000 + tier * 3000 + milestone * 5000;
  const gems = 20 + tier * 10 + milestone * 10;
  const rewards = [];

  if (tier <= 0) {
    return {
      berries,
      gems,
      rewards,
    };
  }

  const boxAmount = 1 + Math.floor(tier / 10);
  const materialAmount = 2 + tier;
  const shipMaterialAmount = Math.max(1, Math.floor(1 + tier / 3));
  const rumAmount = 2 + Math.floor(tier / 2);
  const ticketAmount = 1 + Math.floor(tier / 15);

  if (tier === 1) {
    if (Math.random() < 0.35) {
      addReward(
        rewards,
        randomPick([
          makeReward(ITEMS.basicResourceBox, 1),
          makeReward(ITEMS.woodenMaterialBox, 1),
          makeReward(ITEMS.rumBeer, 2),
          ...getShipMaterialPool(1),
        ])
      );
    }

    return {
      berries,
      gems,
      rewards,
    };
  }

  if (tier === 2) {
    addReward(
      rewards,
      randomPick([
        makeReward(ITEMS.basicResourceBox, 1),
        makeReward(ITEMS.woodenMaterialBox, 1),
        makeReward(ITEMS.rareResourceBox, 1),
        makeReward(ITEMS.rumBeer, rumAmount),
        ...getShipMaterialPool(shipMaterialAmount),
      ])
    );

    return {
      berries,
      gems,
      rewards,
    };
  }

  if (tier === 3) {
    addReward(
      rewards,
      randomPick([
        makeReward(ITEMS.rareResourceBox, 1),
        makeReward(ITEMS.eliteResourceBox, 1),
        makeReward(ITEMS.pullResetTicket, 1),
        makeReward(ITEMS.enhancementStone, materialAmount),
        ...getShipMaterialPool(shipMaterialAmount),
      ])
    );

    if (Math.random() < 0.45) {
      addReward(
        rewards,
        randomPick([
          makeReward(ITEMS.basicResourceBox, 1),
          makeReward(ITEMS.woodenMaterialBox, 1),
          makeReward(ITEMS.rumBeer, rumAmount),
          ...getShipMaterialPool(shipMaterialAmount),
        ])
      );
    }

    return {
      berries,
      gems,
      rewards,
    };
  }

  addReward(
    rewards,
    randomPick([
      makeReward(ITEMS.eliteResourceBox, boxAmount),
      makeReward(ITEMS.rareResourceBox, boxAmount),
      makeReward(ITEMS.pullResetTicket, ticketAmount),
      makeReward(ITEMS.enhancementStone, materialAmount),
      ...getShipMaterialPool(shipMaterialAmount),
    ])
  );

  addReward(
    rewards,
    randomPick([
      makeReward(ITEMS.rareResourceBox, boxAmount),
      makeReward(ITEMS.rumBeer, rumAmount),
      makeReward(ITEMS.enhancementStone, materialAmount),
      makeReward(ITEMS.basicResourceBox, boxAmount),
      ...getShipMaterialPool(shipMaterialAmount),
    ])
  );

  if (tier >= 5) {
    addReward(
      rewards,
      randomPick([
        makeReward(ITEMS.legendResourceBox, 1),
        makeReward(ITEMS.eliteResourceBox, boxAmount),
        makeReward(ITEMS.pullResetTicket, ticketAmount),
        ...getShipMaterialPool(shipMaterialAmount + milestone),
      ])
    );
  }

  if (tier >= 10) {
    addReward(
      rewards,
      randomPick([
        makeReward(ITEMS.legendResourceBox, 1 + highMilestone),
        makeReward(ITEMS.pullResetTicket, ticketAmount + highMilestone),
        makeReward(ITEMS.enhancementStone, materialAmount + tier),
        ...getShipMaterialPool(shipMaterialAmount + highMilestone),
      ])
    );
  }

  if (tier >= 15) {
    addReward(
      rewards,
      randomPick([
        makeReward(ITEMS.legendResourceBox, 1 + highMilestone),
        makeReward(ITEMS.eliteResourceBox, boxAmount + highMilestone),
        makeReward(ITEMS.rumBeer, rumAmount + tier),
        ...getShipMaterialPool(shipMaterialAmount + highMilestone),
      ])
    );
  }

  return {
    berries,
    gems,
    rewards,
  };
}

function applyRewardToInventory(player, reward) {
  if (reward.type === "Box") {
    return {
      boxes: addOrIncrease(player.boxes, reward),
    };
  }

  if (reward.type === "Ticket") {
    return {
      tickets: addOrIncrease(player.tickets, reward),
    };
  }

  if (reward.type === "Consumable" || reward.type === "Item") {
    return {
      items: addOrIncrease(player.items, reward),
    };
  }

  return {
    materials: addOrIncrease(player.materials, reward),
  };
}

module.exports = {
  name: "daily",

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const boosts = getPassiveBoostSummary(player);
    const dailyTier = Number(boosts.daily || 0);
    const cooldowns = player.cooldowns || {};
    const now = Date.now();
    const nextDailyAt = getGlobalDailyReadyAt(player);

    if (nextDailyAt > now) {
      if (Number(cooldowns.daily || 0) !== nextDailyAt) {
        updatePlayer(message.author.id, {
          cooldowns: {
            ...cooldowns,
            daily: nextDailyAt,
          },
        });
      }

      return message.reply(
        `You already claimed your daily reward.\nNext daily: ${formatRemaining(
          nextDailyAt - now
        )}`
      );
    }

    const rewardBundle = getDailyTierRewards(dailyTier);

    let updatedBoxes = [...(player.boxes || [])];
    let updatedTickets = [...(player.tickets || [])];
    let updatedMaterials = [...(player.materials || [])];
    let updatedItems = [...(player.items || [])];

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

    const nextReadyAt = now + DAILY_COOLDOWN_MS;
    const updatedDailyState = incrementQuestCounter(player, "dailyClaims", 1);

    updatePlayer(message.author.id, {
      berries: Number(player.berries || 0) + rewardBundle.berries,
      gems: Number(player.gems || 0) + rewardBundle.gems,
      boxes: updatedBoxes,
      tickets: updatedTickets,
      materials: updatedMaterials,
      items: updatedItems,
      dailyLastClaim: now,
      quests: {
        ...(player.quests || {}),
        dailyState: updatedDailyState,
      },
      cooldowns: {
        ...cooldowns,
        daily: nextReadyAt,
      },
    });

    const extraLines = rewardBundle.rewards.length
      ? rewardBundle.rewards.map(
          (reward) => `↪ ${reward.name} x${reward.amount}`
        )
      : ["↪ No extra reward this time"];

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("Daily Reward Claimed")
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