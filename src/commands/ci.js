const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const { findCardTemplate, findOwnedCard } = require("../utils/evolution");
const { buildCardStyleEmbed } = require("../utils/cardView");
const { getCardImage, getRarityBadge } = require("../config/assetLinks");

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

function getStageImage(card, stage) {
  const stageKey = `M${stage}`;
  return (
    card.evolutionForms?.[stage - 1]?.image ||
    card.stageImages?.[stageKey] ||
    getCardImage(card.code, stageKey, card.image) ||
    card.image ||
    ""
  );
}

function getStageBadge(card, stage) {
  const form = card.evolutionForms?.[stage - 1];
  return form?.badgeImage || getRarityBadge(form?.tier || card.rarity);
}

function getStageMultiplier(card, stage) {
  if (card.code === "luffy_straw_hat") {
    if (stage === 1) return 1;
    if (stage === 2) return 1.75;
    return 2.35;
  }
  if (stage === 1) return 1;
  if (stage === 2) return 1.2;
  return 1.45;
}

function buildEmbed(card, owned, stage) {
  const form = card.evolutionForms?.[stage - 1];
  const mult = getStageMultiplier(card, stage);
  const stageImage = getStageImage(card, stage);
  const stageBadge = getStageBadge(card, stage);

  const extraLines =
    card.cardRole === "boost"
      ? [
          `Form: ${form?.key || `M${stage}`}`,
          `Tier: ${form?.tier || card.currentTier || card.rarity}`,
          `Role: ${card.cardRole}`,
          `Power: ${card.powerCaps?.[`M${stage}`] || card.currentPower || 0}`,
          `Effect: ${card.evolutionForms?.[stage - 1]?.effectText || card.effectText || "No effect text"}`,
          `Target: ${card.boostTarget || "team"}`,
          `Boost Type: ${card.boostType || "unknown"}`,
          `Fragments: ${Number(owned?.fragments || 0)}`,
          owned
            ? `Owned Stage: M${owned.evolutionStage} • ${owned.evolutionForms?.[owned.evolutionStage - 1]?.name || owned.variant}`
            : "Owned Stage: Not owned",
        ]
      : [
          `Form: ${form?.key || `M${stage}`}`,
          `Tier: ${form?.tier || card.currentTier || card.rarity}`,
          `Role: ${card.cardRole}`,
          `Power: ${card.powerCaps?.[`M${stage}`] || card.currentPower || 0}`,
          `Type: ${card.type || "Battle"}`,
          "",
          `ATK: ${Math.floor(Number(card.baseAtk || 0) * mult)}`,
          `HP: ${Math.floor(Number(card.baseHp || 0) * mult)}`,
          `SPD: ${Math.floor(Number(card.baseSpeed || 0) * mult)}`,
          `Weapon Set: ${card.weapon || "None"}`,
          `Devil Fruit: ${card.devilFruit || "None"}`,
          owned
            ? `Owned Stage: M${owned.evolutionStage} • ${owned.evolutionForms?.[owned.evolutionStage - 1]?.name || owned.variant}`
            : "Owned Stage: Not owned",
        ];

  return buildCardStyleEmbed({
    color: 0x5865f2,
    header: "Global Card Viewer",
    card,
    image: stageImage,
    badgeImage: stageBadge,
    formName: form?.name || "Unknown Form",
    tier: form?.tier || card.currentTier || card.rarity,
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