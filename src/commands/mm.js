const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const {
  getMessageMilestoneCount,
  formatMessageMilestoneLines,
} = require("../utils/messageMilestones");

module.exports = {
  name: "mm",

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const total = getMessageMilestoneCount(player);

    const avatarUrl =
      message.member?.displayAvatarURL({ extension: "png", size: 512 }) ||
      message.author.displayAvatarURL({ extension: "png", size: 512 });

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`${message.author.username}'s Message Milestones`)
      .setDescription(
        [
          `Messages Counted: **${total}**`,
          "",
          ...formatMessageMilestoneLines(player),
        ].join("\n\n")
      )
      .setThumbnail(avatarUrl)
      .setFooter({ text: "One Piece Bot • Message Milestones" });

    return message.reply({ embeds: [embed] });
  },
};