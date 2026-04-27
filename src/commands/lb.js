const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const { readPlayers } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const weaponsDb = require("../data/weapons");
const devilFruitsDb = require("../data/devilFruits");

const ARENA_START_RANK = 500;
const ARENA_POINTS_PER_RANK = 10;

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function getArenaRankFromPoints(points) {
  const safePoints = Math.max(0, Number(points || 0));
  return Math.max(1, ARENA_START_RANK - Math.floor(safePoints / ARENA_POINTS_PER_RANK));
}

function formatArenaRank(points) {
  return `#${getArenaRankFromPoints(points)}`;
}

function getArenaBotRows(realPlayersCount = 0) {
  const botRows = [
    {
      username: "Pirate King Bot",
      points: 35,
      wins: 3,
      losses: 0,
      isBot: true,
    },
    {
      username: "Yonko Bot",
      points: 25,
      wins: 2,
      losses: 1,
      isBot: true,
    },
    {
      username: "Grand Champion Bot",
      points: 15,
      wins: 1,
      losses: 1,
      isBot: true,
    },
  ];

  const botCount = Math.max(0, 3 - realPlayersCount);

  return botRows.slice(0, botCount);
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

  return cards.reduce((sum, card) => sum + Number(card.currentPower || 0), 0);
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

      return sub + getWeaponPowerByRarityAndLevel(
        template.rarity,
        Number(entry.upgradeLevel || 0)
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

function getArenaRows(players) {
  const realPlayers = players
    .map((player) => ({
      username: player.username || "Unknown",
      points: Number(player?.arena?.points || 0),
      wins: Number(player?.arena?.wins || 0),
      losses: Number(player?.arena?.losses || 0),
      matches: Number(player?.arena?.matches || 0),
      isBot: false,
    }))
    .filter((entry) => entry.matches > 0 || entry.points > 0 || entry.wins > 0 || entry.losses > 0);

  const rows = [...getArenaBotRows(realPlayers.length), ...realPlayers]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      if (a.isBot !== b.isBot) return a.isBot ? -1 : 1;

      return String(a.username).localeCompare(String(b.username));
    })
    .slice(0, 10);

  return rows.map((entry) => {
    const tag = entry.isBot ? "BOT" : "PLAYER";

    return `${formatArenaRank(entry.points)} **${entry.username}** • ${entry.points} pts • ${entry.wins}W/${entry.losses}L • ${tag}`;
  });
}

function getPowerRows(players) {
  return players
    .map((player) => ({
      username: player.username || "Unknown",
      value: getPlayerCollectionPower(player),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map(
      (entry, index) =>
        `${index + 1}. **${entry.username}** • ${entry.value.toLocaleString(
          "en-US"
        )} power`
    );
}

function buildLeaderboardEmbed(mode = null) {
  const players = Object.values(readPlayers() || {});

  if (mode === "arena") {
    const rows = getArenaRows(players);

    return new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("Arena Leaderboard")
      .setDescription(
        [
          rows.length ? rows.join("\n") : "No arena data yet.",
          "",
          `Arena starts at **#${ARENA_START_RANK}** and climbs upward with points.`,
          "Arena Bots are temporary placeholders and disappear as real players join.",
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Arena Leaderboard",
      });
  }

  if (mode === "power") {
    const rows = getPowerRows(players);

    return new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("Collection Power Leaderboard")
      .setDescription(
        rows.length ? rows.join("\n") : "No collection power data yet."
      )
      .setFooter({
        text: "Power includes owned cards, boosts, weapons, and devil fruits",
      });
  }

  return new EmbedBuilder()
    .setColor(0x5865f2)
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
            description: "View arena rank, points, wins, and losses",
            value: "arena",
            default: selected === "arena",
          },
          {
            label: "Collection Power Leaderboard",
            description: "View total collection power ranking",
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
      embeds: [buildLeaderboardEmbed(selected)],
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
        embeds: [buildLeaderboardEmbed(selected)],
        components: buildLeaderboardMenu(selected),
      });
    });

    collector.on("end", async () => {
      try {
        await sent.edit({
          components: [],
        });
      } catch {}
    });
  },
};