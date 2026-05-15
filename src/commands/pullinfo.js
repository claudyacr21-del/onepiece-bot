const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const {
  getPullSlotStatus,
  buildPullAccessSnapshot,
} = require("../utils/pullSlots");
const { getPremiumTier } = require("../utils/premiumAccess");

function fmtInfo(slot) {
  const max = Number(slot?.max || 0);
  const used = Number(slot?.used || 0);
  const displayMax = Number(slot?.displayMax || max || 0);
  const remaining = slot?.enabled ? Math.max(0, max - used) : 0;

  return `${remaining}/${displayMax}`;
}

function getActiveSlotTotal(slots) {
  return Object.values(slots).reduce((total, slot) => {
    if (!slot.enabled) return total;

    const max = Number(slot.max || 0);
    const used = Number(slot.used || 0);

    return total + Math.max(0, max - used);
  }, 0);
}

function getPotentialSlotTotal(slots) {
  return Object.values(slots).reduce((total, slot) => {
    return total + Number(slot.displayMax || slot.max || 0);
  }, 0);
}

function syncPremiumSnapshot(snapshot, premiumTier) {
  if (premiumTier === "motherFlame") {
    return {
      ...snapshot,
      patreon: true,
      vivreCard: false,
      litePremium: false,
    };
  }

  if (premiumTier === "vivreCard") {
    return {
      ...snapshot,
      patreon: false,
      vivreCard: true,
      litePremium: true,
    };
  }

  return {
    ...snapshot,
    patreon: false,
    vivreCard: false,
    litePremium: false,
  };
}

module.exports = {
  name: "pullinfo",
  aliases: ["pi"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const premiumTier = await getPremiumTier(message);

    const snapshot = syncPremiumSnapshot(
      buildPullAccessSnapshot(player, message),
      premiumTier
    );

    updatePlayer(message.author.id, {
      pullAccessSnapshot: snapshot,
    });

    player.pullAccessSnapshot = snapshot;

    const slots = getPullSlotStatus(player, message);
    const activeSlotTotal = getActiveSlotTotal(slots);
    const potentialSlotTotal = getPotentialSlotTotal(slots);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("Pull Slot Information")
      .setDescription(
        [
          "`op pull` and `op pa` use the same synced pity counter.",
          "Mother Flame users guarantee **S** at 100 pity.",
          "Vivre Card bonus slot uses **Vivre Card rates**.",
          "Non-premium/base slots guarantee **A** at 150 pity.",
          "",
          `↪ Base Pulls: ${fmtInfo(slots.base)}`,
          `↪ Bonus Pull For Main Server Members: ${fmtInfo(slots.supportMember)}`,
          `↪ Bonus Pull For Main Server Boosters: ${fmtInfo(slots.booster)}`,
          `↪ Bonus Pull For Server Owners: ${fmtInfo(slots.owner)}`,
          `↪ Bonus Pulls From Mother Flame: ${fmtInfo(slots.patreon)}`,
          `↪ Bonus Pulls From Baccarat Card: ${fmtInfo(slots.baccaratCard)}`,
          `↪ Bonus Pulls From Baccarat Devil Fruit: ${fmtInfo(slots.baccaratFruit)}`,
          "",
          `**Remaining Pulls:** ${activeSlotTotal}/${potentialSlotTotal}`,
          "",
          "This page shows your remaining pull slots.",
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Pull Slot Information",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};