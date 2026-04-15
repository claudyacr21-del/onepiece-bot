const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getNextResetTime, applyGlobalPullReset } = require("../utils/pullReset");
const { PREMIUM_ROLE_NAME } = require("../utils/pullAccess");

function hasRole(message, roleName) {
  if (!message.member?.roles?.cache || !roleName) return false;
  return message.member.roles.cache.some((role) => role.name === roleName);
}

function formatRemaining(targetTime, now = Date.now()) {
  const diff = Number(targetTime || 0) - now;

  if (diff <= 0) return "Now";

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return "Now";
}

module.exports = {
  name: "cd",
  aliases: ["cooldown", "cooldowns"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const resetState = applyGlobalPullReset(player);
    if (resetState.wasReset) {
      updatePlayer(message.author.id, { pulls: resetState.pulls });
      player.pulls = resetState.pulls;
    }

    const cooldowns = player.cooldowns || {};
    const now = Date.now();

    const nextPullReset = getNextResetTime(now);
    const nextDaily = Number(cooldowns.daily || 0);
    const nextFight = Number(cooldowns.fight || 0);
    const nextBoss = Number(cooldowns.boss || 0);
    const nextVote = Number(cooldowns.vote || 0);
    const nextTreasure = Number(cooldowns.treasure || 0);

    const isMotherFlame = hasRole(message, PREMIUM_ROLE_NAME);

    const lines = [
      `↪ Next Pull Reset: ${formatRemaining(nextPullReset, now)}`,
      `↪ Next Daily: ${formatRemaining(nextDaily, now)}`,
      `↪ Next Vote: ${formatRemaining(nextVote, now)}`,
      `↪ Next Fight: ${formatRemaining(nextFight, now)}`,
      `↪ Next Boss: ${formatRemaining(nextBoss, now)}`,
      `↪ Next Treasure: ${isMotherFlame ? formatRemaining(nextTreasure, now) : "Mother Flame only"}`
    ];

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("⏳ Cooldown Status")
      .setDescription(lines.join("\n"))
      .setFooter({ text: "One Piece Bot • Cooldowns" });

    return message.reply({ embeds: [embed] });
  }
};