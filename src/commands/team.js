const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");

function getPower(card) {
  return Number(card.atk || 0) + Number(card.hp || 0) + Number(card.speed || 0);
}

module.exports = {
  name: "team",
  aliases: ["lineup"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const cards = Array.isArray(player.cards) ? player.cards : [];
    const team = player.team || { slots: [null, null, null] };

    const lines = team.slots.map((instanceId, index) => {
      if (!instanceId) {
        return `**${index + 1}.** Empty`;
      }

      const card = cards.find((entry) => entry.instanceId === instanceId);

      if (!card) {
        return `**${index + 1}.** Missing Card`;
      }

      return [
        `**${index + 1}.** ${card.displayName || card.name} [${card.rarity}]`,
        `↪ Lv ${Number(card.level || 1)} • Kills ${Number(card.kills || 0)} • Power ${getPower(card)}`
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