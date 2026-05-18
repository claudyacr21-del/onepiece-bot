const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const { getShipByCode, getNextShip } = require("../data/ships");
const { incrementQuestCounter } = require("../utils/questProgress");

function getMaterialAmount(materials, code) {
  const found = (Array.isArray(materials) ? materials : []).find(
    (x) => String(x.code || "") === String(code || "")
  );

  return Number(found?.amount || 0);
}

function consumeMaterials(materials, costs) {
  const next = [...(Array.isArray(materials) ? materials : [])];

  for (const cost of costs) {
    const idx = next.findIndex(
      (x) => String(x.code || "") === String(cost.code || "")
    );

    if (idx === -1 || Number(next[idx].amount || 0) < Number(cost.amount || 0)) {
      throw new Error(`Missing material: ${cost.name}`);
    }
  }

  for (const cost of costs) {
    const idx = next.findIndex(
      (x) => String(x.code || "") === String(cost.code || "")
    );
    const current = Number(next[idx].amount || 0);
    const remain = current - Number(cost.amount || 0);

    if (remain <= 0) {
      next.splice(idx, 1);
    } else {
      next[idx] = {
        ...next[idx],
        amount: remain,
      };
    }
  }

  return next;
}

function buildRequirementText(player, ship) {
  if (!ship?.upgradeCost) return "Max ship reached.";

  const berryLine = `Berries: ${Number(player.berries || 0).toLocaleString(
    "en-US"
  )} / ${Number(ship.upgradeCost.berries || 0).toLocaleString("en-US")}`;

  const materialLines = (ship.upgradeCost.materials || []).map((mat) => {
    const owned = getMaterialAmount(player.materials || [], mat.code);
    return `${mat.name}: ${owned}/${mat.amount}`;
  });

  return [berryLine, ...materialLines].join("\n");
}

function getCurrentShip(player) {
  const shipState = player?.ship || {};
  return getShipByCode(shipState.shipCode || shipState.code || "small_boat");
}

module.exports = {
  name: "ship",
  aliases: ["myship"],

  async execute(message, args) {
    const sub = String(args?.[0] || "").toLowerCase();
    const player = getPlayer(message.author.id, message.author.username);
    const ship = getCurrentShip(player);

    if (!ship) {
      return message.reply({
        content: "Current ship data was not found.",
        allowedMentions: { repliedUser: false },
      });
    }

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
        allowedMentions: { repliedUser: false },
      });
    }

    if (!ship.upgradeCost || !nextShip) {
      return message.reply({
        content: "Your ship is already at max tier.",
        allowedMentions: { repliedUser: false },
      });
    }

    const berryNeed = Number(ship.upgradeCost.berries || 0);
    const currentBerries = Number(player.berries || 0);

    if (currentBerries < berryNeed) {
      return message.reply({
        content: [
          `Not enough berries to upgrade **${ship.name}**.`,
          `Need: **${berryNeed.toLocaleString("en-US")}**`,
          `Current: **${currentBerries.toLocaleString("en-US")}**`,
        ].join("\n"),
        allowedMentions: { repliedUser: false },
      });
    }

    for (const mat of ship.upgradeCost.materials || []) {
      const owned = getMaterialAmount(player.materials || [], mat.code);

      if (owned < Number(mat.amount || 0)) {
        return message.reply({
          content: [
            `Not enough materials to upgrade **${ship.name}**.`,
            `Missing: **${mat.name}**`,
            `Need: **${mat.amount}**`,
            `Current: **${owned}**`,
          ].join("\n"),
          allowedMentions: { repliedUser: false },
        });
      }
    }

    let finalOldShip = ship;
    let finalNextShip = nextShip;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const freshShip = getCurrentShip(fresh);

          if (!freshShip) {
            throw new Error("Current ship data was not found.");
          }

          const freshNextShip = getNextShip(freshShip.code);

          if (!freshShip.upgradeCost || !freshNextShip) {
            throw new Error("Your ship is already at max tier.");
          }

          const freshBerryNeed = Number(freshShip.upgradeCost.berries || 0);
          const freshCurrentBerries = Number(fresh.berries || 0);

          if (freshCurrentBerries < freshBerryNeed) {
            throw new Error(
              [
                `Not enough berries to upgrade **${freshShip.name}**.`,
                `Need: **${freshBerryNeed.toLocaleString("en-US")}**`,
                `Current: **${freshCurrentBerries.toLocaleString("en-US")}**`,
              ].join("\n")
            );
          }

          for (const mat of freshShip.upgradeCost.materials || []) {
            const owned = getMaterialAmount(fresh.materials || [], mat.code);

            if (owned < Number(mat.amount || 0)) {
              throw new Error(
                [
                  `Not enough materials to upgrade **${freshShip.name}**.`,
                  `Missing: **${mat.name}`,
                  `Need: **${mat.amount}**`,
                  `Current: **${owned}**`,
                ].join("\n")
              );
            }
          }

          const updatedMaterials = consumeMaterials(
            fresh.materials || [],
            freshShip.upgradeCost.materials || []
          );

          const updatedDailyState = incrementQuestCounter(fresh, "shipUpgrades", 1);

          finalOldShip = freshShip;
          finalNextShip = freshNextShip;

          return {
            ...fresh,
            berries: freshCurrentBerries - freshBerryNeed,
            materials: updatedMaterials,
            ship: {
              ...(fresh.ship || {}),
              shipCode: freshNextShip.code,
              code: freshNextShip.code,
              tier: freshNextShip.tier,
              name: freshNextShip.name,
              sea: freshNextShip.sea,
            },
            quests: {
              ...(fresh.quests || {}),
              dailyState: updatedDailyState,
            },
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Ship upgrade failed.",
        allowedMentions: { repliedUser: false },
      });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("🚢 Ship Upgrade Success")
          .setDescription(
            [
              `Upgraded from **${finalOldShip.name}** to **${finalNextShip.name}**`,
              `**New Tier:** ${finalNextShip.tier}`,
              `**Sea:** ${finalNextShip.sea}`,
              `**HP Bonus:** +${finalNextShip.hpBonus}`,
              `**Reward Bonus:** +${finalNextShip.rewardBonus}%`,
              `**Travel Cooldown Reduction:** ${finalNextShip.travelCooldownReduction} minute(s)`,
            ].join("\n")
          )
          .setImage(finalNextShip.image || null)
          .setFooter({ text: `Ship Code: ${finalNextShip.code}` }),
      ],
      allowedMentions: { repliedUser: false },
    });
  },
};