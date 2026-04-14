const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getPullAccess } = require("../utils/pullAccess");
const { applyGlobalPullReset } = require("../utils/pullReset");

function getRemaining(max, used) {
  return Math.max(0, Number(max || 0) - Number(used || 0));
}

module.exports = {
  name: "pullinfo",
  aliases: ["pulli"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const resetState = applyGlobalPullReset(player);

    if (resetState.wasReset) {
      updatePlayer(message.author.id, { pulls: resetState.pulls });
      player.pulls = resetState.pulls;
    }

    const pulls = player.pulls || {};
    const access = getPullAccess(message);

    const baseUsed = Number(pulls.base?.used || 0);
    const baseRemaining = getRemaining(access.base, baseUsed);

    const supportUsed = access.supportMember > 0 ? Number(pulls.supportMember?.used || 0) : 0;
    const supportRemaining = getRemaining(access.supportMember, supportUsed);

    const boosterUsed = access.booster > 0 ? Number(pulls.booster?.used || 0) : 0;
    const boosterRemaining = getRemaining(access.booster, boosterUsed);

    const ownerUsed = access.owner > 0 ? Number(pulls.owner?.used || 0) : 0;
    const ownerRemaining = getRemaining(access.owner, ownerUsed);

    const motherFlameUsed = access.motherFlame > 0 ? Number(pulls.patreon?.used || 0) : 0;
    const motherFlameRemaining = getRemaining(access.motherFlame, motherFlameUsed);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📥 Here is your pull information")
      .setDescription(
        [
          `↪ Base Pulls: ${baseRemaining}/${access.base}`,
          `↪ Bonus Pull For Support Server Members: ${supportRemaining}/${access.supportMember}`,
          `↪ Bonus Pull For Support Server Boosters: ${boosterRemaining}/${access.booster}`,
          `↪ Bonus Pull For Server Owners: ${ownerRemaining}/${access.owner}`,
          `↪ Bonus pulls from Patreon: ${motherFlameRemaining}/${access.motherFlame}`
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Pull Information" });

    return message.reply({ embeds: [embed] });
  }
};