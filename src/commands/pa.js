const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { PREMIUM_ROLE_NAME } = require("../utils/pullAccess");
const { applyGlobalPullReset } = require("../utils/pullReset");
const { getTotalPullUsage, consumeAllActivePullSlots } = require("../utils/pullSlots");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { getAllCards, createOwnedCard, rollBaseTier } = require("../utils/evolution");

const PREMIUM_PITY_TARGET = 80;

function hasRole(message, roleName) {
  if (!message.member?.roles?.cache || !roleName) return false;
  return message.member.roles.cache.some((role) => role.name === roleName);
}

function getPremiumBaseTier(pullChanceBoost = 0, forcedHigh = false) {
  if (forcedHigh) return Math.random() < 0.75 ? "S" : "A";

  const roll = Math.random() * 100;
  const cRate = Math.max(10, 34 - pullChanceBoost);
  const bRate = 28;
  const aRate = 24;
  const sRate = 14 + Math.floor(pullChanceBoost / 2);

  if (roll < cRate) return "C";
  if (roll < cRate + bRate) return "B";
  if (roll < cRate + bRate + aRate) return "A";
  return "S";
}

function pickContentType() {
  const roll = Math.random() * 100;
  if (roll < 75) return "battle";
  return "boost";
}

function fmtOwned(card) {
  return `[${card.currentTier}] ${card.displayName || card.name} (${card.cardRole}) • ${card.evolutionKey}`;
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

    const allCards = getAllCards();
    const battlePool = allCards.filter((c) => c.cardRole === "battle");
    const boostPool = allCards.filter((c) => c.cardRole === "boost");

    let pityCounter = Number(player.pity?.premiumSPity || 0);
    let updatedCards = [...(player.cards || [])];
    const pullLines = [];

    for (let i = 0; i < availableTotal; i++) {
      pityCounter += 1;
      const pityTriggered = pityCounter >= PREMIUM_PITY_TARGET;
      const contentType = pickContentType();
      const baseTier = getPremiumBaseTier(Number(passiveBoosts?.pullChance || 0), pityTriggered);
      const pool = (contentType === "battle" ? battlePool : boostPool).filter((c) => c.baseTier === baseTier);

      if (!pool.length) continue;

      const picked = pool[Math.floor(Math.random() * pool.length)];
      const owned = createOwnedCard(picked);
      updatedCards.push(owned);

      pullLines.push(`${i + 1}. ${fmtOwned(owned)}${pityTriggered ? " [PITY]" : ""}`);

      if (pityTriggered) pityCounter = 0;
    }

    const updatedPity = {
      ...(player.pity || { normalSPity: 0, premiumSPity: 0 }),
      premiumSPity: pityCounter,
    };

    const updatedPulls = consumeAllActivePullSlots(player, message);

    updatePlayer(message.author.id, {
      cards: updatedCards,
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
          .setFooter({ text: `One Piece Bot • Premium Pull All • S pity ${updatedPity.premiumSPity}/${PREMIUM_PITY_TARGET}` })
      );
    }

    return message.reply({ embeds: embeds.length ? embeds : [new EmbedBuilder().setColor(0x8e44ad).setTitle("🎟️ Mother Flame Pull All").setDescription("No rewards were generated.")] });
  },
};