const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");

function rarityText(item) {
  return item?.rarity ? ` (${String(item.rarity).toUpperCase()})` : "";
}

function amountText(item) {
  return `x${Number(item?.amount || 0)}`;
}

function formatSimpleList(items, emptyText) {
  if (!Array.isArray(items) || items.length === 0) return emptyText;

  const rows = items
    .filter((item) => Number(item?.amount || 0) > 0)
    .slice()
    .sort((a, b) => String(a.name || a.code || "").localeCompare(String(b.name || b.code || "")))
    .map((item) => `• ${item.name} ${amountText(item)}${rarityText(item)}`);

  return rows.length ? rows.join("\n") : emptyText;
}

function formatWeaponInventory(player) {
  const items = Array.isArray(player?.weapons) ? player.weapons : [];
  if (!items.length) return "No unequipped weapons owned.";

  const rows = items
    .filter((item) => Number(item?.amount || 0) > 0)
    .slice()
    .sort((a, b) => String(a.name || a.code || "").localeCompare(String(b.name || b.code || "")))
    .map((item) => `• ${item.name} ${amountText(item)}${rarityText(item)}`);

  return rows.length ? rows.join("\n") : "No unequipped weapons owned.";
}

function formatFruitInventory(items) {
  if (!Array.isArray(items) || items.length === 0) return "No unequipped devil fruits owned.";

  const rows = items
    .filter((item) => Number(item?.amount || 0) > 0)
    .slice()
    .sort((a, b) => String(a.name || a.code || "").localeCompare(String(b.name || b.code || "")))
    .map((item) => `• ${item.name} ${amountText(item)}${rarityText(item)}`);

  return rows.length ? rows.join("\n") : "No unequipped devil fruits owned.";
}

module.exports = {
  name: "inv",
  aliases: ["inventory", "bag"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`${player.username}'s Inventory`)
      .setDescription("Here is everything currently stored in your inventory.")
      .addFields(
        { name: "📦 Boxes", value: formatSimpleList(player.boxes, "No boxes owned."), inline: false },
        { name: "🎟️ Tickets", value: formatSimpleList(player.tickets, "No tickets owned."), inline: false },
        { name: "🧱 Materials", value: formatSimpleList(player.materials, "No materials owned."), inline: false },
        { name: "🗡️ Weapons", value: formatWeaponInventory(player), inline: false },
        { name: "🍎 Devil Fruits", value: formatFruitInventory(player.devilFruits), inline: false }
      )
      .setFooter({ text: "One Piece Bot • Inventory" });

    await message.reply({ embeds: [embed] });
  },
};