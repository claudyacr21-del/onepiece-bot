const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const {
  normalize,
  getAutoLevelCards,
  findOwnedCardByName,
  getCardName,
} = require("../utils/autoLevel");

function isSameAutoLevelCard(entry, targetCard) {
  const targetCode = normalize(targetCard.code);
  const targetName = normalize(getCardName(targetCard));
  const entryCode = normalize(entry.code);
  const entryName = normalize(entry.name);

  return (
    (targetCode && entryCode && targetCode === entryCode) ||
    (targetName && entryName && targetName === entryName)
  );
}

function formatAutoLevelCards(cards) {
  return cards.length
    ? cards.map((card) => card.name || card.code || "Unknown Card").join(", ")
    : "No characters registered yet.";
}

module.exports = {
  name: "aladd",
  aliases: ["altoggle", "alremove"],

  async execute(message, args) {
    if (!args.length) {
      return message.reply({
        content: "Usage: `op aladd <card name>`",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const query = args.join(" ");
    const previewPlayer = getPlayer(message.author.id, message.author.username);
    const previewFound = findOwnedCardByName(previewPlayer.cards || [], query);

    if (!previewFound) {
      return message.reply({
        content: "You do not own that card, or the name was not found.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (String(previewFound.card.cardRole || "").toLowerCase() === "boost") {
      return message.reply({
        content:
          "Boost cards cannot be added to the auto-leveling list because boost cards do not have levels.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    let targetCard = previewFound.card;
    let updatedCards = [];
    let actionText = "added to";
    let color = 0x2ecc71;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const found = findOwnedCardByName(fresh.cards || [], query);

          if (!found) {
            throw new Error("You do not own that card, or the name was not found.");
          }

          targetCard = found.card;

          if (String(targetCard.cardRole || "").toLowerCase() === "boost") {
            throw new Error(
              "Boost cards cannot be added to the auto-leveling list because boost cards do not have levels."
            );
          }

          const currentCards = getAutoLevelCards(fresh.autoLevel);
          const existingIndex = currentCards.findIndex((entry) =>
            isSameAutoLevelCard(entry, targetCard)
          );

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

          return {
            ...fresh,
            autoLevel: {
              ...(fresh.autoLevel || {}),
              cards: updatedCards,
            },
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to update auto-level list.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle("Fragment Auto-Leveling Updated")
      .setDescription(
        [
          `**${getCardName(targetCard)}** has been ${actionText} your auto-leveling list.`,
          "",
          "**Current Characters**",
          formatAutoLevelCards(updatedCards),
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Auto Level",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};