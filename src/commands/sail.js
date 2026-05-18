const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const {
  getCurrentIsland,
  getNextIsland,
  getIslandByCode,
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

function uniqueCodes(list) {
  return [...new Set((Array.isArray(list) ? list : []).map(String).filter(Boolean))];
}

function ensureTravelState(player) {
  const shipUnlocked = Array.isArray(player?.ship?.unlockedIslands)
    ? player.ship.unlockedIslands
    : [];

  const travelUnlocked = Array.isArray(player?.travel?.unlockedIslands)
    ? player.travel.unlockedIslands
    : [];

  const currentIslandCode =
    player?.travel?.currentIslandCode ||
    player?.currentIslandCode ||
    player?.ship?.currentIslandCode ||
    null;

  const currentIslandByCode = currentIslandCode ? getIslandByCode(currentIslandCode) : null;
  const currentIslandByName = getCurrentIsland(player);
  const resolvedCurrentIsland = currentIslandByCode || currentIslandByName || getIslandByCode("foosha_village");

  return {
    unlockedIslands: uniqueCodes([
      "foosha_village",
      ...shipUnlocked,
      ...travelUnlocked,
      resolvedCurrentIsland?.code,
    ]),
    currentIslandCode: resolvedCurrentIsland?.code || "foosha_village",
    cooldownUntil: Number(
      player?.travel?.cooldownUntil ||
        player?.ship?.nextTravelAt ||
        0
    ),
  };
}

function resolveCurrentIsland(player) {
  const travel = ensureTravelState(player);

  return (
    getIslandByCode(travel.currentIslandCode) ||
    getCurrentIsland(player) ||
    getIslandByCode("foosha_village")
  );
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

  return Boolean(
    phaseState?.phase1Cleared &&
      phaseState?.phase2Cleared &&
      (phaseState?.completed || clearedBosses.includes(island.code))
  );
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
    const currentIsland = resolveCurrentIsland(player);

    if (!currentIsland) {
      return message.reply({
        content: "Current island not found.",
        allowedMentions: { repliedUser: false },
      });
    }

    const nextIsland = getNextIsland(currentIsland);

    if (!nextIsland) {
      return message.reply({
        content: "There is no further island to sail to right now.",
        allowedMentions: { repliedUser: false },
      });
    }

    if (!isIslandBossRouteCleared(player, currentIsland)) {
      return message.reply({
        content: `You must clear the boss route of \`${currentIsland.name}\` before sailing onward.`,
        allowedMentions: { repliedUser: false },
      });
    }

    const ship = getPlayerShip(player);
    const shipTier = Number(player?.ship?.tier || ship?.tier || 1);
    const requiredShipTier = Number(nextIsland.requiredShipTier || 1);

    if (shipTier < requiredShipTier) {
      return message.reply({
        content: `Your ship is not strong enough.\nCurrent Ship Tier: \`${shipTier}\`\nRequired Ship Tier for \`${nextIsland.name}\`: \`${requiredShipTier}\``,
        allowedMentions: { repliedUser: false },
      });
    }

    if (travel.cooldownUntil > Date.now()) {
      return message.reply({
        content: `You are still sailing.\nTravel cooldown remaining: **${formatRemaining(
          travel.cooldownUntil - Date.now()
        )}**`,
        allowedMentions: { repliedUser: false },
      });
    }

    let finalCurrentIsland = currentIsland;
    let finalNextIsland = nextIsland;
    let finalShipTier = shipTier;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const freshTravel = ensureTravelState(fresh);
          const freshCurrentIsland = resolveCurrentIsland(fresh);

          if (!freshCurrentIsland) {
            throw new Error("Current island not found.");
          }

          const freshNextIsland = getNextIsland(freshCurrentIsland);

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

          const unlocked = uniqueCodes([
            "foosha_village",
            ...freshTravel.unlockedIslands,
            freshCurrentIsland.code,
            freshNextIsland.code,
          ]);

          const cooldownUntil = Date.now() + BASE_TRAVEL_COOLDOWN_MS;

          finalCurrentIsland = freshCurrentIsland;
          finalNextIsland = freshNextIsland;
          finalShipTier = freshShipTier;

          return {
            ...fresh,
            currentIsland: freshNextIsland.name,
            currentIslandCode: freshNextIsland.code,
            travel: {
              ...(fresh.travel || {}),
              unlockedIslands: unlocked,
              currentIslandCode: freshNextIsland.code,
              cooldownUntil,
            },
            ship: {
              ...(fresh.ship || {}),
              shipCode: fresh?.ship?.shipCode || fresh?.ship?.code || freshShip?.code || "small_boat",
              code: fresh?.ship?.code || fresh?.ship?.shipCode || freshShip?.code || "small_boat",
              name: fresh?.ship?.name || freshShip?.name || "Small Boat",
              tier: freshShipTier,
              sea: freshNextIsland.sea || fresh?.ship?.sea || freshShip?.sea || "East Blue",
              unlockedIslands: unlocked,
              currentPort: freshNextIsland.name,
              nextTravelAt: cooldownUntil,
            },
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Sail failed.",
        allowedMentions: { repliedUser: false },
      });
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