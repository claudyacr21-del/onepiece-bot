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
  if (["fight", "battle", "pvp"].includes(first)) return "fight";
  if (["all", "both", "cd", "cooldown", "cooldowns"].includes(first)) return "all";

  return "all";
}

function getUsageText() {
  return [
    "Usage:",
    "`op resetcd [all/sail/boss/fight] [@user/userId]`",
    "",
    "Examples:",
    "`op resetcd fight @user`",
    "`op resetcd boss @user`",
    "`op resetcd all @user`",
  ].join("\n");
}

function buildResetDescription(targetUser, changed, mode) {
  const hint =
    mode === "sail"
      ? "The target can use `op sail` again."
      : mode === "boss"
      ? "The target can use `op boss` again."
      : mode === "fight"
      ? "The target can use `op fight` again."
      : "The target can use `op sail`, `op boss`, and `op fight` again.";

  return [
    `**Target:** <@${targetUser.id}>`,
    `**Reset:** ${changed.join(" + ") || "None"}`,
    "",
    hint,
  ].join("\n");
}

module.exports = {
  name: "resetcd",
  aliases: [
    "rcd",
  ],

  async execute(message, args) {
    if (!message.guild) {
      return message.reply({
        content: "This command can only be used in a server.",
        allowedMentions: { repliedUser: false },
      });
    }

    if (!canUseAdminCommand(message)) {
      return message.reply({
        content: getAdminAccessError(),
        allowedMentions: { repliedUser: false },
      });
    }

    const mode = getMode(args);

    if (!["sail", "boss", "fight", "all"].includes(mode)) {
      return message.reply({
        content: getUsageText(),
        allowedMentions: { repliedUser: false },
      });
    }

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
        ...(updatePayload.cooldowns || player.cooldowns || {}),
        boss: 0,
      };

      changed.push("Boss cooldown");
    }

    if (mode === "fight" || mode === "all") {
      updatePayload.cooldowns = {
        ...(updatePayload.cooldowns || player.cooldowns || {}),
        fight: 0,
        fightMotherFlame: 0,
        fightVivreCard: 0,
      };

      changed.push("Fight cooldown");
    }

    updatePlayer(targetUser.id, updatePayload);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("✅ Cooldown Reset Complete")
      .setDescription(buildResetDescription(targetUser, changed, mode))
      .setFooter({
        text: "One Piece Bot • Admin Cooldown Reset",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        users: [String(targetUser.id)],
        repliedUser: false,
      },
    });
  },
};