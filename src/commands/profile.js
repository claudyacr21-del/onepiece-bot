const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { PREMIUM_ROLE_NAME } = require("../utils/pullAccess");
const { hydrateCard } = require("../utils/evolution");

const DEFAULT_START_ISLAND = "Foosha Village";

function hasRole(message, roleName) {
  if (!message.member?.roles?.cache || !roleName) return false;
  return message.member.roles.cache.some((role) => role.name === roleName);
}

function getProfileImage(message) {
  return (
    message.member?.displayAvatarURL?.({ extension: "png", size: 512 }) ||
    message.author.displayAvatarURL({ extension: "png", size: 512 })
  );
}

function getHydratedCards(player) {
  return (Array.isArray(player.cards) ? player.cards : [])
    .map(hydrateCard)
    .filter(Boolean);
}

function getTeamUnits(player) {
  const cards = getHydratedCards(player);
  const slots = Array.isArray(player?.team?.slots)
    ? player.team.slots
    : [null, null, null];

  return slots
    .map((instanceId) => {
      if (!instanceId) return null;

      return (
        cards.find(
          (card) =>
            String(card.instanceId) === String(instanceId) &&
            String(card.cardRole || "").toLowerCase() !== "boost"
        ) || null
      );
    })
    .filter(Boolean);
}

function getTeamPower(player) {
  return getTeamUnits(player).reduce(
    (sum, card) => sum + Number(card?.currentPower || 0),
    0
  );
}

function getStoryProgress(player) {
  const cleared = Array.isArray(player?.story?.clearedIslandBosses)
    ? player.story.clearedIslandBosses.length
    : 0;

  const currentIsland = player.currentIsland || DEFAULT_START_ISLAND;

  return `${cleared} bosses cleared • Current island: ${currentIsland}`;
}

function getArenaSummary(player) {
  const arena = player?.arena || {};

  return {
    points: Number(arena.points || 0),
    wins: Number(arena.wins || 0),
    losses: Number(arena.losses || 0),
    draws: Number(arena.draws || 0),
    streak: Number(arena.streak || 0),
    bestStreak: Number(arena.bestStreak || 0),
  };
}

function getShipSummary(player) {
  const ship = player?.ship || {};

  return {
    name: ship.name || "Small Boat",
    tier: Number(ship.tier || 1),
  };
}

function getCardStatistics(player) {
  const cards = getHydratedCards(player);

  return {
    totalCards: cards.length,
    mastery1Cards: cards.filter(
      (card) => Number(card?.evolutionStage || 1) === 1
    ).length,
    mastery2Cards: cards.filter(
      (card) => Number(card?.evolutionStage || 1) === 2
    ).length,
    mastery3Cards: cards.filter(
      (card) => Number(card?.evolutionStage || 1) === 3
    ).length,
    boostCards: cards.filter(
      (card) => String(card?.cardRole || "").toLowerCase() === "boost"
    ).length,
  };
}

module.exports = {
  name: "profile",
  aliases: ["pf", "me"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const isMotherFlame = hasRole(message, PREMIUM_ROLE_NAME);
    const teamPower = getTeamPower(player);
    const storyProgress = getStoryProgress(player);
    const arena = getArenaSummary(player);
    const ship = getShipSummary(player);
    const cardStats = getCardStatistics(player);
    const profileImage = getProfileImage(message);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setAuthor({
        name: `${player.username}'s One Piece Profile`,
        iconURL: profileImage,
      })
      .setDescription(
        [
          "## 🏴‍☠️ Captain Info",
          `↪ Current Island: ${player.currentIsland || DEFAULT_START_ISLAND}`,
          `↪ Username: ${player.username}`,
          `↪ Premium: ${isMotherFlame ? "Mother Flame" : "Normal"}`,
          `↪ Clan: ${player?.clan?.name || "None"}`,
          `↪ Ship: ${ship.name}`,
          `↪ Ship Tier: ${ship.tier}`,
          "",
          "## 💰 Wallet",
          `↪ Berries: ${Number(player.berries || 0).toLocaleString("en-US")}`,
          `↪ Gems: ${Number(player.gems || 0).toLocaleString("en-US")}`,
          "",
          "## 🃏 Card Statistics",
          `↪ Cards Owned: ${cardStats.totalCards}`,
          `↪ Mastery 1 Cards: ${cardStats.mastery1Cards}`,
          `↪ Mastery 2 Cards: ${cardStats.mastery2Cards}`,
          `↪ Mastery 3 Cards: ${cardStats.mastery3Cards}`,
          `↪ Boost Cards: ${cardStats.boostCards}`,
          "",
          "## 🎮 Game Stats",
          `↪ Team Power: ${teamPower.toLocaleString("en-US")}`,
          `↪ Story Progress: ${storyProgress}`,
          `↪ Fight Win Streak: ${Number(player?.fightStreak || 0)}`,
          "",
          "## ⚔️ Arena Stats",
          `↪ Arena Points: ${arena.points}`,
          `↪ Arena Record: ${arena.wins}W / ${arena.losses}L / ${arena.draws}D`,
          `↪ Arena Streak: ${arena.streak}`,
          `↪ Best Arena Streak: ${arena.bestStreak}`,
        ].join("\n")
      )
      .setThumbnail(profileImage)
      .setFooter({
        text: "One Piece Bot",
      });

    return message.reply({ embeds: [embed] });
  },
};