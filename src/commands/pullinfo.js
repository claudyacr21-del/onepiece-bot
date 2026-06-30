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

function getPremiumLabel(tier) {
  if (tier === "motherFlame") return "Mother Flame";
  if (tier === "vivreCard") return "Vivre Card";
  return "Normal";
}

function getRyumaPityCharmCount(player) {
  const items = Array.isArray(player?.items) ? player.items : [];

  const charm = items.find((item) => {
    const code = String(item?.code || "").toLowerCase().trim();
    const name = String(item?.name || "").toLowerCase().trim();

    return code === "ryuma_pity_charm" || name === "ryuma pity charm";
  });

  return Math.max(0, Math.min(3, Math.floor(Number(charm?.amount || 0))));
}

function getRyumaNormalPityLimit(player) {
  const charms = getRyumaPityCharmCount(player);

  if (charms >= 3) return 130;
  if (charms === 2) return 135;
  if (charms === 1) return 140;

  return 150;
}

function getPityGuarantee(tier, player = null) {
  if (tier === "motherFlame") return "S at 100 pity";
  if (tier === "vivreCard") return "S at 125 pity";

  const charms = getRyumaPityCharmCount(player);
  const pityLimit = getRyumaNormalPityLimit(player);

  if (charms > 0) {
    return `S at ${pityLimit} pity (${charms}/3 Ryuma Pity Charm)`;
  }

  return "S at 150 pity";
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
      .setTitle("🎰 Pull Slot Information")
      .setDescription(
        [
          "`op pull` and `op pa` use the same synced pity counter.",
          "",
          `↪ Premium Tier: ${getPremiumLabel(premiumTier)}`,
          `↪ Pity Guarantee: ${getPityGuarantee(premiumTier, player)}`,
          `↪ Tier Note: ${
            premiumTier === "motherFlame"
              ? "Mother Flame tier"
              : premiumTier === "vivreCard"
              ? "Vivre Card tier only applies to Vivre Card slot"
              : "Normal tier"
          }`,
          "",
          "**Pull Slots**",
          `↪ Base Pulls: ${fmtInfo(slots.base)}`,
          `↪ Bonus Pull For Main Server Members: ${fmtInfo(slots.supportMember)}`,
          `↪ Bonus Pull For Main Server Boosters: ${fmtInfo(slots.booster)}`,
          `↪ Bonus Pull For Server Owners (invite bot to your server): ${fmtInfo(slots.owner)}`,
          `↪ Bonus Pulls From Mother Flame: ${fmtInfo(slots.patreon)}`,
          `↪ Bonus Pulls From Vivre Card: ${fmtInfo(slots.vivreCard)}`,
          `↪ Bonus Pulls From Baccarat Card: ${fmtInfo(slots.baccaratCard)}`,
          `↪ Bonus Pulls From Baccarat Devil Fruit: ${fmtInfo(slots.baccaratFruit)}`,
          "",
          "",
          "This page shows your unlocked pull slots.",
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