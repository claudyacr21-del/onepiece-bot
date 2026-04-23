const { EmbedBuilder } = require("discord.js");
const { readPlayers } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const weaponsDb = require("../data/weapons");
const devilFruitsDb = require("../data/devilFruits");

function normalize(value) {
  return String(value || "").toLowerCase().trim();
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
    const equipped = Array.isArray(rawCard.equippedWeapons) ? rawCard.equippedWeapons : [];

    const equippedPower = equipped.reduce((sub, entry) => {
      const template = findWeaponTemplate(entry.code || entry.name);
      if (!template) return sub;

      return sub + getWeaponPowerByRarityAndLevel(template.rarity, Number(entry.upgradeLevel || 0));
    }, 0);

    return sum + equippedPower;
  }, 0);
}

function getInventoryFruitsPower(player) {
  const inventoryFruits = Array.isArray(player.devilFruits) ? player.devilFruits : [];

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

module.exports = {
  name: "lb",
  aliases: ["leaderboard", "top"],

  async execute(message, args) {
    const mode = String(args?.[0] || "arena").toLowerCase();
    const players = Object.values(readPlayers() || {});
    let title = "🏆 Arena Leaderboard";
    let rows = [];

    if (mode === "power") {
      title = "⚔️ Collection Power Leaderboard";

      rows = players
        .map((player) => ({
          username: player.username || "Unknown",
          value: getPlayerCollectionPower(player),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
        .map(
          (entry, index) =>
            `${index + 1}. **${entry.username}** • ${entry.value.toLocaleString("en-US")} power`
        );
    } else {
      rows = players
        .map((player) => ({
          username: player.username || "Unknown",
          points: Number(player?.arena?.points || 0),
          wins: Number(player?.arena?.wins || 0),
          losses: Number(player?.arena?.losses || 0),
          draws: Number(player?.arena?.draws || 0),
        }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 10)
        .map(
          (entry, index) =>
            `${index + 1}. **${entry.username}** • ${entry.points} pts • ${entry.wins}W/${entry.losses}L/${entry.draws}D`
        );
    }

    if (!rows.length) rows = ["No leaderboard data yet."];

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(title)
          .setDescription(rows.join("\n"))
          .setFooter({
            text:
              mode === "power"
                ? "Power includes all owned cards, boosts, weapons, and devil fruits"
                : "Use op lb power to view total collection power",
          }),
      ],
    });
  },
};