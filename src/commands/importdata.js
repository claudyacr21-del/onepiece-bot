const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { PermissionsBitField } = require("discord.js");
const { filePath, readPlayers } = require("../playerStore");

async function downloadAttachment(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download attachment: ${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

function isGzip(buffer) {
  return buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

module.exports = {
  name: "importdata",
  aliases: ["restoredata", "importplayers"],

  async execute(message) {
    const ownerIds = String(process.env.BOT_OWNER_IDS || process.env.OWNER_IDS || process.env.BOT_OWNER_ID || process.env.ADMIN_USER_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const adminRoleIds = String(process.env.ADMIN_ROLE_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const isBotOwner = ownerIds.includes(String(message.author.id));
    const isServerOwner = message.guild && String(message.guild.ownerId) === String(message.author.id);
    const isAdminPerm = message.member?.permissions?.has(PermissionsBitField.Flags.Administrator);
    const hasAdminRole = adminRoleIds.some((roleId) => message.member?.roles?.cache?.has(roleId));

    if (!isBotOwner && !isServerOwner && !isAdminPerm && !hasAdminRole) {
      return message.reply("❌ This command can only be used by the bot owner, server owner, or administrator.");
    }

    const attachment = message.attachments.first();
    if (!attachment) {
      return message.reply("❌ Attach your `players.json` or `players.json.gz` file with this command.");
    }

    try {
      const before = readPlayers();
      const beforeCount = Object.keys(before || {}).length;

      const raw = await downloadAttachment(attachment.url);
      const jsonBuffer = isGzip(raw) ? zlib.gunzipSync(raw) : raw;
      const parsed = JSON.parse(jsonBuffer.toString("utf8"));

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return message.reply("❌ Invalid player data format.");
      }

      const newCount = Object.keys(parsed || {}).length;

      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, `${filePath}.before_import_${Date.now()}.bak`);
      }

      fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), "utf8");

      return message.reply(
        [
          "✅ **Player data imported successfully.**",
          `Old total players: **${beforeCount}**`,
          `New total players: **${newCount}**`,
          `Saved to: \`${filePath}\``,
          "",
          "Now test `op bal`, `op mc`, `op mci`, and `op finv`.",
        ].join("\n")
      );
    } catch (error) {
      console.error("[IMPORT DATA ERROR]", error);
      return message.reply(`❌ Failed to import player data: \`${error.message}\``);
    }
  },
};