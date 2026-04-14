const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

module.exports = {
  name: "balance",
  aliases: ["bal"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(`${message.author.username}'s Wallet`)
      .setDescription(
        [
          "💰 **Wallet**",
          `• Berries: \`${formatNumber(player.berries)}\` 🍇`,
          `• Gems: \`${formatNumber(player.gems)}\` 💎`
        ].join("\n")
      )
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: "One Piece Bot" });

    return message.reply({ embeds: [embed] });
  }
};