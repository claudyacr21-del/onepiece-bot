const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { isMotherFlame, getPullAccess } = require("../utils/pullAccess");
const { applyGlobalPullReset } = require("../utils/pullReset");

function getPityInfo(player, isPremium) {
  const current = isPremium
    ? Number(player.pity?.premiumSPity || 0)
    : Number(player.pity?.normalSPity || 0);

  const target = isPremium ? 80 : 150;

  return { current, target };
}

module.exports = {
  name: "effect",
  aliases: ["effects"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const resetState = applyGlobalPullReset(player);

    if (resetState.wasReset) {
      updatePlayer(message.author.id, { pulls: resetState.pulls });
      player.pulls = resetState.pulls;
    }

    const premiumActive = isMotherFlame(message);
    const boosts = getPassiveBoostSummary(player);
    const pulls = player.pulls || {};
    const access = getPullAccess(message);

    const baseUsed = Math.min(Number(pulls.base?.used || 0), access.base);
    const supportUsed = access.supportMember > 0 ? Math.min(Number(pulls.supportMember?.used || 0), access.supportMember) : 0;
    const boosterUsed = access.booster > 0 ? Math.min(Number(pulls.booster?.used || 0), access.booster) : 0;
    const ownerUsed = access.owner > 0 ? Math.min(Number(pulls.owner?.used || 0), access.owner) : 0;
    const motherFlameUsed = access.motherFlame > 0 ? Math.min(Number(pulls.patreon?.used || 0), access.motherFlame) : 0;

    const totalMax = access.base + access.supportMember + access.booster + access.owner + access.motherFlame;
    const totalUsed = baseUsed + supportUsed + boosterUsed + ownerUsed + motherFlameUsed;

    const pity = getPityInfo(player, premiumActive);

    const totalQuests = Number(player.quests?.daily?.total || 5);
    const completedQuests = Number(player.quests?.daily?.completed || 0);
    const questLeft = Math.max(0, totalQuests - completedQuests);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🧪 Here are your current effects")
      .setDescription(
        [
          `↪ Pulls Done: ${totalUsed}/${totalMax}`,
          `↪ Pity Drop: ${pity.current}/${pity.target}`,
          `↪ Quest Left: ${questLeft}/${totalQuests}`,
          `↪ Pull Slot Boost: None`,
          `↪ Pull Chance Boost: ${boosts.pullChance > 0 ? `+${boosts.pullChance}` : "None"}`,
          `↪ Daily Boost: ${boosts.daily > 0 ? `+${boosts.daily}` : "None"}`,
          `↪ ATK Boost: ${boosts.atk > 0 ? `+${boosts.atk}%` : "None"}`,
          `↪ HP Boost: ${boosts.hp > 0 ? `+${boosts.hp}%` : "None"}`,
          `↪ SPD Boost: ${boosts.spd > 0 ? `+${boosts.spd}%` : "None"}`,
          `↪ EXP Boost: ${boosts.exp > 0 ? `+${boosts.exp}%` : "None"}`,
          `↪ DMG Boost: ${boosts.dmg > 0 ? `+${boosts.dmg}%` : "None"}`
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Current Effects" });

    return message.reply({ embeds: [embed] });
  }
};