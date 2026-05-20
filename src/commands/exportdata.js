const fs = require("fs");
const path = require("path");
const { AttachmentBuilder, PermissionsBitField } = require("discord.js");
const { readPlayers, filePath } = require("../playerStore");

module.exports = {
  name: "exportdata",
  aliases: ["backupdata", "exportplayers"],

  async execute(message) {
    const ownerIds = String(process.env.BOT_OWNER_IDS || process.env.OWNER_IDS || process.env.BOT_OWNER_ID || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const isBotOwner = ownerIds.includes(String(message.author.id));
    const isServerOwner = message.guild && String(message.guild.ownerId) === String(message.author.id);
    const isAdmin = message.member?.permissions?.has(PermissionsBitField.Flags.Administrator);

    if (!isBotOwner && !isServerOwner && !isAdmin) {
      return message.reply("❌ This command can only be used by the bot owner, server owner, or administrator.");
    }

    try {
      const players = readPlayers();
      const totalPlayers = Object.keys(players || {}).length;

      const activePath = filePath;
      const backupPath = `${filePath}.lastgood.bak`;

      const files = [];

      if (fs.existsSync(activePath)) {
        files.push(
          new AttachmentBuilder(activePath, {
            name: `players-${Date.now()}.json`,
          })
        );
      }

      if (fs.existsSync(backupPath)) {
        files.push(
          new AttachmentBuilder(backupPath, {
            name: `players-lastgood-${Date.now()}.bak.json`,
          })
        );
      }

      if (!files.length) {
        const emergencyPath = path.join(process.cwd(), `players-emergency-${Date.now()}.json`);
        fs.writeFileSync(emergencyPath, JSON.stringify(players || {}, null, 2), "utf8");

        files.push(
          new AttachmentBuilder(emergencyPath, {
            name: `players-emergency-${Date.now()}.json`,
          })
        );
      }

      await message.author.send({
        content: [
          "✅ **One Piece Bot Player Data Export**",
          `Total players: **${totalPlayers}**`,
          `Active file path: \`${activePath}\``,
          fs.existsSync(backupPath) ? `Last-good backup: \`${backupPath}\`` : "Last-good backup: `not found`",
          "",
          "Save these files somewhere safe.",
        ].join("\n"),
        files,
      });

      return message.reply("✅ Player data backup has been sent to your DM.");
    } catch (error) {
      console.error("[EXPORT DATA ERROR]", error);
      return message.reply(`❌ Failed to export player data: \`${error.message}\``);
    }
  },
};