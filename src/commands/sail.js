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
        : ["foosha_village"],
    currentPort: stored.currentPort || player?.currentIsland || "Foosha Village",
    image: shipData.image || "",
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
    const now = Date.now();
    const clearedBosses = Array.isArray(player?.story?.clearedIslandBosses)
      ? player.story.clearedIslandBosses
      : [];

    if (!nextIsland) {
      return message.reply("There is no next island available from your current route.");
    }

    if (!clearedBosses.includes(currentIsland.code)) {
      return message.reply(
        [
          `You must defeat the boss of **${currentIsland.name}** first before sailing to **${nextIsland.name}**.`,
          "Use `op boss`.",
        ].join("\n")
      );
    }

    if (ship.nextTravelAt > now) {
      return message.reply(
        `Your ship is not ready yet.\nNext travel: ${formatRemaining(ship.nextTravelAt - now)}`
      );
    }

    if (ship.tier < Number(nextIsland.requiredShipTier || 1)) {
      return message.reply(
        [
          `Your ship is too weak to sail to **${nextIsland.name}**.`,
          `Required Ship Tier: **${nextIsland.requiredShipTier}**`,
          `Current Ship Tier: **${ship.tier}**`,
          "Use `op ship` and `op ship upgrade` first.",
        ].join("\n")
      );
    }

    const unlockedIslands = Array.isArray(ship.unlockedIslands)
      ? [...ship.unlockedIslands]
      : ["foosha_village"];

    if (!unlockedIslands.includes(nextIsland.code)) {
      unlockedIslands.push(nextIsland.code);
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
        unlockedIslands,
        currentPort: nextIsland.name,
      },
    });

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle("⛵ Sailing Complete")
          .setDescription(
            [
              `**Departed From:** ${currentIsland.name}`,
              `**Arrived At:** ${nextIsland.name}`,
              "",
              `**Sea:** ${nextIsland.sea}`,
              `**Saga:** ${nextIsland.saga || "Unknown"}`,
              `**Boss Route:** ${nextIsland.boss || "None"}`,
              `**Ship:** ${ship.name}`,
              `**Ship Tier:** ${ship.tier}`,
              `**Reward Bonus:** +${ship.rewardBonus}%`,
              `**Travel Cooldown Reduction:** ${ship.travelCooldownReduction} minute(s)`,
              "",
              "You may now use `op travel`, `op fight`, and `op boss` on this island.",
              `**Next Travel:** ${formatRemaining(cooldownMs)}`,
            ].join("\n")
          )
          .setThumbnail(ship.image || null)
          .setImage(nextIsland.image || null)
          .setFooter({ text: `${ship.name} • Tier ${ship.tier}` }),
      ],
    });
  },
};