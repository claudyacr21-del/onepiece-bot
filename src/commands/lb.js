const { EmbedBuilder } = require("discord.js");
const { readPlayers } = require("../playerStore");
const { hydrateCard, getWeaponPower, getFruitPower } = require("../utils/evolution");
const weaponsDb = require("../data/weapons");
const devilFruitsDb = require("../data/devilFruits");

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
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

function getEquippedWeaponsPower(player) {
  const cards = (Array.isArray(player.cards) ? player.cards : [])
    .map(hydrateCard)
    .filter(Boolean);

  return cards.reduce((sum, card) => {
    const equipped = Array.isArray(card.equippedWeapons) ? card.equippedWeapons : [];

    const equippedPower = equipped.reduce((sub, entry) => {
      const template = findWeaponTemplate(entry.code || entry.name);
      if (!template) return sub;

      return sub + getWeaponPower(template, Number(entry.upgradeLevel || 0));
    }, 0);

    return sum + equippedPower;
  }, 0);
}

function getEquippedFruitsPower(player) {
  const cards = (Array.isArray(player.cards) ? player.cards : [])
    .map(hydrateCard)
    .filter(Boolean);

  return cards.reduce((sum, card) => {
    if (!card.equippedDevilFruit) return sum;

    const template = findFruitTemplate(
      card.equippedDevilFruitName || card.equippedDevilFruit
    );
    if (!template) return sum;

    return sum + getFruitPower(template);
  }, 0);
}

function getPlayerCollectionPower(player) {
  const cardsPower = getAllOwnedCardsPower(player);
  const equippedWeaponsPower = getEquippedWeaponsPower(player);
  const equippedFruitsPower = getEquippedFruitsPower(player);

  return {
    total: cardsPower + equippedWeaponsPower + equippedFruitsPower,
    breakdown: {
      cardsPower,
      equippedWeaponsPower,
      equippedFruitsPower,
    },
  };
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
        .map((player) => {
          const result = getPlayerCollectionPower(player);
          return {
            username: player.username || "Unknown",
            value: result.total,
          };
        })
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
                ? "Power includes all owned cards and only equipped weapons/devil fruits"
                : "Use op lb power to view total collection power",
          }),
      ],
    });
  },
};