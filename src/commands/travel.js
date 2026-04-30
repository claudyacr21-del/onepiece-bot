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

function getBossStatus(player, island) {
  if (!island?.boss && !isPhasedIsland(island)) return "—";

  if (!isPhasedIsland(island)) {
    return isIslandBossRouteCleared(player, island)
      ? "✅ Boss Cleared"
      : "⚔️ Boss Pending";
  }

  const phaseState = getBossPhaseState(player, island.code);

  if (phaseState.phase1Cleared && phaseState.phase2Cleared) {
    return "✅ Phase 1 + Phase 2 Cleared";
  }

  if (phaseState.phase1Cleared) {
    return "⚔️ Phase 2 Pending";
  }

  return "⚔️ Phase 1 Pending";
}

function getRouteStatus(currentIsland, island) {
  if (island.code === currentIsland.code) return "📍 Current";
  return "✅ Unlocked";
}

function getTravelReadiness(player, currentIsland, nextIsland, ship, now) {
  if (!nextIsland) {
    return "🏁 You have reached the end of the current route.";
  }

  const bossCleared = isIslandBossRouteCleared(player, currentIsland);
  const shipReady = ship.nextTravelAt <= now;
  const shipTierReady = Number(ship.tier || 1) >= Number(nextIsland.requiredShipTier || 1);

  const lines = [
    `Next Island: **${nextIsland.name}**`,
    `Required Ship Tier: **${nextIsland.requiredShipTier || 1}**`,
    `Boss Gate: **${bossCleared ? "Cleared" : "Not Cleared"}**`,
    `Ship Cooldown: **${shipReady ? "Ready" : formatRemaining(ship.nextTravelAt - now)}**`,
    `Ship Tier: **${shipTierReady ? "Ready" : `Need Tier ${nextIsland.requiredShipTier}`}**`,
  ];

  return lines.join("\n");
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
    const now = Date.now();
    const query = args.join(" ").trim();

    if (!query) {
      const unlockedText = unlockedIslands.length
        ? unlockedIslands
            .map((island, index) => {
              return [
                `**${index + 1}. ${island.name}**`,
                `↪ Status: ${getRouteStatus(currentIsland, island)}`,
                `↪ Sea: ${island.sea || "Unknown"}`,
                `↪ Boss: ${getBossStatus(player, island)}`,
              ].join("\n");
            })
            .join("\n\n")
        : "No islands unlocked yet.";

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1abc9c)
            .setTitle("🧭 Travel Route")
            .setDescription(
              [
                `**Current Island:** ${currentIsland.name}`,
                `**Current Sea:** ${currentIsland.sea || "Unknown"}`,
                `**Ship:** ${ship.name} • Tier ${ship.tier}`,
                `**Ship Ready:** ${
                  ship.nextTravelAt > now
                    ? formatRemaining(ship.nextTravelAt - now)
                    : "Ready"
                }`,
                "",
                "## Route Readiness",
                getTravelReadiness(player, currentIsland, nextIsland, ship, now),
                "",
                "## Unlocked Islands",
                unlockedText,
                "",
                "Use `op sail` to unlock the next canon island.",
                "Use `op travel <island>` to move between unlocked islands.",
              ].join("\n")
            )
            .setThumbnail(ship.image || null)
            .setImage(currentIsland.image || null)
            .setFooter({
              text: "One Piece Bot • Travel",
            }),
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
        `Your ship is not ready yet.\nNext travel: **${formatRemaining(
          ship.nextTravelAt - now
        )}**`
      );
    }

    const unlockedCodes = Array.isArray(ship.unlockedIslands)
      ? ship.unlockedIslands
      : ["foosha_village"];

    if (!unlockedCodes.includes(targetIsland.code)) {
      return message.reply(
        [
          `You have not unlocked **${targetIsland.name}** yet.`,
          "",
          "Use `op sail` to progress through the canon route.",
        ].join("\n")
      );
    }

    if (Number(ship.tier || 1) < Number(targetIsland.requiredShipTier || 1)) {
      return message.reply(
        [
          "Your ship tier is too low.",
          `Current Ship Tier: **${ship.tier}**`,
          `Required Ship Tier: **${targetIsland.requiredShipTier}**`,
          "",
          "Use `op ship upgrade` to upgrade your ship.",
        ].join("\n")
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
          .setTitle("⛵ Travel Successful")
          .setDescription(
            [
              `**Departed From:** ${currentIsland.name}`,
              `**Arrived At:** ${targetIsland.name}`,
              `**Sea:** ${targetIsland.sea || "Unknown"}`,
              `**Saga:** ${targetIsland.saga || "Unknown"}`,
              `**Ship:** ${ship.name}`,
              `**Ship Tier:** ${ship.tier}`,
              "",
              `Next travel cooldown: **${formatRemaining(cooldownMs)}**`,
            ].join("\n")
          )
          .setThumbnail(ship.image || null)
          .setImage(targetIsland.image || null)
          .setFooter({
            text: "One Piece Bot • Travel",
          }),
      ],
    });
  },
};