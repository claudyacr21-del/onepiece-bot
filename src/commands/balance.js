const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");

module.exports = {
  name: "balance",
  aliases: ["bal", "money", "wallet"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("💰 Your Balance")
      .setDescription(
        [
          `**Berries:** \`${Number(player.berries || 0).toLocaleString("en-US")}\``,
          `**Gems:** \`${Number(player.gems || 0).toLocaleString("en-US")}\``
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Balance" });

    return message.reply({ embeds: [embed] });
  }
};