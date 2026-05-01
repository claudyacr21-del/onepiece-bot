const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const { readPlayers } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
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

function getAllOwnedCardsPower(player) {
  const cards = (Array.isArray(player.cards) ? player.cards : [])
    .map(hydrateCard)
    .filter(Boolean);

  return cards.reduce((sum, card) => {
    return sum + Number(card.currentPower || 0);
  }, 0);
}

function getInventoryWeaponsPower(player) {
  const inventoryWeapons = Array.isArray(player.weapons) ? player.weapons : [];

  return inventoryWeapons.reduce((sum, entry) => {
    const template = findWeaponTemplate(entry.code || entry.name);
    if (!template) return sum;

    const amount = Math.max(0, Number(entry.amount || 0));
    const level = Math.max(0, Number(entry.upgradeLevel || 0));

    return sum + getWeaponPowerByRarityAndLevel(template.rarity, level) * amount;
  }, 0);
}

function getEquippedWeaponsPower(player) {
  const cards = Array.isArray(player.cards) ? player.cards : [];

  return cards.reduce((sum, rawCard) => {
    const equipped = Array.isArray(rawCard.equippedWeapons)
      ? rawCard.equippedWeapons
      : [];

    const equippedPower = equipped.reduce((sub, entry) => {
      const template = findWeaponTemplate(entry.code || entry.name);
      if (!template) return sub;

      return (
        sub +
        getWeaponPowerByRarityAndLevel(
          template.rarity,
          Number(entry.upgradeLevel || 0)
        )
      );
    }, 0);

    return sum + equippedPower;
  }, 0);
}

function getInventoryFruitsPower(player) {
  const inventoryFruits = Array.isArray(player.devilFruits)
    ? player.devilFruits
    : [];

  return inventoryFruits.reduce((sum, entry) => {
    const template = findFruitTemplate(entry.code || entry.name);
    if (!template) return sum;

    const amount = Math.max(0, Number(entry.amount || 0));
    return sum + getFruitPowerByRarity(template.rarity) * amount;
  }, 0);
}

function getEquippedFruitsPower(player) {
  const cards = Array.isArray(player.cards) ? player.cards : [];

  return cards.reduce((sum, rawCard) => {
    if (!rawCard.equippedDevilFruit) return sum;

    const template = findFruitTemplate(
      rawCard.equippedDevilFruitName || rawCard.equippedDevilFruit
    );

    if (!template) return sum;

    return sum + getFruitPowerByRarity(template.rarity);
  }, 0);
}

function getPlayerCollectionPower(player) {
  const cardsPower = getAllOwnedCardsPower(player);
  const inventoryWeaponsPower = getInventoryWeaponsPower(player);
  const equippedWeaponsPower = getEquippedWeaponsPower(player);
  const inventoryFruitsPower = getInventoryFruitsPower(player);
  const equippedFruitsPower = getEquippedFruitsPower(player);

  return (
    cardsPower +
    inventoryWeaponsPower +
    equippedWeaponsPower +
    inventoryFruitsPower +
    equippedFruitsPower
  );
}

function getPowerLeaderboardRows(playersMap) {
  return Object.entries(playersMap || {})
    .map(([id, player]) => ({
      id,
      username: player.username || "Unknown",
      value: getPlayerCollectionPower(player),
    }))
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return String(a.username).localeCompare(String(b.username));
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function getArenaLeaderboardRows(playersMap) {
  const realPlayers = Object.entries(playersMap || {})
    .map(([id, player]) => ({
      id,
      username: player.username || "Unknown",
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
  const playersMap = readPlayers() || {};
  const userId = message.author.id;

  if (mode === "arena") {
    const rows = getArenaLeaderboardRows(playersMap);

    return new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("Arena Leaderboard")
      .setDescription(buildArenaDescription(rows, userId))
      .setFooter({
        text: "Top 10 Arena • 500 total ranks • Your rank shown below if not in top 10",
      });
  }

  if (mode === "power") {
    const rows = getPowerLeaderboardRows(playersMap);

    return new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("Global Power Leaderboard")
      .setDescription(buildPowerDescription(rows, userId))
      .setFooter({
        text: "Top 25 Global Power • Your rank shown below if not in top 25",
      });
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
          ephemeral: true,
        });
      }

      selected = interaction.values?.[0] || null;

      return interaction.update({
        embeds: [buildLeaderboardEmbed(message, selected)],
        components: buildLeaderboardMenu(selected),
      });
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