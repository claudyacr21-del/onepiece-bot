const { EmbedBuilder, PermissionsBitField } = require("discord.js");

const GUIDE_CHANNEL_ID = process.env.NEW_PLAYER_GUIDE_CHANNEL_ID || "";

module.exports = {
  name: "sendguide",
  aliases: ["guidepost", "postguide"],

  async execute(message) {
    if (!message.guild) {
      return message.reply("This command can only be used in a server.");
    }

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Only administrators can use this command.");
    }

    if (!GUIDE_CHANNEL_ID) {
      return message.reply(
        "Missing `NEW_PLAYER_GUIDE_CHANNEL_ID` in Railway variables."
      );
    }

    const guideChannel = await message.guild.channels
      .fetch(GUIDE_CHANNEL_ID)
      .catch(() => null);

    if (!guideChannel || !guideChannel.isTextBased()) {
      return message.reply("The new player guide channel was not found.");
    }

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("🏴‍☠️ How To Play One Piece Bot")
      .setDescription(
        [
          "👋 **Welcome to One Piece Bot!**",
          "",
          "🚀 **Start Your Journey**",
          "Go to the command channel and use:",
          "`op pull`",
          "",
          "🎴 **Cards**",
          "Use `op mc` to view your card collection.",
          "Use `op ci <card>` to view global card info.",
          "Use `op mci <card>` to view your owned card info.",
          "",
          "⚔️ **Battle**",
          "Use `op team` to view your team.",
          "Use `op fight` to fight enemies.",
          "Use `op boss` to fight the island boss.",
          "",
          "⛵ **Progression**",
          "Use `op travel` to view islands.",
          "Use `op sail` to move to the next route.",
          "Use `op ship` to view your ship.",
          "",
          "🗳️ **Top.gg Vote**",
          "Vote for One Piece Bot on **Top.gg** to support the bot and receive vote rewards.",
          "You can only pull up to 6 cards every 8 hours, for more use a reset token or vote for the OP Bot on Top.GG",
          "",
          "📖 **Need Help?**",
          "Use `op help` in the command channel to open the full help menu.",
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • New Player Guide" });

    await guideChannel.send({ embeds: [embed] });

    return message.reply(`Guide posted successfully in <#${GUIDE_CHANNEL_ID}>.`);
  },
};