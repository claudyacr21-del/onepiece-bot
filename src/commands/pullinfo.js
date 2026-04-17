const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getPullSlotStatus, buildPullAccessSnapshot } = require("../utils/pullSlots");

function slotText(enabled, used, max) {
  if (!enabled) return `0/${max}`;
  return `${Math.max(0, Number(max || 0) - Number(used || 0))}/${max}`;
}

module.exports = {
  name: "pullinfo",
  aliases: ["pullslots", "pullstatus", "pulli"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const snapshot = buildPullAccessSnapshot(player, message);

    if (message.guild) {
      updatePlayer(message.author.id, {
        pullAccessSnapshot: snapshot,
      });
      player.pullAccessSnapshot = snapshot;
    }

    const slots = getPullSlotStatus(player, message);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("🎟️ Pull Information")
      .setDescription(
        [
          "`op pull` now gives cards with evolution path M1 / M2 / M3.",
          "`op pa` uses the same synced system for Mother Flame pulls.",
          "",
          `↪ Base Pulls: ${slotText(slots.base.enabled, slots.base.used, slots.base.max)}`,
          `↪ Bonus Pull For Support Server Members: ${slotText(slots.supportMember.enabled, slots.supportMember.used, slots.supportMember.max)}`,
          `↪ Bonus Pull For Support Server Boosters: ${slotText(slots.booster.enabled, slots.booster.used, slots.booster.max)}`,
          `↪ Bonus Pull For Server Owners: ${slotText(slots.owner.enabled, slots.owner.used, slots.owner.max)}`,
          `↪ Bonus Pulls From Mother Flame: ${slotText(slots.patreon.enabled, slots.patreon.used, slots.patreon.max)}`,
          `↪ Bonus Pulls From Baccarat Card: ${slotText(slots.baccaratCard.enabled, slots.baccaratCard.used, slots.baccaratCard.max)}`,
          `↪ Bonus Pulls From Baccarat Devil Fruit: ${slotText(slots.baccaratFruit.enabled, slots.baccaratFruit.used, slots.baccaratFruit.max)}`,
          "",
          "Tier path:",
          "C-base → B → A",
          "B-base → A → S",
          "A-base → S → SS",
          "S-base → SS → UR",
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Pull Information" });

    await message.reply({ embeds: [embed] });
  },
};