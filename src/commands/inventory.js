const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");

function formatItemList(items, emptyText) {
  if (!Array.isArray(items) || items.length === 0) {
    return emptyText;
  }

  return items
    .map((item) => {
      const rarity = item.rarity ? ` (${item.rarity})` : "";
      const amount = Number(item.amount || 0);
      return `• ${item.name} x${amount}${rarity}`;
    })
    .join("\n");
}

module.exports = {
  name: "inv",
  aliases: ["inventory", "bag"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`🎒 ${player.username}'s Inventory`)
      .setDescription("Here is everything currently stored in your inventory.")
      .addFields(
        {
          name: "📦 Boxes",
          value: formatItemList(player.boxes, "No boxes owned."),
          inline: false
        },
        {
          name: "🎟️ Tickets",
          value: formatItemList(player.tickets, "No tickets owned."),
          inline: false
        },
        {
          name: "🧱 Materials",
          value: formatItemList(player.materials, "No materials owned."),
          inline: false
        },
        {
          name: "🗡️ Weapons",
          value: formatItemList(player.weapons, "No weapons owned."),
          inline: false
        },
        {
          name: "🍎 Devil Fruits",
          value: formatItemList(player.devilFruits, "No devil fruits owned."),
          inline: false
        }
      )
      .setFooter({ text: "One Piece Bot • Inventory" });

    await message.reply({ embeds: [embed] });
  }
};