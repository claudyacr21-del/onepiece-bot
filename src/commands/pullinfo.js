const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { getPullSlotStatus, getTotalPullUsage } = require("../utils/pullSlots");
const { applyGlobalPullReset, getNextResetTime } = require("../utils/pullReset");

function fmt(enabled, used, max) {
  if (!enabled) return `0/${max}`;
  return `${Math.max(0, max - used)}/${max}`;
}

function fmtTime(ts) {
  if (!ts) return "Unknown";
  return `<t:${Math.floor(ts / 1000)}:R>`;
}

module.exports = {
  name: "pullinfo",
  aliases: ["pullslots", "pullstatus", "pulli"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const resetState = applyGlobalPullReset(player);
    const livePlayer = resetState.wasReset ? { ...player, pulls: resetState.pulls } : player;

    const slots = getPullSlotStatus(livePlayer, message);
    const { totalUsed, totalMax } = getTotalPullUsage(livePlayer, message);
    const nextResetAt = resetState.nextResetAt || getNextResetTime();

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("🎟️ Pull Information")
      .setDescription(
        [
          `**Total Remaining:** ${Math.max(0, totalMax - totalUsed)}/${totalMax}`,
          `**Next Reset:** ${fmtTime(nextResetAt)}`,
          "",
          `↪ Base Pulls: ${fmt(true, slots.base.used, slots.base.max)}`,
          `↪ Support Server Member: ${fmt(slots.supportMember.enabled, slots.supportMember.used, slots.supportMember.max)}`,
          `↪ Support Server Booster: ${fmt(slots.booster.enabled, slots.booster.used, slots.booster.max)}`,
          `↪ Server Owner: ${fmt(slots.owner.enabled, slots.owner.used, slots.owner.max)}`,
          `↪ Mother Flame: ${fmt(slots.patreon.enabled, slots.patreon.used, slots.patreon.max)}`,
          `↪ Baccarat Card: ${fmt(slots.baccaratCard.enabled, slots.baccaratCard.used, slots.baccaratCard.max)}`,
          `↪ Baccarat Fruit: ${fmt(slots.baccaratFruit.enabled, slots.baccaratFruit.used, slots.baccaratFruit.max)}`,
          "",
          "`op pull` = single pull with card result",
          "`op pa` = Mother Flame text-only pull all",
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Pull Slots" });

    await message.reply({ embeds: [embed] });
  },
};