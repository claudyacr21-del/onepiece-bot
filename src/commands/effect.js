const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const {
  getPassiveBoostSummary,
  buildBoostEffectLines,
} = require("../utils/passiveBoosts");
const {
  getTotalPullUsage,
  buildPullAccessSnapshot,
} = require("../utils/pullSlots");
const { applyGlobalPullReset } = require("../utils/pullReset");
const {
  ensureDailyQuestState,
  getQuestCompletionSummary,
} = require("../utils/questProgress");
const { getPremiumTier } = require("../utils/premiumAccess");

function getSharedPity(player) {
  const pity = player?.pity || {};
  return Number(
    pity.pullPity ??
      Math.max(Number(pity.normalSPity || 0), Number(pity.premiumSPity || 0)) ??
      0
  );
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

function getPityLimitByTier(tier, player = null) {
  if (tier === "motherFlame") return 100;
  if (tier === "vivreCard") return 125;

  const charms = getRyumaPityCharmCount(player);

  if (charms >= 3) return 130;
  if (charms === 2) return 135;
  if (charms === 1) return 140;

  return 150;
}

function getPremiumLabelByTier(tier) {
  if (tier === "motherFlame") return "Mother Flame";
  if (tier === "vivreCard") return "Vivre Card";
  return "Normal";
}

function getPityGuaranteeByTier(tier, player = null) {
  if (tier === "motherFlame") return "S";
  if (tier === "vivreCard") return "S";

  const ryumaPityCharmCount = getRyumaPityCharmCount(player);

  return ryumaPityCharmCount > 0 ? "S" : "A";
}

module.exports = {
  name: "effect",
  aliases: ["effects", "status"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const resetState = applyGlobalPullReset(player);
    if (resetState.wasReset) {
      updatePlayer(message.author.id, {
        pulls: resetState.pulls,
      });
      player.pulls = resetState.pulls;
    }

    const premiumTier = await getPremiumTier(message);
    const snapshot = buildPullAccessSnapshot(player, message);

    if (premiumTier === "motherFlame") {
      snapshot.patreon = true;
      snapshot.vivreCard = false;
      snapshot.litePremium = false;
    }

    if (premiumTier === "vivreCard") {
      snapshot.vivreCard = true;
      snapshot.litePremium = true;
      snapshot.patreon = false;
    }

    const dailyState = ensureDailyQuestState(player);
    const questSummary = getQuestCompletionSummary(dailyState);

    const syncPayload = {
      quests: {
        ...(player.quests || {}),
        dailyState,
        daily: {
          ...(player?.quests?.daily || {}),
          total: questSummary.total,
          completed: questSummary.completed,
          left: questSummary.left,
          lastSyncedAt: Date.now(),
        },
      },
      pullAccessSnapshot: snapshot,
    };

    updatePlayer(message.author.id, syncPayload);

    player.quests = syncPayload.quests;
    player.pullAccessSnapshot = snapshot;

    const ryumaPityCharmCount = getRyumaPityCharmCount(player);
    const pityLimit = getPityLimitByTier(premiumTier, player);
    const premiumLabel = getPremiumLabelByTier(premiumTier);
    const pityGuarantee = getPityGuaranteeByTier(premiumTier, player);
    const pityDrop = `${getSharedPity(player)}/${pityLimit}`;

    const boosts = getPassiveBoostSummary(player);
    const { totalUsed, totalMax } = getTotalPullUsage(player, message);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("✨ Current Effects & Status")
      .setDescription(
        [
          "## Pull",
          `↪ Premium Tier: ${premiumLabel}`,
          `↪ Pulls Done: ${totalUsed}/${totalMax}`,
          `↪ Quest Left: ${questSummary.left}/${questSummary.total}`,
          `↪ Ryuma Pity Charm: ${ryumaPityCharmCount}/3`,
          `↪ Pity Drop: ${pityDrop}`,
          `↪ Pity Guarantee: ${pityGuarantee}`,
          "",
          "## Boost Effects",
          ...buildBoostEffectLines(boosts),
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Current Effects",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};