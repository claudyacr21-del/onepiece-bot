const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { hasRole, PREMIUM_ROLE_NAME } = require("../utils/pullAccess");
const { getBoostCards } = require("../utils/passiveBoosts");

const SUPPORT_SERVER_ROLE = "Nakama";
const BOOSTER_ROLE = "New World";

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

function slotText(active, max = 1) {
  return active ? `${max}/${max}` : `0/${max}`;
}

module.exports = {
  name: "pullinfo",
  aliases: ["pullslots", "pullstatus"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const supportMemberActive = hasNamedRole(message, SUPPORT_SERVER_ROLE);
    const boosterActive = hasNamedRole(message, BOOSTER_ROLE);
    const ownerActive = isServerOwner(message);
    const patreonActive = hasRole(message, PREMIUM_ROLE_NAME);
    const baccaratCardActive = hasBaccaratCard(player);
    const baccaratFruitActive = hasBaccaratFruitEquipped(player);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("🤘 Here is your pull information")
      .setDescription(
        [
          `↪ Base Pulls: 6/6`,
          `↪ Bonus Pull For Support Server Members: ${slotText(supportMemberActive)}`,
          `↪ Bonus Pull For Support Server Boosters: ${slotText(boosterActive)}`,
          `↪ Bonus Pull For Server Owners: ${slotText(ownerActive)}`,
          `↪ Bonus pulls from Patreon: ${patreonActive ? "3/3" : "0/3"}`,
          `↪ Bonus pulls from Baccarat Card: ${slotText(baccaratCardActive)}`,
          `↪ Bonus pulls from Baccarat Devil Fruit: ${slotText(baccaratFruitActive)}`
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Pull Information" });

    await message.reply({ embeds: [embed] });
  }
};