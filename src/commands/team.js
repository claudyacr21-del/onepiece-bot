const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");

function getPower(card) {
  return Number(card.currentPower || Math.floor(Number(card.atk || 0) * 1.4 + Number(card.hp || 0) * 0.22 + Number(card.speed || 0) * 9));
}

function formatWeapons(card) {
  if (Array.isArray(card.equippedWeapons) && card.equippedWeapons.length) {
    return card.equippedWeapons.map((w) => w.name).join(", ");
  }
  return card.equippedWeapon || "None";
}

module.exports = {
  name: "team",
  aliases: ["lineup"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const cards = (Array.isArray(player.cards) ? player.cards : []).map(hydrateCard).filter(Boolean);
    const team = player.team || { slots: [null, null, null] };

    const lines = team.slots.map((instanceId, index) => {
      if (!instanceId) return `**${index + 1}.** Empty`;

      const card = cards.find((entry) => entry.instanceId === instanceId && entry.cardRole !== "boost");
      if (!card) return `**${index + 1}.** Missing Card`;

      return [
        `**${index + 1}.** ${card.displayName || card.name} [${card.currentTier || card.rarity}]`,
        `↪ Lv ${Number(card.level || 1)} • Kills ${Number(card.kills || 0)} • Power ${getPower(card)}`,
        `↪ Weapons: ${formatWeapons(card)}`,
        `↪ Devil Fruit: ${card.equippedDevilFruit || "None"}`
      ].join("\n");
    });

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`⚔️ ${player.username}'s Team`)
      .setDescription(
        [
          "Your current battle team:",
          "",
          ...lines,
          "",
          "Use `op add <card name>` to add a card.",
          "Use `op remove <card name>` to remove a card.",
          "Use `op swap <from> <to>` to change position."
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Team" });

    return message.reply({ embeds: [embed] });
  }
};