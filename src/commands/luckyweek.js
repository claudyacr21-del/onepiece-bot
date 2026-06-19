const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const {
  getLuckyWeekState,
  setLuckyWeekState,
  LUCKY_WEEK_MULTIPLIER,
} = require("../utils/luckyWeekStore");

function getOwnerIds() {
  return String(
    process.env.BOT_OWNER_IDS ||
      process.env.ADMIN_ROLE_IDS ||
      process.env.OWNER_IDS ||
      process.env.BOT_OWNER_ID ||
      process.env.ADMIN_USER_IDS ||
      ""
  )
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function canManageLuckyWeek(message) {
  const ownerIds = getOwnerIds();

  if (ownerIds.includes(String(message.author.id))) return true;

  if (message.guild && String(message.guild.ownerId) === String(message.author.id)) {
    return true;
  }

  if (message.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
    return true;
  }

  return false;
}

function parseBoolean(value) {
  const text = String(value || "").toLowerCase().trim();

  if (["true", "on", "enable", "enabled", "yes", "y", "1"].includes(text)) {
    return true;
  }

  if (["false", "off", "disable", "disabled", "no", "n", "0"].includes(text)) {
    return false;
  }

  return null;
}

function buildLuckyWeekEmbed(state) {
  const enabled = Boolean(state.enabled);

  return new EmbedBuilder()
    .setColor(enabled ? 0x2ecc71 : 0xe74c3c)
    .setTitle("🍀 Lucky Week Event")
    .setDescription(
      [
        `Status: **${enabled ? "ACTIVE" : "INACTIVE"}**`,
        `Pull Rate Bonus: **x${Number(state.multiplier || LUCKY_WEEK_MULTIPLIER)}**`,
        "",
        enabled
          ? "All pull rarity rates are currently boosted by Lucky Week."
          : "Lucky Week is currently disabled.",
        "",
        "Usage:",
        "`op luckyweek true`",
        "`op luckyweek false`",
      ].join("\n")
    )
    .setFooter({
      text: state.updatedByName
        ? `Last updated by ${state.updatedByName}`
        : "One Piece Bot • Lucky Week",
    });
}

module.exports = {
  name: "luckyweek",
  aliases: ["lw"],

  async execute(message, args) {
    if (!canManageLuckyWeek(message)) {
      return message.reply({
        content: "Only bot owner / server owner / administrator can manage Lucky Week.",
        allowedMentions: { repliedUser: false },
      });
    }

    const input = args[0];

    if (!input) {
      return message.reply({
        embeds: [buildLuckyWeekEmbed(getLuckyWeekState())],
        allowedMentions: { repliedUser: false },
      });
    }

    const enabled = parseBoolean(input);

    if (enabled === null) {
      return message.reply({
        content: "Usage: `op luckyweek true` / `op luckyweek false`",
        allowedMentions: { repliedUser: false },
      });
    }

    const state = setLuckyWeekState(enabled, message.author);

    return message.reply({
      embeds: [buildLuckyWeekEmbed(state)],
      allowedMentions: { repliedUser: false },
    });
  },
};