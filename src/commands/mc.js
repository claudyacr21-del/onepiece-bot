const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const { buildCardStyleEmbed } = require("../utils/cardView");

function buildEmbed(ownerName, card, index, total) {
  return buildCardStyleEmbed({
    color: 0x3498db,
    ownerName,
    card,
    formName: card.evolutionForms?.[card.evolutionStage - 1]?.name || card.variant || "Unknown",
    tier: card.currentTier || card.rarity,
    footerText: `Card ${index + 1}/${total} • This card belongs to ${ownerName}`,
    extraLines: [
      `Form: ${card.evolutionKey}`,
      `Tier: ${card.currentTier || card.rarity}`,
      `Level: ${card.level || 1}`,
      `Power: ${Math.floor(Number(card.atk || 0) * 1.4 + Number(card.hp || 0) * 0.22 + Number(card.speed || 0) * 9)}`,
      `Health: ${card.hp}`,
      `Speed: ${card.speed}`,
      `Attack: ${card.atk}`,
      `Weapons: ${card.equippedWeapon || "None"}`,
      `Type: ${card.type || card.cardRole}`,
      `Kills: ${card.kills || 0}`,
      `Fragments: ${card.fragments || 0}`,
    ],
  });
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

    const sorted = [...cards].sort((a, b) => {
      const powerA = Math.floor(Number(a.atk || 0) * 1.4 + Number(a.hp || 0) * 0.22 + Number(a.speed || 0) * 9);
      const powerB = Math.floor(Number(b.atk || 0) * 1.4 + Number(b.hp || 0) * 0.22 + Number(b.speed || 0) * 9);
      if (powerB !== powerA) return powerB - powerA;
      return String(a.displayName || a.name).localeCompare(String(b.displayName || b.name));
    });

    let index = 0;

    const sent = await message.reply({
      embeds: [buildEmbed(message.author.username, sorted[index], index, sorted.length)],
      components: rows(index, sorted.length),
    });

    const collector = sent.createMessageComponentCollector({ time: 10 * 60 * 1000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: "Only you can control this card viewer.", ephemeral: true });
      }

      if (i.customId === "mc_prev") index = Math.max(0, index - 1);
      if (i.customId === "mc_next") index = Math.min(sorted.length - 1, index + 1);

      return i.update({
        embeds: [buildEmbed(message.author.username, sorted[index], index, sorted.length)],
        components: rows(index, sorted.length),
      });
    });

    collector.on("end", async () => {
      try { await sent.edit({ components: [] }); } catch (_) {}
    });
  },
};