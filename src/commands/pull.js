const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getAllCards, createOwnedCard, rollBaseTier } = require("../utils/evolution");
const { applyGlobalPullReset } = require("../utils/pullReset");
const { getNextAvailablePullKey, consumePullSlot, getTotalPullUsage } = require("../utils/pullSlots");

function pickContentType() {
  const roll = Math.random() * 100;
  return roll < 80 ? "battle" : "boost";
}

function prettySlotName(key) {
  const map = {
    base: "Base Pull",
    supportMember: "Support Member Pull",
    booster: "Booster Pull",
    owner: "Owner Pull",
    patreon: "Patreon Pull",
    baccaratCard: "Baccarat Card Pull",
    baccaratFruit: "Baccarat Fruit Pull",
  };
  return map[key] || key;
}

module.exports = {
  name: "pull",
  aliases: ["gacha"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const resetState = applyGlobalPullReset(player);
    if (resetState?.wasReset) {
      updatePlayer(message.author.id, { pulls: resetState.pulls });
      player.pulls = resetState.pulls;
    }

    const { totalUsed, totalMax } = getTotalPullUsage(player, message);
    const available = Math.max(0, totalMax - totalUsed);

    if (available <= 0) {
      return message.reply("You do not have any available pulls right now. Use `op pullinfo` to check your slots.");
    }

    const pullKey = getNextAvailablePullKey(player, message);
    if (!pullKey) {
      return message.reply("No pull slot is currently available.");
    }

    const allCards = getAllCards();
    const battlePool = allCards.filter((c) => c.cardRole === "battle");
    const boostPool = allCards.filter((c) => c.cardRole === "boost");
    const contentType = pickContentType();
    const baseTier = rollBaseTier();
    const pool = (contentType === "battle" ? battlePool : boostPool).filter((c) => c.baseTier === baseTier);

    if (!pool.length) return message.reply("Pull pool is empty.");

    const picked = pool[Math.floor(Math.random() * pool.length)];
    const owned = createOwnedCard(picked);
    const updatedPulls = consumePullSlot(player, pullKey);

    updatePlayer(message.author.id, {
      cards: [...(player.cards || []), owned],
      pulls: updatedPulls,
    });

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle("🎴 Pull Result")
          .setDescription(
            [
              `**Slot Used:** ${prettySlotName(pullKey)}`,
              `**Remaining Pulls:** ${available - 1}/${totalMax}`,
              "",
              `**${owned.displayName || owned.name}**`,
              `**Role:** ${owned.cardRole}`,
              `**Base Tier:** ${owned.baseTier}`,
              `**Current Form:** ${owned.evolutionKey} • ${owned.evolutionForms[0].name}`,
              `**Current Tier:** ${owned.currentTier}`,
              "",
              `**ATK:** ${owned.atk}`,
              `**HP:** ${owned.hp}`,
              `**SPD:** ${owned.speed}`,
              "",
              "Use `op ci <card name>` to inspect full M1 / M2 / M3 path.",
            ].join("\n")
          )
          .setThumbnail(owned.evolutionForms?.[0]?.badgeImage || owned.badgeImage || null)
          .setImage(owned.image || null),
      ],
    });
  },
};