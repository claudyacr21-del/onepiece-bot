const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { incrementQuestCounter } = require("../utils/questProgress");
const { PREMIUM_ROLE_NAME } = require("../utils/pullAccess");
const { applyGlobalPullReset } = require("../utils/pullReset");
const { addFragment, getDuplicateFragmentAmount, hasOwnedCardByCode } = require("../utils/fragmentUtils");
const { getTotalPullUsage, consumeAllActivePullSlots } = require("../utils/pullSlots");
const cards = require("../data/cards");
const weapons = require("../data/weapons");
const devilFruits = require("../data/devilFruits");

const CONTENT_RATES = {
  battleCard: 60,
  boostCard: 10,
  weapon: 15,
  devilFruit: 15
};

const PREMIUM_PITY_TARGET = 80;

function hasRole(message, roleName) {
  if (!message.member?.roles?.cache || !roleName) return false;
  return message.member.roles.cache.some((role) => role.name === roleName);
}

function getPlaceholderImage(name = "Reward") {
  const text = encodeURIComponent(name);
  return `https://dummyimage.com/512x768/1e1e1e/ffffff.png&text=${text}`;
}

function getPremiumRarity(pullChanceBoost = 0) {
  const roll = Math.random() * 100;
  const sRate = 10 + pullChanceBoost;
  const urRate = 4 + Math.floor(pullChanceBoost / 2);
  const cCut = 42 - pullChanceBoost;
  const bCut = cCut + 27;
  const aCut = bCut + (100 - (42 - pullChanceBoost) - 27 - sRate - urRate);

  if (roll < cCut) return "C";
  if (roll < bCut) return "B";
  if (roll < aCut) return "A";
  if (roll < aCut + sRate) return "S";
  return "UR";
}

function getGuaranteedSRarity() {
  return "S";
}

function getContentType() {
  const roll = Math.random() * 100;
  if (roll < CONTENT_RATES.battleCard) return "battleCard";
  if (roll < CONTENT_RATES.battleCard + CONTENT_RATES.boostCard) return "boostCard";
  if (roll < CONTENT_RATES.battleCard + CONTENT_RATES.boostCard + CONTENT_RATES.weapon) return "weapon";
  return "devilFruit";
}

function getRewardPool(contentType) {
  if (contentType === "battleCard") return cards.filter((c) => c.cardRole !== "boost");
  if (contentType === "boostCard") return cards.filter((c) => c.cardRole === "boost");
  if (contentType === "weapon") return weapons;
  return devilFruits;
}

function pickRandomByRarity(pool, rarity) {
  const filtered = pool.filter((entry) => entry.rarity === rarity);
  if (!filtered.length) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function buildCardReward(baseReward) {
  return {
    instanceId: Date.now().toString() + Math.floor(Math.random() * 10000).toString(),
    ...baseReward,
    level: 1,
    kills: 0,
    fragments: 0,
    image: baseReward.image || getPlaceholderImage(baseReward.displayName || baseReward.name || "Card")
  };
}

function addNamedItem(list, reward) {
  const items = Array.isArray(list) ? [...list] : [];
  const existingIndex = items.findIndex((entry) => entry.code === reward.code);

  if (existingIndex !== -1) {
    items[existingIndex] = {
      ...items[existingIndex],
      amount: Number(items[existingIndex].amount || 1) + 1
    };
    return items;
  }

  items.push({
    name: reward.name,
    amount: 1,
    rarity: reward.rarity,
    code: reward.code,
    image: reward.image || "",
    type: reward.type,
    statBonus: reward.statBonus,
    owners: reward.owners,
    boostBonus: reward.boostBonus,
    description: reward.description
  });

  return items;
}

function getRewardResult(contentType, baseReward) {
  if (contentType === "battleCard" || contentType === "boostCard") {
    return {
      storageKey: "cards",
      storedReward: buildCardReward(baseReward)
    };
  }

  if (contentType === "weapon") {
    return {
      storageKey: "weapons",
      storedReward: baseReward
    };
  }

  return {
    storageKey: "devilFruits",
    storedReward: baseReward
  };
}

function getTypeLabel(contentType) {
  if (contentType === "battleCard") return "Battle Card";
  if (contentType === "boostCard") return "Boost Card";
  if (contentType === "weapon") return "Weapon";
  return "Devil Fruit";
}

module.exports = {
  name: "pa",
  aliases: ["pullall"],
  async execute(message) {
    if (!hasRole(message, PREMIUM_ROLE_NAME)) {
      return message.reply("Only Mother Flame users can use `op pa`.");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const resetState = applyGlobalPullReset(player);

    if (resetState.wasReset) {
      updatePlayer(message.author.id, { pulls: resetState.pulls });
      player.pulls = resetState.pulls;
    }

    const passiveBoosts = getPassiveBoostSummary(player);
    const { totalUsed, totalMax } = getTotalPullUsage(player, message);
    const availableTotal = Math.max(0, totalMax - totalUsed);

    if (availableTotal <= 0) {
      return message.reply("You do not have any available pulls right now.");
    }

    let updatedCards = [...(player.cards || [])];
    let updatedWeapons = [...(player.weapons || [])];
    let updatedDevilFruits = [...(player.devilFruits || [])];
    let updatedFragments = [...(player.fragments || [])];

    let pityCounter = Number(player.pity?.premiumSPity || 0);
    const pullLines = [];

    for (let i = 0; i < availableTotal; i++) {
      pityCounter += 1;
      const triggeredPity = pityCounter >= PREMIUM_PITY_TARGET;

      const contentType = getContentType();
      const pool = getRewardPool(contentType);

      const rarity = triggeredPity
        ? getGuaranteedSRarity()
        : getPremiumRarity(passiveBoosts.pullChance);

      let reward = pickRandomByRarity(pool, rarity);
      if (!reward) reward = pool[Math.floor(Math.random() * pool.length)];

      const rewardResult = getRewardResult(contentType, reward);
      let duplicateNote = "";

      if (rewardResult.storageKey === "cards") {
        const alreadyOwned = hasOwnedCardByCode(updatedCards, rewardResult.storedReward.code);

        if (alreadyOwned) {
          const fragmentAmount = getDuplicateFragmentAmount(rewardResult.storedReward);
          updatedFragments = addFragment(updatedFragments, rewardResult.storedReward, fragmentAmount);
          duplicateNote = ` → Duplicate (+${fragmentAmount} fragments)`;
        } else {
          updatedCards.push(rewardResult.storedReward);
        }
      } else if (rewardResult.storageKey === "weapons") {
        updatedWeapons = addNamedItem(updatedWeapons, rewardResult.storedReward);
      } else {
        updatedDevilFruits = addNamedItem(updatedDevilFruits, rewardResult.storedReward);
      }

      const rewardName = reward.displayName || reward.name || "Unknown";
      const typeLabel = getTypeLabel(contentType);
      const pityLabel = triggeredPity ? " [PITY]" : "";

      pullLines.push(
        `${i + 1}. [${reward.rarity}] ${rewardName} (${typeLabel})${pityLabel}${duplicateNote}`
      );

      if (triggeredPity) pityCounter = 0;
    }

    const updatedPity = {
      ...(player.pity || { normalSPity: 0, premiumSPity: 0 }),
      premiumSPity: pityCounter
    };

    const updatedPulls = consumeAllActivePullSlots(player, message);
    const updatedDailyState = incrementQuestCounter(player, "pullsUsed", availableTotal);

    updatePlayer(message.author.id, {
      cards: updatedCards,
      weapons: updatedWeapons,
      devilFruits: updatedDevilFruits,
      fragments: updatedFragments,
      pulls: updatedPulls,
      pity: updatedPity,
      quests: {
        ...(player.quests || {}),
        dailyState: updatedDailyState
      }
    });

    const chunkSize = 25;
    const chunks = [];
    for (let i = 0; i < pullLines.length; i += chunkSize) {
      chunks.push(pullLines.slice(i, i + chunkSize).join("\n"));
    }

    const embeds = chunks.map((chunk, index) =>
      new EmbedBuilder()
        .setColor(0x8e44ad)
        .setTitle(`📜 Pull Results ${index + 1}/${chunks.length}`)
        .setDescription(chunk)
        .setFooter({
          text: `One Piece Bot • Mother Flame Pull All • S Pity ${updatedPity.premiumSPity}/${PREMIUM_PITY_TARGET}`
        })
    );

    return message.reply({ embeds });
  }
};