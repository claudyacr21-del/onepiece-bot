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

const NORMAL_PITY_TARGET = 150;

function pickContentType() {
  const roll = Math.random() * 100;

  if (roll < 75) return "battleCard";
  if (roll < 90) return "boostCard";
  if (roll < 95) return "weapon";
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
  const index = arr.findIndex(
    (entry) => String(entry.code) === String(reward.code)
  );

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
    rarity: reward.rarity || reward.baseTier || "C",
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

function getRewardPool(contentType) {
  if (contentType === "battleCard") {
    return rawCards.filter((c) => c.cardRole === "battle");
  }

  if (contentType === "boostCard") {
    return rawCards.filter((c) => c.cardRole === "boost");
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

function getTypeLabel(contentType) {
  if (contentType === "battleCard") return "Battle Card";
  if (contentType === "boostCard") return "Boost Card";
  if (contentType === "weapon") return "Weapon";
  return "Devil Fruit";
}

function buildRewardStatsText(contentType, reward) {
  if (contentType === "battleCard" || contentType === "boostCard") {
    return [
      `**ATK:** ${reward.atk ?? 0}`,
      `**HP:** ${reward.hp ?? 0}`,
      `**SPD:** ${reward.speed ?? 0}`,
    ];
  }

  const stat = reward.statPercent || { atk: 0, hp: 0, speed: 0 };

  return [
    `**ATK Bonus:** ${Number(stat.atk || 0)}%`,
    `**HP Bonus:** ${Number(stat.hp || 0)}%`,
    `**SPD Bonus:** ${Number(stat.speed || 0)}%`,
  ];
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

    const contentType = pickContentType();
    const baseTier = triggeredPity ? "A" : rollStandardBaseTier();
    const pool = getRewardPool(contentType);
    const picked = pickRandomByRarity(pool, baseTier);

    if (!picked) {
      return message.reply(`Pull pool is empty for ${contentType} ${baseTier}.`);
    }

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

    if (contentType === "battleCard" || contentType === "boostCard") {
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
            `**Type:** ${getTypeLabel(contentType)}`,
            `**Current Form:** ${owned.evolutionKey || "M1"} • ${getCurrentFormName(owned)}`,
            `**Base Tier:** ${picked.baseTier || picked.rarity || "C"}`,
            "",
            ...buildRewardStatsText(contentType, owned),
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
    }

    const updatedWeapons =
      contentType === "weapon"
        ? addNamedItem(player.weapons || [], picked)
        : player.weapons || [];
    const updatedDevilFruits =
      contentType === "devilFruit"
        ? addNamedItem(player.devilFruits || [], picked)
        : player.devilFruits || [];

    updatePlayer(message.author.id, {
      weapons: updatedWeapons,
      devilFruits: updatedDevilFruits,
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
          `**${picked.displayName || picked.name}**`,
          `**Type:** ${getTypeLabel(contentType)}`,
          `**Rarity:** ${picked.baseTier || picked.rarity || "C"}`,
          picked.type ? `**Category:** ${picked.type}` : null,
          "",
          ...buildRewardStatsText(contentType, picked),
          "",
          buildTicketDropText(ticketDrop),
        ]
          .filter(Boolean)
          .join("\n")
      );

    if (picked.image) embed.setImage(picked.image);

    return message.reply({
      embeds: [embed],
    });
  },
};