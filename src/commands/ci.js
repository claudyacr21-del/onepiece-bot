const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const { findCardTemplate, findOwnedCard } = require("../utils/evolution");

function reqText(req) {
  if (!req) return "Base form. No requirement.";
  return [
    `Berries: ${Number(req.berries || 0).toLocaleString("en-US")}`,
    req.cards?.length ? `Battle Cards: ${req.cards.join(", ")}` : null,
    req.boosts?.length ? `Boost Cards: ${req.boosts.join(", ")}` : null,
    req.text || null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildEmbed(card, owned, stage) {
  const form = card.evolutionForms?.[stage - 1];
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🃏 Card Info • ${card.displayName || card.name}`)
    .setDescription(
      [
        `**Form:** ${form?.key || `M${stage}`} • ${form?.name || card.variant || "Unknown"}`,
        `**Tier:** ${form?.tier || card.currentTier || card.rarity}`,
        `**Role:** ${card.cardRole}`,
        `**Base Path:** ${card.baseTier} -> ${card.evolutionForms.map((x) => x.tier).join(" -> ")}`,
        "",
        `**ATK:** ${stage === 1 ? card.baseAtk : stage === 2 ? Math.floor(card.baseAtk * 1.2) : Math.floor(card.baseAtk * 1.45)}`,
        `**HP:** ${stage === 1 ? card.baseHp : stage === 2 ? Math.floor(card.baseHp * 1.2) : Math.floor(card.baseHp * 1.45)}`,
        `**SPD:** ${stage === 1 ? card.baseSpeed : stage === 2 ? Math.floor(card.baseSpeed * 1.2) : Math.floor(card.baseSpeed * 1.45)}`,
        "",
        owned
          ? `**Owned Stage:** M${owned.evolutionStage} • ${owned.evolutionForms?.[owned.evolutionStage - 1]?.name || owned.variant}`
          : "**Owned Stage:** Not owned",
      ].join("\n")
    )
    .setImage(card.image || null)
    .setFooter({
      text: owned
        ? "Global Card Viewer • Owned card detected"
        : "Global Card Viewer • Not required to own the card",
    });
}

function buildRows(stage) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ci_prev")
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(stage <= 1),
      new ButtonBuilder()
        .setCustomId("ci_info")
        .setLabel("(i)")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(stage <= 1),
      new ButtonBuilder()
        .setCustomId("ci_next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(stage >= 3)
    ),
  ];
}

module.exports = {
  name: "ci",
  aliases: ["cardinfo"],
  async execute(message, args) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("Usage: `op ci <card name>`");

    const player = getPlayer(message.author.id, message.author.username);
    const globalCard = findCardTemplate(query);
    if (!globalCard) return message.reply("Card not found in global database.");

    const owned = findOwnedCard(player.cards || [], query);
    let stage = 1;

    const sent = await message.reply({
      embeds: [buildEmbed(globalCard, owned, stage)],
      components: buildRows(stage),
    });

    const collector = sent.createMessageComponentCollector({
      time: 10 * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({
          content: "Only you can control this card viewer.",
          ephemeral: true,
        });
      }

      if (i.customId === "ci_prev") stage = Math.max(1, stage - 1);
      if (i.customId === "ci_next") stage = Math.min(3, stage + 1);

      if (i.customId === "ci_info") {
        const req = globalCard.awakenRequirements?.[`M${stage}`];
        return i.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle(`ℹ️ Requirement • ${globalCard.displayName || globalCard.name} • M${stage}`)
              .setDescription(reqText(req)),
          ],
        });
      }

      return i.update({
        embeds: [buildEmbed(globalCard, owned, stage)],
        components: buildRows(stage),
      });
    });

    collector.on("end", async () => {
      try {
        await sent.edit({ components: [] });
      } catch (_) {}
    });
  },
};