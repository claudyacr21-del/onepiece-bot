const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { getTotalPullUsage, buildPullAccessSnapshot } = require("../utils/pullSlots");
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

function getArenaSummary(player) {
  const arena = player?.arena || {};
  return {
    points: Number(arena.points || 0),
    wins: Number(arena.wins || 0),
    losses: Number(arena.losses || 0),
    draws: Number(arena.draws || 0),
    streak: Number(arena.streak || 0),
  };
}

function getShipSummary(player) {
  const ship = player?.ship || {};
  return {
    name: ship.name || "Small Boat",
    tier: Number(ship.tier || 1),
  };
}

module.exports = {
  name: "effect",
  aliases: ["effects", "status"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const resetState = applyGlobalPullReset(player);
    if (resetState.wasReset) {
      updatePlayer(message.author.id, { pulls: resetState.pulls });
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
    };

    if (message.guild) {
      syncPayload.pullAccessSnapshot = snapshot;
    }

    updatePlayer(message.author.id, syncPayload);

    player.quests = syncPayload.quests;
    if (message.guild) {
      player.pullAccessSnapshot = snapshot;
    }

    const isMotherFlame = hasRole(message, PREMIUM_ROLE_NAME);
    const pityDrop = isMotherFlame
      ? `${Number(player?.pity?.premiumSPity || 0)}/100`
      : `${Number(player?.pity?.normalSPity || 0)}/150`;

    const boosts = getPassiveBoostSummary(player);
    const { totalUsed, totalMax } = getTotalPullUsage(player, message);
    const arena = getArenaSummary(player);
    const ship = getShipSummary(player);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("✨ Current Effects & Status")
      .setDescription(
        [
          "## Pull",
          `↪ Pulls Done: ${totalUsed}/${totalMax}`,
          `↪ Total Pull Chance: ${formatValue(boosts.pullChance, "%")}`,
          "",

          "## Boost Effects",
          `↪ ATK Boost: ${formatValue(boosts.atk, "%")}`,
          `↪ HP Boost: ${formatValue(boosts.hp, "%")}`,
          `↪ SPD Boost: ${formatValue(boosts.spd, "%")}`,
          `↪ EXP Boost: ${formatValue(boosts.exp, "%")}`,
          `↪ DMG Boost: ${formatValue(boosts.dmg, "%")}`,
          `↪ Daily Reward Boost: ${formatValue(boosts.daily)}`,
          `↪ Fragment Storage Bonus: ${formatValue(boosts.fragmentStorageBonus)}`,
          "",

          "## Progress",
          `↪ Pity Drop: ${pityDrop}`,
          `↪ Quest Left: ${questSummary.left}/${questSummary.total}`,
          `↪ Fight Streak: ${Number(player?.fightStreak || 0)}`,
          "",

          "## Arena",
          `↪ Arena Points: ${arena.points}`,
          `↪ Record: ${arena.wins}W / ${arena.losses}L / ${arena.draws}D`,
          `↪ Arena Streak: ${arena.streak}`,
          "",

          "## Ship",
          `↪ Current Ship: ${ship.name}`,
          `↪ Ship Tier: ${ship.tier}`,
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Current Effects" });

    await message.reply({ embeds: [embed] });
  },
};