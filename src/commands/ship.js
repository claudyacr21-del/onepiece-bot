const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { getCurrentIsland, getNextIsland, getUnlockedIslandObjects } = require("../data/islands");

function formatRemaining(ms) {
  if (ms <= 0) return "Now";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "Now";
}

function getShipInfo(player) {
  const ship = player?.ship || {};
  return {
    name: ship.name || "Going Merry",
    tier: Number(ship.tier || 1),
    sea: ship.sea || "East Blue",
    nextTravelAt: Number(ship.nextTravelAt || 0),
    unlockedIslands: Array.isArray(ship.unlockedIslands) && ship.unlockedIslands.length
      ? ship.unlockedIslands
      : ["shells_town"]
  };
}

module.exports = {
  name: "ship",
  aliases: ["boat", "voyage"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const ship = getShipInfo(player);
    const currentIsland = getCurrentIsland(player);
    const nextIsland = getNextIsland(currentIsland);
    const unlocked = getUnlockedIslandObjects(player);
    const now = Date.now();

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("🚢 Ship Status")
      .setDescription(
        [
          `**Ship Name:** \`${ship.name}\``,
          `**Ship Tier:** \`${ship.tier}\``,
          `**Current Sea:** \`${currentIsland?.sea || ship.sea}\``,
          "",
          "## Route",
          `**Current Island:** \`${currentIsland?.name || "Unknown"}\``,
          `**Next Island:** \`${nextIsland?.name || "None"}\``,
          nextIsland ? `**Required Ship Tier:** \`${nextIsland.requiredShipTier}\`` : null,
          nextIsland ? `**Boss Route Ahead:** \`${nextIsland.boss || "Unknown"}\`` : null,
          "",
          "## Travel Status",
          `**Next Travel:** \`${formatRemaining(ship.nextTravelAt - now)}\``,
          "",
          "## Unlocked Islands",
          unlocked.map((island) => `• ${island.name}`).join("\n") || "• Shells Town",
          "",
          "Use `op sail` to unlock the next island.",
          "Use `op travel <island name>` to return to an unlocked island."
        ].filter(Boolean).join("\n")
      )
      .setFooter({ text: "One Piece Bot • Ship" });

    return message.reply({ embeds: [embed] });
  }
};