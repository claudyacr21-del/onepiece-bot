const { EmbedBuilder } = require("discord.js");
const { readPlayers, writePlayers } = require("../playerStore");
const {
  isUniversalAdmin,
} = require("../utils/universalAdmin");
const STORE_ID = "__disabled_commands";

function normalizeCommand(value) {
  return String(value || "").toLowerCase().trim();
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
  name: "disable",

  async execute(message, args = []) {
    if (!message.guild) {
      return message.reply({
        content: "This command can only be used in a server.",
        allowedMentions: { repliedUser: false },
      });
    }

    if (!isUniversalAdmin(message)) {
      return message.reply({
        content:
          "This command can only be used by authorized bot staff.",
        allowedMentions: { repliedUser: false },
      });
    }

    const commandName = normalizeCommand(args[0]);

    if (!commandName) {
      return message.reply({
        content: "Usage: `op disable <command>`\nExample: `op disable ryuma`",
        allowedMentions: { repliedUser: false },
      });
    }

    const protectedCommands = new Set(["disable", "enable", "disabledcmds", "maintenance", "banuser", "unbanuser", "baninfo"]);

    if (protectedCommands.has(commandName)) {
      return message.reply({
        content: `You cannot disable \`${commandName}\`.`,
        allowedMentions: { repliedUser: false },
      });
    }

    const players = readPlayers();
    const store = getStore(players);
    const disabled = new Set(store.disabled);

    disabled.add(commandName);

    players[STORE_ID] = {
      disabled: [...disabled].sort(),
      updatedAt: Date.now(),
      updatedBy: String(message.author.id),
    };

    writePlayers(players);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Command Disabled")
          .setDescription(`\`op ${commandName}\` is now disabled for normal players.\nAdmins can still use it.`),
      ],
      allowedMentions: { repliedUser: false },
    });
  },
};