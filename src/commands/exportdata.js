const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { AttachmentBuilder, PermissionsBitField } = require("discord.js");
const { readPlayers, filePath } = require("../playerStore");

const DISCORD_SAFE_LIMIT = 7.5 * 1024 * 1024;

function nowTag() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function makeGzipBackup(srcPath, outPath) {
  const raw = fs.readFileSync(srcPath);
  const gz = zlib.gzipSync(raw, { level: 9 });
  fs.writeFileSync(outPath, gz);
  return outPath;
}

function splitFile(srcPath, outDir, baseName) {
  const buf = fs.readFileSync(srcPath);
  const parts = [];

  for (let offset = 0, part = 1; offset < buf.length; offset += DISCORD_SAFE_LIMIT, part++) {
    const chunk = buf.subarray(offset, Math.min(offset + DISCORD_SAFE_LIMIT, buf.length));
    const partPath = path.join(outDir, `${baseName}.part${String(part).padStart(3, "0")}`);
    fs.writeFileSync(partPath, chunk);
    parts.push(partPath);
  }

  return parts;
}

async function sendFilesInBatches(user, content, paths) {
  const batchSize = 5;

  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    await user.send({
      content: i === 0 ? content : `Backup parts continued: ${i + 1}-${Math.min(i + batchSize, paths.length)} / ${paths.length}`,
      files: batch.map((p) => new AttachmentBuilder(p, { name: path.basename(p) })),
    });
  }
}

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

      const tag = nowTag();
      const outDir = path.join(process.cwd(), "backup_exports");
      fs.mkdirSync(outDir, { recursive: true });

      const activePath = filePath;
      const backupPath = `${filePath}.lastgood.bak`;

      const filesToSend = [];

      if (fs.existsSync(activePath)) {
        const gzPath = path.join(outDir, `players-${tag}.json.gz`);
        makeGzipBackup(activePath, gzPath);

        if (fs.statSync(gzPath).size <= DISCORD_SAFE_LIMIT) {
          filesToSend.push(gzPath);
        } else {
          filesToSend.push(...splitFile(gzPath, outDir, `players-${tag}.json.gz`));
        }
      }

      if (fs.existsSync(backupPath)) {
        const gzPath = path.join(outDir, `players-lastgood-${tag}.json.gz`);
        makeGzipBackup(backupPath, gzPath);

        if (fs.statSync(gzPath).size <= DISCORD_SAFE_LIMIT) {
          filesToSend.push(gzPath);
        } else {
          filesToSend.push(...splitFile(gzPath, outDir, `players-lastgood-${tag}.json.gz`));
        }
      }

      if (!filesToSend.length) {
        const emergencyPath = path.join(outDir, `players-emergency-${tag}.json`);
        fs.writeFileSync(emergencyPath, JSON.stringify(players || {}, null, 2), "utf8");

        const gzPath = `${emergencyPath}.gz`;
        makeGzipBackup(emergencyPath, gzPath);

        if (fs.statSync(gzPath).size <= DISCORD_SAFE_LIMIT) {
          filesToSend.push(gzPath);
        } else {
          filesToSend.push(...splitFile(gzPath, outDir, `players-emergency-${tag}.json.gz`));
        }
      }

      const content = [
        "✅ **One Piece Bot Player Data Export**",
        `Total players: **${totalPlayers}**`,
        `Active file path: \`${activePath}\``,
        fs.existsSync(backupPath) ? `Last-good backup: \`${backupPath}\`` : "Last-good backup: `not found`",
        "",
        "Files are compressed as `.gz`.",
        "If you receive `.part001`, `.part002`, etc, download all parts and merge them before extracting.",
      ].join("\n");

      await sendFilesInBatches(message.author, content, filesToSend);

      return message.reply("✅ Compressed player data backup has been sent to your DM.");
    } catch (error) {
      console.error("[EXPORT DATA ERROR]", error);
      return message.reply(`❌ Failed to export player data: \`${error.message}\``);
    }
  },
};