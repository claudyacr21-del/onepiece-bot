const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { getShipByCode, getNextShip } = require("../data/ships");

module.exports = {
  name: "ship",
  aliases: ["myship"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const ship = getShipByCode(player?.ship?.shipCode || "going_merry");
    const nextShip = getNextShip(ship.code);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`🚢 ${ship.name}`)
          .setDescription(
            [
              `**Tier:** ${player?.ship?.tier || ship.tier}`,
              `**Sea:** ${ship.sea}`,
              `**HP Bonus:** +${ship.hpBonus}`,
              `**Reward Bonus:** +${ship.rewardBonus}%`,
              `**Travel Cooldown Reduction:** ${ship.travelCooldownReduction} minute(s)`,
              "",
              nextShip
                ? `**Next Upgrade:** ${nextShip.name}`
                : "**Next Upgrade:** Max ship reached",
            ].join("\n")
          )
          .setImage(ship.image || null)
          .setFooter({ text: `Ship Code: ${ship.code}` }),
      ],
    });
  },
};