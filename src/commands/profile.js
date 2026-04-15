const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { PREMIUM_ROLE_NAME } = require("../utils/pullAccess");

function hasRole(message, roleName) {
  if (!message.member?.roles?.cache || !roleName) return false;
  return message.member.roles.cache.some((role) => role.name === roleName);
}

function countTotalAmount(list) {
  if (!Array.isArray(list)) return 0;
  return list.reduce((sum, item) => sum + Number(item?.amount || 0), 0);
}

function getProfileImage(message) {
  return message.author.displayAvatarURL({ extension: "png", size: 512 });
}

module.exports = {
  name: "profile",
  aliases: ["pf", "me"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const cards = Array.isArray(player.cards) ? player.cards : [];
    const battleCards = cards.filter((card) => card.cardRole !== "boost");
    const boostCards = cards.filter((card) => card.cardRole === "boost");

    const totalFragments = countTotalAmount(player.fragments);
    const totalBoxes = countTotalAmount(player.boxes);
    const totalTickets = countTotalAmount(player.tickets);
    const totalMaterials = countTotalAmount(player.materials);
    const totalWeapons = countTotalAmount(player.weapons);
    const totalFruits = countTotalAmount(player.devilFruits);
    const totalResources = totalBoxes + totalTickets + totalMaterials + totalWeapons + totalFruits;

    const isMotherFlame = hasRole(message, PREMIUM_ROLE_NAME);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setAuthor({
        name: `${player.username}'s One Piece Profile`,
        iconURL: getProfileImage(message)
      })
      .setDescription(
        [
          "🧭 **Captain Info**",
          `- Current Island: \`${player.currentIsland || "Shells Town"}\``,
          `- Username: \`${player.username}\``,
          `- Premium: \`${isMotherFlame ? "Mother Flame" : "Normal"}\``,
          `- Clan: \`${player?.clan?.name || "None"}\``,
          "",
          "💰 **Wallet**",
          `- Berries: \`${Number(player.berries || 0).toLocaleString("en-US")}\` 🍇`,
          `- Gems: \`${Number(player.gems || 0).toLocaleString("en-US")}\` 💎`,
          "",
          "🃏 **Card Statistics**",
          `- Battle Cards: \`${battleCards.length}\``,
          `- Boost Cards: \`${boostCards.length}\``,
          `- Total Cards Owned: \`${cards.length}\``,
          `- Total Fragments: \`${totalFragments}\``,
          "",
          "🎒 **Inventory Stats**",
          `- Total Resources: \`${totalResources}\``,
          `- Boxes: \`${totalBoxes}\``,
          `- Weapons: \`${totalWeapons}\``,
          `- Devil Fruits: \`${totalFruits}\``,
          `- Materials: \`${totalMaterials}\``,
          `- Tickets: \`${totalTickets}\``,
          "",
          "⚔️ **Game Stats**",
          "- Team Power: `Coming Soon`",
          "- Story Progress: `Coming Soon`",
          "- Win Streak: `Coming Soon`"
        ].join("\n")
      )
      .setThumbnail(getProfileImage(message))
      .setFooter({ text: "One Piece Bot" });

    return message.reply({ embeds: [embed] });
  }
};