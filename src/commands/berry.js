const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
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

module.exports = {
  name: "berry",

  async execute(message, args) {
    if (!message.guild) {
      return message.reply("This command can only be used in a server.");
    }

    if (!canUseAdminCommand(message)) {
      return message.reply(getAdminAccessError());
    }

    const targetUser = getTargetUser(message, args[0]);
    const amount = parseAmount(args[1]);

    if (!targetUser || !amount || amount <= 0) {
      return message.reply("Usage: `op berry <@user/userId> <amount>`");
    }

    const player = getPlayer(targetUser.id, targetUser.username || targetUser.id);
    const currentAmount = Number(player.berries || 0);
    const nextAmount = currentAmount + amount;

    updatePlayer(targetUser.id, {
      berries: nextAmount,
    });

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("✅ Berries Added")
      .setDescription(
        [
          `**Target:** <@${targetUser.id}>`,
          `**Added:** +${amount.toLocaleString("en-US")} berries`,
          `**New Balance:** ${nextAmount.toLocaleString("en-US")} berries`,
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Admin Currency",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};