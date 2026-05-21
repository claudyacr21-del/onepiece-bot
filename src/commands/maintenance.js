const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const {
  readMaintenanceState,
  setMaintenanceActive,
} = require("../utils/maintenanceStore");

function getOwnerIds() {
  return String(
    process.env.BOT_OWNER_IDS ||
      process.env.OWNER_IDS ||
      process.env.BOT_OWNER_ID ||
      process.env.ADMIN_USER_IDS ||
      ""
  )
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function isOwnerOrAdmin(message) {
  const ownerIds = getOwnerIds();

  const isBotOwner = ownerIds.includes(String(message.author.id));
  const isServerOwner =
    message.guild && String(message.guild.ownerId) === String(message.author.id);
  const isAdminPerm = message.member?.permissions?.has(
    PermissionsBitField.Flags.Administrator
  );

  return Boolean(isBotOwner || isServerOwner || isAdminPerm);
}

function createMaintenanceEmbed() {
  return new EmbedBuilder()
    .setColor(0x2f6fed)
    .setTitle("2.8.3 Patch Maintenance")
    .setDescription(
      [
        "**Estimated Maintenance Window:** 6:15 A.M EST to 7:00 A.M EST",
        "",
        "In today's patch:",
        "**KoIHelp:** Get detailed information on various systems wherever you see 🎴!",
        "• Various tweaks, bug fixes, and missing info. See support server for more information!",
      ].join("\n")
    );
}

module.exports = {
  name: "maintenance",

  async execute(message, args) {
    if (!isOwnerOrAdmin(message)) {
      return message.reply("❌ Only the bot owner/server admin can use this command.");
    }

    const value = String(args[0] || "").toLowerCase();

    if (!["true", "false", "on", "off"].includes(value)) {
      const state = readMaintenanceState();

      return message.reply({
        content: [
          `Maintenance is currently: **${state.active ? "ON" : "OFF"}**`,
          "",
          "Usage:",
          "`op maintenance true`",
          "`op maintenance false`",
        ].join("\n"),
      });
    }

    const active = value === "true" || value === "on";
    setMaintenanceActive(active, message.author.id);

    if (active) {
      return message.reply({
        content: "✅ Maintenance mode is now **ON**. Non-owner players cannot use commands.",
        embeds: [createMaintenanceEmbed()],
      });
    }

    return message.reply("✅ Maintenance mode is now **OFF**. Players can use commands again.");
  },

  createMaintenanceEmbed,
};