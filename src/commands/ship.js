const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { getCurrentIsland, getNextIsland, getUnlockedIslandObjects } = require("../data/islands");
const { getShipByCode } = require("../data/ships");

function formatRemaining(ms) {
  if (ms <= 0) return "Now";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "Now";
}

module.exports = {
  name: "ship",
  aliases: ["boat", "voyage"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const currentIsland = getCurrentIsland(player);
    const nextIsland = getNextIsland(currentIsland);
    const unlocked = getUnlockedIslandObjects(player);
    const shipData = getShipByCode(player?.ship?.shipCode || "going_merry");
    const shipTier = Number(player?.ship?.tier || shipData.tier || 1);
    const nextTravelAt = Number(player?.ship?.nextTravelAt || 0);
    const now = Date.now();
    const bossCleared = Array.isArray(player?.story?.clearedIslandBosses)
      ? player.story.clearedIslandBosses.includes(currentIsland.code)
      : false;

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("🚢 Ship Status")
      .setDescription(
        [
          `**Ship Name:** \`${shipData.name}\``,
          `**Ship Tier:** \`${shipTier}\``,
          `**Current Sea:** \`${currentIsland?.sea || "Unknown"}\``,
          "",
          "## Current Route",
          `**Current Island:** \`${currentIsland?.name || "Unknown"}\``,
          `**Current Boss:** \`${currentIsland?.boss || "None"}\``,
          `**Boss Cleared:** \`${bossCleared ? "Yes" : "No"}\``,
          `**Next Island:** \`${nextIsland?.name || "None"}\``,
          nextIsland ? `**Required Ship Tier:** \`${nextIsland.requiredShipTier}\`` : null,
          "",
          "## Travel Status",
          `**Next Travel:** \`${formatRemaining(nextTravelAt - now)}\``,
          "",
          "## Unlocked Islands",
          unlocked.map((island) => `• ${island.name}`).join("\n") || "• Foosha Village"
        ].filter(Boolean).join("\n")
      )
      .setThumbnail(shipData.image || null)
      .setImage(currentIsland.image || null)
      .setFooter({ text: "One Piece Bot • Ship" });

    return message.reply({ embeds: [embed] });
  }
};