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
      .setTitle("How To Play One Piece Bot")
      .setDescription(
        [
          "**Welcome to One Piece Bot!**",
          "",
          "To start your journey, go to the islands channel and use:",
          "`op pull`",
          "",
          "You can pull cards, build your team, fight enemies, upgrade your units, and progress through islands.",
          "",
          "### Pulls",
          "Use `op pull` for a single pull.",
          "Use `op pa` for Mother Flame pull all if you have premium access.",
          "Use `op pullinfo` to check your pull slots.",
          "",
          "### Cards",
          "Use `op mc` to view your card collection.",
          "Use `op ci <card>` to view global card info.",
          "Use `op mci <card>` to view your owned card info.",
          "",
          "Cards can have stages such as **M1**, **M2**, and **M3**.",
          "",
          "### Team",
          "Use `op team` to view your current team.",
          "Use `op fight` to start fighting enemies.",
          "Use `op boss` to fight the current island boss.",
          "",
          "### Progression",
          "Use `op travel` to view islands.",
          "Use `op sail` to move forward when requirements are met.",
          "Use `op ship` to view your ship.",
          "Use `op ship upgrade` to upgrade your ship.",
          "",
          "### Help",
          "Use `op help` in the command channel to open the full help menu.",
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • New Player Guide" });

    await guideChannel.send({ embeds: [embed] });

    return message.reply(`Guide posted successfully in <#${GUIDE_CHANNEL_ID}>.`);
  },
};