const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { getAutoLevelCards } = require("../utils/autoLevel");

module.exports = {
  name: "autolevel",
  aliases: ["al", "autolvl"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const cards = getAutoLevelCards(player.autoLevel);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle("Fragment Auto-Leveling Settings")
      .setDescription(
        [
          "Add characters to your auto-leveling list.",
          "Whenever you pull duplicate fragments from registered cards, they will instantly be used to increase their levels.",
          "",
          "**Characters**",
          cards.length
            ? cards.map((card) => card.name || card.code || "Unknown Card").join(", ")
            : "No characters registered yet.",
          "",
          "**Command**",
          "`op aladd <card name>` → add or remove a card from auto-leveling",
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