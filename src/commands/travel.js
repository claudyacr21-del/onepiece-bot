const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getCurrentIsland, getIslandByName, getIslandByCode } = require("../data/islands");
const { getShipByCode } = require("../data/ships");

const BASE_TRAVEL_COOLDOWN_MS = 60 * 60 * 1000;

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
  const stored = player?.ship || {};
  const shipData = getShipByCode(stored.shipCode || "small_boat");

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
        : ["shells_town"],
    currentPort: stored.currentPort || player?.currentIsland || "Shells Town",
  };
}

function getTravelCooldownMs(ship) {
  const reducedMinutes = Math.max(0, Number(ship.travelCooldownReduction || 0));
  return Math.max(5 * 60 * 1000, BASE_TRAVEL_COOLDOWN_MS - reducedMinutes * 60 * 1000);
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
      return message.reply(`Your ship is not ready yet.\nNext travel: ${formatRemaining(ship.nextTravelAt - now)}`);
    }

    const unlockedCodes = Array.isArray(ship.unlockedIslands) ? ship.unlockedIslands : ["shells_town"];
    const unlockedTarget = unlockedCodes
      .map((code) => getIslandByCode(code))
      .find((island) => island?.code === targetIsland.code);

    if (!unlockedTarget) {
      return message.reply(`You have not unlocked \`${targetIsland.name}\` yet.`);
    }

    if (ship.tier < Number(targetIsland.requiredShipTier || 1)) {
      return message.reply(
        `Your ship tier is too low.\nYou need Ship Tier ${targetIsland.requiredShipTier} to reach ${targetIsland.name}.`
      );
    }

    if (currentIsland.code === targetIsland.code) {
      return message.reply(`You are already at \`${targetIsland.name}\`.`);
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

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("🧭 Travel Successful")
      .setDescription(
        [
          `**Departed From:** \`${currentIsland.name}\``,
          `**Arrived At:** \`${targetIsland.name}\``,
          `**Sea:** \`${targetIsland.sea}\``,
          `**Ship:** \`${ship.name}\``,
          `**Ship Tier:** \`${ship.tier}\``,
          `**Ship Reward Bonus:** \`+${ship.rewardBonus}%\``,
          `**Travel Cooldown Reduction:** \`${ship.travelCooldownReduction} minute(s)\``,
          "",
          targetIsland.description || "",
          "",
          `**Next Travel:** \`${formatRemaining(cooldownMs)}\``,
        ].filter(Boolean).join("\n")
      )
      .setImage(targetIsland.image || null)
      .setFooter({ text: "One Piece Bot • Travel" });

    return message.reply({ embeds: [embed] });
  },
};