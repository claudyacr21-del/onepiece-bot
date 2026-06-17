const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { incrementQuestCounter } = require("../utils/questProgress");
const { ITEMS, cloneItem } = require("../data/items");

const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function addOrIncrease(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = String(item?.code || "").trim().toLowerCase();
  const name = String(item?.name || "").trim();

  if (!code && !name) return arr;

  const index = arr.findIndex((entry) => {
    const entryCode = String(entry?.code || "").trim().toLowerCase();

    if (code && entryCode) return entryCode === code;

    return normalizeDailyText(entry?.name) === normalizeDailyText(name);
  });

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      ...item,
      code: item.code || arr[index].code,
      name: item.name || arr[index].name,
      amount: Number(arr[index].amount || 0) + Number(item.amount || 1),
    };
    return arr;
  }

  arr.push({
    ...item,
    code: item.code || code,
    name: item.name || name,
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

function normalizeDailyText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function getDailyFruitTexts(value) {
  if (!value) return [];

  if (typeof value === "string") {
    return [normalizeDailyText(value)];
  }

  if (typeof value === "object") {
    return [
      value.code,
      value.name,
      value.displayName,
      value.title,
      value.fruitCode,
      value.fruitName,
      value.devilFruitCode,
      value.devilFruitName,
    ].map(normalizeDailyText);
  }

  return [normalizeDailyText(value)];
}

function isBaccaratFruitText(value) {
  const text = normalizeDailyText(value);

  return (
    text === "raki raki no mi" ||
    text === "baccarat" ||
    text === "baccarat fruit" ||
    text === "raki raki" ||
    text === "raki raki fruit" ||
    text.includes("raki raki") ||
    text.includes("baccarat")
  );
}

function getEquippedDailyFruitTexts(card) {
  const equippedFruitValues = [
    card?.equippedDevilFruit,
    card?.equippedDevilFruitCode,
    card?.equippedDevilFruitName,
    card?.equippedFruit,
    card?.equippedFruitCode,
    card?.equippedFruitName,

    card?.equipment?.devilFruit,
    card?.equipment?.devilFruitCode,
    card?.equipment?.devilFruitName,
    card?.equipment?.fruit,
    card?.equipment?.fruitCode,
    card?.equipment?.fruitName,

    card?.equipped?.devilFruit,
    card?.equipped?.devilFruitCode,
    card?.equipped?.devilFruitName,
    card?.equipped?.fruit,
    card?.equipped?.fruitCode,
    card?.equipped?.fruitName,

    card?.loadout?.devilFruit,
    card?.loadout?.devilFruitCode,
    card?.loadout?.devilFruitName,
    card?.loadout?.fruit,
    card?.loadout?.fruitCode,
    card?.loadout?.fruitName,
  ];

  return equippedFruitValues.flatMap((value) => getDailyFruitTexts(value));
}

function hasBaccaratDailyDevilFruit(player) {
  const cards = Array.isArray(player?.cards) ? player.cards : [];

  return cards.some((card) => {
    const fruitTexts = getEquippedDailyFruitTexts(card);
    return fruitTexts.some(isBaccaratFruitText);
  });
}

function applyBaccaratDailyBonus(player) {
  return hasBaccaratDailyDevilFruit(player);
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

function getCatalogItemByCode(code, fallback = {}) {
  const target = String(code || "").toLowerCase().trim();

  const found =
    Object.values(ITEMS || {}).find(
      (item) => String(item?.code || "").toLowerCase().trim() === target
    ) || null;

  return found || fallback || null;
}

function getDailyPullResetTicket() {
  return getCatalogItemByCode("pull_reset_ticket", {
    code: "pull_reset_ticket",
    name: "Pull Reset Ticket",
    type: "Ticket",
    rarity: "A",
  });
}

function makePullResetTicketReward(amount = 1) {
  return {
    code: "pull_reset_ticket",
    name: "Pull Reset Ticket",
    type: "Ticket",
    rarity: "A",
    amount: Math.max(1, Math.floor(Number(amount || 1))),
  };
}

function addPullResetTicketToTickets(tickets, amount = 1) {
  return addOrIncrease(tickets, makePullResetTicketReward(amount));
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
  const code = String(reward?.code || "").toLowerCase().trim();

  const catalogItem =
    Object.values(ITEMS || {}).find(
      (item) => String(item?.code || "").toLowerCase().trim() === code
    ) || null;

  return String(reward?.type || catalogItem?.type || "").toLowerCase().trim();
}

function isDailyTicketReward(reward) {
  const code = String(reward?.code || "").toLowerCase().trim();
  const type = getRewardType(reward);

  return (
    type === "ticket" ||
    code === "pull_reset_ticket" ||
    code === "raid_ticket" ||
    code === "gold_raid_ticket" ||
    code.endsWith("_ticket")
  );
}

function isDailyBoxReward(reward) {
  const code = String(reward?.code || "").toLowerCase().trim();
  const type = getRewardType(reward);

  return type === "box" || code.endsWith("_box");
}

function isDailyUniversalReward(reward) {
  const code = String(reward?.code || "").toLowerCase().trim();
  const name = String(reward?.name || "").toLowerCase().trim();
  const category = String(reward?.category || "").toLowerCase().trim();

  return (
    category === "universal" ||
    code.startsWith("universal_") ||
    code.includes("universal") ||
    name.includes("universal")
  );
}

function isDailyConsumableReward(reward) {
  const code = String(reward?.code || "").toLowerCase().trim();
  const type = getRewardType(reward);

  return (
    type === "consumable" ||
    type === "item" ||
    code === "rum_beer" ||
    code === "universal_random" ||
    isDailyUniversalReward(reward)
  );
}

function normalizeDailyTicketReward(reward) {
  const code = String(reward?.code || "").toLowerCase().trim();

  if (code === "pull_reset_ticket") {
    return {
      ...reward,
      code: "pull_reset_ticket",
      name: "Pull Reset Ticket",
      type: "Ticket",
    };
  }

  if (code === "raid_ticket") {
    return {
      ...reward,
      code: "raid_ticket",
      name: "Raid Ticket",
      type: "Ticket",
    };
  }

  if (code === "gold_raid_ticket") {
    return {
      ...reward,
      code: "gold_raid_ticket",
      name: "Gold Raid Ticket",
      type: "Ticket",
    };
  }

  return {
    ...reward,
    type: "Ticket",
  };
}

function normalizeDailyItemReward(reward) {
  return {
    ...reward,
    type: reward.type || "Consumable",
    category: reward.category || (isDailyUniversalReward(reward) ? "universal" : reward.category),
  };
}

function applyRewardToInventory(player, reward) {
  if (!reward || !reward.code || !reward.name) return {};

  if (isDailyTicketReward(reward)) {
    return {
      tickets: addOrIncrease(player.tickets, normalizeDailyTicketReward(reward)),
    };
  }

  if (isDailyBoxReward(reward)) {
    return {
      boxes: addOrIncrease(player.boxes, {
        ...reward,
        type: "Box",
      }),
    };
  }

  if (isDailyConsumableReward(reward)) {
    return {
      items: addOrIncrease(player.items, normalizeDailyItemReward(reward)),
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

    let baccaratBonusApplied = false;
    let appliedRewards = [];
    let updatedSnapshot = null;

    updatePlayerAtomic(
      message.author.id,
      (fresh) => {
        const rewardsToApply = [...rewardBundle.rewards];

        baccaratBonusApplied = applyBaccaratDailyBonus(fresh);

        console.log(
          `[DAILY BACCARAT] user=${message.author.id} equipped=${baccaratBonusApplied}`
        );

        let updatedBoxes = [...(fresh.boxes || [])];
        let updatedTickets = [...(fresh.tickets || [])];
        let updatedMaterials = [...(fresh.materials || [])];
        let updatedItems = [...(fresh.items || [])];

        for (const reward of rewardsToApply) {
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

        if (baccaratBonusApplied) {
          const pullResetTicket = makePullResetTicketReward(1);

          updatedTickets = addPullResetTicketToTickets(updatedTickets, 1);
          rewardsToApply.push(pullResetTicket);

          console.log(
            `[DAILY BACCARAT] Added Pull Reset Ticket to tickets for ${message.author.id}.`
          );
        }

        appliedRewards = rewardsToApply;

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

    const displayRewards = appliedRewards.length ? appliedRewards : rewardBundle.rewards;

    const extraLines = displayRewards.length
      ? displayRewards.map((reward) => `↪ ${reward.name} x${reward.amount}`)
      : ["↪ No extra reward this time"];

    if (baccaratBonusApplied) {
      extraLines.push("↪ Baccarat / Raki Raki Bonus Applied");
    }

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