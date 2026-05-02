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

function getGlobalCardPower(card) {
  return Number(card.currentPower || card.powerCaps?.M3 || 0);
}

function prettifyCode(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatReqEntry(entry) {
  if (!entry) return "Unknown";

  if (typeof entry === "string") {
    return prettifyCode(entry);
  }

  const name = entry.name || entry.displayName || prettifyCode(entry.code);
  const stage = Number(entry.stage || 1);

  return `${name} M${stage}`;
}

function getReqLines(req, key, textKey) {
  if (Array.isArray(req?.[key]) && req[key].length) {
    return req[key].map((entry) => `↪ ${formatReqEntry(entry)}`);
  }

  if (Array.isArray(req?.[textKey]) && req[textKey].length) {
    return req[textKey].map((entry) => `↪ ${entry}`);
  }

  return ["↪ None"];
}

function buildReqEmbed(card, stage) {
  const stageCard = getStageCard(card, stage);
  const req = stageCard.awakenRequirements?.[`M${stage}`] || card.awakenRequirements?.[`M${stage}`];

  if (!req) {
    return new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`ℹ️ Requirement • ${stageCard.displayName || card.displayName || card.name} • M${stage}`)
      .setDescription("Base form.\nNo requirement.");
  }

  const levelText =
    stageCard.cardRole === "battle"
      ? Number(req.minLevel || 0)
      : "Not required";

  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`ℹ️ Requirement • ${stageCard.displayName || card.displayName || card.name} • M${stage}`)
    .setDescription(
      [
        "**Requirement Panel**",
        "",
        "**Berries Required**",
        `↪ ${Number(req.berries || 0).toLocaleString("en-US")}`,
        "",
        "**Self Fragments Required**",
        `↪ ${Number(req.selfFragments || 0)}x ${stageCard.displayName || card.displayName || card.name}`,
        "",
        "**Level Requirement**",
        `↪ ${levelText}`,
        "",
        "**Cards Required**",
        ...getReqLines(req, "cards", "cardsText"),
        "",
        "✨ **Boosts Required**",
        ...getReqLines(req, "boosts", "boostsText"),
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

function getOwnedStageText(owned) {
  if (!owned) return "Owned Stage: Not owned";

  return `Owned Stage: M${owned.evolutionStage} • ${
    owned.evolutionForms?.[owned.evolutionStage - 1]?.name || owned.variant
  }`;
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
            `Power: ${getGlobalCardPower(card)}`,
            `Effect: ${form?.effectText || stageCard.effectText || "No effect text"}`,
            `Target: ${stageCard.boostTarget || "team"}`,
            `Boost Type: ${stageCard.boostType || "unknown"}`,
            `Fragments: ${Number(owned?.fragments || 0)}`,
          ]
        : [
            `Form: ${stageCard.evolutionKey || `M${stage}`}`,
            `Tier: ${stageCard.currentTier || stageCard.rarity}`,
            `Role: ${card.cardRole || stageCard.cardRole}`,
            `Power: ${getGlobalCardPower(card)}`,
            `Type: ${card.type || stageCard.type || "Battle"}`,
            "",
            `ATK: ${formatAtkRange(card.atk)}`,
            `HP: ${Number(card.hp || 0)}`,
            `SPD: ${Number(card.speed || 0)}`,
            `Weapon Set: ${card.weapon || "None"}`,
            `Devil Fruit: ${card.devilFruit || "None"}`,
          ];

  return buildCardStyleEmbed({
    color: 0x5865f2,
    header: "Global Card Viewer",
    card: stageCard,
    image: stageImage,
    badgeImage: stageBadge,
    formName: form?.name || "Unknown Form",
    tier: form?.tier || stageCard.currentTier || stageCard.rarity,
    footerText: "Global Card Viewer • Not required to own the card",
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