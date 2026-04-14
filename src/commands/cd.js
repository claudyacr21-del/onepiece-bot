const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { hasRole, PREMIUM_ROLE_NAME } = require("../utils/pullAccess");
const { getNextResetTime } = require("../utils/pullReset");

function formatRemaining(ms) {
  if (ms <= 0) return "Now";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} hours, ${minutes} minutes`;
  }

  if (minutes > 0) {
    return `${minutes} minutes`;
  }

  return "Now";
}

function getDailyRemaining(player) {
  if (!player.dailyLastClaim) return "Now";

  const nextTime = Number(player.dailyLastClaim) + 24 * 60 * 60 * 1000;
  return formatRemaining(nextTime - Date.now());
}

function getCooldownRemaining(timestamp) {
  if (!timestamp) return "Now";
  return formatRemaining(Number(timestamp) - Date.now());
}

module.exports = {
  name: "cd",
  aliases: ["cooldown", "cooldowns"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const cooldowns = player.cooldowns || {};
    const hasTreasureAccess = hasRole(message, PREMIUM_ROLE_NAME);

    const nextResetText = formatRemaining(getNextResetTime() - Date.now());

    const lines = [
      `↪ Next Reset: ${nextResetText}`,
      `↪ Next Vote: ${getCooldownRemaining(cooldowns.vote)}`,
      `↪ Next Daily: ${getDailyRemaining(player)}`,
      `↪ Next Fight: ${getCooldownRemaining(cooldowns.fight)}`,
      `↪ Next Boss: ${getCooldownRemaining(cooldowns.boss)}`,
      `↪ Next Treasure: ${hasTreasureAccess ? getCooldownRemaining(cooldowns.treasure) : "Only Mother Flame users can claim"}`
    ];

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("⏳ Here are the important bot timers!")
      .setDescription(lines.join("\n"))
      .setFooter({ text: "One Piece Bot • Cooldowns" });

    return message.reply({ embeds: [embed] });
  }
};