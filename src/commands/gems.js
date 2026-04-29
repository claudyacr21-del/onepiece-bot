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
  name: "gems",

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
      return message.reply("Usage: `op gems <@user/userId> <amount>`");
    }

    const player = getPlayer(targetUser.id, targetUser.username || targetUser.id);
    const currentAmount = Number(player.gems || 0);
    const nextAmount = currentAmount + amount;

    updatePlayer(targetUser.id, {
      gems: nextAmount,
    });

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle("✅ Gems Added")
      .setDescription(
        [
          `**Target:** <@${targetUser.id}>`,
          `**Added:** +${amount.toLocaleString("en-US")} gems`,
          `**New Balance:** ${nextAmount.toLocaleString("en-US")} gems`,
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