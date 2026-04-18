const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getCurrentIsland, getNextIsland } = require("../data/islands");
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
    const clearedBosses = Array.isArray(player?.story?.clearedIslandBosses)
      ? player.story.clearedIslandBosses
      : [];

    if (!nextIsland) {
      return message.reply("There is no next island available on your current route yet.");
    }

    if (!clearedBosses.includes(currentIsland.code)) {
      return message.reply(`You must defeat the boss of \`${currentIsland.name}\` first using \`op boss\`.`);
    }

    if (ship.nextTravelAt > now) {
      return message.reply(`Your ship is not ready yet.\nNext travel: ${formatRemaining(ship.nextTravelAt - now)}`);
    }

    if (ship.tier < Number(nextIsland.requiredShipTier || 1)) {
      return message.reply(
        `Your ship tier is too low.\nYou need Ship Tier ${nextIsland.requiredShipTier} to reach ${nextIsland.name}.`
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

    const cooldownMs = getTravelCooldownMs(ship);

    updatePlayer(message.author.id, {
      currentIsland: nextIsland.name,
      ship: {
        ...(player.ship || {}),
        shipCode: ship.code,
        name: ship.name,
        tier: ship.tier,
        sea: nextIsland.sea,
        nextTravelAt: now + cooldownMs,
        unlockedIslands: unlocked,
        currentPort: nextIsland.name,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("⛵ Voyage Successful")
      .setDescription(
        [
          `**Departed From:** \`${currentIsland.name}\``,
          `**Arrived At:** \`${nextIsland.name}\``,
          `**Sea:** \`${nextIsland.sea}\``,
          `**Ship:** \`${ship.name}\``,
          `**Ship Tier Check:** \`${ship.tier}/${nextIsland.requiredShipTier}\``,
          `**Ship Reward Bonus:** \`+${ship.rewardBonus}%\``,
          `**Travel Cooldown Reduction:** \`${ship.travelCooldownReduction} minute(s)\``,
          `**Next Boss Route:** \`${nextIsland.boss || "Unknown"}\``,
          "",
          nextIsland.description || "",
          "",
          `**Next Travel:** \`${formatRemaining(cooldownMs)}\``,
        ].filter(Boolean).join("\n")
      )
      .setImage(nextIsland.image || null)
      .setFooter({ text: "One Piece Bot • Sailing" });

    return message.reply({ embeds: [embed] });
  },
};