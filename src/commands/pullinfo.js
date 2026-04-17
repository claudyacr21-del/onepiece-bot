const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { getPullSlotStatus } = require("../utils/pullSlots");

function fmtInfo(enabled, max) {
  return enabled ? `${max}/${max}` : `0/${max}`;
}

module.exports = {
  name: "pullinfo",
  aliases: ["pullslots", "pullstatus", "pulli"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const slots = getPullSlotStatus(player, message);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("🎟️ Pull Information")
      .setDescription(
        [
          "`op pull` now gives cards with evolution path M1 / M2 / M3.",
          "`op pa` uses the same synced system for Mother Flame pulls.",
          "",
          `↪ Base Pulls: ${fmtInfo(true, slots.base.max)}`,
          `↪ Bonus Pull For Support Server Members: ${fmtInfo(slots.supportMember.enabled, slots.supportMember.max)}`,
          `↪ Bonus Pull For Support Server Boosters: ${fmtInfo(slots.booster.enabled, slots.booster.max)}`,
          `↪ Bonus Pull For Server Owners: ${fmtInfo(slots.owner.enabled, slots.owner.max)}`,
          `↪ Bonus Pulls From Mother Flame: ${fmtInfo(slots.patreon.enabled, slots.patreon.max)}`,
          `↪ Bonus Pulls From Baccarat Card: ${fmtInfo(slots.baccaratCard.enabled, slots.baccaratCard.max)}`,
          `↪ Bonus Pulls From Baccarat Devil Fruit: ${fmtInfo(slots.baccaratFruit.enabled, slots.baccaratFruit.max)}`,
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Pull Information" });

    await message.reply({ embeds: [embed] });
  },
};