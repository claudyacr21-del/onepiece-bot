const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");

function normalize(text) {
  return String(text || "").toLowerCase().trim().replace(/\s+/g, " ");
}

module.exports = {
  name: "remove",
  aliases: ["unequip"],
  async execute(message, args) {
    if (!args.length) {
      return message.reply("Usage: `op remove <card name>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const cards = Array.isArray(player.cards) ? player.cards : [];
    const team = player.team || { slots: [null, null, null] };
    const query = normalize(args.join(" "));

    const slotIndex = team.slots.findIndex((instanceId) => {
      if (!instanceId) return false;
      const card = cards.find((entry) => entry.instanceId === instanceId);
      if (!card) return false;

      const fields = [
        card.displayName,
        card.name,
        card.title,
        card.code,
        card.variant,
        card.arc
      ]
        .filter(Boolean)
        .map((value) => normalize(value));

      return fields.some((value) => value.includes(query));
    });

    if (slotIndex === -1) {
      return message.reply(`No team card found matching \`${args.join(" ")}\`.`);
    }

    const card = cards.find((entry) => entry.instanceId === team.slots[slotIndex]);
    const newSlots = [...team.slots];
    newSlots[slotIndex] = null;

    updatePlayer(message.author.id, {
      team: {
        slots: newSlots
      }
    });

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("❌ Card Removed From Team")
      .setDescription(
        [
          `**Card:** ${card?.displayName || card?.name || "Unknown Card"}`,
          `**Position:** ${slotIndex + 1}`
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Team Setup" });

    return message.reply({ embeds: [embed] });
  }
};