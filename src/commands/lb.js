const { EmbedBuilder } = require("discord.js");
const { readPlayers } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");

function getPlayerPower(player) {
  const cards = (Array.isArray(player.cards) ? player.cards : []).map(hydrateCard).filter(Boolean);
  const teamSlots = Array.isArray(player?.team?.slots) ? player.team.slots : [null, null, null];

  return teamSlots.reduce((sum, instanceId) => {
    if (!instanceId) return sum;
    const card = cards.find((entry) => entry.instanceId === instanceId && entry.cardRole !== "boost");
    return sum + Number(card?.currentPower || 0);
  }, 0);
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
      title = "⚔️ Team Power Leaderboard";
      rows = players
        .map((player) => ({
          username: player.username || "Unknown",
          value: getPlayerPower(player),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
        .map((entry, index) => `${index + 1}. **${entry.username}** • ${entry.value.toLocaleString("en-US")} power`);
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
        .map((entry, index) => `${index + 1}. **${entry.username}** • ${entry.points} pts • ${entry.wins}W/${entry.losses}L/${entry.draws}D`);
    }

    if (!rows.length) rows = ["No leaderboard data yet."];

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(title)
          .setDescription(rows.join("\n"))
          .setFooter({ text: mode === "power" ? "Use op lb arena to view ranked points" : "Use op lb power to view team power" }),
      ],
    });
  },
};