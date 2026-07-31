const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");

const BERRY_EMOJI =
  "<:berry:1532401337063702538>";

const GEMS_EMOJI =
  "<:gems:1532392133611229304>";

const GOLDEN_FOIL_COIN_EMOJI =
  "<:GoldenFoilCoin:1532388575197270228>";

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