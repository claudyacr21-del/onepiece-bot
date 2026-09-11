const {
  EmbedBuilder,
} = require("discord.js");

const {
  getRarityColor,
} = require("./rarityColor");

function buildCardStyleEmbed({
  color = 0x5865f2,
  header = "Card",
  ownerName = "",
  card,
  formName = "",
  tier = "",
  badgeImage = "",
  image = "",
  extraLines = [],
  footerText = "",
}) {
  const title =
    ownerName
      ? `${ownerName}'s Card`
      : header;

  const finalImage =
    card?.hasCustomSkin &&
    card?.skinImage
      ? card.skinImage
      : image ||
        card?.image ||
        null;

  const finalBadge =
    badgeImage ||
    card?.badgeImage ||
    null;

  const subtitle =
    card?.hasCustomSkin &&
    card?.skinTitle
      ? card.skinTitle
      : formName ||
        card?.title ||
        card?.variant ||
        "";

  const displayedTier =
    tier ||
    card?.currentTier ||
    card?.rarity ||
    card?.baseTier ||
    "";

  const borderColor =
    displayedTier
      ? getRarityColor(
          displayedTier
        )
      : color;

  return new EmbedBuilder()
    .setColor(borderColor)
    .setTitle(title)
    .setDescription(
      [
        `**${
          card.displayName ||
          card.name
        }**`,
        subtitle,
        "",
        ...extraLines.filter(
          Boolean
        ),
      ].join("\n")
    )
    .setThumbnail(finalBadge)
    .setImage(finalImage)
    .setFooter({
      text:
        footerText ||
        (
          ownerName
            ? `This card belongs to ${ownerName}`
            : `Tier ${displayedTier}`
        ),
    });
}

module.exports = {
  buildCardStyleEmbed,
};