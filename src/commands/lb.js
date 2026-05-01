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

const ARENA_START_RANK = 500;
const ARENA_POINTS_PER_RANK = 10;

const ARENA_BOTS = [
  { id: "bot_001", username: "Pirate King Bot", points: 5000, wins: 120, losses: 0 },
  { id: "bot_002", username: "Yonko Bot", points: 4850, wins: 116, losses: 2 },
  { id: "bot_003", username: "Fleet Admiral Bot", points: 4700, wins: 112, losses: 3 },
  { id: "bot_004", username: "Revolutionary Bot", points: 4550, wins: 108, losses: 4 },
  { id: "bot_005", username: "Warlord Bot", points: 4400, wins: 104, losses: 6 },
  { id: "bot_006", username: "CP0 Bot", points: 4250, wins: 100, losses: 8 },
  { id: "bot_007", username: "Supernova Bot", points: 4100, wins: 96, losses: 10 },
  { id: "bot_008", username: "Commander Bot", points: 3950, wins: 92, losses: 12 },
  { id: "bot_009", username: "Vice Admiral Bot", points: 3800, wins: 88, losses: 14 },
  { id: "bot_010", username: "New World Bot", points: 3650, wins: 84, losses: 16 },
];

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function getArenaRankFromPoints(points) {
  const safePoints = Math.max(0, Number(points || 0));

  return Math.max(
    1,
    ARENA_START_RANK - Math.floor(safePoints / ARENA_POINTS_PER_RANK)
  );
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

  const botRows = ARENA_BOTS.map((bot) => ({
    ...bot,
    matches: Number(bot.wins || 0) + Number(bot.losses || 0),
    isBot: true,
  }));

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
      arenaRank: getArenaRankFromPoints(entry.points),
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
  const tag = row.isBot ? "BOT" : "PLAYER";

  return `\`${row.rank}.\` ${username} - ${Number(row.points || 0).toLocaleString(
    "en-US"
  )} pts • ${row.wins}W/${row.losses}L • #${row.arenaRank} • ${tag}`;
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
        text: "Top 10 Arena • Your rank shown below if not in top 10",
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