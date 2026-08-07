const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const {
  getItemEmoji,
} = require("../config/itemEmojis");

const BERRY_EMOJI =
  getItemEmoji("berries");

const GEMS_EMOJI =
  getItemEmoji("gems");

const GOLDEN_FOIL_COIN_EMOJI =
  getItemEmoji("golden_foil_coin");

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

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setAuthor({
        name: `${player.username}'s Wallet`,
        iconURL: getProfileImage(message),
      })
      .setDescription(
        [
          "💰 **Wallet**",
          `- Berries: \`${Number(
            player.berries || 0
          ).toLocaleString("en-US")}\` ${BERRY_EMOJI}`,
          `- Gems: \`${Number(
            player.gems || 0
          ).toLocaleString("en-US")}\` ${GEMS_EMOJI}`,
          `- Golden Foil Coins: \`${Number(
            player.goldenFoilCoins || 0
          ).toLocaleString("en-US")}\` ${GOLDEN_FOIL_COIN_EMOJI}`,
        ].join("\n")
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