const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getCurrentIsland, getNextIsland } = require("../data/islands");
const { getShipByCode } = require("../data/ships");

module.exports = {
  name: "sail",
  aliases: ["nextisland", "goto"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const currentIsland = getCurrentIsland(player);
    const nextIsland = getNextIsland(currentIsland);

    if (!nextIsland) return message.reply("There is no next island available from your current route.");

    const clearedBosses = Array.isArray(player?.story?.clearedIslandBosses)
      ? player.story.clearedIslandBosses
      : [];

    if (!clearedBosses.includes(currentIsland.code)) {
      return message.reply(
        `You must defeat the boss of **${currentIsland.name}** first before sailing to **${nextIsland.name}**. Use \`op boss\`.`
      );
    }

    const ship = getShipByCode(player?.ship?.shipCode || "going_merry");
    const currentTier = Number(player?.ship?.tier || ship.tier || 1);

    if (currentTier < Number(nextIsland.requiredShipTier || 1)) {
      return message.reply(
        `Your ship is too weak to sail to **${nextIsland.name}**.\nRequired Ship Tier: **${nextIsland.requiredShipTier}**\nCurrent Ship Tier: **${currentTier}**\nUse \`op ship\` and \`op ship upgrade\` first.`
      );
    }

    const unlockedIslands = Array.isArray(player?.ship?.unlockedIslands)
      ? [...player.ship.unlockedIslands]
      : ["foosha_village"];

    if (!unlockedIslands.includes(nextIsland.code)) unlockedIslands.push(nextIsland.code);

    updatePlayer(message.author.id, {
      currentIsland: nextIsland.name,
      ship: {
        ...(player.ship || {}),
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
              `You sailed from **${currentIsland.name}** to **${nextIsland.name}**.`,
              "",
              `**Sea:** ${nextIsland.sea}`,
              `**Saga:** ${nextIsland.saga}`,
              `**Boss Route:** ${nextIsland.boss || "None"}`,
              "",
              `You may now use \`op travel\`, \`op fight\`, and \`op boss\` on this island.`,
            ].join("\n")
          )
          .setThumbnail(ship.image || null)
          .setImage(nextIsland.image || null)
          .setFooter({ text: `${ship.name} • Tier ${currentTier}` }),
      ],
    });
  },
};