const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getPassiveBoostSummary, getBoostCards } = require("../utils/passiveBoosts");
const { hasRole, PREMIUM_ROLE_NAME } = require("../utils/pullAccess");
const { applyGlobalPullReset } = require("../utils/pullReset");
const { addFragment, getDuplicateFragmentAmount, hasOwnedCardByCode } = require("../utils/fragmentUtils");
const cards = require("../data/cards");
const weapons = require("../data/weapons");
const devilFruits = require("../data/devilFruits");

const SUPPORT_SERVER_ROLE = "Nakama";
const BOOSTER_ROLE = "New World";

const CONTENT_RATES = {
  card: 70,
  weapon: 15,
  devilFruit: 15
};

const PREMIUM_PITY_TARGET = 80;

function hasNamedRole(message, roleName) {
  if (!message.member?.roles?.cache) return false;
  return message.member.roles.cache.some((role) => role.name === roleName);
}

function isServerOwner(message) {
  return Boolean(message.guild && message.author.id === message.guild.ownerId);
}

function hasBaccaratCard(player) {
  const ownedCards = Array.isArray(player?.cards) ? player.cards : [];
  return ownedCards.some((card) => card.code === "baccarat_lucky_draw");
}

function hasBaccaratFruitEquipped(player) {
  const boostCards = getBoostCards(player);
  return boostCards.some(
    (card) =>
      card.code === "baccarat_lucky_draw" &&
      String(card.equippedDevilFruit || "") === "unknown_fortune_fruit"
  );
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
  if (roll < CONTENT_RATES.card) return "card";
  if (roll < CONTENT_RATES.card + CONTENT_RATES.weapon) return "weapon";
  return "devilFruit";
}

function pickRandomByRarity(pool, rarity) {
  const filtered = pool.filter((entry) => entry.rarity === rarity);
  if (!filtered.length) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function getRewardPool(contentType) {
  if (contentType === "card") return cards;
  if (contentType === "weapon") return weapons;
  return devilFruits;
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
  if (contentType === "card") {
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

function getAvailablePullCount(player, message) {
  const pulls = player.pulls || {};

  const base = Math.max(0, 6 - Number(pulls.base?.used || 0));
  const support = hasNamedRole(message, SUPPORT_SERVER_ROLE)
    ? Math.max(0, 1 - Number(pulls.supportMember?.used || 0))
    : 0;
  const booster = hasNamedRole(message, BOOSTER_ROLE)
    ? Math.max(0, 1 - Number(pulls.booster?.used || 0))
    : 0;
  const owner = isServerOwner(message)
    ? Math.max(0, 1 - Number(pulls.owner?.used || 0))
    : 0;
  const motherFlame = hasRole(message, PREMIUM_ROLE_NAME)
    ? Math.max(0, 3 - Number(pulls.patreon?.used || 0))
    : 0;
  const baccaratCard = hasBaccaratCard(player)
    ? Math.max(0, 1 - Number(pulls.baccaratCard?.used || 0))
    : 0;
  const baccaratFruit = hasBaccaratFruitEquipped(player)
    ? Math.max(0, 1 - Number(pulls.baccaratFruit?.used || 0))
    : 0;

  return {
    total: base + support + booster + owner + motherFlame + baccaratCard + baccaratFruit
  };
}

function consumeAllPulls(player, message) {
  const pulls = { ...(player.pulls || {}) };

  pulls.base = { ...(pulls.base || { used: 0, max: 6 }), used: 6 };
  pulls.supportMember = { ...(pulls.supportMember || { used: 0, max: 1 }), used: hasNamedRole(message, SUPPORT_SERVER_ROLE) ? 1 : Number(pulls.supportMember?.used || 0) };
  pulls.booster = { ...(pulls.booster || { used: 0, max: 1 }), used: hasNamedRole(message, BOOSTER_ROLE) ? 1 : Number(pulls.booster?.used || 0) };
  pulls.owner = { ...(pulls.owner || { used: 0, max: 1 }), used: isServerOwner(message) ? 1 : Number(pulls.owner?.used || 0) };
  pulls.patreon = { ...(pulls.patreon || { used: 0, max: 3 }), used: hasRole(message, PREMIUM_ROLE_NAME) ? 3 : Number(pulls.patreon?.used || 0) };
  pulls.baccaratCard = { ...(pulls.baccaratCard || { used: 0, max: 1 }), used: hasBaccaratCard(player) ? 1 : Number(pulls.baccaratCard?.used || 0) };
  pulls.baccaratFruit = { ...(pulls.baccaratFruit || { used: 0, max: 1 }), used: hasBaccaratFruitEquipped(player) ? 1 : Number(pulls.baccaratFruit?.used || 0) };

  return pulls;
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
    const available = getAvailablePullCount(player, message);

    if (available.total <= 0) {
      return message.reply("You do not have any available pulls right now.");
    }

    let updatedCards = [...(player.cards || [])];
    let updatedWeapons = [...(player.weapons || [])];
    let updatedDevilFruits = [...(player.devilFruits || [])];
    let updatedFragments = [...(player.fragments || [])];

    let pityCounter = Number(player.pity?.premiumSPity || 0);

    const summary = {
      card: 0,
      weapon: 0,
      devilFruit: 0,
      C: 0,
      B: 0,
      A: 0,
      S: 0,
      UR: 0,
      fragments: 0
    };

    const highlights = [];

    for (let i = 0; i < available.total; i++) {
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

      if (rewardResult.storageKey === "cards") {
        const alreadyOwned = hasOwnedCardByCode(updatedCards, rewardResult.storedReward.code);

        if (alreadyOwned) {
          const fragmentAmount = getDuplicateFragmentAmount(rewardResult.storedReward);
          updatedFragments = addFragment(updatedFragments, rewardResult.storedReward, fragmentAmount);
          summary.fragments += fragmentAmount;
        } else {
          updatedCards.push(rewardResult.storedReward);
        }
      } else if (rewardResult.storageKey === "weapons") {
        updatedWeapons = addNamedItem(updatedWeapons, rewardResult.storedReward);
      } else {
        updatedDevilFruits = addNamedItem(updatedDevilFruits, rewardResult.storedReward);
      }

      summary[contentType] += 1;
      summary[reward.rarity] += 1;

      if (reward.rarity === "S" || reward.rarity === "UR") {
        highlights.push(`${reward.displayName || reward.name} [${reward.rarity}]`);
      }

      if (triggeredPity) pityCounter = 0;
    }

    const updatedPity = {
      ...(player.pity || { normalSPity: 0, premiumSPity: 0 }),
      premiumSPity: pityCounter
    };

    const updatedPulls = consumeAllPulls(player, message);

    updatePlayer(message.author.id, {
      cards: updatedCards,
      weapons: updatedWeapons,
      devilFruits: updatedDevilFruits,
      fragments: updatedFragments,
      pulls: updatedPulls,
      pity: updatedPity
    });

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle("Pull All Result")
      .setDescription(
        [
          `**Pulled By:** ${player.username}`,
          `**Banner:** \`Mother Flame\``,
          `**Total Pulls Used:** \`${available.total}\``,
          "",
          `**Cards:** \`${summary.card}\``,
          `**Weapons:** \`${summary.weapon}\``,
          `**Devil Fruits:** \`${summary.devilFruit}\``,
          `**Fragments Gained:** \`${summary.fragments}\``,
          "",
          `**C:** \`${summary.C}\` • **B:** \`${summary.B}\` • **A:** \`${summary.A}\` • **S:** \`${summary.S}\` • **UR:** \`${summary.UR}\``,
          "",
          "**Highlights**",
          highlights.length ? highlights.slice(0, 10).join("\n") : "No S/UR rewards this time."
        ].join("\n")
      )
      .setFooter({
        text: `S Pity: ${updatedPity.premiumSPity}/${PREMIUM_PITY_TARGET} | Mother Flame Pull All`
      });

    return message.reply({ embeds: [embed] });
  }
};