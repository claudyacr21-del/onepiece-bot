const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");

function fmt(card, index) {
  return `${index + 1}. **${card.displayName || card.name}** • \`${card.cardRole}\` • \`${card.evolutionKey}\` • \`${card.currentTier || card.rarity}\``;
}

module.exports = {
  name: "mc",
  aliases: ["mycards"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const cards = (player.cards || []).map(hydrateCard).filter(Boolean);

    if (!cards.length) {
      return message.reply("You do not own any cards yet.");
    }

    const sorted = [...cards].sort((a, b) => {
      const tierA = String(a.currentTier || a.rarity || "");
      const tierB = String(b.currentTier || b.rarity || "");
      if (tierA !== tierB) return tierA.localeCompare(tierB);
      return String(a.displayName || a.name).localeCompare(String(b.displayName || b.name));
    });

    const chunks = [];
    for (let i = 0; i < sorted.length; i += 15) {
      chunks.push(sorted.slice(i, i + 15));
    }

    const embeds = chunks.map((chunk, idx) =>
      new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`🗂️ My Cards ${idx + 1}/${chunks.length}`)
        .setDescription(chunk.map((card, i) => fmt(card, idx * 15 + i)).join("\n"))
        .setFooter({ text: `Total Cards: ${sorted.length}` })
    );

    return message.reply({ embeds });
  },
};