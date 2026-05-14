const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { getPlayer, updatePlayer } = require("../playerStore");
const {
  getCurrentIsland,
  getUnlockedIslandObjects,
  getNextIsland,
  getIslandByName,
} = require("../data/islands");
const { getShipByCode } = require("../data/ships");

const BASE_TRAVEL_COOLDOWN_MS = 60 * 60 * 1000;
const ISLANDS_PER_PAGE = 5;
const PAGINATION_TIMEOUT_MS = 2 * 60 * 1000;

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
  const shipTierReady =
    Number(ship.tier || 1) >= Number(nextIsland.requiredShipTier || 1);

  return [
    `Next Island: **${nextIsland.name}**`,
    `Required Ship Tier: **${nextIsland.requiredShipTier || 1}**`,
    `Boss Gate: **${bossCleared ? "Cleared" : "Not Cleared"}**`,
    `Ship Cooldown: **${shipReady ? "Ready" : formatRemaining(ship.nextTravelAt - now)}**`,
    `Ship Tier: **${shipTierReady ? "Ready" : `Need Tier ${nextIsland.requiredShipTier}`}**`,
  ].join("\n");
}

function clampPage(page, totalPages) {
  const safePage = Math.max(1, Number(page || 1));
  return Math.min(Math.max(1, totalPages), safePage);
}

function formatIslandBlock(player, currentIsland, island, globalIndex) {
  return [
    `**${globalIndex}. ${island.name}**`,
    `↪ Status: ${getRouteStatus(currentIsland, island)}`,
    `↪ Sea: ${island.sea || "Unknown"}`,
    `↪ Boss: ${getBossStatus(player, island)}`,
  ].join("\n");
}

function formatUnlockedIslandsPage(player, currentIsland, unlockedIslands, page) {
  if (!unlockedIslands.length) return "No islands unlocked yet.";

  const totalPages = Math.max(1, Math.ceil(unlockedIslands.length / ISLANDS_PER_PAGE));
  const safePage = clampPage(page, totalPages);
  const start = (safePage - 1) * ISLANDS_PER_PAGE;
  const pageItems = unlockedIslands.slice(start, start + ISLANDS_PER_PAGE);

  return pageItems
    .map((island, index) =>
      formatIslandBlock(player, currentIsland, island, start + index + 1)
    )
    .join("\n\n");
}

function buildTravelEmbed({
  player,
  currentIsland,
  unlockedIslands,
  nextIsland,
  ship,
  now,
  page,
}) {
  const totalPages = Math.max(1, Math.ceil(unlockedIslands.length / ISLANDS_PER_PAGE));
  const safePage = clampPage(page, totalPages);
  const unlockedText = formatUnlockedIslandsPage(
    player,
    currentIsland,
    unlockedIslands,
    safePage
  );

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle("⛵ Travel")
    .setDescription(
      [
        `**Current Island:** ${currentIsland.name}`,
        `**Sea:** ${currentIsland.sea || "Unknown"}`,
        `**Ship:** ${ship.name} • Tier ${ship.tier}`,
        "",
        getTravelReadiness(player, currentIsland, nextIsland, ship, now),
        "",
        `**Unlocked Islands — Page ${safePage}/${totalPages}**`,
        unlockedText,
        "",
        "Use `op sail` to unlock the next canon island.",
        "Use `op travel <island>` to move between unlocked islands.",
        "Use `op travel page <number>` to open a specific page.",
      ].join("\n")
    )
    .setThumbnail(ship.image || null)
    .setImage(currentIsland.image || null)
    .setFooter({
      text: `One Piece Bot • Travel • ${unlockedIslands.length} unlocked islands`,
    });
}

function buildTravelRows(page, totalPages, ownerId) {
  if (totalPages <= 1) return [];

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`travel_prev_${ownerId}_${page}`)
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 1),
      new ButtonBuilder()
        .setCustomId(`travel_next_${ownerId}_${page}`)
        .setLabel("Next")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= totalPages)
    ),
  ];
}

function parsePageQuery(args) {
  const first = String(args[0] || "").toLowerCase();
  const second = Number(args[1] || 1);

  if (["page", "p"].includes(first)) {
    return Math.max(1, second || 1);
  }

  return null;
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
    const requestedPage = parsePageQuery(args);

    if (!query || requestedPage) {
      const totalPages = Math.max(
        1,
        Math.ceil(unlockedIslands.length / ISLANDS_PER_PAGE)
      );
      let page = clampPage(requestedPage || 1, totalPages);

      const travelMessage = await message.reply({
        embeds: [
          buildTravelEmbed({
            player,
            currentIsland,
            unlockedIslands,
            nextIsland,
            ship,
            now,
            page,
          }),
        ],
        components: buildTravelRows(page, totalPages, message.author.id),
      });

      if (totalPages <= 1) return;

      const collector = travelMessage.createMessageComponentCollector({
        time: PAGINATION_TIMEOUT_MS,
      });

      collector.on("collect", async (interaction) => {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({
            content: "Only the command user can control this travel page.",
            ephemeral: true,
          });
        }

        if (interaction.customId.startsWith(`travel_prev_${message.author.id}_`)) {
          page = clampPage(page - 1, totalPages);
        }

        if (interaction.customId.startsWith(`travel_next_${message.author.id}_`)) {
          page = clampPage(page + 1, totalPages);
        }

        await interaction.update({
          embeds: [
            buildTravelEmbed({
              player,
              currentIsland,
              unlockedIslands,
              nextIsland,
              ship,
              now,
              page,
            }),
          ],
          components: buildTravelRows(page, totalPages, message.author.id),
        });
      });

      collector.on("end", async () => {
        try {
          await travelMessage.edit({
            components: [],
          });
        } catch {}
      });

      return;
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