const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { PREMIUM_ROLE_NAME } = require("../utils/pullAccess");
const { applyGlobalPullReset } = require("../utils/pullReset");
const {
  getTotalPullUsage,
  consumeAllActivePullSlots,
  buildPullAccessSnapshot,
} = require("../utils/pullSlots");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { getAllCards, createOwnedCard } = require("../utils/evolution");
const { rollPremiumBaseTier } = require("../utils/pullRates");

const PREMIUM_PITY_TARGET = 100;

function hasRole(message, roleName) {
  if (!message.member?.roles?.cache || !roleName) return false;
  return message.member.roles.cache.some((role) => role.name === roleName);
}

function pickContentType() {
  const roll = Math.random() * 100;
  return roll < 76 ? "battle" : "boost";
}

function fmtOwned(card) {
  return `[${card.currentTier}] ${card.displayName || card.name} (${card.cardRole}) • ${card.evolutionKey}`;
}

function addFragment(list, card) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = card.code;
  const index = arr.findIndex((x) => String(x.code || "").toLowerCase() === String(card.code || "").toLowerCase());

  if (index !== -1) {
    arr[index] = { ...arr[index], amount: Number(arr[index].amount || 0) + 1 };
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

    const snapshot = buildPullAccessSnapshot(player, message);

    if (message.guild) {
      updatePlayer(message.author.id, {
        pullAccessSnapshot: snapshot,
      });
      player.pullAccessSnapshot = snapshot;
    }

    const passiveBoosts = getPassiveBoostSummary(player);
    const { totalUsed, totalMax } = getTotalPullUsage(player, message);
    const availableTotal = Math.max(0, totalMax - totalUsed);

    if (availableTotal <= 0) {
      return message.reply("You do not have any available pulls right now.");
    }

    const allCards = getAllCards();
    const battlePool = allCards.filter((c) => c.cardRole === "battle");
    const boostPool = allCards.filter((c) => c.cardRole === "boost");

    let pityCounter = Number(player.pity?.premiumSPity || 0);
    let updatedCards = [...(player.cards || [])];
    let updatedFragments = [...(player.fragments || [])];
    const pullLines = [];

    for (let i = 0; i < availableTotal; i++) {
      pityCounter += 1;
      const pityTriggered = pityCounter >= PREMIUM_PITY_TARGET;
      const contentType = pickContentType();
      const baseTier = pityTriggered ? "S" : rollPremiumBaseTier(Number(passiveBoosts?.pullChance || 0));
      const pool = (contentType === "battle" ? battlePool : boostPool).filter((c) => c.baseTier === baseTier);

      if (!pool.length) continue;

      const picked = pool[Math.floor(Math.random() * pool.length)];
      const alreadyOwned = updatedCards.some(
        (c) => String(c.code || "").toLowerCase() === String(picked.code || "").toLowerCase()
      );

      if (alreadyOwned) {
        updatedFragments = addFragment(updatedFragments, picked);
        pullLines.push(`${i + 1}. [FRAGMENT] ${picked.displayName || picked.name}${pityTriggered ? " [PITY]" : ""}`);
      } else {
        const owned = createOwnedCard(picked);
        updatedCards.push(owned);
        pullLines.push(`${i + 1}. ${fmtOwned(owned)}${pityTriggered ? " [PITY]" : ""}`);
      }

      if (pityTriggered) pityCounter = 0;
    }

    const updatedPity = {
      ...(player.pity || { normalSPity: 0, premiumSPity: 0 }),
      premiumSPity: pityCounter,
    };

    const updatedPulls = consumeAllActivePullSlots(player, message);

    updatePlayer(message.author.id, {
      cards: updatedCards,
      fragments: updatedFragments,
      pulls: updatedPulls,
      pity: updatedPity,
    });

    const chunkSize = 20;
    const embeds = [];
    for (let i = 0; i < pullLines.length; i += chunkSize) {
      embeds.push(
        new EmbedBuilder()
          .setColor(0x8e44ad)
          .setTitle(`🎟️ Mother Flame Pull All ${Math.floor(i / chunkSize) + 1}/${Math.ceil(pullLines.length / chunkSize)}`)
          .setDescription(pullLines.slice(i, i + chunkSize).join("\n"))
          .setFooter({ text: `Premium text-only pull • S pity ${updatedPity.premiumSPity}/${PREMIUM_PITY_TARGET}` })
      );
    }

    return message.reply({
      embeds: embeds.length
        ? embeds
        : [new EmbedBuilder().setColor(0x8e44ad).setTitle("🎟️ Mother Flame Pull All").setDescription("No rewards were generated.")],
    });
  },
};