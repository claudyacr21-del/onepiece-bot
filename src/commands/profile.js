const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function countAmount(list) {
  if (!Array.isArray(list)) return 0;

  return list.reduce((total, entry) => {
    if (!entry) return total;
    return total + (Number(entry.amount) > 0 ? Number(entry.amount) : 1);
  }, 0);
}

module.exports = {
  name: "profile",
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const totalCards = Array.isArray(player.cards) ? player.cards.length : 0;
    const totalItems = countAmount(player.items);
    const totalBoxes = countAmount(player.boxes);
    const totalWeapons = countAmount(player.weapons);
    const totalDevilFruits = countAmount(player.devilFruits);
    const totalTickets = countAmount(player.tickets);
    const totalMaterials = countAmount(player.materials);

    const totalResources =
      totalItems +
      totalBoxes +
      totalWeapons +
      totalDevilFruits +
      totalTickets +
      totalMaterials;

    const profileText = [
      "🧭 **Captain Info**",
      `• Current Island: \`${player.currentIsland || "Shells Town"}\``,
      `• Username: \`${message.author.username}\``,
      "",
      "💰 **Wallet**",
      `• Berries: \`${formatNumber(player.berries)}\` 🍇`,
      `• Gems: \`${formatNumber(player.gems)}\` 💎`,
      "",
      "🃏 **Card Statistics**",
      `• Cards Owned: \`${formatNumber(totalCards)}\``,
      `• Total Resources: \`${formatNumber(totalResources)}\``,
      `• Boxes: \`${formatNumber(totalBoxes)}\``,
      `• Weapons: \`${formatNumber(totalWeapons)}\``,
      `• Devil Fruits: \`${formatNumber(totalDevilFruits)}\``,
      "",
      "🎒 **Inventory Stats**",
      `• Items: \`${formatNumber(totalItems)}\``,
      `• Materials: \`${formatNumber(totalMaterials)}\``,
      `• Tickets: \`${formatNumber(totalTickets)}\``,
      "",
      "⚔️ **Game Stats**",
      "• Team Power: `Coming Soon`",
      "• Story Progress: `Coming Soon`",
      "• Win Streak: `Coming Soon`"
    ].join("\n");

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`${message.author.username}'s One Piece Profile`)
      .setDescription(profileText)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: "One Piece Bot" });

    return message.reply({ embeds: [embed] });
  }
};