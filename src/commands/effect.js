const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { getPassiveBoostSummary, getBoostCards } = require("../utils/passiveBoosts");
const { hasRole, PREMIUM_ROLE_NAME } = require("../utils/pullAccess");

const SUPPORT_SERVER_ROLE = "Nakama";
const BOOSTER_ROLE = "New World";

function formatValue(value, suffix = "") {
  const number = Number(value || 0);
  return number > 0 ? `+${number}${suffix}` : "None";
}

function hasNamedRole(message, roleName) {
  if (!message.member?.roles?.cache) return false;
  return message.member.roles.cache.some((role) => role.name === roleName);
}

function isServerOwner(message) {
  return Boolean(message.guild && message.author.id === message.guild.ownerId);
}

function hasBaccaratCard(player) {
  const cards = Array.isArray(player?.cards) ? player.cards : [];
  return cards.some((card) => card.code === "baccarat_lucky_draw");
}

function hasBaccaratFruitEquipped(player) {
  const boostCards = getBoostCards(player);
  return boostCards.some(
    (card) =>
      card.code === "baccarat_lucky_draw" &&
      String(card.equippedDevilFruit || "") === "unknown_fortune_fruit"
  );
}

function getTotalPullSlots(player, message) {
  let total = 6;

  if (hasNamedRole(message, SUPPORT_SERVER_ROLE)) total += 1;
  if (hasNamedRole(message, BOOSTER_ROLE)) total += 1;
  if (isServerOwner(message)) total += 1;
  if (hasRole(message, PREMIUM_ROLE_NAME)) total += 3;
  if (hasBaccaratCard(player)) total += 1;
  if (hasBaccaratFruitEquipped(player)) total += 1;

  return total;
}

module.exports = {
  name: "effect",
  aliases: ["effects", "status"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const boosts = getPassiveBoostSummary(player);

    const pulls = player.pulls || {};
    const totalUsed =
      Number(pulls.base?.used || 0) +
      Number(pulls.supportMember?.used || 0) +
      Number(pulls.booster?.used || 0) +
      Number(pulls.owner?.used || 0) +
      Number(pulls.patreon?.used || 0) +
      Number(pulls.baccaratCard?.used || 0) +
      Number(pulls.baccaratFruit?.used || 0);

    const totalMaxPulls = getTotalPullSlots(player, message);

    const questTotal = Number(player?.quests?.daily?.total || 5);
    const questCompleted = Number(player?.quests?.daily?.completed || 0);
    const questLeft = Math.max(0, questTotal - questCompleted);

    const pityDrop =
      Number(player?.pity?.premiumSPity || 0) > 0
        ? `${Number(player.pity.premiumSPity)}/80`
        : `${Number(player?.pity?.normalSPity || 0)}/150`;

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("🧪 Here are your current effects")
      .setDescription(
        [
          `↪ Pulls Done: ${totalUsed}/${totalMaxPulls}`,
          `↪ Pity Drop: ${pityDrop}`,
          `↪ Quest Left: ${questLeft}/${questTotal}`,
          `↪ ATK Boost: ${formatValue(boosts.atk, "%")}`,
          `↪ HP Boost: ${formatValue(boosts.hp, "%")}`,
          `↪ SPD Boost: ${formatValue(boosts.spd, "%")}`,
          `↪ EXP Boost: ${formatValue(boosts.exp, "%")}`,
          `↪ DMG Boost: ${formatValue(boosts.dmg, "%")}`
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Current Effects" });

    await message.reply({ embeds: [embed] });
  }
};