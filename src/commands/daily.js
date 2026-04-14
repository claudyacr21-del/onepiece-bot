const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");

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
    name: item.name,
    amount: Number(item.amount || 1),
    rarity: item.rarity || "C",
    code: item.code,
    image: item.image || "",
    type: item.type || "Item",
    description: item.description || ""
  });

  return arr;
}

function randomPick(items) {
  return items[Math.floor(Math.random() * items.length)];
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
      rewards.push(randomPick([
        {
          name: "Basic Resource Box",
          amount: 1,
          rarity: "C",
          code: "basic_resource_box",
          type: "Box",
          description: "A small box containing basic resources."
        },
        {
          name: "Enhancement Stone",
          amount: 2,
          rarity: "C",
          code: "enhancement_stone",
          type: "Material",
          description: "A stone used to strengthen growth systems."
        }
      ]));
    }

    return { berries, gems, rewards };
  }

  if (dailyTier === 2) {
    berries = 8500;
    gems = 40;

    rewards.push(randomPick([
      {
        name: "Basic Resource Box",
        amount: 1,
        rarity: "C",
        code: "basic_resource_box",
        type: "Box",
        description: "A small box containing basic resources."
      },
      {
        name: "Treasure Material Pack",
        amount: 3,
        rarity: "B",
        code: "treasure_material_pack",
        type: "Material",
        description: "A set of useful treasure materials."
      },
      {
        name: "Pull Reset Ticket",
        amount: 1,
        rarity: "A",
        code: "pull_reset_ticket",
        type: "Ticket",
        description: "Resets your pull usage manually."
      }
    ]));

    return { berries, gems, rewards };
  }

  if (dailyTier === 3) {
    berries = 11000;
    gems = 55;

    rewards.push(
      randomPick([
        {
          name: "Rare Resource Box",
          amount: 1,
          rarity: "B",
          code: "rare_resource_box",
          type: "Box",
          description: "A better box with improved rewards."
        },
        {
          name: "Treasure Material Pack",
          amount: 5,
          rarity: "B",
          code: "treasure_material_pack",
          type: "Material",
          description: "A set of useful treasure materials."
        },
        {
          name: "Pull Reset Ticket",
          amount: 1,
          rarity: "A",
          code: "pull_reset_ticket",
          type: "Ticket",
          description: "Resets your pull usage manually."
        }
      ])
    );

    if (Math.random() < 0.4) {
      rewards.push({
        name: "Basic Resource Box",
        amount: 1,
        rarity: "C",
        code: "basic_resource_box",
        type: "Box",
        description: "A small box containing basic resources."
      });
    }

    return { berries, gems, rewards };
  }

  berries = 14000;
  gems = 75;

  rewards.push(
    randomPick([
      {
        name: "Rare Resource Box",
        amount: 1,
        rarity: "B",
        code: "rare_resource_box",
        type: "Box",
        description: "A better box with improved rewards."
      },
      {
        name: "Treasure Material Pack",
        amount: 6,
        rarity: "A",
        code: "treasure_material_pack",
        type: "Material",
        description: "A set of premium treasure materials."
      },
      {
        name: "Pull Reset Ticket",
        amount: 2,
        rarity: "A",
        code: "pull_reset_ticket",
        type: "Ticket",
        description: "Resets your pull usage manually."
      }
    ])
  );

  rewards.push(
    randomPick([
      {
        name: "Basic Resource Box",
        amount: 1,
        rarity: "C",
        code: "basic_resource_box",
        type: "Box",
        description: "A small box containing basic resources."
      },
      {
        name: "Enhancement Stone",
        amount: 4,
        rarity: "B",
        code: "enhancement_stone",
        type: "Material",
        description: "A stone used to strengthen growth systems."
      }
    ])
  );

  return { berries, gems, rewards };
}

function applyRewardToInventory(player, reward) {
  if (reward.type === "Box") {
    return {
      boxes: addOrIncrease(player.boxes, reward)
    };
  }

  if (reward.type === "Ticket") {
    return {
      tickets: addOrIncrease(player.tickets, reward)
    };
  }

  return {
    materials: addOrIncrease(player.materials, reward)
  };
}

module.exports = {
  name: "daily",
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (player.dailyLastClaim && now - Number(player.dailyLastClaim) < oneDay) {
      const remaining = oneDay - (now - Number(player.dailyLastClaim));
      const totalSeconds = Math.floor(remaining / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      return message.reply(
        `You already claimed your daily reward. Come back in ${hours}h ${minutes}m.`
      );
    }

    const boosts = getPassiveBoostSummary(player);
    const dailyTier = Number(boosts.daily || 0);

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

    updatePlayer(message.author.id, {
      berries: Number(player.berries || 0) + rewardBundle.berries,
      gems: Number(player.gems || 0) + rewardBundle.gems,
      boxes: updatedBoxes,
      tickets: updatedTickets,
      materials: updatedMaterials,
      dailyLastClaim: now
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
          ...extraLines
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Daily Reward" });

    return message.reply({ embeds: [embed] });
  }
};