const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const { buildCardStyleEmbed } = require("../utils/cardView");

function getPower(card) {
  return Math.floor(Number(card.atk || 0) * 1.4 + Number(card.hp || 0) * 0.22 + Number(card.speed || 0) * 9);
}

function buildViewerEmbed(ownerName, card, index, total) {
  return buildCardStyleEmbed({
    color: 0x3498db,
    ownerName,
    card,
    badgeImage: card.evolutionForms?.[card.evolutionStage - 1]?.badgeImage || card.badgeImage || "",
    formName: card.evolutionForms?.[card.evolutionStage - 1]?.name || card.variant || "Unknown",
    tier: card.currentTier || card.rarity,
    footerText: `Card ${index + 1}/${total} • This card belongs to ${ownerName}`,
    extraLines: [
      `Form: ${card.evolutionKey}`,
      `Tier: ${card.currentTier || card.rarity}`,
      `Level: ${card.level || 1}`,
      `Power: ${getPower(card)}`,
      `Health: ${card.hp}`,
      `Speed: ${card.speed}`,
      `Attack: ${card.atk}`,
      `Weapon: ${card.equippedWeapon || "None"}`,
      `Devil Fruit: ${card.equippedDevilFruit || "None"}`,
      `Type: ${card.type || card.cardRole}`,
      `Kills: ${card.kills || 0}`,
      `Fragments: ${card.fragments || 0}`,
    ],
  });
}

function buildRows(index, total) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("mc_prev").setLabel("Prev").setStyle(ButtonStyle.Secondary).setDisabled(index <= 0),
      new ButtonBuilder().setCustomId("mc_next").setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(index >= total - 1)
    ),
  ];
}

function buildTextEmbeds(ownerName, cards) {
  const lines = cards.map((card, i) => {
    const role = card.cardRole === "boost" ? "BOOST" : "CARD";
    const rarity = String(card.currentTier || card.rarity || "C").toUpperCase();
    const name = card.displayName || card.name || "Unknown Card";
    const stage = card.evolutionKey || `M${card.evolutionStage || 1}`;
    const power = getPower(card);
    return `${i + 1}. **${name}** • ${role} • ${stage} • ${rarity} • ${power}`;
  });

  const chunkSize = 20;
  const embeds = [];

  for (let i = 0; i < lines.length; i += chunkSize) {
    embeds.push(
      new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`${ownerName}'s Collection`)
        .setDescription(
          [
            "You are viewing your collection in text mode!",
            "Cards and boosts are combined in one list.",
            "",
            ...lines.slice(i, i + chunkSize),
          ].join("\n")
        )
        .setFooter({ text: `Showing ${i + 1}-${Math.min(i + chunkSize, lines.length)} of ${lines.length} entries` })
    );
  }

  return embeds;
}

module.exports = {
  name: "mc",
  aliases: ["mycards"],
  async execute(message, args) {
    const player = getPlayer(message.author.id, message.author.username);
    const cards = (player.cards || []).map(hydrateCard).filter(Boolean);

    if (!cards.length) return message.reply("You do not own any cards yet.");

    const sorted = [...cards].sort((a, b) => {
      const powerDiff = getPower(b) - getPower(a);
      if (powerDiff !== 0) return powerDiff;
      if ((a.cardRole || "") !== (b.cardRole || "")) return String(a.cardRole || "").localeCompare(String(b.cardRole || ""));
      return String(a.displayName || a.name).localeCompare(String(b.displayName || b.name));
    });

    const sub = String(args?.[0] || "").toLowerCase();

    if (sub === "text") {
      return message.reply({ embeds: buildTextEmbeds(message.author.username, sorted) });
    }

    let index = 0;

    const sent = await message.reply({
      embeds: [buildViewerEmbed(message.author.username, sorted[index], index, sorted.length)],
      components: buildRows(index, sorted.length),
    });

    const collector = sent.createMessageComponentCollector({ time: 10 * 60 * 1000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: "Only you can control this card viewer.", ephemeral: true });
      }

      if (i.customId === "mc_prev") index = Math.max(0, index - 1);
      if (i.customId === "mc_next") index = Math.min(sorted.length - 1, index + 1);

      return i.update({
        embeds: [buildViewerEmbed(message.author.username, sorted[index], index, sorted.length)],
        components: buildRows(index, sorted.length),
      });
    });

    collector.on("end", async () => {
      try { await sent.edit({ components: [] }); } catch (_) {}
    });
  },
};