const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("../playerStore");
const {
  canUseAdminCommand,
  getAdminAccessError,
} = require("../utils/adminAccess");

function parseUserId(value) {
  return String(value || "").replace(/[<@!>]/g, "").trim();
}

function parseAmount(value) {
  const cleaned = String(value || "")
    .replace(/,/g, "")
    .replace(/\./g, "")
    .trim();

  const amount = Number(cleaned);
  if (!Number.isFinite(amount)) return null;
  return Math.floor(amount);
}

function getTargetUser(message, rawUserId) {
  const mentionedUser = message.mentions?.users?.first();
  if (mentionedUser) return mentionedUser;

  const userId = parseUserId(rawUserId);
  if (!userId || !/^\d{15,25}$/.test(userId)) return null;

  return {
    id: userId,
    username: `User ${userId}`,
  };
}

function parseMode(rawMode) {
  const mode = String(rawMode || "").toLowerCase().trim();

  if (["add", "+", "give", "plus"].includes(mode)) return "add";
  if (["remove", "rem", "take", "minus", "sub", "subtract", "-"].includes(mode)) return "remove";

  return null;
}

module.exports = {
  name: "berry",

  async execute(message, args) {
    if (!message.guild) {
      return message.reply("This command can only be used in a server.");
    }

    if (!canUseAdminCommand(message)) {
      return message.reply(getAdminAccessError());
    }

    let mode = parseMode(args[0]);
    let targetArg = args[1];
    let amountArg = args[2];

    // Backward compatibility:
    // op berry <@user/userId> <amount> = add
    if (!mode) {
      mode = "add";
      targetArg = args[0];
      amountArg = args[1];
    }

    const targetUser = getTargetUser(message, targetArg);
    const amount = parseAmount(amountArg);

    if (!targetUser || !amount || amount <= 0) {
      return message.reply(
        [
          "Usage:",
          "`op berry add <@user/userId> <amount>`",
          "`op berry remove <@user/userId> <amount>`",
          "`op berry <@user/userId> <amount>`",
        ].join("\n")
      );
    }

    let before = 0;
    let after = 0;
    const delta = mode === "remove" ? -amount : amount;

    updatePlayerAtomic(
      targetUser.id,
      (fresh) => {
        before = Number(fresh.berries || 0);
        after = Math.max(0, before + delta);

        return {
          ...fresh,
          berries: after,
        };
      },
      targetUser.username || targetUser.id
    );

    const isRemove = mode === "remove";

    const embed = new EmbedBuilder()
      .setColor(isRemove ? 0xe74c3c : 0xf1c40f)
      .setTitle(isRemove ? "✅ Berries Removed" : "✅ Berries Added")
      .setDescription(
        [
          `**Target:** <@${targetUser.id}>`,
          `**${isRemove ? "Removed" : "Added"}:** ${isRemove ? "-" : "+"}${amount.toLocaleString("en-US")} berries`,
          `**Before:** ${before.toLocaleString("en-US")} berries`,
          `**New Balance:** ${after.toLocaleString("en-US")} berries`,
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Admin Currency" });

    return message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  },
};