const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { PREMIUM_ROLE_NAME } = require("../utils/pullAccess");

function hasRole(message, roleName) {
  if (!message.member?.roles?.cache || !roleName) return false;
  return message.member.roles.cache.some((role) => role.name === roleName);
}

function countTotalAmount(list) {
  if (!Array.isArray(list)) return 0;
  return list.reduce((sum, item) => sum + Number(item?.amount || 0), 0);
}

module.exports = {
  name: "profile",
  aliases: ["pf", "me"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const cards = Array.isArray(player.cards) ? player.cards : [];
    const battleCards = cards.filter((card) => card.cardRole !== "boost");
    const boostCards = cards.filter((card) => card.cardRole === "boost");

    const totalFragments = countTotalAmount(player.fragments);
    const totalBoxes = countTotalAmount(player.boxes);
    const totalTickets = countTotalAmount(player.tickets);
    const totalMaterials = countTotalAmount(player.materials);

    const isMotherFlame = hasRole(message, PREMIUM_ROLE_NAME);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`🏴‍☠️ ${player.username}'s Profile`)
      .setDescription(
        [
          `**Current Island:** \`${player.currentIsland || "Shells Town"}\``,
          `**Premium Status:** \`${isMotherFlame ? "Mother Flame" : "Normal"}\``,
          `**Clan:** \`${player?.clan?.name || "None"}\``,
          `**Clan Role:** \`${player?.clan?.role || "member"}\``,
          "",
          `**Berries:** \`${Number(player.berries || 0).toLocaleString("en-US")}\``,
          `**Gems:** \`${Number(player.gems || 0).toLocaleString("en-US")}\``,
          "",
          `**Battle Cards:** \`${battleCards.length}\``,
          `**Boost Cards:** \`${boostCards.length}\``,
          `**Fragments:** \`${totalFragments}\``,
          "",
          `**Boxes:** \`${totalBoxes}\``,
          `**Tickets:** \`${totalTickets}\``,
          `**Materials:** \`${totalMaterials}\``
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Profile" });

    return message.reply({ embeds: [embed] });
  }
};