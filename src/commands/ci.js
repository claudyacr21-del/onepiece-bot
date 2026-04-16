const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const { findCardTemplate, findOwnedCard } = require("../utils/evolution");
const { buildCardStyleEmbed } = require("../utils/cardView");

function buildReqEmbed(card, stage) {
  const req = card.awakenRequirements?.[`M${stage}`];
  if (!req) {
    return new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`ℹ️ Requirement • ${card.displayName || card.name} • M${stage}`)
      .setDescription("Base form. No requirement.");
  }

  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`ℹ️ Requirement • ${card.displayName || card.name} • M${stage}`)
    .setDescription(
      [
        "🧩 **Requirement Panel**",
        "",
        "💰 **Berries Required**",
        `↪ ${Number(req.berries || 0).toLocaleString("en-US")}`,
        "",
        "🃏 **Cards Required**",
        ...(req.cards?.length ? req.cards.map((x) => `↪ ${x}`) : ["↪ None"]),
        "",
        "✨ **Boosts Required**",
        ...(req.boosts?.length ? req.boosts.map((x) => `↪ ${x}`) : ["↪ None"]),
        "",
        "📜 **Notes**",
        `↪ ${req.text || "No extra notes."}`,
      ].join("\n")
    );
}

function buildEmbed(card, owned, stage) {
  const form = card.evolutionForms?.[stage - 1];
  const mult =
    card.code === "luffy_straw_hat"
      ? stage === 1
        ? 1
        : stage === 2
        ? 1.75
        : 2.35
      : stage === 1
      ? 1
      : stage === 2
      ? 1.2
      : 1.45;

  return buildCardStyleEmbed({
    color: 0x5865f2,
    header: "Global Card Viewer",
    card,
    badgeImage: form?.badgeImage || card.badgeImage || "",
    formName: form?.name || "Unknown Form",
    tier: form?.tier || card.currentTier || card.rarity,
    footerText: owned
      ? `Owned Stage: M${owned.evolutionStage} • Global viewer`
      : "Global Card Viewer • Not required to own the card",
    extraLines: [
      `Form: ${form?.key || `M${stage}`}`,
      `Tier: ${form?.tier || card.currentTier || card.rarity}`,
      `Role: ${card.cardRole}`,
      "",
      `ATK: ${Math.floor(Number(card.baseAtk || 0) * mult)}`,
      `HP: ${Math.floor(Number(card.baseHp || 0) * mult)}`,
      `SPD: ${Math.floor(Number(card.baseSpeed || 0) * mult)}`,
      `Weapon: ${card.weapon || "None"}`,
      `Devil Fruit: ${card.devilFruit || "None"}`,
      owned
        ? `Owned Stage: M${owned.evolutionStage} • ${owned.evolutionForms?.[owned.evolutionStage - 1]?.name || owned.variant}`
        : "Owned Stage: Not owned",
    ],
  });
}

function buildRows(stage) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ci_prev").setLabel("Prev").setStyle(ButtonStyle.Secondary).setDisabled(stage <= 1),
      new ButtonBuilder().setCustomId("ci_info").setLabel("(i)").setStyle(ButtonStyle.Primary).setDisabled(stage <= 1),
      new ButtonBuilder().setCustomId("ci_next").setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(stage >= 3)
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

    const collector = sent.createMessageComponentCollector({ time: 10 * 60 * 1000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: "Only you can control this card viewer.", ephemeral: true });
      }

      if (i.customId === "ci_prev") stage = Math.max(1, stage - 1);
      if (i.customId === "ci_next") stage = Math.min(3, stage + 1);

      if (i.customId === "ci_info") {
        return i.reply({ ephemeral: true, embeds: [buildReqEmbed(globalCard, stage)] });
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