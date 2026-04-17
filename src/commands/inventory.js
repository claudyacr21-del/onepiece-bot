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

  return items
    .slice()
    .sort((a, b) => String(a.name || a.code || "").localeCompare(String(b.name || b.code || "")))
    .map((item) => `• ${item.name} ${amountText(item)}${rarityText(item)}`)
    .join("\n");
}

function getEquippedWeaponLevels(player) {
  const result = new Map();
  const cards = Array.isArray(player?.cards) ? player.cards : [];

  for (const card of cards) {
    const equippedWeapons = Array.isArray(card?.equippedWeapons) ? card.equippedWeapons : [];
    for (const weapon of equippedWeapons) {
      const code = String(weapon?.code || "");
      if (!code) continue;
      const current = result.get(code) || [];
      current.push({
        owner: card.displayName || card.name || "Unknown",
        level: Number(weapon?.upgradeLevel || 0),
      });
      result.set(code, current);
    }
  }

  return result;
}

function formatWeaponInventory(player) {
  const items = Array.isArray(player?.weapons) ? player.weapons : [];
  if (!items.length) return "No weapons owned.";

  const equippedMap = getEquippedWeaponLevels(player);

  return items
    .slice()
    .sort((a, b) => String(a.name || a.code || "").localeCompare(String(b.name || b.code || "")))
    .map((item) => {
      const equippedInfo = equippedMap.get(String(item.code || "")) || [];
      const equippedText = equippedInfo.length
        ? ` • Equipped: ${equippedInfo.map((x) => `${x.owner}${x.level > 0 ? ` +${x.level}` : ""}`).join(", ")}`
        : "";
      return `• ${item.name} ${amountText(item)}${rarityText(item)}${equippedText}`;
    })
    .join("\n");
}

function formatFruitInventory(items) {
  if (!Array.isArray(items) || items.length === 0) return "No devil fruits owned.";

  return items
    .slice()
    .sort((a, b) => String(a.name || a.code || "").localeCompare(String(b.name || b.code || "")))
    .map((item) => `• ${item.name} ${amountText(item)}${rarityText(item)}`)
    .join("\n");
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