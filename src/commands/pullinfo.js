const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { getPullSlotStatus } = require("../utils/pullSlots");

function slotText(enabled, max) {
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
      .setTitle("🤘 Here is your pull information")
      .setDescription(
        [
          `↪ Base Pulls: 6/6`,
          `↪ Bonus Pull For Support Server Members: ${slotText(slots.supportMember.enabled, 1)}`,
          `↪ Bonus Pull For Support Server Boosters: ${slotText(slots.booster.enabled, 1)}`,
          `↪ Bonus Pull For Server Owners: ${slotText(slots.owner.enabled, 1)}`,
          `↪ Bonus pulls from Patreon: ${slots.patreon.enabled ? "3/3" : "0/3"}`,
          `↪ Bonus pulls from Baccarat Card: ${slotText(slots.baccaratCard.enabled, 1)}`,
          `↪ Bonus pulls from Baccarat Devil Fruit: ${slotText(slots.baccaratFruit.enabled, 1)}`
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Pull Information" });

    await message.reply({ embeds: [embed] });
  }
};