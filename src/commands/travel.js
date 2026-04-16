const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { getCurrentIsland, getUnlockedIslandObjects, getNextIsland } = require("../data/islands");
const { getShipByCode } = require("../data/ships");

module.exports = {
  name: "travel",
  aliases: ["route", "islandroute"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const currentIsland = getCurrentIsland(player);
    const unlockedIslands = getUnlockedIslandObjects(player);
    const nextIsland = getNextIsland(currentIsland);
    const ship = getShipByCode(player?.ship?.shipCode || "going_merry");
    const clearedBosses = Array.isArray(player?.story?.clearedIslandBosses)
      ? player.story.clearedIslandBosses
      : [];

    const unlockedText = unlockedIslands.length
      ? unlockedIslands
          .map((island, index) => {
            const status = island.code === currentIsland.code ? "🌍 Current" : "✅ Unlocked";
            const bossClear = clearedBosses.includes(island.code) ? "👑 Boss Cleared" : "⚔️ Boss Pending";
            return `${index + 1}. **${island.name}** — ${status} • ${bossClear}`;
          })
          .join("\n")
      : "No islands unlocked yet.";

    const nextText = nextIsland
      ? [
          `**Next Canon Island:** ${nextIsland.name}`,
          `**Required Ship Tier:** ${nextIsland.requiredShipTier}`,
          `**Boss Gate from Current Island:** ${clearedBosses.includes(currentIsland.code) ? "Cleared" : "Not Cleared"}`,
        ].join("\n")
      : "You have reached the end of the currently configured island route.";

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x1abc9c)
          .setTitle("🧭 Travel Route")
          .setDescription(
            [
              `**Current Island:** ${currentIsland.name}`,
              `**Current Sea:** ${currentIsland.sea}`,
              `**Ship:** ${ship.name} (Tier ${player?.ship?.tier || ship.tier || 1})`,
              "",
              "## Unlocked Islands",
              unlockedText,
              "",
              "## Next Route",
              nextText,
            ].join("\n")
          )
          .setThumbnail(ship.image || null)
          .setImage(currentIsland.image || null),
      ],
    });
  },
};