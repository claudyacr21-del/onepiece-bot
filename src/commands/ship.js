const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getShipByCode, getNextShip } = require("../data/ships");

function getMaterialAmount(materials, code) {
  const found = (Array.isArray(materials) ? materials : []).find((x) => x.code === code);
  return Number(found?.amount || 0);
}

function consumeMaterials(materials, costs) {
  const next = [...(Array.isArray(materials) ? materials : [])];

  for (const cost of costs) {
    const idx = next.findIndex((x) => x.code === cost.code);
    if (idx === -1 || Number(next[idx].amount || 0) < Number(cost.amount || 0)) {
      throw new Error(`Missing material: ${cost.name}`);
    }
  }

  for (const cost of costs) {
    const idx = next.findIndex((x) => x.code === cost.code);
    const current = Number(next[idx].amount || 0);
    const remain = current - Number(cost.amount || 0);

    if (remain <= 0) next.splice(idx, 1);
    else next[idx] = { ...next[idx], amount: remain };
  }

  return next;
}

function buildRequirementText(player, ship) {
  if (!ship?.upgradeCost) return "Max ship reached.";

  const berryLine = `💰 Berries: ${Number(player.berries || 0).toLocaleString("en-US")} / ${Number(ship.upgradeCost.berries || 0).toLocaleString("en-US")}`;
  const materialLines = (ship.upgradeCost.materials || []).map((mat) => {
    const owned = getMaterialAmount(player.materials || [], mat.code);
    return `📦 ${mat.name}: ${owned}/${mat.amount}`;
  });

  return [berryLine, ...materialLines].join("\n");
}

module.exports = {
  name: "ship",
  aliases: ["myship"],
  async execute(message, args) {
    const sub = String(args?.[0] || "").toLowerCase();
    const player = getPlayer(message.author.id, message.author.username);
    const shipState = player?.ship || {};
    const ship = getShipByCode(shipState.shipCode || "small_boat");
    const nextShip = getNextShip(ship.code);

    if (sub !== "upgrade") {
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
                nextShip ? `**Next Upgrade:** ${nextShip.name}` : "**Next Upgrade:** Max ship reached",
                "",
                nextShip ? "**Upgrade Requirements**" : "",
                nextShip ? buildRequirementText(player, ship) : "",
              ]
                .filter(Boolean)
                .join("\n")
            )
            .setImage(ship.image || null)
            .setFooter({ text: `Ship Code: ${ship.code}` }),
        ],
      });
    }

    if (!ship.upgradeCost || !nextShip) {
      return message.reply("Your ship is already at max tier.");
    }

    const berryNeed = Number(ship.upgradeCost.berries || 0);
    const currentBerries = Number(player.berries || 0);

    if (currentBerries < berryNeed) {
      return message.reply(
        [
          `Not enough berries to upgrade **${ship.name}**.`,
          `Need: **${berryNeed.toLocaleString("en-US")}**`,
          `Current: **${currentBerries.toLocaleString("en-US")}**`,
        ].join("\n")
      );
    }

    for (const mat of ship.upgradeCost.materials || []) {
      const owned = getMaterialAmount(player.materials || [], mat.code);
      if (owned < Number(mat.amount || 0)) {
        return message.reply(
          [
            `Not enough materials to upgrade **${ship.name}**.`,
            `Missing: **${mat.name}**`,
            `Need: **${mat.amount}**`,
            `Current: **${owned}**`,
          ].join("\n")
        );
      }
    }

    const updatedMaterials = consumeMaterials(player.materials || [], ship.upgradeCost.materials || []);

    updatePlayer(message.author.id, {
      berries: currentBerries - berryNeed,
      materials: updatedMaterials,
      ship: {
        ...(player.ship || {}),
        shipCode: nextShip.code,
        tier: nextShip.tier,
        name: nextShip.name,
      },
    });

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("🚢 Ship Upgrade Success")
          .setDescription(
            [
              `Upgraded from **${ship.name}** to **${nextShip.name}**`,
              `**New Tier:** ${nextShip.tier}`,
              `**Sea:** ${nextShip.sea}`,
              `**HP Bonus:** +${nextShip.hpBonus}`,
              `**Reward Bonus:** +${nextShip.rewardBonus}%`,
              `**Travel Cooldown Reduction:** ${nextShip.travelCooldownReduction} minute(s)`,
            ].join("\n")
          )
          .setImage(nextShip.image || null)
          .setFooter({ text: `Ship Code: ${nextShip.code}` }),
      ],
    });
  },
};