const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const {
  normalize,
  getAutoLevelCards,
  findOwnedCardByName,
  getCardName,
} = require("../utils/autoLevel");

module.exports = {
  name: "aladd",
  aliases: ["altoggle", "alremove"],

  async execute(message, args) {
    if (!args.length) {
      return message.reply("Usage: `op aladd <card name>`");
    }

    const query = args.join(" ");
    const player = getPlayer(message.author.id, message.author.username);
    const found = findOwnedCardByName(player.cards || [], query);

    if (!found) {
      return message.reply("You do not own that card, or the name was not found.");
    }

    const targetCard = found.card;
    const currentCards = getAutoLevelCards(player.autoLevel);
    const targetCode = normalize(targetCard.code);
    const targetName = normalize(getCardName(targetCard));

    const existingIndex = currentCards.findIndex((entry) => {
      const entryCode = normalize(entry.code);
      const entryName = normalize(entry.name);

      return (
        (targetCode && entryCode && targetCode === entryCode) ||
        (targetName && entryName && targetName === entryName)
      );
    });

    let updatedCards;
    let actionText;
    let color;

    if (existingIndex !== -1) {
      updatedCards = currentCards.filter((_, index) => index !== existingIndex);
      actionText = "removed from";
      color = 0xe74c3c;
    } else {
      updatedCards = [
        ...currentCards,
        {
          code: targetCard.code || null,
          name: getCardName(targetCard),
        },
      ];
      actionText = "added to";
      color = 0x2ecc71;
    }

    updatePlayer(message.author.id, {
      autoLevel: {
        cards: updatedCards,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle("Fragment Auto-Leveling Updated")
      .setDescription(
        [
          `**${getCardName(targetCard)}** has been ${actionText} your auto-leveling list.`,
          "",
          "**Current Characters**",
          updatedCards.length
            ? updatedCards.map((card) => card.name || card.code || "Unknown Card").join(", ")
            : "No characters registered yet.",
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Auto Level",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};