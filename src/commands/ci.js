const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const { findCardTemplate, findOwnedCard, hydrateCard } = require("../utils/evolution");
const { buildCardStyleEmbed } = require("../utils/cardView");
const { getCardImage, getRarityBadge } = require("../config/assetLinks");

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function buildReqEmbed(card, stage) {
  const req = card.awakenRequirements?.[`M${stage}`];

  if (!req) {
    return new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`ℹ️ Requirement • ${card.displayName || card.name} • M${stage}`)
      .setDescription("Base form.\nNo requirement.");
  }

  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`ℹ️ Requirement • ${card.displayName || card.name} • M${stage}`)
    .setDescription(
      [
        "**Requirement Panel**",
        "",
        "**Berries Required**",
        `↪ ${Number(req.berries || 0).toLocaleString("en-US")}`,
        "",
        "**Self Fragments Required**",
        `↪ ${Number(req.selfFragments || 0)}x ${card.displayName || card.name}`,
        "",
        "**Level Requirement**",
        `↪ ${card.cardRole === "battle" ? Number(req.minLevel || 0) : "Not required"}`,
        "",
        "**Cards Required**",
        ...(req.cards?.length ? req.cards.map((x) => `↪ ${x}`) : ["↪ None"]),
        "",
        "✨ **Boosts Required**",
        ...(req.boosts?.length ? req.boosts.map((x) => `↪ ${x}`) : ["↪ None"]),
      ].join("\n")
    );
}

function getStageCard(card, stage) {
  return hydrateCard({
    ...card,
    evolutionStage: stage,
    evolutionKey: `M${stage}`,
  });
}

function getStageImage(card, stageCard, stage) {
  const stageKey = `M${stage}`;
  return (
    stageCard?.evolutionForms?.[stage - 1]?.image ||
    card.evolutionForms?.[stage - 1]?.image ||
    stageCard?.stageImages?.[stageKey] ||
    card.stageImages?.[stageKey] ||
    getCardImage(
      card.code,
      stageKey,
      stageCard?.stageImages?.[stageKey] ||
        card.stageImages?.[stageKey] ||
        stageCard?.image ||
        card.image ||
        ""
    ) ||
    stageCard?.image ||
    card.image ||
    ""
  );
}

function getStageBadge(card, stageCard, stage) {
  const form = stageCard?.evolutionForms?.[stage - 1] || card.evolutionForms?.[stage - 1];
  return form?.badgeImage || getRarityBadge(form?.tier || stageCard?.currentTier || card.rarity);
}

function buildEmbed(card, owned, stage) {
  const stageCard = getStageCard(card, stage);
  const form = stageCard.evolutionForms?.[stage - 1];
  const stageImage = getStageImage(card, stageCard, stage);
  const stageBadge = getStageBadge(card, stageCard, stage);

  const extraLines =
    stageCard.cardRole === "boost"
      ? [
          `Form: ${stageCard.evolutionKey || `M${stage}`}`,
          `Tier: ${stageCard.currentTier || stageCard.rarity}`,
          `Role: ${stageCard.cardRole}`,
          `Power: ${Number(stageCard.currentPower || 0)}`,
          `Effect: ${form?.effectText || stageCard.effectText || "No effect text"}`,
          `Target: ${stageCard.boostTarget || "team"}`,
          `Boost Type: ${stageCard.boostType || "unknown"}`,
          `Fragments: ${Number(owned?.fragments || 0)}`,
          owned
            ? `Owned Stage: M${owned.evolutionStage} • ${owned.evolutionForms?.[owned.evolutionStage - 1]?.name || owned.variant}`
            : "Owned Stage: Not owned",
        ]
      : [
          `Form: ${stageCard.evolutionKey || `M${stage}`}`,
          `Tier: ${stageCard.currentTier || stageCard.rarity}`,
          `Role: ${stageCard.cardRole}`,
          `Power: ${Number(stageCard.currentPower || 0)}`,
          `Type: ${stageCard.type || "Battle"}`,
          "",
          `ATK: ${formatAtkRange(stageCard.atk)}`,
          `HP: ${Number(stageCard.hp || 0)}`,
          `SPD: ${Number(stageCard.speed || 0)}`,
          `Weapon Set: ${stageCard.weapon || "None"}`,
          `Devil Fruit: ${stageCard.devilFruit || "None"}`,
          owned
            ? `Owned Stage: M${owned.evolutionStage} • ${owned.evolutionForms?.[owned.evolutionStage - 1]?.name || owned.variant}`
            : "Owned Stage: Not owned",
        ];

  return buildCardStyleEmbed({
    color: 0x5865f2,
    header: "Global Card Viewer",
    card: stageCard,
    image: stageImage,
    badgeImage: stageBadge,
    formName: form?.name || "Unknown Form",
    tier: form?.tier || stageCard.currentTier || stageCard.rarity,
    footerText: owned
      ? `Owned Stage: M${owned.evolutionStage} • Global viewer`
      : "Global Card Viewer • Not required to own the card",
    extraLines,
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
    if (!query) return message.reply("Usage: `op ci <card>`");

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
        return i.reply({
          ephemeral: true,
          embeds: [buildReqEmbed(globalCard, stage)],
        });
      }

      return i.update({
        embeds: [buildEmbed(globalCard, owned, stage)],
        components: buildRows(stage),
      });
    });
  },
};