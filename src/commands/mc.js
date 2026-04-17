const { getPlayer } = require("../playerStore");
const { findOwnedCard } = require("../utils/evolution");
const { buildCardStyleEmbed } = require("../utils/cardView");

function formatOwnedWeapons(card) {
  if (Array.isArray(card.equippedWeapons) && card.equippedWeapons.length) {
    return card.equippedWeapons
      .map((w) => `${w.name}${Number(w.upgradeLevel || 0) > 0 ? ` +${w.upgradeLevel}` : ""}`)
      .join(", ");
  }
  return card.equippedWeapon || "None";
}

function getCurrentForm(card) {
  const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
  return card.evolutionForms?.[stage - 1] || null;
}

function buildOwnedCardEmbed(ownerName, card) {
  const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
  const form = getCurrentForm(card);

  return buildCardStyleEmbed({
    color: 0x1abc9c,
    ownerName,
    card,
    badgeImage: form?.badgeImage || card.badgeImage || "",
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