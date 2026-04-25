const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { createOwnedCard } = require("../utils/evolution");
const rawCards = require("../data/cards");
const { applyGlobalPullReset } = require("../utils/pullReset");
const {
  getNextAvailablePullKey,
  consumePullSlot,
  getTotalPullUsage,
  buildPullAccessSnapshot,
} = require("../utils/pullSlots");
const { rollStandardBaseTier } = require("../utils/pullRates");
const { incrementQuestCounter } = require("../utils/questProgress");

const NORMAL_PITY_TARGET = 150;

function pickContentType() {
  const roll = Math.random() * 100;
  return roll < 82 ? "battle" : "boost";
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

function addTicket(list, ticket) {
  const arr = Array.isArray(list) ? [...list] : [];
  const idx = arr.findIndex((x) => String(x.code) === String(ticket.code));

  if (idx === -1) {
    arr.push({
      code: ticket.code,
      name: ticket.name,
      amount: 1,
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

function getCardImage(card) {
  return card?.image || null;
}

function getCardThumbnail(card) {
  return card?.evolutionForms?.[0]?.badgeImage || card?.badgeImage || null;
}

function getCurrentFormName(card) {
  return card?.evolutionForms?.[0]?.name || card?.evolutionKey || "M1";
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

    if (message.guild) {
      updatePlayer(message.author.id, {
        pullAccessSnapshot: snapshot,
      });

      player.pullAccessSnapshot = snapshot;
    }

    const { totalUsed, totalMax } = getTotalPullUsage(player, message);
    const available = Math.max(0, totalMax - totalUsed);

    if (available <= 0) {
      return message.reply(
        "You do not have any available pulls right now.\nUse `op pullinfo` to check your slots."
      );
    }

    const pullKey = getNextAvailablePullKey(player, message);
    if (!pullKey) return message.reply("No pull slot is currently available.");

    const pityCounter =
      Number(player.pity?.normalAPity ?? player.pity?.normalSPity ?? 0) + 1;
    const triggeredPity = pityCounter >= NORMAL_PITY_TARGET;

    const battlePool = rawCards.filter((c) => c.cardRole === "battle");
    const boostPool = rawCards.filter((c) => c.cardRole === "boost");
    const contentType = pickContentType();
    const baseTier = triggeredPity ? "A" : rollStandardBaseTier();

    const pool = (contentType === "battle" ? battlePool : boostPool).filter(
      (c) => String(c.baseTier || c.rarity || "").toUpperCase() === baseTier
    );

    if (!pool.length) {
      return message.reply(`Pull pool is empty for ${contentType} ${baseTier}.`);
    }

    const picked = pool[Math.floor(Math.random() * pool.length)];
    const updatedPulls = consumePullSlot(player, pullKey);
    const updatedDailyState = incrementQuestCounter(player, "pullsUsed", 1);
    const ticketDrop = rollTicketBonus();
    const updatedTickets = ticketDrop
      ? addTicket(player.tickets || [], ticketDrop)
      : player.tickets || [];

    const updatedPity = {
      ...(player.pity || {}),
      normalAPity: triggeredPity ? 0 : pityCounter,
      normalSPity: triggeredPity ? 0 : pityCounter,
    };

    const alreadyOwned = (player.cards || []).some(
      (c) =>
        String(c.code || "").toLowerCase() ===
        String(picked.code || "").toLowerCase()
    );

    if (alreadyOwned) {
      const updatedFragments = addFragment(player.fragments || [], picked);

      updatePlayer(message.author.id, {
        pulls: updatedPulls,
        fragments: updatedFragments,
        tickets: updatedTickets,
        pity: updatedPity,
        quests: {
          ...(player.quests || {}),
          dailyState: updatedDailyState,
        },
      });

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("🎴 Pull Result")
        .setDescription(
          [
            `**Slot Used:** ${prettySlotName(pullKey)}`,
            `**Remaining Pulls:** ${available - 1}/${totalMax}`,
            `**Pity:** ${updatedPity.normalAPity}/${NORMAL_PITY_TARGET}`,
            triggeredPity ? "**Pity Triggered:** Guaranteed A" : null,
            "",
            `You already own **${picked.displayName || picked.name}**.`,
            "Converted into **1 Fragment** instead.",
            "",
            buildTicketDropText(ticketDrop),
          ]
            .filter(Boolean)
            .join("\n")
        );

      const thumb = getCardThumbnail(picked);
      const image = getCardImage(picked);

      if (thumb) embed.setThumbnail(thumb);
      if (image) embed.setImage(image);

      return message.reply({
        embeds: [embed],
      });
    }

    const owned = createOwnedCard(picked);

    updatePlayer(message.author.id, {
      cards: [...(player.cards || []), owned],
      pulls: updatedPulls,
      tickets: updatedTickets,
      pity: updatedPity,
      quests: {
        ...(player.quests || {}),
        dailyState: updatedDailyState,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("🎴 Pull Result")
      .setDescription(
        [
          `**Slot Used:** ${prettySlotName(pullKey)}`,
          `**Remaining Pulls:** ${available - 1}/${totalMax}`,
          `**Pity:** ${updatedPity.normalAPity}/${NORMAL_PITY_TARGET}`,
          triggeredPity ? "**Pity Triggered:** Guaranteed A" : null,
          "",
          `**${owned.displayName || owned.name}**`,
          `**Role:** ${owned.cardRole}`,
          `**Current Form:** ${owned.evolutionKey || "M1"} • ${getCurrentFormName(owned)}`,
          `**Base Tier:** ${picked.baseTier || picked.rarity || "C"}`,
          "",
          `**ATK:** ${owned.atk}`,
          `**HP:** ${owned.hp}`,
          `**SPD:** ${owned.speed}`,
          "",
          buildTicketDropText(ticketDrop),
        ]
          .filter(Boolean)
          .join("\n")
      );

    const thumb = getCardThumbnail(owned);
    const image = getCardImage(owned);

    if (thumb) embed.setThumbnail(thumb);
    if (image) embed.setImage(image);

    return message.reply({
      embeds: [embed],
    });
  },
};