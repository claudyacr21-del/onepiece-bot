const { EmbedBuilder } = require("discord.js");

function buildCardStyleEmbed({
  color = 0x5865f2,
  header = "Card",
  ownerName = "",
  card,
  formName = "",
  tier = "",
  badgeImage = "",
  extraLines = [],
  footerText = "",
}) {
  const title = ownerName ? `${ownerName}'s Card` : header;

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(
      [
        `**${card.displayName || card.name}**`,
        formName || card.title || card.variant || "",
        "",
        ...extraLines.filter(Boolean),
      ].join("\n")
    )
    .setThumbnail(badgeImage || card?.badgeImage || null)
    .setImage(card?.image || null)
    .setFooter({
      text: footerText || (ownerName ? `This card belongs to ${ownerName}` : `Tier ${tier}`),
    });
}

module.exports = {
  buildCardStyleEmbed,
};