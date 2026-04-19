const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");

function getProfileImage(message) {
  return (
    message.member?.displayAvatarURL?.({ extension: "png", size: 512 }) ||
    message.author.displayAvatarURL({ extension: "png", size: 512 })
  );
}

module.exports = {
  name: "balance",
  aliases: ["bal", "money", "wallet"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setAuthor({
        name: `${player.username}'s Wallet`,
        iconURL: getProfileImage(message)
      })
      .setDescription(
        [
          "💰 **Wallet**",
          `- Berries: \`${Number(player.berries || 0).toLocaleString("en-US")}\` 🍇`,
          `- Gems: \`${Number(player.gems || 0).toLocaleString("en-US")}\` 💎`
        ].join("\n")
      )
      .setThumbnail(getProfileImage(message))
      .setFooter({ text: "One Piece Bot" });

    return message.reply({ embeds: [embed] });
  }
};