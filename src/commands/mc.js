const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");

function buildEmbed(card, index, total) {
  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`🗂️ My Cards ${index + 1}/${total}`)
    .setDescription(
      [
        `**Name:** ${card.displayName || card.name}`,
        `**Role:** ${card.cardRole}`,
        `**Stage:** ${card.evolutionKey}`,
        `**Tier:** ${card.currentTier || card.rarity}`,
        `**ATK:** ${card.atk}`,
        `**HP:** ${card.hp}`,
        `**SPD:** ${card.speed}`,
        `**Weapon:** ${card.equippedWeapon || "None"}`,
      ].join("\n")
    )
    .setThumbnail(card.badgeImage || null)
    .setImage(card.image || null)
    .setFooter({ text: `Code: ${card.code}` });
}

function rows(index, total) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("mc_prev").setLabel("Prev").setStyle(ButtonStyle.Secondary).setDisabled(index <= 0),
      new ButtonBuilder().setCustomId("mc_next").setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(index >= total - 1)
    ),
  ];
}

module.exports = {
  name: "mc",
  aliases: ["mycards"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const cards = (player.cards || []).map(hydrateCard).filter(Boolean);

    if (!cards.length) return message.reply("You do not own any cards yet.");

    let index = 0;

    const sent = await message.reply({
      embeds: [buildEmbed(cards[index], index, cards.length)],
      components: rows(index, cards.length),
    });

    const collector = sent.createMessageComponentCollector({ time: 10 * 60 * 1000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: "Only you can control this card viewer.", ephemeral: true });
      }

      if (i.customId === "mc_prev") index = Math.max(0, index - 1);
      if (i.customId === "mc_next") index = Math.min(cards.length - 1, index + 1);

      return i.update({
        embeds: [buildEmbed(cards[index], index, cards.length)],
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