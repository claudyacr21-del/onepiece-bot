const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getAllCards } = require("../utils/evolution");

function buildEmbed(card, index, total, mode) {
  return new EmbedBuilder()
    .setColor(mode === "boost" ? 0x9b59b6 : 0xe67e22)
    .setTitle(mode === "boost" ? `🧩 All Boost ${index + 1}/${total}` : `🃏 All Battle ${index + 1}/${total}`)
    .setDescription(
      [
        `**Name:** ${card.displayName || card.name}`,
        `**Role:** ${card.cardRole}`,
        `**Base Tier:** ${card.baseTier}`,
        `**Path:** ${card.evolutionForms.map((x) => x.tier).join(" -> ")}`,
        `**Stage:** ${card.evolutionKey}`,
        `**Tier:** ${card.currentTier || card.rarity}`,
        `**ATK:** ${card.atk}`,
        `**HP:** ${card.hp}`,
        `**SPD:** ${card.speed}`,
      ].join("\n")
    )
    .setThumbnail(card.badgeImage || null)
    .setImage(card.image || null)
    .setFooter({ text: `Code: ${card.code}` });
}

function rows(index, total) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("all_prev").setLabel("Prev").setStyle(ButtonStyle.Secondary).setDisabled(index <= 0),
      new ButtonBuilder().setCustomId("all_next").setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(index >= total - 1)
    ),
  ];
}

module.exports = {
  name: "all",
  aliases: ["allcards"],
  async execute(message, args) {
    const mode = String(args.join(" ").trim()).toLowerCase() === "boost" ? "boost" : "battle";
    const cards = getAllCards().filter((c) => c.cardRole === mode);

    if (!cards.length) return message.reply("No cards found.");

    let index = 0;

    const sent = await message.reply({
      embeds: [buildEmbed(cards[index], index, cards.length, mode)],
      components: rows(index, cards.length),
    });

    const collector = sent.createMessageComponentCollector({ time: 10 * 60 * 1000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: "Only you can control this card viewer.", ephemeral: true });
      }

      if (i.customId === "all_prev") index = Math.max(0, index - 1);
      if (i.customId === "all_next") index = Math.min(cards.length - 1, index + 1);

      return i.update({
        embeds: [buildEmbed(cards[index], index, cards.length, mode)],
        components: rows(index, cards.length),
      });
    });

    collector.on("end", async () => {
      try {
        await sent.edit({ components: [] });
      } catch (_) {}
    });
  },
};