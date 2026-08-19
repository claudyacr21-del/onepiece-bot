const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require("discord.js");

const { readPlayers } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const { isMergeCard, getMergeFixedPower } = require("../utils/mergeCards");
const weaponsDb = require("../data/weapons");
const devilFruitsDb = require("../data/devilFruits");

const COLOR = 0x5865f2;

const POWER_TOP_LIMIT = 25;
const ARENA_TOP_LIMIT = 10;
const ARENA_TOTAL_RANKS = 500;
const ARENA_TOP_BOT_POINTS = 300;
const ARENA_POINT_STEP = 1;

const BOT_NAMES = [
  "Pirate King Bot",
  "Yonko Bot",
  "Fleet Admiral Bot",
  "Revolutionary Bot",
  "Warlord Bot",
  "CP0 Bot",
  "Supernova Bot",
  "Commander Bot",
  "Vice Admiral Bot",
  "New World Bot",
  "Grand Line Bot",
  "Marine Hero Bot",
  "Shichibukai Bot",
  "Worst Generation Bot",
  "Cipher Pol Bot",
  "Sky Island Bot",
  "Fishman Bot",
  "Dressrosa Bot",
  "Wano Samurai Bot",
  "Egghead Bot",
];

const LB_CACHE_TTL_MS = 60 * 1000;

let lbPlayersCache = {
  updatedAt: 0,
  players: null,
};

function getCachedLeaderboardPlayers() {
  const now = Date.now();

  if (
    lbPlayersCache.players &&
    now - Number(lbPlayersCache.updatedAt || 0) < LB_CACHE_TTL_MS
  ) {
    return lbPlayersCache.players;
  }

  const players = readPlayers() || {};

  lbPlayersCache = {
    updatedAt: now,
    players,
  };

  return players;
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function getBotName(index) {
  const base = BOT_NAMES[index % BOT_NAMES.length];
  const cycle = Math.floor(index / BOT_NAMES.length);

  return cycle === 0 ? base : `${base} ${cycle + 1}`;
}

function getBotPoints(index) {
  return Math.max(0, ARENA_TOP_BOT_POINTS - index * ARENA_POINT_STEP);
}

function getBotWins(points) {
  return Math.max(0, Math.floor(Number(points || 0) / 10));
}

function getBotLosses(index) {
  return Math.floor(index / 25);
}

function buildArenaBots(count = ARENA_TOTAL_RANKS) {
  return Array.from({ length: count }, (_, index) => {
    const points = getBotPoints(index);

    return {
      id: `arena_bot_${String(index + 1).padStart(3, "0")}`,
      username: getBotName(index),
      points,
      wins: getBotWins(points),
      losses: getBotLosses(index),
      matches: getBotWins(points) + getBotLosses(index),
      isBot: true,
    };
  });
}

function getRarityPower(rarity) {
  return (
    {
      C: 400,
      B: 800,
      A: 1400,
      S: 2400,
      SS: 3800,
      UR: 5600,
    }[String(rarity || "").toUpperCase()] || 400
  );
}

function getWeaponPowerByRarityAndLevel(rarity, level = 0) {
  return getRarityPower(rarity) + Math.max(0, Number(level || 0)) * 250;
}

function getFruitPowerByRarity(rarity) {
  return getRarityPower(rarity);
}

function isLeaderboardMergeCard(card) {
  return isMergeCard(card);
}

function getLeaderboardCardPower(card) {
  if (isLeaderboardMergeCard(card)) {
    return getMergeFixedPower(card);
  }

  return Number(
    card.currentPower ||
      card.finalPower ||
      card.power ||
      card.teamPower ||
      Math.floor(
        Number(card.atk || card.finalAtk || card.displayAtk || 0) * 1.4 +
          Number(card.hp || card.finalHp || card.displayHp || 0) * 0.22 +
          Number(card.speed || card.spd || card.finalSpeed || card.displaySpeed || 0) * 9
      )
  );
}

function findWeaponTemplate(value) {
  const q = normalize(value);
  if (!q) return null;

  return (
    weaponsDb.find((item) => normalize(item.code) === q) ||
    weaponsDb.find((item) => normalize(item.name) === q) ||
    weaponsDb.find((item) => normalize(item.code).includes(q)) ||
    weaponsDb.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

function findFruitTemplate(value) {
  const q = normalize(value);
  if (!q) return null;

  return (
    devilFruitsDb.find((item) => normalize(item.code) === q) ||
    devilFruitsDb.find((item) => normalize(item.name) === q) ||
    devilFruitsDb.find((item) => normalize(item.code).includes(q)) ||
    devilFruitsDb.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

function getPlayerCollectionPower(player) {
  const rawCards = Array.isArray(player?.cards)
    ? player.cards
    : [];

  return rawCards.reduce((sum, rawCard) => {
    let card = rawCard;

    try {
      card = hydrateCard(rawCard) || rawCard;
    } catch (error) {
      console.error("[LB POWER HYDRATE ERROR]", {
        cardId: rawCard?.id,
        cardCode:
          rawCard?.code ||
          rawCard?.cardCode ||
          rawCard?.characterCode,
        message: error?.message,
      });
    }

    if (!card) {
      return sum;
    }

    const totalCardPower = Math.max(
      0,
      Number(getLeaderboardCardPower(card) || 0)
    );

    const weaponPower = Math.max(
      0,
      Number(card.weaponPowerBonus || 0)
    );

    const fruitPower = Math.max(
      0,
      Number(card.fruitPowerBonus || 0)
    );

    const equipmentPower = Math.max(
      0,
      Number(
        card.totalEquipmentPowerBonus ??
          weaponPower + fruitPower
      )
    );

    const cardOnlyPower = Math.max(
      0,
      totalCardPower - equipmentPower
    );

    const finalPower =
      cardOnlyPower +
      weaponPower +
      fruitPower;

    return (
      sum +
      (Number.isFinite(finalPower)
        ? finalPower
        : 0)
    );
  }, 0);
}


function looksLikeGeneratedUserName(value, id = "") {
  const text = String(value || "").trim();
  const userId = String(id || "").trim();

  if (!text) return true;
  if (/^unknown$/i.test(text)) return true;
  if (/^user\s*\d{10,25}$/i.test(text)) return true;
  if (userId && text === userId) return true;

  return false;
}

function getLeaderboardUsername(id, player, message = null) {
  const raw = String(player?.username || "").trim();
  const userId = String(id || "").trim();

  const guildMember =
    message?.guild?.members?.cache?.get(userId)?.user?.username ||
    message?.guild?.members?.cache?.get(userId)?.displayName;

  const clientUser = message?.client?.users?.cache?.get(userId)?.username;

  const picked = guildMember || clientUser || raw;

  if (!looksLikeGeneratedUserName(picked, userId)) {
    return picked;
  }

  return "Unknown Player";
}

function getPowerLeaderboardRows(playersMap, message = null) {
  return Object.entries(playersMap || {})
    .map(([id, player]) => ({
      id,
      username: getLeaderboardUsername(id, player, message),
      value: getPlayerCollectionPower(player),
    }))
    .filter((entry) => Number(entry.value || 0) > 0)
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return String(a.username).localeCompare(String(b.username));
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function getSimpleValueRows(playersMap, valueGetter, message = null) {
  return Object.entries(playersMap || {})
    .map(([id, player]) => ({
      id,
      username: getLeaderboardUsername(id, player, message),
      value: Number(valueGetter(player) || 0),
    }))
    .filter((entry) => Number(entry.value || 0) > 0)
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return String(a.username).localeCompare(String(b.username));
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function formatSimpleValueRow(row, isSelf = false) {
  const username = isSelf ? `**${row.username}**` : `**${row.username}**`;

  return `\`${row.rank}.\` ${username} - ${Number(row.value || 0).toLocaleString("en-US")}`;
}

function buildSimpleValueDescription(rows, userId, limit = 25) {
  const topRows = rows.slice(0, limit);
  const ownRow = rows.find((row) => row.id === userId);
  const lines = topRows.map((row) => formatSimpleValueRow(row, row.id === userId));

  if (ownRow && !topRows.some((row) => row.id === userId)) {
    lines.push("");
    lines.push(formatSimpleValueRow(ownRow, true));
  }

  return lines.length ? lines.join("\n") : "No leaderboard data yet.";
}

function getArenaLeaderboardRows(playersMap, message = null) {
  const realPlayers = Object.entries(playersMap || {})
    .map(([id, player]) => ({
      id,
      username: getLeaderboardUsername(id, player, message),
      points: Number(player?.arena?.points || 0),
      wins: Number(player?.arena?.wins || 0),
      losses: Number(player?.arena?.losses || 0),
      matches: Number(player?.arena?.matches || 0),
      isBot: false,
    }))
    .filter((entry) => {
      return (
        entry.matches > 0 ||
        entry.points > 0 ||
        entry.wins > 0 ||
        entry.losses > 0
      );
    });

  const botCount = Math.max(0, ARENA_TOTAL_RANKS - realPlayers.length);
  const botRows = buildArenaBots(botCount);

  return [...botRows, ...realPlayers]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      if (a.isBot !== b.isBot) return a.isBot ? -1 : 1;
      return String(a.username).localeCompare(String(b.username));
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function formatPowerRow(row, isSelf = false) {
  const username = isSelf ? `**${row.username}**` : `**${row.username}**`;

  return `\`${row.rank}.\` ${username} - ${Number(row.value || 0).toLocaleString(
    "en-US"
  )}`;
}

function formatArenaRow(row, isSelf = false) {
  const username = isSelf ? `**${row.username}**` : `**${row.username}**`;

  return `\`${row.rank}.\` ${username} - ${Number(row.points || 0).toLocaleString(
    "en-US"
  )}`;
}

function buildPowerDescription(rows, userId) {
  const topRows = rows.slice(0, POWER_TOP_LIMIT);
  const ownRow = rows.find((row) => row.id === userId);

  const lines = topRows.map((row) => formatPowerRow(row, row.id === userId));

  if (ownRow && !topRows.some((row) => row.id === userId)) {
    lines.push("");
    lines.push(formatPowerRow(ownRow, true));
  }

  if (!lines.length) {
    return "No collection power data yet.";
  }

  return lines.join("\n");
}

function buildArenaDescription(rows, userId) {
  const topRows = rows.slice(0, ARENA_TOP_LIMIT);
  const ownRow = rows.find((row) => row.id === userId);

  const lines = topRows.map((row) => formatArenaRow(row, row.id === userId));

  if (ownRow && !topRows.some((row) => row.id === userId)) {
    lines.push("");
    lines.push(formatArenaRow(ownRow, true));
  }

  if (!lines.length) {
    return "No arena data yet.";
  }

  return lines.join("\n");
}

function buildLeaderboardEmbed(message, mode = null) {
  const playersMap = getCachedLeaderboardPlayers();
  const userId = message.author.id;

  if (mode === "arena") {
    const rows = getArenaLeaderboardRows(playersMap, message);

    return new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("Arena Leaderboard")
      .setDescription(buildArenaDescription(rows, userId))
      .setFooter({
        text: "Top 10 Arena • 500 total ranks • Your rank shown below if not in top 10",
      });
  }

  if (mode === "power") {
    const rows = getPowerLeaderboardRows(playersMap, message);

    return new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("Global Power Leaderboard")
      .setDescription(buildPowerDescription(rows, userId))
      .setFooter({
        text: "Top 25 Global Power • Your rank shown below if not in top 25",
      });
  }

  if (mode === "votes") {
    const rows = getSimpleValueRows(playersMap, (player) => player?.vote?.totalVotes || 0, message);

    return new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("Global Vote Leaderboard")
      .setDescription(buildSimpleValueDescription(rows, userId))
      .setFooter({ text: "Top votes • Your rank shown below if not in top 25" });
  }

  if (mode === "berries") {
    const rows = getSimpleValueRows(playersMap, (player) => player.berries || 0, message);

    return new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("Global Berries Leaderboard")
      .setDescription(buildSimpleValueDescription(rows, userId))
      .setFooter({ text: "Top berries • Your rank shown below if not in top 25" });
  }

  if (mode === "gems") {
    const rows = getSimpleValueRows(playersMap, (player) => player.gems || 0, message);

    return new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("Global Gems Leaderboard")
      .setDescription(buildSimpleValueDescription(rows, userId))
      .setFooter({ text: "Top gems • Your rank shown below if not in top 25" });
  }

  if (mode === "cards_pulled") {
    const rows = getSimpleValueRows(playersMap, (player) => player?.stats?.cardsPulled || 0, message);

    return new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("Lifetime Cards Pulled Leaderboard")
      .setDescription(buildSimpleValueDescription(rows, userId))
      .setFooter({ text: "Lifetime cards pulled • Your rank shown below if not in top 25" });
  }

  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("Global Leaderboards")
    .setDescription("Select a leaderboard type below.")
    .setFooter({
      text: "One Piece Bot • Leaderboards",
    });
}

function buildLeaderboardMenu(selected = null) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("lb_select")
        .setPlaceholder("Select a leaderboard type")
        .addOptions([
          {
            label: "Arena Leaderboard",
            description: "Top 10 arena ranks and your own rank",
            value: "arena",
            default: selected === "arena",
          },
          {
            label: "Global Power Leaderboard",
            description: "Top power ranking and your own rank",
            value: "power",
            default: selected === "power",
          },
          {
            label: "Global Vote Leaderboard",
            description: "Top total votes",
            value: "votes",
            default: selected === "votes",
          },
          {
            label: "Global Berries Leaderboard",
            description: "Top berries ranking",
            value: "berries",
            default: selected === "berries",
          },
          {
            label: "Global Gems Leaderboard",
            description: "Top gems ranking",
            value: "gems",
            default: selected === "gems",
          },
          {
            label: "Lifetime Cards Pulled",
            description: "Top lifetime battle/boost cards pulled",
            value: "cards_pulled",
            default: selected === "cards_pulled",
          },
        ])
    ),
  ];
}

module.exports = {
  name: "lb",
  aliases: ["leaderboard", "top"],

  async execute(message) {
    let selected = null;

    const sent = await message.reply({
      embeds: [buildLeaderboardEmbed(message, selected)],
      components: buildLeaderboardMenu(selected),
    });

    const collector = sent.createMessageComponentCollector({
      time: 10 * 60 * 1000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the command user can use this leaderboard menu.",
          flags: MessageFlags.Ephemeral,
        });
      }

      selected =
        interaction.values?.[0] || null;

      await interaction.deferUpdate();

      try {
        const embed = buildLeaderboardEmbed(
          message,
          selected
        );

        return interaction.editReply({
          embeds: [embed],
          components:
            buildLeaderboardMenu(selected),
        });
      } catch (error) {
        console.error(
          "[LEADERBOARD BUILD ERROR]",
          {
            selected,
            userId: interaction.user.id,
            message: error?.message,
            stack: error?.stack,
          }
        );

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("Leaderboard Error")
              .setDescription(
                "The leaderboard could not be loaded. Please try again."
              ),
          ],
          components:
            buildLeaderboardMenu(null),
        });
      }
    });

    collector.on("end", async () => {
      try {
        await sent.edit({
          components: [],
        });
      } catch (_) {}
    });
  },
};