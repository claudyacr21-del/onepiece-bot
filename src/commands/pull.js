const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { incrementQuestCounter } = require("../utils/questProgress");
const { PREMIUM_ROLE_NAME } = require("../utils/pullAccess");
const { applyGlobalPullReset } = require("../utils/pullReset");
const { addFragment, getDuplicateFragmentAmount, hasOwnedCardByCode } = require("../utils/fragmentUtils");
const { getNextAvailablePullKey, consumePullSlot } = require("../utils/pullSlots");
const cards = require("../data/cards");
const weapons = require("../data/weapons");
const devilFruits = require("../data/devilFruits");

const CONTENT_RATES = {
  battleCard: 60,
  boostCard: 10,
  weapon: 15,
  devilFruit: 15
};

const NORMAL_PITY_TARGET = 150;
const PREMIUM_PITY_TARGET = 80;

function hasRole(message, roleName) {
  if (!message.member?.roles?.cache || !roleName) return false;
  return message.member.roles.cache.some((role) => role.name === roleName);
}

function getPlaceholderImage(name = "Reward") {
  const text = encodeURIComponent(name);
  return `https://dummyimage.com/512x768/1e1e1e/ffffff.png&text=${text}`;
}

function getRarityBadgeUrl(rarity) {
  const badges = {
    C: "https://cdn.discordapp.com/attachments/1493204525975076944/1493206778739949679/C.png?ex=69de20ae&is=69dccf2e&hm=ea4a3ad6d0431f20b5469fa07b1a908b7fea87bc634ad88207ec5c857376f5ab&",
    B: "https://cdn.discordapp.com/attachments/1493204525975076944/1493206778454872094/B.png?ex=69de20ae&is=69dccf2e&hm=01cafdb339ff901f49435b2f1eb4c82f010ad999010c5f137fc8b44f8768d4ac&",
    A: "https://cdn.discordapp.com/attachments/1493204525975076944/1493206778169528430/A.png?ex=69de20ae&is=69dccf2e&hm=e797f93352047664c42ba344c1952acc7e081025084fc63b0c1449465b61d400&",
    S: "https://cdn.discordapp.com/attachments/1493204525975076944/1493206777830047834/S.png?ex=69de20ae&is=69dccf2e&hm=1a8a3689e8c5c859ce7f0c861dd1a69f4e3a61c6d045821aaa0097960067add2&",
    UR: "https://cdn.discordapp.com/attachments/1493204525975076944/1493206779050332371/UR.png?ex=69dec96e&is=69dd77ee&hm=5741989996bead05060a9c97c5d424d81e148932d3f89b23aae0ee1f7a947053&"
  };

  return badges[rarity] || badges.C;
}

function getNormalRarity(pullChanceBoost = 0) {
  const roll = Math.random() * 100;
  const sRate = 8 + pullChanceBoost;
  const urRate = 3 + Math.floor(pullChanceBoost / 2);
  const cCut = 45 - pullChanceBoost;
  const bCut = cCut + 28;
  const aCut = bCut + (100 - (45 - pullChanceBoost) - 28 - sRate - urRate);

  if (roll < cCut) return "C";
  if (roll < bCut) return "B";
  if (roll < aCut) return "A";
  if (roll < aCut + sRate) return "S";
  return "UR";
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

function getPityData(player, premiumActive) {
  return premiumActive
    ? { current: Number(player?.pity?.premiumSPity || 0), target: PREMIUM_PITY_TARGET, key: "premiumSPity" }
    : { current: Number(player?.pity?.normalSPity || 0), target: NORMAL_PITY_TARGET, key: "normalSPity" };
}

function createRewardEmbed(result) {
  const {
    reward,
    contentType,
    premiumActive,
    triggeredPity,
    pityCountAfter,
    pityTarget,
    username,
    duplicateFragmentAmount,
    wasDuplicate
  } = result;

  const displayName = reward.displayName || reward.name || "Unknown Reward";
  const categoryName =
    contentType === "devilFruit"
      ? "Devil Fruit"
      : contentType === "weapon"
        ? "Weapon"
        : reward.cardRole === "boost"
          ? "Boost Card"
          : "Battle Card";

  const description = [
    `**Reward:** ${displayName}`,
    reward.title ? `**Title:** \`${reward.title}\`` : null,
    `**Rarity:** \`${reward.rarity || "C"}\``,
    reward.arc ? `**Arc:** \`${reward.arc}\`` : null,
    reward.type ? `**Type:** \`${reward.type}\`` : null,
    reward.faction ? `**Faction:** \`${reward.faction}\`` : null,
    contentType !== "weapon" && contentType !== "devilFruit" && reward.cardRole !== "boost"
      ? `**Stats:** \`ATK ${reward.atk || 0}\` • \`HP ${reward.hp || 0}\` • \`SPD ${reward.speed || 0}\``
      : null,
    reward.cardRole === "boost"
      ? `**Passive Boost:** \`${reward.boostType}\` • \`${reward.boostValue}\`${["atk", "hp", "spd", "exp", "dmg"].includes(reward.boostType) ? "%" : ""}`
      : null,
    reward.weapon ? `**Weapon:** \`${reward.weapon}\`` : null,
    reward.devilFruit ? `**Devil Fruit:** \`${reward.devilFruit}\`` : null,
    wasDuplicate ? `**Duplicate:** Converted into \`${duplicateFragmentAmount}\` fragment(s)` : null,
    triggeredPity ? "🌟 **S Pity Activated**" : null
  ].filter(Boolean).join("\n");

  return new EmbedBuilder()
    .setColor(premiumActive ? 0xf39c12 : 0xc0392b)
    .setTitle(`${categoryName} Pulled`)
    .setDescription(description)
    .setThumbnail(getRarityBadgeUrl(reward.rarity || "C"))
    .setImage(reward.image || getPlaceholderImage(displayName))
    .setFooter({
      text:
        `This reward was pulled by ${username}\n` +
        `S Pity: ${pityCountAfter}/${pityTarget} | ${premiumActive ? PREMIUM_ROLE_NAME : "Normal Banner"}`
    });
}

module.exports = {
  name: "pull",
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const resetState = applyGlobalPullReset(player);

    if (resetState.wasReset) {
      updatePlayer(message.author.id, { pulls: resetState.pulls });
      player.pulls = resetState.pulls;
    }

    const premiumActive = hasRole(message, PREMIUM_ROLE_NAME);
    const passiveBoosts = getPassiveBoostSummary(player);
    const availablePullKey = getNextAvailablePullKey(player, message);

    if (!availablePullKey) {
      return message.reply("You do not have any available pulls right now.");
    }

    const pityData = getPityData(player, premiumActive);
    const nextPityCount = pityData.current + 1;
    const triggeredPity = nextPityCount >= pityData.target;

    const contentType = getContentType();
    const pool = getRewardPool(contentType);

    let rarity = triggeredPity
      ? getGuaranteedSRarity()
      : premiumActive
        ? getPremiumRarity(passiveBoosts.pullChance)
        : getNormalRarity(passiveBoosts.pullChance);

    let reward = pickRandomByRarity(pool, rarity);
    if (!reward) reward = pool[Math.floor(Math.random() * pool.length)];

    const rewardResult = getRewardResult(contentType, reward);

    let updatedCards = [...(player.cards || [])];
    let updatedWeapons = [...(player.weapons || [])];
    let updatedDevilFruits = [...(player.devilFruits || [])];
    let updatedFragments = [...(player.fragments || [])];

    let wasDuplicate = false;
    let duplicateFragmentAmount = 0;

    if (rewardResult.storageKey === "cards") {
      const alreadyOwned = hasOwnedCardByCode(updatedCards, rewardResult.storedReward.code);

      if (alreadyOwned) {
        wasDuplicate = true;
        duplicateFragmentAmount = getDuplicateFragmentAmount(rewardResult.storedReward);
        updatedFragments = addFragment(updatedFragments, rewardResult.storedReward, duplicateFragmentAmount);
      } else {
        updatedCards.push(rewardResult.storedReward);
      }
    } else if (rewardResult.storageKey === "weapons") {
      updatedWeapons = addNamedItem(updatedWeapons, rewardResult.storedReward);
    } else {
      updatedDevilFruits = addNamedItem(updatedDevilFruits, rewardResult.storedReward);
    }

    const updatedPulls = consumePullSlot(player, availablePullKey);
    const updatedDailyState = incrementQuestCounter(player, "pullsUsed", 1);

    const updatedPity = {
      ...(player.pity || { normalSPity: 0, premiumSPity: 0 })
    };
    updatedPity[pityData.key] = triggeredPity ? 0 : nextPityCount;

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

    const embed = createRewardEmbed({
      reward: rewardResult.storedReward,
      contentType,
      premiumActive,
      triggeredPity,
      pityCountAfter: updatedPity[pityData.key],
      pityTarget: pityData.target,
      username: player.username,
      wasDuplicate,
      duplicateFragmentAmount
    });

    return message.reply({ embeds: [embed] });
  }
};