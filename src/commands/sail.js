const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
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

function getPlayerShip(player) {
  const stored = player?.ship || {};
  return getShipByCode(stored.shipCode || stored.code || "small_boat");
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

    if (!currentIsland) {
      return message.reply("Current island not found.");
    }

    const nextIsland = getNextIsland(currentIsland.code);

    if (!nextIsland) {
      return message.reply("There is no further island to sail to right now.");
    }

    if (!isIslandBossRouteCleared(player, currentIsland)) {
      return message.reply(
        `You must clear the boss route of \`${currentIsland.name}\` before sailing onward.`
      );
    }

    const ship = getPlayerShip(player);
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

    let finalCurrentIsland = currentIsland;
    let finalNextIsland = nextIsland;
    let finalShipTier = shipTier;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const freshTravel = ensureTravelState(fresh);
          const freshCurrentIsland = getCurrentIsland({
            ...fresh,
            travel: freshTravel,
            currentIslandCode: freshTravel.currentIslandCode,
          });

          if (!freshCurrentIsland) {
            throw new Error("Current island not found.");
          }

          const freshNextIsland = getNextIsland(freshCurrentIsland.code);

          if (!freshNextIsland) {
            throw new Error("There is no further island to sail to right now.");
          }

          if (!isIslandBossRouteCleared(fresh, freshCurrentIsland)) {
            throw new Error(
              `You must clear the boss route of \`${freshCurrentIsland.name}\` before sailing onward.`
            );
          }

          const freshShip = getPlayerShip(fresh);
          const freshShipTier = Number(fresh?.ship?.tier || freshShip?.tier || 1);
          const freshRequiredShipTier = Number(freshNextIsland.requiredShipTier || 1);

          if (freshShipTier < freshRequiredShipTier) {
            throw new Error(
              `Your ship is not strong enough.\nCurrent Ship Tier: \`${freshShipTier}\`\nRequired Ship Tier for \`${freshNextIsland.name}\`: \`${freshRequiredShipTier}\``
            );
          }

          if (freshTravel.cooldownUntil > Date.now()) {
            throw new Error(
              `You are still sailing.\nTravel cooldown remaining: **${formatRemaining(
                freshTravel.cooldownUntil - Date.now()
              )}**`
            );
          }

          const unlocked = Array.isArray(freshTravel.unlockedIslands)
            ? [...freshTravel.unlockedIslands]
            : ["foosha_village"];

          if (!unlocked.includes(freshNextIsland.code)) {
            unlocked.push(freshNextIsland.code);
          }

          const nextTravel = {
            ...freshTravel,
            unlockedIslands: unlocked,
            currentIslandCode: freshNextIsland.code,
            cooldownUntil: Date.now() + BASE_TRAVEL_COOLDOWN_MS,
          };

          finalCurrentIsland = freshCurrentIsland;
          finalNextIsland = freshNextIsland;
          finalShipTier = freshShipTier;

          return {
            ...fresh,
            travel: nextTravel,
            currentIslandCode: freshNextIsland.code,
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply(error.message || "Sail failed.");
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle("⛵ Sailing Complete")
          .setDescription(
            [
              `**From:** \`${finalCurrentIsland.name}\``,
              `**To:** \`${finalNextIsland.name}\``,
              `**Sea:** \`${finalNextIsland.sea || "Unknown"}\``,
              `**Saga:** \`${finalNextIsland.saga || "Unknown"}\``,
              `**Ship Tier Used:** \`${finalShipTier}\``,
              "",
              `You have unlocked and arrived at **${finalNextIsland.name}**.`,
              `Next travel cooldown: **${formatRemaining(BASE_TRAVEL_COOLDOWN_MS)}**`,
            ].join("\n")
          )
          .setImage(finalNextIsland.image || null)
          .setFooter({
            text: "One Piece Bot • Sail",
          }),
      ],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};