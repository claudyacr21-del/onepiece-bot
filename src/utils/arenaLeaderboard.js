const { readPlayers } = require("../playerStore");

const ARENA_TOTAL_RANKS = 500;
const ARENA_TOP_BOT_POINTS = 300;
const ARENA_POINT_STEP = 1;

const BOT_NAMES = [
  "Pirate King Bot",
  "Yonko Bot",
  "Fleet Admiral Bot",
  "Revolutionary Bot",
  "Warlord Bot",
  "CP0 Bot",
  "Supernova Bot",
  "Commander Bot",
  "Vice Admiral Bot",
  "New World Bot",
  "Grand Line Bot",
  "Marine Hero Bot",
  "Shichibukai Bot",
  "Worst Generation Bot",
  "Cipher Pol Bot",
  "Sky Island Bot",
  "Fishman Bot",
  "Dressrosa Bot",
  "Wano Samurai Bot",
  "Egghead Bot",
];

function getBotName(index) {
  const base = BOT_NAMES[index % BOT_NAMES.length];
  const cycle = Math.floor(index / BOT_NAMES.length);

  return cycle === 0 ? base : `${base} ${cycle + 1}`;
}

function getBotPoints(index) {
  return Math.max(0, ARENA_TOP_BOT_POINTS - index * ARENA_POINT_STEP);
}

function getBotWins(points) {
  return Math.max(0, Math.floor(Number(points || 0) / 10));
}

function getBotLosses(index) {
  return Math.floor(index / 25);
}

function buildArenaBots(count = ARENA_TOTAL_RANKS) {
  return Array.from({ length: count }, (_, index) => {
    const points = getBotPoints(index);

    return {
      userId: `arena_bot_${String(index + 1).padStart(3, "0")}`,
      id: `arena_bot_${String(index + 1).padStart(3, "0")}`,
      username: getBotName(index),
      points,
      wins: getBotWins(points),
      losses: getBotLosses(index),
      matches: getBotWins(points) + getBotLosses(index),
      streak: 0,
      isBot: true,
    };
  });
}

function compareArenaEntries(a, b) {
  if (Number(b.points || 0) !== Number(a.points || 0)) {
    return Number(b.points || 0) - Number(a.points || 0);
  }

  if (Number(b.wins || 0) !== Number(a.wins || 0)) {
    return Number(b.wins || 0) - Number(a.wins || 0);
  }

  if (Number(a.losses || 0) !== Number(b.losses || 0)) {
    return Number(a.losses || 0) - Number(b.losses || 0);
  }

  if (Number(b.streak || 0) !== Number(a.streak || 0)) {
    return Number(b.streak || 0) - Number(a.streak || 0);
  }

  if (Boolean(a.isBot) !== Boolean(b.isBot)) {
    return a.isBot ? -1 : 1;
  }

  return String(a.username || "").localeCompare(String(b.username || ""));
}

function getRealArenaEntries(playersMap = null) {
  const players = playersMap || readPlayers() || {};

  return Object.entries(players)
    .map(([userId, player]) => ({
      userId: String(userId),
      id: String(userId),
      username: player.username || "Unknown",
      points: Number(player?.arena?.points || 0),
      wins: Number(player?.arena?.wins || 0),
      losses: Number(player?.arena?.losses || 0),
      draws: Number(player?.arena?.draws || 0),
      matches: Number(player?.arena?.matches || 0),
      streak: Number(player?.arena?.streak || 0),
      bestStreak: Number(player?.arena?.bestStreak || 0),
      isBot: false,
    }))
    .filter((entry) => {
      return (
        entry.matches > 0 ||
        entry.points > 0 ||
        entry.wins > 0 ||
        entry.losses > 0
      );
    });
}

function getArenaLeaderboard(playersMap = null) {
  const realPlayers = getRealArenaEntries(playersMap);
  const botCount = Math.max(0, ARENA_TOTAL_RANKS - realPlayers.length);
  const botRows = buildArenaBots(botCount);

  return [...botRows, ...realPlayers]
    .sort(compareArenaEntries)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function getArenaTop3(playersMap = null) {
  return getArenaLeaderboard(playersMap)
    .filter((entry) => !entry.isBot)
    .filter((entry) => [1, 2, 3].includes(Number(entry.rank)));
}

function getArenaRankForUser(userId, playersMap = null) {
  const found = getArenaLeaderboard(playersMap).find(
    (entry) => String(entry.userId || entry.id) === String(userId)
  );

  return found?.rank || ARENA_TOTAL_RANKS;
}

function formatArenaEntryRank(entry) {
  return `#${Number(entry?.rank || ARENA_TOTAL_RANKS)}`;
}

module.exports = {
  ARENA_TOTAL_RANKS,
  ARENA_TOTAL_RANK_SLOTS: ARENA_TOTAL_RANKS,
  ARENA_TOP_BOT_POINTS,
  ARENA_POINT_STEP,
  compareArenaEntries,
  getArenaLeaderboard,
  getArenaTop3,
  getArenaRankForUser,
  formatArenaEntryRank,
};