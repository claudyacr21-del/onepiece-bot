const { getPlayer } = require("../playerStore");
const { findOwnedCard } = require("../utils/evolution");
const { buildCardStyleEmbed } = require("../utils/cardView");
const { getCardImage, getRarityBadge } = require("../config/assetLinks");

function formatOwnedWeapons(card) {
  if (Array.isArray(card.equippedWeapons) && card.equippedWeapons.length) {
    return card.equippedWeapons.map((w) => w.name).join(", ");
  }
  return card.equippedWeapon || "None";
}

function getCurrentStage(card) {
  return Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
}

function getCurrentForm(card) {
  const stage = getCurrentStage(card);
  return card.evolutionForms?.[stage - 1] || null;
}

function getOwnedStageImage(card) {
  const stage = getCurrentStage(card);
  const stageKey = `M${stage}`;

  return (
    card.evolutionForms?.[stage - 1]?.image ||
    card.stageImages?.[stageKey] ||
    getCardImage(card.code, stageKey, card.image) ||
    card.image ||
    ""
  );
}

function getOwnedStageBadge(card) {
  const stage = getCurrentStage(card);
  const form = card.evolutionForms?.[stage - 1];

  return form?.badgeImage || getRarityBadge(form?.tier || card.currentTier || card.rarity);
}

function buildOwnedCardEmbed(ownerName, card) {
  const stage = getCurrentStage(card);
  const form = getCurrentForm(card);
  const stageImage = getOwnedStageImage(card);
  const stageBadge = getOwnedStageBadge(card);

  return buildCardStyleEmbed({
    color: 0x1abc9c,
    ownerName,
    card,
    image: stageImage,
    badgeImage: stageBadge,
    formName: form?.name || card.variant || "Unknown Form",
    tier: card.currentTier || card.rarity,
    footerText: `Owned card info • ${ownerName}`,
    extraLines: [
      `Form: ${card.evolutionKey || `M${stage}`}`,
      `Tier: ${card.currentTier || card.rarity}`,
      `Level: ${Number(card.level || 1)}`,
      `Power: ${Number(card.currentPower || 0)}`,
      `Health: ${Number(card.hp || 0)}`,
      `Speed: ${Number(card.speed || 0)}`,
      `Attack: ${Number(card.atk || 0)}`,
      `Weapons: ${formatOwnedWeapons(card)}`,
      `Devil Fruit: ${card.equippedDevilFruit || "None"}`,
      card.cardRole === "boost"
        ? `Effect: ${card.effectText || "No effect text"}`
        : `Type: ${card.type || card.cardRole}`,
      `Kills: ${Number(card.kills || 0)}`,
      `Fragments: ${Number(card.fragments || 0)}`,
    ],
  });
}

module.exports = {
  name: "mci",
  aliases: ["mycardinfo"],

  async execute(message, args) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("Usage: `op mci <card name>`");

    const player = getPlayer(message.author.id, message.author.username);
    const card = findOwnedCard(player.cards || [], query);

    if (!card) {
      return message.reply("You do not own that card.");
    }

    return message.reply({
      embeds: [buildOwnedCardEmbed(message.author.username, card)],
    });
  },
};