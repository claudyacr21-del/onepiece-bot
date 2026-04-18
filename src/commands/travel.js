const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const {
  getCurrentIsland,
  getUnlockedIslandObjects,
  getNextIsland,
  getIslandByName,
} = require("../data/islands");
const { getShipByCode } = require("../data/ships");

const BASE_TRAVEL_COOLDOWN_MS = 60 * 60 * 1000;

function formatRemaining(ms) {
  if (ms <= 0) return "Now";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "Now";
}

function getShipState(player) {
  const stored = player?.ship || {};
  const shipData = getShipByCode(stored.shipCode || "small_boat");

  return {
    code: shipData.code,
    name: stored.name || shipData.name,
    tier: Number(stored.tier || shipData.tier || 1),
    sea: stored.sea || shipData.sea || "East Blue",
    hpBonus: Number(shipData.hpBonus || 0),
    rewardBonus: Number(shipData.rewardBonus || 0),
    travelCooldownReduction: Number(shipData.travelCooldownReduction || 0),
    nextTravelAt: Number(stored.nextTravelAt || 0),
    unlockedIslands:
      Array.isArray(stored.unlockedIslands) && stored.unlockedIslands.length
        ? stored.unlockedIslands
        : ["foosha_village"],
    currentPort: stored.currentPort || player?.currentIsland || "Foosha Village",
    image: shipData.image || "",
  };
}

function getTravelCooldownMs(ship) {
  const reducedMinutes = Math.max(0, Number(ship.travelCooldownReduction || 0));
  return Math.max(5 * 60 * 1000, BASE_TRAVEL_COOLDOWN_MS - reducedMinutes * 60 * 1000);
}

module.exports = {
  name: "travel",
  aliases: ["route", "islandroute"],
  async execute(message, args) {
    const player = getPlayer(message.author.id, message.author.username);
    const currentIsland = getCurrentIsland(player);
    const unlockedIslands = getUnlockedIslandObjects(player);
    const nextIsland = getNextIsland(currentIsland);
    const ship = getShipState(player);
    const clearedBosses = Array.isArray(player?.story?.clearedIslandBosses)
      ? player.story.clearedIslandBosses
      : [];
    const now = Date.now();

    const query = args.join(" ").trim();

    if (!query) {
      const unlockedText = unlockedIslands.length
        ? unlockedIslands
            .map((island, index) => {
              const status = island.code === currentIsland.code ? "🌍 Current" : "✅ Unlocked";
              const bossClear = clearedBosses.includes(island.code)
                ? "🏆 Boss Cleared"
                : island.boss
                  ? "⚔️ Boss Pending"
                  : "—";
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
                `**Ship:** ${ship.name} (Tier ${ship.tier})`,
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
    }

    const targetIsland = getIslandByName(query);

    if (!targetIsland) {
      return message.reply(`Island not found: \`${query}\``);
    }

    if (currentIsland.code === targetIsland.code) {
      return message.reply(`You are already at **${targetIsland.name}**.`);
    }

    if (ship.nextTravelAt > now) {
      return message.reply(
        `Your ship is not ready yet.\nNext travel: ${formatRemaining(ship.nextTravelAt - now)}`
      );
    }

    const unlockedCodes = Array.isArray(ship.unlockedIslands) ? ship.unlockedIslands : ["foosha_village"];
    if (!unlockedCodes.includes(targetIsland.code)) {
      return message.reply(`You have not unlocked **${targetIsland.name}** yet.`);
    }

    if (ship.tier < Number(targetIsland.requiredShipTier || 1)) {
      return message.reply(
        `Your ship tier is too low.\nYou need Ship Tier ${targetIsland.requiredShipTier} to reach ${targetIsland.name}.`
      );
    }

    const cooldownMs = getTravelCooldownMs(ship);

    updatePlayer(message.author.id, {
      currentIsland: targetIsland.name,
      ship: {
        ...(player.ship || {}),
        shipCode: ship.code,
        name: ship.name,
        tier: ship.tier,
        sea: targetIsland.sea,
        nextTravelAt: now + cooldownMs,
        unlockedIslands: unlockedCodes,
        currentPort: targetIsland.name,
      },
    });

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle("🧭 Travel Successful")
          .setDescription(
            [
              `**Departed From:** ${currentIsland.name}`,
              `**Arrived At:** ${targetIsland.name}`,
              `**Sea:** ${targetIsland.sea}`,
              `**Ship:** ${ship.name}`,
              `**Ship Tier:** ${ship.tier}`,
              `**Next Travel:** ${formatRemaining(cooldownMs)}`,
            ].join("\n")
          )
          .setThumbnail(ship.image || null)
          .setImage(targetIsland.image || null),
      ],
    });
  },
};