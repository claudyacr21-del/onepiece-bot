const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getNextResetTime, applyGlobalPullReset } = require("../utils/pullReset");
const { getPremiumTier } = require("../utils/premiumAccess");

function formatRemaining(targetTime, now = Date.now()) {
  const diff = Math.max(0, Number(targetTime || 0) - Number(now || Date.now()));

  if (diff <= 0) return "Now";

  const totalSeconds = Math.ceil(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;

  return `${seconds}s`;
}

function getActiveFightCooldownKey(premiumTier) {
  if (premiumTier === "motherFlame") return "fightMotherFlame";
  if (premiumTier === "vivreCard") return "fightVivreCard";
  return "fight";
}

function getCooldownValue(cooldowns, keys = []) {
  for (const key of keys) {
    const value = Number(cooldowns?.[key] || 0);
    if (value > 0) return value;
  }

  return 0;
}

function getFightCooldownValue(cooldowns, premiumTier) {
  const activeKey = getActiveFightCooldownKey(premiumTier);

  return getCooldownValue(cooldowns, [
    activeKey,

    // fallback legacy/older data
    "fight",
    "fightMotherFlame",
    "fightVivreCard",
  ]);
}

module.exports = {
  name: "cd",
  aliases: ["cooldown", "cooldowns"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const resetState = applyGlobalPullReset(player);

    if (resetState.wasReset) {
      updatePlayer(message.author.id, {
        pulls: resetState.pulls,
      });

      player.pulls = resetState.pulls;
    }

    const premiumTier = await getPremiumTier(message);
    const cooldowns = player.cooldowns || {};
    const now = Date.now();

    const nextPullReset = getNextResetTime(now);
    const nextDaily = Number(cooldowns.daily || 0);
    const nextVote = Number(cooldowns.vote || 0);
    const nextFight = getFightCooldownValue(cooldowns, premiumTier);
    const nextBoss = Number(cooldowns.boss || 0);
    const nextTreasure = Number(cooldowns.treasure || 0);

    const canClaimTreasure = premiumTier === "motherFlame";

    const lines = [
      `↪ Next Pull Reset: ${formatRemaining(nextPullReset, now)}`,
      `↪ Next Daily: ${formatRemaining(nextDaily, now)}`,
      `↪ Next Vote: ${formatRemaining(nextVote, now)}`,
      `↪ Next Fight: ${formatRemaining(nextFight, now)}`,
      `↪ Next Boss: ${formatRemaining(nextBoss, now)}`,
      `↪ Next Treasure: ${
        canClaimTreasure ? formatRemaining(nextTreasure, now) : "Mother Flame only"
      }`,
    ];

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("⏳ Cooldown Status")
      .setDescription(lines.join("\n"))
      .setFooter({
        text: "One Piece Bot • Cooldowns",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};