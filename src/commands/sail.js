const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const {
  getCurrentIsland,
  getNextIsland,
} = require("../data/islands");
const { getShipByCode } = require("../data/ships");

const BASE_TRAVEL_COOLDOWN_MS = 60 * 60 * 1000;

function formatRemaining(ms) {
  if (ms <= 0) return "Now";

  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;

  return "Now";
}

function getShipState(player) {
  const stored = player?.ship || {};
  const shipData = getShipByCode(stored.shipCode || stored.code || "small_boat");

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
  return Math.max(
    5 * 60 * 1000,
    BASE_TRAVEL_COOLDOWN_MS - reducedMinutes * 60 * 1000
  );
}

function isPhasedIsland(island) {
  return Array.isArray(island?.bossPhases) && island.bossPhases.length > 0;
}

function getBossPhaseState(player, islandCode) {
  return player?.story?.bossPhases?.[islandCode] || {
    phase1Cleared: false,
    phase2Cleared: false,
    completed: false,
  };
}

function isIslandBossRouteCleared(player, island) {
  if (!island) return false;

  const clearedBosses = Array.isArray(player?.story?.clearedIslandBosses)
    ? player.story.clearedIslandBosses
    : [];

  if (!isPhasedIsland(island)) {
    return clearedBosses.includes(island.code);
  }

  const phaseState = getBossPhaseState(player, island.code);

  return Boolean(
    phaseState.phase1Cleared &&
      phaseState.phase2Cleared &&
      (phaseState.completed || clearedBosses.includes(island.code))
  );
}

module.exports = {
  name: "sail",
  aliases: [],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const currentIsland = getCurrentIsland(player);
    const nextIsland = getNextIsland(currentIsland);
    const ship = getShipState(player);
    const now = Date.now();

    if (!currentIsland) {
      return message.reply(
        "Current island not found. Use `op travel` to check your route."
      );
    }

    if (!nextIsland) {
      return message.reply(
        [
          "There is no further island to sail to right now.",
          "",
          `**Current Island:** ${currentIsland.name}`,
          "If this looks wrong, use `op travel` and check your current route.",
        ].join("\n")
      );
    }

    if (!isIslandBossRouteCleared(player, currentIsland)) {
      return message.reply(
        `You must clear the boss route of \`${currentIsland.name}\` before sailing onward.`
      );
    }

    if (ship.nextTravelAt > now) {
      return message.reply(
        `Your ship is not ready yet.\nNext travel: **${formatRemaining(
          ship.nextTravelAt - now
        )}**`
      );
    }

    const shipTier = Number(ship.tier || 1);
    const requiredShipTier = Number(nextIsland.requiredShipTier || 1);

    if (shipTier < requiredShipTier) {
      return message.reply(
        [
          "Your ship is not strong enough.",
          `Current Ship Tier: \`${shipTier}\``,
          `Required Ship Tier for \`${nextIsland.name}\`: \`${requiredShipTier}\``,
          "",
          "Use `op ship upgrade` to upgrade your ship.",
        ].join("\n")
      );
    }

    const unlocked = Array.isArray(ship.unlockedIslands)
      ? [...ship.unlockedIslands]
      : ["foosha_village"];

    if (!unlocked.includes(nextIsland.code)) {
      unlocked.push(nextIsland.code);
    }

    const cooldownMs = getTravelCooldownMs(ship);

    updatePlayer(message.author.id, {
      currentIsland: nextIsland.name,
      ship: {
        ...(player.ship || {}),
        shipCode: ship.code,
        name: ship.name,
        tier: ship.tier,
        sea: nextIsland.sea,
        nextTravelAt: now + cooldownMs,
        unlockedIslands: unlocked,
        currentPort: nextIsland.name,
      },
    });

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle("⛵ Sailing Complete")
          .setDescription(
            [
              `**From:** \`${currentIsland.name}\``,
              `**To:** \`${nextIsland.name}\``,
              `**Sea:** \`${nextIsland.sea || "Unknown"}\``,
              `**Saga:** \`${nextIsland.saga || "Unknown"}\``,
              `**Ship:** \`${ship.name}\``,
              `**Ship Tier Used:** \`${shipTier}\``,
              "",
              `You have unlocked and arrived at **${nextIsland.name}**.`,
              `Next travel cooldown: **${formatRemaining(cooldownMs)}**`,
            ].join("\n")
          )
          .setThumbnail(ship.image || null)
          .setImage(nextIsland.image || null)
          .setFooter({
            text: "One Piece Bot • Sail",
          }),
      ],
    });
  },
};