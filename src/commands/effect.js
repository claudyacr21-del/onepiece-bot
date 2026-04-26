const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const {
  getTotalPullUsage,
  buildPullAccessSnapshot,
} = require("../utils/pullSlots");
const { applyGlobalPullReset } = require("../utils/pullReset");
const {
  ensureDailyQuestState,
  getQuestCompletionSummary,
} = require("../utils/questProgress");

const PREMIUM_ROLE_NAME = "Mother Flame";

function hasRole(message, roleName) {
  return Boolean(
    message?.member?.roles?.cache?.some(
      (role) =>
        String(role?.name || "").toLowerCase() ===
        String(roleName || "").toLowerCase()
    )
  );
}

function formatValue(value, suffix = "") {
  const number = Number(value || 0);
  return number > 0 ? `+${number}${suffix}` : "None";
}

function getSharedPity(player) {
  const pity = player?.pity || {};

  return Number(
    pity.pullPity ??
      Math.max(Number(pity.normalSPity || 0), Number(pity.premiumSPity || 0)) ??
      0
  );
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

    const snapshot = buildPullAccessSnapshot(player, message);
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

    const isMotherFlame = hasRole(message, PREMIUM_ROLE_NAME);
    const pityLimit = isMotherFlame ? 100 : 150;
    const pityDrop = `${getSharedPity(player)}/${pityLimit}`;
    const boosts = getPassiveBoostSummary(player);
    const { totalUsed, totalMax } = getTotalPullUsage(player, message);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("✨ Current Effects & Status")
      .setDescription(
        [
          "## Pull",
          `↪ Pulls Done: ${totalUsed}/${totalMax}`,
          `↪ Quest Left: ${questSummary.left}/${questSummary.total}`,
          `↪ Pity Drop: ${pityDrop}`,
          "",
          "## Boost Effects",
          `↪ ATK Boost: ${formatValue(boosts.atk, "%")}`,
          `↪ HP Boost: ${formatValue(boosts.hp, "%")}`,
          `↪ SPD Boost: ${formatValue(boosts.spd, "%")}`,
          `↪ EXP Boost: ${formatValue(boosts.exp, "%")}`,
          `↪ DMG Boost: ${formatValue(boosts.dmg, "%")}`,
          `↪ Daily Reward Boost: ${formatValue(boosts.daily)}`,
          `↪ Fragment Storage Bonus: ${formatValue(boosts.fragmentStorageBonus)}`,
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Current Effects",
      });

    await message.reply({
      embeds: [embed],
    });
  },
};