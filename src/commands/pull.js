const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getAllCards, createOwnedCard } = require("../utils/evolution");
const { applyGlobalPullReset } = require("../utils/pullReset");
const { getNextAvailablePullKey, consumePullSlot, getTotalPullUsage } = require("../utils/pullSlots");
const { rollStandardBaseTier } = require("../utils/pullRates");

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
    if (!pullKey) return message.reply("No pull slot is currently available.");

    const allCards = getAllCards();
    const battlePool = allCards.filter((c) => c.cardRole === "battle");
    const boostPool = allCards.filter((c) => c.cardRole === "boost");

    const contentType = pickContentType();
    const baseTier = rollStandardBaseTier();
    const pool = (contentType === "battle" ? battlePool : boostPool).filter((c) => c.baseTier === baseTier);

    if (!pool.length) return message.reply("Pull pool is empty.");

    const picked = pool[Math.floor(Math.random() * pool.length)];
    const updatedPulls = consumePullSlot(player, pullKey);
    const alreadyOwned = (player.cards || []).some((c) => String(c.code || "").toLowerCase() === String(picked.code || "").toLowerCase());

    if (alreadyOwned) {
      const updatedFragments = addFragment(player.fragments || [], picked);

      updatePlayer(message.author.id, {
        pulls: updatedPulls,
        fragments: updatedFragments,
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
                `You already own **${picked.displayName || picked.name}**.`,
                `Converted into **1 Fragment** instead.`,
              ].join("\n")
            )
            .setThumbnail(picked.evolutionForms?.[0]?.badgeImage || picked.badgeImage || null)
            .setImage(picked.image || null),
        ],
      });
    }

    const owned = createOwnedCard(picked);

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
            ].join("\n")
          )
          .setThumbnail(owned.evolutionForms?.[0]?.badgeImage || owned.badgeImage || null)
          .setImage(owned.image || null),
      ],
    });
  },
};