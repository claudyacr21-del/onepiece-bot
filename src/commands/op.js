const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "op",

  async execute(message) {
    const avatar =
      message.client.user?.displayAvatarURL({
        extension: "png",
        size: 512,
      }) || null;

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("🏴‍☠️ One Piece Bot")
      .setDescription(
        [
          "**The Grand Line is ready.**",
          "",
          "The crew has set sail, the Log Pose is locked, and the bot is running normally.",
          "",
          "Use `op help` to open the command menu.",
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • System Check",
        iconURL: avatar,
      })
      .setTimestamp();

    if (avatar) {
      embed.setThumbnail(avatar);
    }

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};