const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getCurrentIsland, getNextIsland } = require("../data/islands");
const { getShipByCode } = require("../data/ships");

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

module.exports = {
  name: "sail",
  aliases: ["nextisland"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const currentIsland = getCurrentIsland(player);
    const nextIsland = getNextIsland(currentIsland);
    const shipData = getShipByCode(player?.ship?.shipCode || "going_merry");
    const shipTier = Number(player?.ship?.tier || shipData.tier || 1);
    const nextTravelAt = Number(player?.ship?.nextTravelAt || 0);
    const unlockedIslands = Array.isArray(player?.ship?.unlockedIslands) && player.ship.unlockedIslands.length
      ? [...player.ship.unlockedIslands]
      : ["foosha_village"];
    const teamSlots = Array.isArray(player?.team?.slots) ? player.team.slots : [];
    const teamCount = teamSlots.filter(Boolean).length;
    const cards = Array.isArray(player.cards) ? player.cards : [];
    const now = Date.now();
    const clearedBosses = Array.isArray(player?.story?.clearedIslandBosses)
      ? player.story.clearedIslandBosses
      : [];

    if (!nextIsland) {
      return message.reply("There is no next island available on your current route yet.");
    }

    if (currentIsland.boss && !clearedBosses.includes(currentIsland.code)) {
      return message.reply(`You must defeat the boss of \`${currentIsland.name}\` first using \`op boss\`.`);
    }

    if (nextTravelAt > now) {
      return message.reply(`Your ship is not ready yet. Next travel: ${formatRemaining(nextTravelAt - now)}`);
    }

    if (shipTier < Number(nextIsland.requiredShipTier || 1)) {
      return message.reply(`Your ship tier is too low. You need Ship Tier ${nextIsland.requiredShipTier} to reach ${nextIsland.name}.`);
    }

    if (teamCount < 3 || cards.filter((card) => card.cardRole !== "boost").length < 3) {
      return message.reply("You need a full team of 3 battle cards before sailing.");
    }

    if (!unlockedIslands.includes(nextIsland.code)) {
      unlockedIslands.push(nextIsland.code);
    }

    updatePlayer(message.author.id, {
      currentIsland: nextIsland.name,
      ship: {
        ...(player.ship || {}),
        shipCode: player?.ship?.shipCode || "going_merry",
        tier: shipTier,
        sea: nextIsland.sea,
        nextTravelAt: now + TRAVEL_COOLDOWN_MS,
        unlockedIslands,
        currentPort: nextIsland.name
      }
    });

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("⛵ Voyage Successful")
      .setDescription(
        [
          `**Ship:** \`${shipData.name}\``,
          `**Departed From:** \`${currentIsland.name}\``,
          `**Arrived At:** \`${nextIsland.name}\``,
          `**Sea:** \`${nextIsland.sea}\``,
          `**Ship Tier Check:** \`${shipTier}/${nextIsland.requiredShipTier}\``,
          nextIsland.boss ? `**Next Boss Route:** \`${nextIsland.boss}\`` : null,
          "",
          nextIsland.description || "",
          "",
          `**Next Travel:** \`${formatRemaining(TRAVEL_COOLDOWN_MS)}\``
        ].filter(Boolean).join("\n")
      )
      .setThumbnail(shipData.image || null)
      .setImage(nextIsland.image || null)
      .setFooter({ text: "One Piece Bot • Sailing" });

    return message.reply({ embeds: [embed] });
  }
};