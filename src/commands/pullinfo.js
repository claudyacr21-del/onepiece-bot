const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const {
  getPullSlotStatus,
  buildPullAccessSnapshot,
} = require("../utils/pullSlots");

function fmtSlot(slot) {
  const max = Number(slot?.max || 0);
  const displayMax = Number(slot?.displayMax || max || 0);
  const used = Math.min(Number(slot?.used || 0), max);
  const remaining = slot?.enabled ? Math.max(0, max - used) : 0;

  return `${remaining}/${displayMax}`;
}

module.exports = {
  name: "pullinfo",
  aliases: ["pullslots", "pullstatus", "pulli"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const snapshot = buildPullAccessSnapshot(player, message);

    updatePlayer(message.author.id, {
      pullAccessSnapshot: snapshot,
    });

    player.pullAccessSnapshot = snapshot;

    const slots = getPullSlotStatus(player, message);

    const totalRemaining = Object.values(slots).reduce((sum, slot) => {
      if (!slot.enabled) return sum;

      const max = Number(slot.max || 0);
      const used = Math.min(Number(slot.used || 0), max);

      return sum + Math.max(0, max - used);
    }, 0);

    const totalMax = Object.values(slots).reduce((sum, slot) => {
      return sum + Number(slot.displayMax || slot.max || 0);
    }, 0);

    const activeMax = Object.values(slots).reduce((sum, slot) => {
      if (!slot.enabled) return sum;

      return sum + Number(slot.max || 0);
    }, 0);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("🎟️ Pull Information")
      .setDescription(
        [
          "`op pull` and `op pa` use the same synced pity counter.",
          "Premium users guarantee **S** at 100 pity.",
          "Non-premium users guarantee **A** at 150 pity.",
          "",
          `↪ Pulls Available: ${totalRemaining}/${activeMax}`,
          `↪ Full Potential Max: ${totalMax}`,
          "",
          `↪ Base Pulls: ${fmtSlot(slots.base)}`,
          `↪ Bonus Pull For Main Server Members: ${fmtSlot(slots.supportMember)}`,
          `↪ Bonus Pull For Main Server Boosters: ${fmtSlot(slots.booster)}`,
          `↪ Bonus Pull For Server Owners: ${fmtSlot(slots.owner)}`,
          `↪ Bonus Pulls From Mother Flame: ${fmtSlot(slots.patreon)}`,
          `↪ Bonus Pulls From Baccarat Card: ${fmtSlot(slots.baccaratCard)}`,
          `↪ Bonus Pulls From Baccarat Devil Fruit: ${fmtSlot(slots.baccaratFruit)}`,
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Pull Information",
      });

    await message.reply({
      embeds: [embed],
    });
  },
};