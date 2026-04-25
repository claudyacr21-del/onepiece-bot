const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const rawCards = require("../data/cards");
const { applyGlobalPullReset } = require("../utils/pullReset");
const {
  getTotalPullUsage,
  consumeAllActivePullSlots,
} = require("../utils/pullSlots");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { incrementQuestCounter } = require("../utils/questProgress");
const { rollPremiumBaseTier } = require("../utils/pullRates");

const PREMIUM_ROLE_NAME = "Mother Flame";
const PREMIUM_PITY_TARGET = 100;

function hasRole(message, roleName) {
  return Boolean(
    message?.member?.roles?.cache?.some(
      (role) =>
        String(role?.name || "").toLowerCase() ===
        String(roleName || "").toLowerCase()
    )
  );
}

function makeInstanceId(code) {
  return `${code}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createOwnedCardLocal(template) {
  return hydrateCard({
    ...template,
    instanceId: makeInstanceId(template.code || "card"),
    level: 1,
    xp: 0,
    kills: 0,
    fragments: 0,
    evolutionStage: 1,
    evolutionKey: "M1",
    currentTier: template.baseTier || template.rarity || "C",
    rarity: template.baseTier || template.rarity || "C",
    equippedWeapons: [],
    equippedWeapon: null,
    equippedWeaponName: null,
    equippedWeaponCode: null,
    equippedWeaponLevel: 0,
    equippedDevilFruit: null,
    equippedDevilFruitName: null,
  });
}

function getPremiumRarity() {
  return rollPremiumBaseTier();
}

function getGuaranteedSRarity() {
  return "S";
}

function getContentType() {
  const roll = Math.random() * 100;

  if (roll < 75) return "battleCard";
  if (roll < 90) return "boostCard";
  if (roll < 95) return "weapon";
  return "devilFruit";
}

function getRewardPool(contentType) {
  if (contentType === "battleCard") {
    return rawCards.filter((c) => c.cardRole === "battle");
  }

  if (contentType === "boostCard") {
    return rawCards.filter((c) => c.cardRole === "boost");
  }

  if (contentType === "weapon") return require("../data/weapons");

  return require("../data/devilFruits");
}

function pickRandomByRarity(pool, rarity) {
  const list = Array.isArray(pool) ? pool : [];

  if (!list.length) return null;

  const filtered = list.filter(
    (entry) =>
      String(entry.baseTier || entry.rarity || "").toUpperCase() ===
      String(rarity || "").toUpperCase()
  );

  const source = filtered.length ? filtered : list;

  return source[Math.floor(Math.random() * source.length)] || null;
}

function hasOwnedCardByCode(cards, code) {
  return (Array.isArray(cards) ? cards : []).some(
    (entry) =>
      String(entry.code || "").toLowerCase() === String(code || "").toLowerCase()
  );
}

function getDuplicateFragmentAmount(card) {
  return 1;
}

function addFragment(list, card, amount = 1) {
  const items = Array.isArray(list) ? [...list] : [];
  const code = String(card.code || "");
  const index = items.findIndex((entry) => String(entry.code || "") === code);

  if (index !== -1) {
    items[index] = {
      ...items[index],
      amount: Number(items[index].amount || 0) + Number(amount || 1),
    };

    return items;
  }

  items.push({
    name: card.displayName || card.name,
    amount: Number(amount || 1),
    rarity: card.baseTier || card.rarity || "C",
    category: card.cardRole === "boost" ? "boost" : "battle",
    code: card.code,
    image: card.image || "",
  });

  return items;
}

function addNamedItem(list, reward) {
  const items = Array.isArray(list) ? [...list] : [];
  const existingIndex = items.findIndex(
    (entry) => String(entry.code) === String(reward.code)
  );

  if (existingIndex !== -1) {
    items[existingIndex] = {
      ...items[existingIndex],
      amount: Number(items[existingIndex].amount || 1) + 1,
      upgradeLevel: Math.max(
        Number(items[existingIndex].upgradeLevel || 0),
        Number(reward.upgradeLevel || 0)
      ),
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
    statPercent: reward.statPercent || { atk: 0, hp: 0, speed: 0 },
    ownerBonusPercent: reward.ownerBonusPercent || { atk: 0, hp: 0, speed: 0 },
    owners: reward.owners || [],
    boostBonus: reward.boostBonus,
    description: reward.description || "",
    power: reward.power || undefined,
    upgradeLevel: 0,
  });

  return items;
}

function addTicket(list, ticket) {
  const items = Array.isArray(list) ? [...list] : [];
  const existingIndex = items.findIndex(
    (entry) => String(entry.code) === String(ticket.code)
  );

  if (existingIndex !== -1) {
    items[existingIndex] = {
      ...items[existingIndex],
      amount: Number(items[existingIndex].amount || 0) + 1,
    };

    return items;
  }

  items.push({
    code: ticket.code,
    name: ticket.name,
    amount: 1,
  });

  return items;
}

function rollTicketBonus() {
  const roll = Math.random() * 100;

  if (roll < 0.75) {
    return {
      code: "raid_ticket",
      name: "Raid Ticket",
      rarity: "A",
    };
  }

  if (roll < 3.25) {
    return {
      code: "common_raid_ticket",
      name: "Common Raid Ticket",
      rarity: "B",
    };
  }

  return null;
}

function getRewardResult(contentType, reward) {
  if (contentType === "battleCard" || contentType === "boostCard") {
    return {
      storageKey: "cards",
      storedReward: createOwnedCardLocal(reward),
    };
  }

  if (contentType === "weapon") {
    return {
      storageKey: "weapons",
      storedReward: reward,
    };
  }

  return {
    storageKey: "devilFruits",
    storedReward: reward,
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

    if (resetState?.wasReset) {
      updatePlayer(message.author.id, {
        pulls: resetState.pulls,
      });

      player.pulls = resetState.pulls;
    }

    const { totalUsed, totalMax } = getTotalPullUsage(player, message);
    const availableTotal = Math.max(0, totalMax - totalUsed);

    if (availableTotal <= 0) {
      return message.reply("You do not have any available pulls right now.");
    }

    getPassiveBoostSummary(player);

    let updatedCards = [...(player.cards || [])];
    let updatedWeapons = [...(player.weapons || [])];
    let updatedDevilFruits = [...(player.devilFruits || [])];
    let updatedFragments = [...(player.fragments || [])];
    let updatedTickets = [...(player.tickets || [])];
    let pityCounter = Number(player.pity?.premiumSPity || 0);

    const summary = {
      card: 0,
      weapon: 0,
      devilFruit: 0,
      C: 0,
      B: 0,
      A: 0,
      S: 0,
      SS: 0,
      UR: 0,
      fragments: 0,
      commonRaidTicket: 0,
      raidTicket: 0,
    };

    const pullLines = [];

    for (let i = 0; i < availableTotal; i++) {
      pityCounter += 1;

      const triggeredPity = pityCounter >= PREMIUM_PITY_TARGET;
      const contentType = getContentType();
      const pool = getRewardPool(contentType);
      const rarity = triggeredPity ? getGuaranteedSRarity() : getPremiumRarity();
      const reward = pickRandomByRarity(pool, rarity);

      if (!reward) continue;

      const rewardResult = getRewardResult(contentType, reward);
      let duplicateNote = "";

      if (rewardResult.storageKey === "cards") {
        const alreadyOwned = hasOwnedCardByCode(
          updatedCards,
          rewardResult.storedReward.code
        );

        if (alreadyOwned) {
          const fragmentAmount = getDuplicateFragmentAmount(reward);

          updatedFragments = addFragment(
            updatedFragments,
            reward,
            fragmentAmount
          );
          summary.fragments += fragmentAmount;
          duplicateNote = ` → Duplicate (+${fragmentAmount} fragments)`;
        } else {
          updatedCards.push(rewardResult.storedReward);
        }
      } else if (rewardResult.storageKey === "weapons") {
        updatedWeapons = addNamedItem(updatedWeapons, rewardResult.storedReward);
      } else {
        updatedDevilFruits = addNamedItem(
          updatedDevilFruits,
          rewardResult.storedReward
        );
      }

      if (contentType === "battleCard" || contentType === "boostCard") {
        summary.card += 1;
      } else if (contentType === "weapon") {
        summary.weapon += 1;
      } else {
        summary.devilFruit += 1;
      }

      const rewardRarity = String(
        reward.baseTier || reward.rarity || "C"
      ).toUpperCase();

      if (summary[rewardRarity] !== undefined) summary[rewardRarity] += 1;

      const ticketDrop = rollTicketBonus();
      let ticketNote = "";

      if (ticketDrop) {
        updatedTickets = addTicket(updatedTickets, ticketDrop);

        if (ticketDrop.code === "common_raid_ticket") {
          summary.commonRaidTicket += 1;
        }

        if (ticketDrop.code === "raid_ticket") {
          summary.raidTicket += 1;
        }

        ticketNote = ` + ${ticketDrop.name}`;
      }

      const rewardName = reward.displayName || reward.name || "Unknown";
      const typeLabel = getTypeLabel(contentType);
      const pityLabel = triggeredPity ? " [PITY]" : "";

      pullLines.push(
        `${i + 1}. [${rewardRarity}] ${rewardName} (${typeLabel})${pityLabel}${duplicateNote}${ticketNote}`
      );

      if (triggeredPity) pityCounter = 0;
    }

    const updatedPity = {
      ...(player.pity || {
        normalSPity: 0,
        premiumSPity: 0,
      }),
      premiumSPity: pityCounter,
    };

    const updatedPulls = consumeAllActivePullSlots(player, message);
    const updatedDailyState = incrementQuestCounter(
      player,
      "pullsUsed",
      availableTotal
    );

    updatePlayer(message.author.id, {
      cards: updatedCards,
      weapons: updatedWeapons,
      devilFruits: updatedDevilFruits,
      fragments: updatedFragments,
      tickets: updatedTickets,
      pulls: updatedPulls,
      pity: updatedPity,
      quests: {
        ...(player.quests || {}),
        dailyState: updatedDailyState,
      },
    });

    const chunkSize = 20;
    const chunks = [];

    for (let i = 0; i < pullLines.length; i += chunkSize) {
      chunks.push(pullLines.slice(i, i + chunkSize).join("\n"));
    }

    const embeds = [];

    chunks.slice(0, 10).forEach((chunk, index) => {
      embeds.push(
        new EmbedBuilder()
          .setColor(0x8e44ad)
          .setTitle(`🎴 Pull Results ${index + 1}/${chunks.length}`)
          .setDescription(chunk || "No rewards rolled.")
          .setFooter({
            text: `One Piece Bot • Pull All • Pity ${updatedPity.premiumSPity}/${PREMIUM_PITY_TARGET}`,
          })
      );
    });

    if (!embeds.length) {
      embeds.push(
        new EmbedBuilder()
          .setColor(0x8e44ad)
          .setTitle("🎴 Pull Results")
          .setDescription("No rewards rolled.")
      );
    }

    return message.reply({
      embeds,
    });
  },
};