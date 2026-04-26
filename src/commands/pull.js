const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { createOwnedCard } = require("../utils/evolution");
const rawCards = require("../data/cards");
const rawWeapons = require("../data/weapons");
const rawDevilFruits = require("../data/devilFruits");
const { applyGlobalPullReset } = require("../utils/pullReset");
const {
  getNextAvailablePullKey,
  consumePullSlot,
  getTotalPullUsage,
  buildPullAccessSnapshot,
} = require("../utils/pullSlots");
const { rollStandardBaseTier } = require("../utils/pullRates");
const { incrementQuestCounter } = require("../utils/questProgress");

const PREMIUM_ROLE_NAME = "Mother Flame";
const PREMIUM_PITY_TARGET = 100;
const NORMAL_PITY_TARGET = 150;

function hasRole(message, roleName) {
  return Boolean(
    message?.member?.roles?.cache?.some(
      (role) =>
        String(role?.name || "").toLowerCase() ===
        String(roleName || "").toLowerCase()
    )
  );
}

function getSharedPity(player) {
  const pity = player?.pity || {};

  return Number(
    pity.pullPity ??
      Math.max(Number(pity.normalSPity || 0), Number(pity.premiumSPity || 0)) ??
      0
  );
}

function getPityLimit(isPremium) {
  return isPremium ? PREMIUM_PITY_TARGET : NORMAL_PITY_TARGET;
}

function getPityGuarantee(isPremium) {
  return isPremium ? "S" : "A";
}

function pickContentType() {
  const roll = Math.random() * 100;

  if (roll < 81) return "battleCard";
  if (roll < 96) return "boostCard";
  if (roll < 98) return "weapon";

  return "devilFruit";
}

function prettySlotName(key) {
  const map = {
    base: "Base Pull",
    supportMember: "Support Member Pull",
    booster: "Booster Pull",
    owner: "Owner Pull",
    patreon: "Mother Flame Pull",
    baccaratCard: "Baccarat Card Pull",
    baccaratFruit: "Baccarat Fruit Pull",
  };

  return map[key] || key;
}

function getRewardPool(contentType) {
  if (contentType === "battleCard") {
    return rawCards.filter((card) => card.cardRole === "battle");
  }

  if (contentType === "boostCard") {
    return rawCards.filter((card) => card.cardRole === "boost");
  }

  if (contentType === "weapon") return rawWeapons;

  return rawDevilFruits;
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

function addFragment(list, card) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = card.code;
  const index = arr.findIndex((x) => x.code === code);

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 0) + 1,
    };

    return arr;
  }

  arr.push({
    name: card.displayName || card.name,
    amount: 1,
    rarity: card.baseTier || card.rarity || "C",
    category: card.cardRole === "boost" ? "boost" : "battle",
    code: card.code,
    image: card.image || "",
  });

  return arr;
}

function addNamedItem(list, reward) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = String(reward.code || "");
  const index = arr.findIndex((entry) => String(entry.code || "") === code);

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 1) + 1,
      upgradeLevel: Math.max(
        Number(arr[index].upgradeLevel || 0),
        Number(reward.upgradeLevel || 0)
      ),
    };

    return arr;
  }

  arr.push({
    name: reward.name,
    amount: 1,
    rarity: reward.rarity,
    code: reward.code,
    image: reward.image || "",
    type: reward.type,
    statPercent: reward.statPercent || {
      atk: 0,
      hp: 0,
      speed: 0,
    },
    ownerBonusPercent: reward.ownerBonusPercent || {
      atk: 0,
      hp: 0,
      speed: 0,
    },
    owners: reward.owners || [],
    boostBonus: reward.boostBonus,
    description: reward.description || "",
    power: reward.power || undefined,
    upgradeLevel: Number(reward.upgradeLevel || 0),
  });

  return arr;
}

function addTicket(list, ticket) {
  const arr = Array.isArray(list) ? [...list] : [];
  const idx = arr.findIndex((x) => String(x.code) === String(ticket.code));

  if (idx === -1) {
    arr.push({
      code: ticket.code,
      name: ticket.name,
      amount: 1,
      rarity: ticket.rarity,
      type: "Ticket",
    });
  } else {
    arr[idx] = {
      ...arr[idx],
      amount: Number(arr[idx].amount || 0) + 1,
    };
  }

  return arr;
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

function buildTicketDropText(ticket) {
  if (!ticket) return null;

  return `🎟️ Bonus Drop: **${ticket.name}**`;
}

function getTypeLabel(contentType) {
  if (contentType === "battleCard") return "Battle Card";
  if (contentType === "boostCard") return "Boost Card";
  if (contentType === "weapon") return "Weapon";

  return "Devil Fruit";
}

module.exports = {
  name: "pull",
  aliases: ["gacha"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const resetState = applyGlobalPullReset(player);

    if (resetState?.wasReset) {
      updatePlayer(message.author.id, {
        pulls: resetState.pulls,
      });

      player.pulls = resetState.pulls;
    }

    const snapshot = buildPullAccessSnapshot(player, message);

    updatePlayer(message.author.id, {
      pullAccessSnapshot: snapshot,
    });

    player.pullAccessSnapshot = snapshot;

    const { totalUsed, totalMax } = getTotalPullUsage(player, message);
    const available = Math.max(0, totalMax - totalUsed);

    if (available <= 0) {
      return message.reply(
        "You do not have any available pulls right now.\nUse `op pullinfo` to check your slots."
      );
    }

    const pullKey = getNextAvailablePullKey(player, message);

    if (!pullKey) {
      return message.reply("No pull slot is currently available.");
    }

    const isPremium = hasRole(message, PREMIUM_ROLE_NAME);
    const pityLimit = getPityLimit(isPremium);
    const pityGuarantee = getPityGuarantee(isPremium);
    let pityCounter = getSharedPity(player) + 1;
    const triggeredPity = pityCounter >= pityLimit;

    const contentType = pickContentType();
    const pool = getRewardPool(contentType);
    const rarity = triggeredPity ? pityGuarantee : rollStandardBaseTier();
    const reward = pickRandomByRarity(pool, rarity);

    if (!reward) {
      return message.reply("Pull pool is empty.");
    }

    const updatedPulls = consumePullSlot(player, pullKey);
    const updatedDailyState = incrementQuestCounter(player, "pullsUsed", 1);
    const ticketDrop = rollTicketBonus();
    const updatedTickets = ticketDrop
      ? addTicket(player.tickets || [], ticketDrop)
      : player.tickets || [];

    let updatedCards = [...(player.cards || [])];
    let updatedWeapons = [...(player.weapons || [])];
    let updatedDevilFruits = [...(player.devilFruits || [])];
    let updatedFragments = [...(player.fragments || [])];

    let resultLine = "";
    let duplicateLine = "";

    if (contentType === "battleCard" || contentType === "boostCard") {
      const ownedCard = createOwnedCard(reward);
      const alreadyOwned = updatedCards.some(
        (card) =>
          String(card.code || "").toLowerCase() ===
          String(ownedCard.code || "").toLowerCase()
      );

      if (alreadyOwned) {
        updatedFragments = addFragment(updatedFragments, reward);
        duplicateLine = `You already own **${reward.displayName || reward.name}**.\nConverted into **1 Fragment** instead.`;
      } else {
        updatedCards.push(ownedCard);
      }

      resultLine = `[${String(reward.baseTier || reward.rarity || "C").toUpperCase()}] ${
        reward.displayName || reward.name
      } (${getTypeLabel(contentType)})`;
    } else if (contentType === "weapon") {
      updatedWeapons = addNamedItem(updatedWeapons, reward);
      resultLine = `[${String(reward.rarity || "C").toUpperCase()}] ${
        reward.name
      } (Weapon)`;
    } else {
      updatedDevilFruits = addNamedItem(updatedDevilFruits, reward);
      resultLine = `[${String(reward.rarity || "C").toUpperCase()}] ${
        reward.name
      } (Devil Fruit)`;
    }

    if (triggeredPity) {
      pityCounter = 0;
    }

    const updatedPity = {
      ...(player.pity || {}),
      pullPity: pityCounter,
      normalSPity: pityCounter,
      premiumSPity: pityCounter,
    };

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

    const ticketText = buildTicketDropText(ticketDrop);
    const pityText = triggeredPity
      ? `Pity triggered: **${pityGuarantee} Guarantee**`
      : `Pity: ${updatedPity.pullPity}/${pityLimit}`;

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("🎴 Pull Result")
      .setDescription(
        [
          `**Slot Used:** ${prettySlotName(pullKey)}`,
          `**Remaining Pulls:** ${available - 1}/${totalMax}`,
          `**${pityText}**`,
          "",
          resultLine,
          duplicateLine,
          ticketText,
        ]
          .filter(Boolean)
          .join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Pull",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};