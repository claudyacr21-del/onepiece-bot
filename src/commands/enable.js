const { EmbedBuilder } = require("discord.js");
const { readPlayers, writePlayers } = require("../playerStore");

const STORE_ID = "__disabled_commands";

function normalizeCommand(value) {
  return String(value || "").toLowerCase().trim();
}

function getOwnerIds() {
  return String(
    process.env.BOT_OWNER_IDS ||
      process.env.OWNER_IDS ||
      process.env.BOT_OWNER_ID ||
      process.env.DISCORD_OWNER_ID ||
      process.env.ADMIN_USER_IDS ||
      ""
  )
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function isAdmin(message) {
  const userId = String(message.author.id);
  const ownerIds = getOwnerIds();
  const roleIds = String(process.env.ADMIN_ROLE_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const isBotOwner = ownerIds.includes(userId);
  const isServerOwner = String(message.guild?.ownerId || "") === userId;
  const isAdminPerm = message.member?.permissions?.has?.("Administrator");
  const hasAdminRole =
    roleIds.length && message.member?.roles?.cache
      ? roleIds.some((roleId) => message.member.roles.cache.has(roleId))
      : false;

  return Boolean(isBotOwner || isServerOwner || isAdminPerm || hasAdminRole);
}

function getStore(players) {
  const raw = players[STORE_ID] && typeof players[STORE_ID] === "object"
    ? players[STORE_ID]
    : {};

  return {
    disabled: Array.isArray(raw.disabled) ? raw.disabled.map(normalizeCommand).filter(Boolean) : [],
    updatedAt: Number(raw.updatedAt || 0),
    updatedBy: String(raw.updatedBy || ""),
  };
}

module.exports = {
  name: "enable",
  aliases: ["enablecmd", "cmdenable"],

  async execute(message, args = []) {
    if (!message.guild) {
      return message.reply({
        content: "This command can only be used in a server.",
        allowedMentions: { repliedUser: false },
      });
    }

    if (!isAdmin(message)) {
      return message.reply({
        content: "Only admins can enable commands.",
        allowedMentions: { repliedUser: false },
      });
    }

    const commandName = normalizeCommand(args[0]);

    if (!commandName) {
      return message.reply({
        content: "Usage: `op enable <command>`\nExample: `op enable ryuma`",
        allowedMentions: { repliedUser: false },
      });
    }

    const players = readPlayers();
    const store = getStore(players);
    const disabled = new Set(store.disabled);

    disabled.delete(commandName);

    players[STORE_ID] = {
      disabled: [...disabled].sort(),
      updatedAt: Date.now(),
      updatedBy: String(message.author.id),
    };

    writePlayers(players);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("Command Enabled")
          .setDescription(`\`op ${commandName}\` is now enabled again.`),
      ],
      allowedMentions: { repliedUser: false },
    });
  },
};