const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { applyGlobalPullReset } = require("../utils/pullReset");

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

    const boosts = getPassiveBoostSummary(player);
    const arena = getArenaSummary(player);
    const ship = getShipSummary(player);

    const questTotal = Number(player?.quests?.daily?.total || 5);
    const questCompleted = Number(player?.quests?.daily?.completed || 0);
    const questLeft = Math.max(0, questTotal - questCompleted);

    const pityDrop =
      Number(player?.pity?.premiumSPity || 0) > 0
        ? `${Number(player.pity.premiumSPity)}/100`
        : `${Number(player?.pity?.normalSPity || 0)}/150`;

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("✨ Current Effects & Status")
      .setDescription(
        [
          "## Boost Effects",
          `↪ ATK Boost: ${formatValue(boosts.atk, "%")}`,
          `↪ HP Boost: ${formatValue(boosts.hp, "%")}`,
          `↪ SPD Boost: ${formatValue(boosts.spd, "%")}`,
          `↪ EXP Boost: ${formatValue(boosts.exp, "%")}`,
          `↪ DMG Boost: ${formatValue(boosts.dmg, "%")}`,
          `↪ Daily Reward Boost: ${formatValue(boosts.daily)}`,
          `↪ Pull Chance Boost: ${formatValue(boosts.pullChance)}`,
          `↪ Fragment Storage Bonus: ${formatValue(boosts.fragmentStorageBonus)}`,
          "",
          "## Progress",
          `↪ Pity Drop: ${pityDrop}`,
          `↪ Quest Left: ${questLeft}/${questTotal}`,
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