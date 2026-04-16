const { EmbedBuilder } = require("discord.js");
const { getAllCards } = require("../utils/evolution");

function fmt(card, index) {
  return `${index + 1}. **${card.displayName || card.name}** • \`${card.cardRole}\` • Base \`${card.baseTier}\` • Path \`${card.evolutionForms.map((x) => x.tier).join(" -> ")}\``;
}

module.exports = {
  name: "all",
  aliases: ["allcards"],
  async execute(message, args) {
    const mode = String(args.join(" ").trim()).toLowerCase();
    let cards = getAllCards();

    if (mode === "boost") {
      cards = cards.filter((c) => c.cardRole === "boost");
    } else {
      cards = cards.filter((c) => c.cardRole === "battle");
    }

    if (!cards.length) return message.reply("No cards found.");

    cards.sort((a, b) => String(a.displayName || a.name).localeCompare(String(b.displayName || b.name)));

    const chunks = [];
    for (let i = 0; i < cards.length; i += 15) {
      chunks.push(cards.slice(i, i + 15));
    }

    const embeds = chunks.map((chunk, idx) =>
      new EmbedBuilder()
        .setColor(mode === "boost" ? 0x9b59b6 : 0xe67e22)
        .setTitle(mode === "boost" ? `🧩 All Boost Cards ${idx + 1}/${chunks.length}` : `🃏 All Battle Cards ${idx + 1}/${chunks.length}`)
        .setDescription(chunk.map((card, i) => fmt(card, idx * 15 + i)).join("\n"))
        .setFooter({ text: `Total ${mode === "boost" ? "Boost" : "Battle"} Cards: ${cards.length}` })
    );

    return message.reply({ embeds });
  },
};