const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const {
  getItemEmoji,
} = require("../config/itemEmojis");
const {
  getActiveEvent,
} = require("../config/eventConfig");
const {
  getEventCurrencyAmount,
} = require("../utils/eventCurrency");

const BERRY_EMOJI =
  getItemEmoji("berries");

const GEMS_EMOJI =
  getItemEmoji("gems");

function getProfileImage(message) {
  return (
    message.member?.displayAvatarURL?.({
      extension: "png",
      size: 512,
    }) ||
    message.author.displayAvatarURL({
      extension: "png",
      size: 512,
    })
  );
}

module.exports = {
  name: "balance",
  aliases: ["bal"],

  async execute(message) {
    const player = getPlayer(
      message.author.id,
      message.author.username
    );

    const activeEvent =
      getActiveEvent();

    const walletLines = [
      "💰 **Wallet**",
      `- Berries: \`${Number(
        player.berries || 0
      ).toLocaleString("en-US")}\` ${BERRY_EMOJI}`,
      `- Gems: \`${Number(
        player.gems || 0
      ).toLocaleString("en-US")}\` ${GEMS_EMOJI}`,
    ];

    if (
      activeEvent?.key &&
      activeEvent?.currency?.name
    ) {
      const currencyAmount =
        getEventCurrencyAmount(
          player,
          activeEvent
        );

      const currencyEmoji =
        getItemEmoji(
          activeEvent.currency.emojiCode ||
            activeEvent.currency.code
        );

      walletLines.push(
        `- ${activeEvent.currency.name}: \`${currencyAmount.toLocaleString(
          "en-US"
        )}\`${currencyEmoji ? ` ${currencyEmoji}` : ""}`
      );
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setAuthor({
        name: `${player.username}'s Wallet`,
        iconURL: getProfileImage(message),
      })
      .setDescription(
        walletLines.join("\n")
      )
      .setThumbnail(
        getProfileImage(message)
      )
      .setFooter({
        text: "One Piece Bot",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};