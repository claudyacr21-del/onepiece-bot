const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const {
  getCurrentIsland,
  getUnlockedIslandObjects,
  getNextIsland,
  getIslandByName,
} = require("../data/islands");
const { getShipByCode } = require("../data/ships");

const BASE_TRAVEL_COOLDOWN_MS = 60 * 60 * 1000;
const ISLANDS_PER_PAGE = 5;
const ROUTE_COLLECTOR_MS = 90 * 1000;

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
  return (
    player?.story?.bossPhases?.[islandCode] || {
      phase1Cleared: false,
      phase2Cleared: false,
      completed: false,
    }
  );
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
    return "You have reached the end of the current route.";
  }

  const bossCleared = isIslandBossRouteCleared(player, currentIsland);
  const shipReady = ship.nextTravelAt <= now;
  const shipTierReady =
    Number(ship.tier || 1) >= Number(nextIsland.requiredShipTier || 1);

  const lines = [
    `Next Island: **${nextIsland.name}**`,
    `Required Ship Tier: **${nextIsland.requiredShipTier || 1}**`,
    `Boss Gate: **${bossCleared ? "Cleared" : "Not Cleared"}**`,
    `Ship Cooldown: **${
      shipReady ? "Ready" : formatRemaining(ship.nextTravelAt - now)
    }**`,
    `Ship Tier: **${
      shipTierReady ? "Ready" : `Need Tier ${nextIsland.requiredShipTier}`
    }**`,
  ];

  return lines.join("\n");
}

function getCurrentIslandPage(unlockedIslands, currentIsland) {
  const index = unlockedIslands.findIndex(
    (island) => island.code === currentIsland.code
  );

  if (index === -1) return 1;

  return Math.floor(index / ISLANDS_PER_PAGE) + 1;
}

function buildIslandList(player, currentIsland, unlockedIslands, page) {
  const maxPage = Math.max(
    1,
    Math.ceil(unlockedIslands.length / ISLANDS_PER_PAGE)
  );
  const safePage = Math.min(maxPage, Math.max(1, Number(page || 1)));
  const start = (safePage - 1) * ISLANDS_PER_PAGE;
  const pageIslands = unlockedIslands.slice(start, start + ISLANDS_PER_PAGE);

  const text = pageIslands.length
    ? pageIslands
        .map((island, index) => {
          const globalIndex = start + index + 1;

          return [
            `**${globalIndex}. ${island.name}** • ${getRouteStatus(
              currentIsland,
              island
            )}`,
            `↪ Sea: ${island.sea || "Unknown"}`,
            `↪ Boss: ${getBossStatus(player, island)}`,
          ].join("\n");
        })
        .join("\n\n")
    : "No islands unlocked yet.";

  return {
    text,
    page: safePage,
    maxPage,
  };
}

function buildRouteEmbed(player, currentIsland, unlockedIslands, page) {
  const ship = getShipState(player);
  const now = Date.now();
  const nextIsland = getNextIsland(currentIsland);
  const routeList = buildIslandList(player, currentIsland, unlockedIslands, page);

  return new EmbedBuilder()
    .setColor(0x1abc9c)
    .setTitle(`Travel Route • Page ${routeList.page}/${routeList.maxPage}`)
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
        routeList.text,
        "",
        "Use `op sail` to unlock the next canon island.",
        "Use `op travel <island>` to move between unlocked islands.",
      ].join("\n")
    )
    .setThumbnail(ship.image || null)
    .setImage(currentIsland.image || null)
    .setFooter({
      text: "One Piece Bot • Travel",
    });
}

function buildRouteButtons(page, maxPage) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("travel_prev")
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 1),
      new ButtonBuilder()
        .setCustomId("travel_next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= maxPage)
    ),
  ];
}

async function sendRouteMenu(message, player, currentIsland, unlockedIslands, page) {
  const routeList = buildIslandList(player, currentIsland, unlockedIslands, page);

  const sent = await message.reply({
    embeds: [buildRouteEmbed(player, currentIsland, unlockedIslands, routeList.page)],
    components: buildRouteButtons(routeList.page, routeList.maxPage),
    allowedMentions: {
      repliedUser: false,
    },
  });

  const collector = sent.createMessageComponentCollector({
    time: ROUTE_COLLECTOR_MS,
  });

  let currentPage = routeList.page;

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      return interaction.reply({
        content: "This travel menu is not yours.",
        ephemeral: true,
      });
    }

    if (interaction.customId === "travel_prev") {
      currentPage = Math.max(1, currentPage - 1);
    }

    if (interaction.customId === "travel_next") {
      currentPage = Math.min(routeList.maxPage, currentPage + 1);
    }

    const nextList = buildIslandList(
      player,
      currentIsland,
      unlockedIslands,
      currentPage
    );

    return interaction.update({
      embeds: [
        buildRouteEmbed(player, currentIsland, unlockedIslands, nextList.page),
      ],
      components: buildRouteButtons(nextList.page, nextList.maxPage),
    });
  });

  collector.on("end", async () => {
    try {
      const latestList = buildIslandList(
        player,
        currentIsland,
        unlockedIslands,
        currentPage
      );

      await sent.edit({
        components: buildRouteButtons(latestList.page, latestList.maxPage).map(
          (row) => {
            row.components.forEach((button) => button.setDisabled(true));
            return row;
          }
        ),
      });
    } catch (_) {}
  });

  return sent;
}

module.exports = {
  name: "travel",
  aliases: ["route", "islandroute"],

  async execute(message, args) {
    const player = getPlayer(message.author.id, message.author.username);
    const currentIsland = getCurrentIsland(player);
    const unlockedIslands = getUnlockedIslandObjects(player);
    const ship = getShipState(player);
    const now = Date.now();
    const query = args.join(" ").trim();

    if (!query || /^\d+$/.test(query)) {
      const page = query
        ? Number(query)
        : getCurrentIslandPage(unlockedIslands, currentIsland);

      return sendRouteMenu(
        message,
        player,
        currentIsland,
        unlockedIslands,
        page
      );
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

    let finalCurrentIsland = currentIsland;
    let finalTargetIsland = targetIsland;
    let finalShip = ship;
    let finalCooldownMs = getTravelCooldownMs(ship);

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const freshCurrentIsland = getCurrentIsland(fresh);
          const freshShip = getShipState(fresh);
          const freshTargetIsland = getIslandByName(query);

          if (!freshTargetIsland) {
            throw new Error(`Island not found: \`${query}\``);
          }

          if (freshCurrentIsland.code === freshTargetIsland.code) {
            throw new Error(
              `You are already at **${freshTargetIsland.name}**.`
            );
          }

          if (freshShip.nextTravelAt > Date.now()) {
            throw new Error(
              `Your ship is not ready yet.\nNext travel: **${formatRemaining(
                freshShip.nextTravelAt - Date.now()
              )}**`
            );
          }

          const freshUnlockedCodes = Array.isArray(freshShip.unlockedIslands)
            ? freshShip.unlockedIslands
            : ["foosha_village"];

          if (!freshUnlockedCodes.includes(freshTargetIsland.code)) {
            throw new Error(
              [
                `You have not unlocked **${freshTargetIsland.name}** yet.`,
                "",
                "Use `op sail` to progress through the canon route.",
              ].join("\n")
            );
          }

          if (
            Number(freshShip.tier || 1) <
            Number(freshTargetIsland.requiredShipTier || 1)
          ) {
            throw new Error(
              [
                "Your ship tier is too low.",
                `Current Ship Tier: **${freshShip.tier}**`,
                `Required Ship Tier: **${freshTargetIsland.requiredShipTier}**`,
                "",
                "Use `op ship upgrade` to upgrade your ship.",
              ].join("\n")
            );
          }

          const cooldownMs = getTravelCooldownMs(freshShip);

          finalCurrentIsland = freshCurrentIsland;
          finalTargetIsland = freshTargetIsland;
          finalShip = freshShip;
          finalCooldownMs = cooldownMs;

          return {
            ...fresh,
            currentIsland: freshTargetIsland.name,
            ship: {
              ...(fresh.ship || {}),
              shipCode: freshShip.code,
              code: freshShip.code,
              name: freshShip.name,
              tier: freshShip.tier,
              sea: freshTargetIsland.sea,
              nextTravelAt: Date.now() + cooldownMs,
              unlockedIslands: freshUnlockedCodes,
              currentPort: freshTargetIsland.name,
            },
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply(error.message || "Travel failed.");
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle("⛵ Travel Successful")
          .setDescription(
            [
              `**Departed From:** ${finalCurrentIsland.name}`,
              `**Arrived At:** ${finalTargetIsland.name}`,
              `**Sea:** ${finalTargetIsland.sea || "Unknown"}`,
              `**Saga:** ${finalTargetIsland.saga || "Unknown"}`,
              `**Ship:** ${finalShip.name}`,
              `**Ship Tier:** ${finalShip.tier}`,
              "",
              `Next travel cooldown: **${formatRemaining(finalCooldownMs)}**`,
            ].join("\n")
          )
          .setThumbnail(finalShip.image || null)
          .setImage(finalTargetIsland.image || null)
          .setFooter({
            text: "One Piece Bot • Travel",
          }),
      ],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};