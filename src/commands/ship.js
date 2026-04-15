const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { getCurrentIsland, getNextIsland } = require("../data/islands");

const SAIL_COOLDOWN_MS = 60 * 60 * 1000;

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
    tier: ship.tier || 1,
    sea: ship.sea || "East Blue",
    nextSailAt: Number(ship.nextSailAt || 0)
  };
}

module.exports = {
  name: "ship",
  aliases: ["boat", "voyage"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const currentIsland = getCurrentIsland(player);
    const nextIsland = getNextIsland(currentIsland);
    const ship = getShipInfo(player);
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
          "## Current Route",
          `**Current Island:** \`${currentIsland?.name || "Unknown"}\``,
          `**Next Island:** \`${nextIsland?.name || "None"}\``,
          nextIsland ? `**Next Boss Route:** \`${nextIsland.boss || "Unknown"}\`` : null,
          "",
          "## Sailing Status",
          `**Next Sail:** \`${formatRemaining(ship.nextSailAt - now)}\``,
          "",
          nextIsland
            ? "Use `op sail` to travel to the next island."
            : "You have reached the end of the current route."
        ].filter(Boolean).join("\n")
      )
      .setFooter({ text: "One Piece Bot • Ship" });

    return message.reply({ embeds: [embed] });
  }
};