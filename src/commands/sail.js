const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getCurrentIsland, getNextIsland } = require("../data/islands");

const TRAVEL_COOLDOWN_MS = 60 * 60 * 1000;

function formatRemaining(ms) {
  if (ms <= 0) return "Now";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "Now";
}

function getShipState(player) {
  return {
    name: player?.ship?.name || "Going Merry",
    tier: Number(player?.ship?.tier || 1),
    sea: player?.ship?.sea || "East Blue",
    nextTravelAt: Number(player?.ship?.nextTravelAt || 0),
    unlockedIslands: Array.isArray(player?.ship?.unlockedIslands) && player.ship.unlockedIslands.length
      ? player.ship.unlockedIslands
      : ["shells_town"]
  };
}

module.exports = {
  name: "sail",
  aliases: ["nextisland"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const currentIsland = getCurrentIsland(player);
    const nextIsland = getNextIsland(currentIsland);
    const ship = getShipState(player);
    const cards = Array.isArray(player.cards) ? player.cards : [];
    const teamSlots = Array.isArray(player?.team?.slots) ? player.team.slots : [];
    const teamCount = teamSlots.filter(Boolean).length;
    const now = Date.now();

    if (!nextIsland) {
      return message.reply("There is no next island available on your current route yet.");
    }

    if (ship.nextTravelAt > now) {
      return message.reply(`Your ship is not ready yet. Next travel: ${formatRemaining(ship.nextTravelAt - now)}`);
    }

    if (ship.tier < Number(nextIsland.requiredShipTier || 1)) {
      return message.reply(
        `Your ship tier is too low. You need Ship Tier ${nextIsland.requiredShipTier} to reach ${nextIsland.name}.`
      );
    }

    if (teamCount < 3) {
      return message.reply("You need a full team of 3 battle cards before sailing.");
    }

    if (cards.filter((card) => card.cardRole !== "boost").length < 3) {
      return message.reply("You need at least 3 battle cards before sailing.");
    }

    const unlocked = Array.isArray(ship.unlockedIslands) ? [...ship.unlockedIslands] : ["shells_town"];
    if (!unlocked.includes(nextIsland.code)) {
      unlocked.push(nextIsland.code);
    }

    updatePlayer(message.author.id, {
      currentIsland: nextIsland.name,
      ship: {
        ...(player.ship || {}),
        name: ship.name,
        tier: ship.tier,
        sea: nextIsland.sea,
        nextTravelAt: now + TRAVEL_COOLDOWN_MS,
        unlockedIslands: unlocked
      }
    });

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("⛵ Voyage Successful")
      .setDescription(
        [
          `**Departed From:** \`${currentIsland.name}\``,
          `**Arrived At:** \`${nextIsland.name}\``,
          `**Sea:** \`${nextIsland.sea}\``,
          `**Ship Tier Check:** \`${ship.tier}/${nextIsland.requiredShipTier}\``,
          `**Boss Route Ahead:** \`${nextIsland.boss || "Unknown"}\``,
          "",
          nextIsland.description || "",
          "",
          `**Next Travel:** \`${formatRemaining(TRAVEL_COOLDOWN_MS)}\``
        ].filter(Boolean).join("\n")
      )
      .setFooter({ text: "One Piece Bot • Sailing" });

    return message.reply({ embeds: [embed] });
  }
};