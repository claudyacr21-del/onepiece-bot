const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");

function rarityText(item) {
  return item?.rarity ? ` (${String(item.rarity).toUpperCase()})` : "";
}

function amountText(item) {
  return `x${Number(item?.amount || 0)}`;
}

function cleanList(items) {
  return Array.isArray(items)
    ? items
        .filter((item) => Number(item?.amount || 0) > 0)
        .slice()
        .sort((a, b) => String(a.name || a.code || "").localeCompare(String(b.name || b.code || "")))
    : [];
}

function formatList(items) {
  return items.map((item) => `• ${item.name} ${amountText(item)}${rarityText(item)}`).join("\n");
}

module.exports = {
  name: "inv",
  aliases: ["inventory", "bag"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const boxes = cleanList(player.boxes);
    const tickets = cleanList(player.tickets);
    const materials = cleanList(player.materials);
    const weapons = cleanList(player.weapons);
    const devilFruits = cleanList(player.devilFruits);

    const fields = [
      {
        name: "📦 Boxes",
        value: boxes.length ? formatList(boxes) : "No boxes owned.",
        inline: false,
      },
      {
        name: "🎟️ Tickets",
        value: tickets.length ? formatList(tickets) : "No tickets owned.",
        inline: false,
      },
      {
        name: "🧱 Materials",
        value: materials.length ? formatList(materials) : "No materials owned.",
        inline: false,
      },
    ];

    if (weapons.length) {
      fields.push({
        name: "🗡️ Weapons",
        value: formatList(weapons),
        inline: false,
      });
    }

    if (devilFruits.length) {
      fields.push({
        name: "🍎 Devil Fruits",
        value: formatList(devilFruits),
        inline: false,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`${player.username}'s Inventory`)
      .setDescription("Here is everything currently stored in your inventory.")
      .addFields(fields)
      .setFooter({ text: "One Piece Bot • Inventory" });

    await message.reply({ embeds: [embed] });
  },
};