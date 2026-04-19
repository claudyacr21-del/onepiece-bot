const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getCurrentIsland, getNextIsland } = require("../data/islands");
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

function ensureTravelState(player) {
  return {
    unlockedIslands: Array.isArray(player?.travel?.unlockedIslands)
      ? player.travel.unlockedIslands
      : ["foosha_village"],
    currentIslandCode:
      player?.travel?.currentIslandCode ||
      player?.currentIslandCode ||
      "foosha_village",
    cooldownUntil: Number(player?.travel?.cooldownUntil || 0),
  };
}

function isPhasedIsland(island) {
  return Array.isArray(island?.bossPhases) && island.bossPhases.length > 0;
}

function isIslandBossRouteCleared(player, island) {
  const clearedBosses = Array.isArray(player?.story?.clearedIslandBosses)
    ? player.story.clearedIslandBosses
    : [];

  if (!isPhasedIsland(island)) {
    return clearedBosses.includes(island.code);
  }

  const phaseState = player?.story?.bossPhases?.[island.code];
  return Boolean(phaseState?.phase1Cleared && phaseState?.phase2Cleared);
}

module.exports = {
  name: "sail",
  aliases: [],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const travel = ensureTravelState(player);

    const currentIsland = getCurrentIsland({
      ...player,
      travel,
      currentIslandCode: travel.currentIslandCode,
    });

    const nextIsland = getNextIsland(currentIsland?.code);

    if (!currentIsland) {
      return message.reply("Current island not found.");
    }

    if (!nextIsland) {
      return message.reply("There is no further island to sail to right now.");
    }

    if (!isIslandBossRouteCleared(player, currentIsland)) {
      return message.reply(
        `You must clear the boss route of \`${currentIsland.name}\` before sailing onward.`
      );
    }

    const ship = getShipByCode(player?.ship?.code || "small_boat");
    const shipTier = Number(player?.ship?.tier || ship?.tier || 1);
    const requiredShipTier = Number(nextIsland.requiredShipTier || 1);

    if (shipTier < requiredShipTier) {
      return message.reply(
        `Your ship is not strong enough.\nCurrent Ship Tier: \`${shipTier}\`\nRequired Ship Tier for \`${nextIsland.name}\`: \`${requiredShipTier}\``
      );
    }

    if (travel.cooldownUntil > Date.now()) {
      return message.reply(
        `You are still sailing.\nTravel cooldown remaining: **${formatRemaining(
          travel.cooldownUntil - Date.now()
        )}**`
      );
    }

    const unlocked = Array.isArray(travel.unlockedIslands)
      ? [...travel.unlockedIslands]
      : ["foosha_village"];

    if (!unlocked.includes(nextIsland.code)) {
      unlocked.push(nextIsland.code);
    }

    const nextTravel = {
      ...travel,
      unlockedIslands: unlocked,
      currentIslandCode: nextIsland.code,
      cooldownUntil: Date.now() + BASE_TRAVEL_COOLDOWN_MS,
    };

    updatePlayer(message.author.id, {
      travel: nextTravel,
      currentIslandCode: nextIsland.code,
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
              `**Ship Tier Used:** \`${shipTier}\``,
              "",
              `You have unlocked and arrived at **${nextIsland.name}**.`,
              `Next travel cooldown: **${formatRemaining(BASE_TRAVEL_COOLDOWN_MS)}**`,
            ].join("\n")
          )
          .setImage(nextIsland.image || null)
          .setFooter({ text: "One Piece Bot • Sail" }),
      ],
    });
  },
};