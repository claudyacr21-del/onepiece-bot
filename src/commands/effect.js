const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { getTotalPullUsage } = require("../utils/pullSlots");

function formatValue(value, suffix = "") {
  const number = Number(value || 0);
  return number > 0 ? `+${number}${suffix}` : "None";
}

module.exports = {
  name: "effect",
  aliases: ["effects", "status"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const boosts = getPassiveBoostSummary(player);
    const { totalUsed, totalMax } = getTotalPullUsage(player, message);

    const questTotal = Number(player?.quests?.daily?.total || 5);
    const questCompleted = Number(player?.quests?.daily?.completed || 0);
    const questLeft = Math.max(0, questTotal - questCompleted);

    const pityDrop =
      Number(player?.pity?.premiumSPity || 0) > 0
        ? `${Number(player.pity.premiumSPity)}/80`
        : `${Number(player?.pity?.normalSPity || 0)}/150`;

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("🧪 Here are your current effects")
      .setDescription(
        [
          `↪ Pulls Done: ${totalUsed}/${totalMax}`,
          `↪ Pity Drop: ${pityDrop}`,
          `↪ Quest Left: ${questLeft}/${questTotal}`,
          `↪ ATK Boost: ${formatValue(boosts.atk, "%")}`,
          `↪ HP Boost: ${formatValue(boosts.hp, "%")}`,
          `↪ SPD Boost: ${formatValue(boosts.spd, "%")}`,
          `↪ EXP Boost: ${formatValue(boosts.exp, "%")}`,
          `↪ DMG Boost: ${formatValue(boosts.dmg, "%")}`
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Current Effects" });

    await message.reply({ embeds: [embed] });
  }
};