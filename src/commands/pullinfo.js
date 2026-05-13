const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const {
  getPullSlotStatus,
  buildPullAccessSnapshot,
} = require("../utils/pullSlots");
const { getPremiumTier } = require("../utils/premiumAccess");

function fmtInfo(slot) {
  const max = Number(slot?.max || 0);
  const displayMax = Number(slot?.displayMax || max || 0);
  return slot?.enabled ? `${max}/${displayMax}` : `0/${displayMax}`;
}

function getActiveSlotTotal(slots) {
  return Object.values(slots).reduce((total, slot) => {
    if (!slot.enabled) return total;
    return total + Number(slot.max || 0);
  }, 0);
}

function getPotentialSlotTotal(slots) {
  return Object.values(slots).reduce((total, slot) => {
    return total + Number(slot.displayMax || slot.max || 0);
  }, 0);
}

function getTierInfo(tier) {
  if (tier === "motherFlame") {
    return {
      label: "Mother Flame",
      pity: "S at 100 pity",
      note: "Full premium tier",
    };
  }

  if (tier === "vivreCard") {
    return {
      label: "Vivre Card",
      pity: "S at 125 pity",
      note: "Lite premium tier",
    };
  }

  return {
    label: "Normal",
    pity: "A at 150 pity",
    note: "Normal tier",
  };
}

module.exports = {
  name: "pullinfo",
  aliases: ["pi"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const premiumTier = await getPremiumTier(message);

    const snapshot = buildPullAccessSnapshot(player, message);

    if (premiumTier === "motherFlame") {
      snapshot.patreon = true;
      snapshot.vivreCard = false;
    }

    if (premiumTier === "vivreCard") {
      snapshot.vivreCard = true;
      snapshot.patreon = false;
    }

    updatePlayer(message.author.id, {
      pullAccessSnapshot: snapshot,
    });

    player.pullAccessSnapshot = snapshot;

    const slots = getPullSlotStatus(player, message);
    const activeSlotTotal = getActiveSlotTotal(slots);
    const potentialSlotTotal = getPotentialSlotTotal(slots);
    const tierInfo = getTierInfo(premiumTier);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("🎰 Pull Slot Information")
      .setDescription(
        [
          "`op pull` and `op pa` use the same synced pity counter.",
          "",
          `↪ Premium Tier: **${tierInfo.label}**`,
          `↪ Pity Guarantee: **${tierInfo.pity}**`,
          `↪ Tier Note: ${tierInfo.note}`,
          "",
          "**Pull Slots**",
          `↪ Base Pulls: ${fmtInfo(slots.base)}`,
          `↪ Bonus Pull For Main Server Members: ${fmtInfo(slots.supportMember)}`,
          `↪ Bonus Pull For Main Server Boosters: ${fmtInfo(slots.booster)}`,
          `↪ Bonus Pull For Server Owners: ${fmtInfo(slots.owner)}`,
          `↪ Bonus Pulls From Mother Flame: ${fmtInfo(slots.patreon)}`,
          `↪ Bonus Pulls From Baccarat Card: ${fmtInfo(slots.baccaratCard)}`,
          `↪ Bonus Pulls From Baccarat Devil Fruit: ${fmtInfo(slots.baccaratFruit)}`,
          "",
          "This page shows your unlocked pull slots, not your remaining pulls.",
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Pull Slot Information",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};