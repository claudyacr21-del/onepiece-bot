const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const {
  canUseAdminCommand,
  getAdminAccessError,
} = require("../utils/adminAccess");

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function getTargetUser(message, args) {
  const mentionedUser = message.mentions?.users?.first();
  if (mentionedUser) return mentionedUser;

  const rawId = args.find((arg) => /^\d{15,25}$/.test(String(arg || "")));
  if (rawId) {
    return {
      id: rawId,
      username: `User ${rawId}`,
    };
  }

  return message.author;
}

function getMode(args) {
  const first = normalize(args[0]);

  if (["sail", "ship", "travel"].includes(first)) return "sail";
  if (["boss", "islandboss"].includes(first)) return "boss";
  if (["all", "both", "cd", "cooldown", "cooldowns"].includes(first)) return "all";

  return "all";
}

module.exports = {
  name: "resetcd",
  aliases: ["resetcooldown", "rcd", "resetboss", "resetsail"],

  async execute(message, args) {
    if (!message.guild) {
      return message.reply("This command can only be used in a server.");
    }

    if (!canUseAdminCommand(message)) {
      return message.reply(getAdminAccessError());
    }

    const mode = getMode(args);
    const targetUser = getTargetUser(message, args);
    const player = getPlayer(targetUser.id, targetUser.username || targetUser.id);

    const updatePayload = {};
    const changed = [];

    if (mode === "sail" || mode === "all") {
      updatePayload.ship = {
        ...(player.ship || {}),
        nextTravelAt: 0,
      };

      changed.push("Sail cooldown");
    }

    if (mode === "boss" || mode === "all") {
      updatePayload.cooldowns = {
        ...(player.cooldowns || {}),
        boss: 0,
      };

      changed.push("Boss cooldown");
    }

    updatePlayer(targetUser.id, updatePayload);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("✅ Cooldown Reset Complete")
      .setDescription(
        [
          `**Target:** <@${targetUser.id}>`,
          `**Reset:** ${changed.join(" + ")}`,
          "",
          mode === "sail"
            ? "The target can use `op sail` again."
            : mode === "boss"
              ? "The target can use `op boss` again."
              : "The target can use `op sail` and `op boss` again.",
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Admin Cooldown Reset",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};