const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { incrementQuestCounter } = require("../utils/questProgress");
const { ITEMS, cloneItem } = require("../data/items");

const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function addOrIncrease(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = String(item?.code || "").trim();

  if (!code) return arr;

  const index = arr.findIndex((entry) => String(entry.code || "") === code);

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      ...item,
      amount: Number(arr[index].amount || 0) + Number(item.amount || 1),
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
      ...reward,
      amount: Number(rewards[index].amount || 0) + Number(reward.amount || 1),
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

  const reward = cloneItem(item, amount);

  return {
    ...item,
    ...reward,
    type: item.type || reward.type,
    code: item.code || reward.code,
    name: item.name || reward.name,
    amount: Number(amount || reward.amount || 1),
  };
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
  const ticketAmount = tier >= 26 ? 2 : 1;

  addReward(rewards, makeReward(ITEMS.pullResetTicket, ticketAmount));

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
        ...getShipMaterialPool(shipMaterialAmount + milestone),
      ])
    );
  }

  if (tier >= 10) {
    addReward(
      rewards,
      randomPick([
        makeReward(ITEMS.legendResourceBox, 1 + highMilestone),
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

function getRewardType(reward) {
  const code = String(reward?.code || "");

  const catalogItem = Object.values(ITEMS).find((item) => item.code === code);

  return String(reward?.type || catalogItem?.type || "").toLowerCase();
}

function applyRewardToInventory(player, reward) {
  const rewardType = getRewardType(reward);

  if (rewardType === "box") {
    return {
      boxes: addOrIncrease(player.boxes, {
        ...reward,
        type: "Box",
      }),
    };
  }

  if (rewardType === "ticket") {
    return {
      tickets: addOrIncrease(player.tickets, {
        ...reward,
        type: "Ticket",
      }),
    };
  }

  if (rewardType === "consumable" || rewardType === "item") {
    return {
      items: addOrIncrease(player.items, reward),
    };
  }

  return {
    materials: addOrIncrease(player.materials, {
      ...reward,
      type: reward.type || "Material",
    }),
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
        updatePlayerAtomic(
          message.author.id,
          (fresh) => ({
            ...fresh,
            cooldowns: {
              ...(fresh.cooldowns || {}),
              daily: nextDailyAt,
            },
          }),
          message.author.username
        );
      }

      return message.reply(
        `You already claimed your daily reward.\nNext daily: ${formatRemaining(
          nextDailyAt - now
        )}`
      );
    }

    const rewardBundle = getDailyTierRewards(dailyTier);
    const nextReadyAt = now + DAILY_COOLDOWN_MS;

    let updatedSnapshot = null;

    updatePlayerAtomic(
      message.author.id,
      (fresh) => {
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

        updatedSnapshot = {
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

        return updatedSnapshot;
      },
      message.author.username
    );

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