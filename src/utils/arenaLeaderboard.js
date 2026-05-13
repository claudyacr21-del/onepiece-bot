const { readPlayers } = require("../playerStore");

const ARENA_TOTAL_RANK_SLOTS = 500;
const ARENA_POINTS_PER_RANK = 10;

const ARENA_BOT_NAMES = [
  "NitroSlayer",
  "IronPhantom",
  "ApexPredator",
  "Trafalgar Law",
  "VoidWalker",
  "GhostProtocol",
  "Marine Hunter",
  "Grandline Reaper",
  "Red Flag",
  "Blue Storm",
  "East Blue Rookie",
  "New World Guard",
  "Cipher Duelist",
  "Skypiea Knight",
  "Wano Ronin",
  "Baratie Brawler",
  "Arlong Raider",
  "Alabasta Guard",
  "Water 7 Agent",
  "Sabaody Hunter",
];

function makeBotName(index) {
  const base = ARENA_BOT_NAMES[index % ARENA_BOT_NAMES.length];
  const suffix = Math.floor(index / ARENA_BOT_NAMES.length) + 1;
  return suffix > 1 ? `${base} ${suffix}` : base;
}

function getBotPointsByRank(rank) {
  return Math.max(0, (ARENA_TOTAL_RANK_SLOTS - rank) * ARENA_POINTS_PER_RANK);
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

  if (Number(b.matches || 0) !== Number(a.matches || 0)) {
    return Number(b.matches || 0) - Number(a.matches || 0);
  }

  if (Boolean(a.isBot) !== Boolean(b.isBot)) {
    return a.isBot ? 1 : -1;
  }

  return String(a.username || "").localeCompare(String(b.username || ""));
}

function getRealArenaEntries() {
  const players = readPlayers() || {};

  return Object.entries(players)
    .map(([userId, player]) => {
      const arena = player?.arena || {};

      return {
        userId: String(userId),
        username: player?.username || "Unknown",
        points: Number(arena.points || 0),
        wins: Number(arena.wins || 0),
        losses: Number(arena.losses || 0),
        draws: Number(arena.draws || 0),
        matches: Number(arena.matches || 0),
        streak: Number(arena.streak || 0),
        bestStreak: Number(arena.bestStreak || 0),
        isBot: false,
      };
    })
    .filter((entry) => {
      return (
        entry.points > 0 ||
        entry.wins > 0 ||
        entry.losses > 0 ||
        entry.matches > 0
      );
    });
}

function buildArenaBots(count) {
  return Array.from({ length: count }, (_, index) => {
    const seed = index + 1;

    return {
      userId: `arena-bot-${seed}`,
      username: makeBotName(index),
      points: getBotPointsByRank(seed),
      wins: Math.max(0, Math.floor(getBotPointsByRank(seed) / 120)),
      losses: Math.max(0, Math.floor(seed / 35)),
      draws: 0,
      matches: Math.max(0, Math.floor(getBotPointsByRank(seed) / 90)),
      streak: 0,
      bestStreak: 0,
      isBot: true,
      botSeed: seed,
    };
  });
}

function getArenaLeaderboard() {
  const realEntries = getRealArenaEntries()
    .sort(compareArenaEntries)
    .slice(0, ARENA_TOTAL_RANK_SLOTS);

  const botCount = Math.max(0, ARENA_TOTAL_RANK_SLOTS - realEntries.length);
  const bots = buildArenaBots(botCount);

  return [...realEntries, ...bots]
    .sort(compareArenaEntries)
    .slice(0, ARENA_TOTAL_RANK_SLOTS)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function getArenaTop3() {
  return getArenaLeaderboard()
    .filter((entry) => !entry.isBot)
    .slice(0, 3);
}

function getArenaRankForUser(userId) {
  const found = getArenaLeaderboard().find(
    (entry) => String(entry.userId) === String(userId)
  );

  return found?.rank || ARENA_TOTAL_RANK_SLOTS;
}

function formatArenaEntryRank(entry) {
  return `#${Number(entry?.rank || ARENA_TOTAL_RANK_SLOTS)}`;
}

module.exports = {
  ARENA_TOTAL_RANK_SLOTS,
  ARENA_POINTS_PER_RANK,
  compareArenaEntries,
  getArenaLeaderboard,
  getArenaTop3,
  getArenaRankForUser,
  formatArenaEntryRank,
};