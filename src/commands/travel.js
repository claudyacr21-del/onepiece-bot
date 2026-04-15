const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getCurrentIsland, getIslandByName, getIslandByCode } = require("../data/islands");

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
  name: "travel",
  aliases: ["goto"],
  async execute(message, args) {
    if (!args.length) {
      return message.reply("Usage: `op travel <island name>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const ship = getShipState(player);
    const currentIsland = getCurrentIsland(player);
    const targetQuery = args.join(" ");
    const targetIsland = getIslandByName(targetQuery);
    const now = Date.now();

    if (!targetIsland) {
      return message.reply(`No island found matching \`${targetQuery}\`.`);
    }

    if (ship.nextTravelAt > now) {
      return message.reply(`Your ship is not ready yet. Next travel: ${formatRemaining(ship.nextTravelAt - now)}`);
    }

    const unlockedCodes = Array.isArray(ship.unlockedIslands) ? ship.unlockedIslands : ["shells_town"];
    const unlockedTarget = unlockedCodes
      .map((code) => getIslandByCode(code))
      .find((island) => island?.code === targetIsland.code);

    if (!unlockedTarget) {
      return message.reply(`You have not unlocked \`${targetIsland.name}\` yet.`);
    }

    if (currentIsland.code === targetIsland.code) {
      return message.reply(`You are already at \`${targetIsland.name}\`.`);
    }

    updatePlayer(message.author.id, {
      currentIsland: targetIsland.name,
      ship: {
        ...(player.ship || {}),
        name: ship.name,
        tier: ship.tier,
        sea: targetIsland.sea,
        nextTravelAt: now + TRAVEL_COOLDOWN_MS,
        unlockedIslands: unlockedCodes,
        currentPort: targetIsland.name
      }
    });

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("🧭 Travel Successful")
      .setDescription(
        [
          `**Departed From:** \`${currentIsland.name}\``,
          `**Arrived At:** \`${targetIsland.name}\``,
          `**Sea:** \`${targetIsland.sea}\``,
          "",
          targetIsland.description || "",
          "",
          `**Next Travel:** \`${formatRemaining(TRAVEL_COOLDOWN_MS)}\``
        ].filter(Boolean).join("\n")
      )
      .setImage(targetIsland.image || null)
      .setFooter({ text: "One Piece Bot • Travel" });

    return message.reply({ embeds: [embed] });
  }
};