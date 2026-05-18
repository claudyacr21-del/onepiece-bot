const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");

const { getPlayer, updatePlayer, readPlayers, writePlayers } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const { incrementQuestCounter } = require("../utils/questProgress");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { applyDamageBoost } = require("../utils/combatStats");
const {
  getCardExp,
  getCardLevelCap,
  applyExpToCard,
} = require("../utils/cardExp");
const { syncArenaRankRoles } = require("../utils/arenaRankRoles");
const { ITEMS, cloneItem } = require("../data/items");

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const ARENA_DAILY_LIMIT = 5;
const ARENA_TOTAL_RANK_SLOTS = 500;
const ARENA_TOP_BOT_POINTS = 300;
const ARENA_POINT_STEP = 1;
const ARENA_WIN_EXP_PER_CARD = 200;
const ARENA_LOSE_EXP_PER_CARD = 100;

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

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

async function safeDeferUpdate(interaction) {
  if (!interaction || interaction.deferred || interaction.replied) return;

  try {
    await interaction.deferUpdate();
  } catch (error) {
    // Unknown interaction usually means it was already acknowledged or expired.
    // Do not crash the collector.
  }
}

async function safeEditInteractionMessage(interaction, payload) {
  try {
    return await interaction.message.edit(payload);
  } catch (error) {
    console.error("[ARENA MESSAGE EDIT ERROR]", error);
    return null;
  }
}

function queueArenaRankRoleSync(message) {
  if (!message?.client || !message?.guild) return;

  setTimeout(() => {
    try {
      const leaderboardSnapshot = buildArenaVirtualLeaderboard(message);

      syncArenaRankRoles(message.client, message.guild, leaderboardSnapshot).catch(
        (error) => {
          console.error("[ARENA RANK ROLES SYNC ERROR]", error);
        }
      );
    } catch (error) {
      console.error("[ARENA RANK ROLES SNAPSHOT ERROR]", error);
    }
  }, 1000);
}

function getDateKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

function getArenaDailyUses(arena) {
  const today = getDateKey();

  if (arena?.dailyDateKey !== today) return 0;

  return Math.max(0, Number(arena?.dailyUses || 0));
}

function getArenaUsesLeft(arena) {
  return Math.max(0, ARENA_DAILY_LIMIT - getArenaDailyUses(arena));
}

function formatArenaEntryRank(entry) {
  return `#${Number(entry?.rank || ARENA_TOTAL_RANK_SLOTS)}`;
}

function getArenaBotPointsForSeed(seed) {
  const safeSeed = Math.max(
    1,
    Math.min(ARENA_TOTAL_RANK_SLOTS, Number(seed || 1))
  );

  return Math.max(0, ARENA_TOP_BOT_POINTS - (safeSeed - 1) * ARENA_POINT_STEP);
}

function getPower(card) {
  return Number(
    card.currentPower ||
      Math.floor(
        Number(card.atk || 0) * 1.4 +
          Number(card.hp || 0) * 0.22 +
          Number(card.speed || 0) * 9
      )
  );
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function formatWeapons(card) {
  if (Array.isArray(card?.equippedWeapons) && card.equippedWeapons.length) {
    return card.equippedWeapons
      .map((weapon) =>
        `${weapon.name}${
          Number(weapon.upgradeLevel || 0) > 0 ? ` +${weapon.upgradeLevel}` : ""
        }`
      )
      .join(", ");
  }

  return card?.displayWeaponName || card?.equippedWeapon || "None";
}

function formatDevilFruit(card) {
  return (
    card?.displayFruitName ||
    card?.equippedDevilFruitName ||
    card?.equippedDevilFruit ||
    "None"
  );
}

function applyBoostedBattleStats(card, boosts = {}) {
  if (!card || String(card.cardRole || "").toLowerCase() === "boost") return card;

  return {
    ...card,
    atk: Math.floor(Number(card.atk || 0) * (1 + Number(boosts.atk || 0) / 100)),
    hp: Math.floor(Number(card.hp || 0) * (1 + Number(boosts.hp || 0) / 100)),
    speed: Math.floor(
      Number(card.speed || 0) * (1 + Number(boosts.spd || 0) / 100)
    ),
  };
}

function buildBattleUnit(card, slot, ownerTag = "player", boosts = {}) {
  const hydrated = hydrateCard(card);
  const synced = applyBoostedBattleStats(hydrated, boosts);

  return {
    slot: slot + 1,
    sourceIndex: Number.isInteger(card.sourceIndex) ? card.sourceIndex : null,
    ownerTag,
    instanceId: synced.instanceId || `${ownerTag}-${slot}-${Date.now()}`,
    name: synced.displayName || synced.name || "Unknown",
    rarity: synced.currentTier || synced.rarity || "C",
    atk: Number(synced.atk || 0),
    hp: Number(synced.hp || 0),
    maxHp: Number(synced.hp || 0),
    speed: Number(synced.speed || 0),
    level: Number(synced.level || 1),
    levelCap: getCardLevelCap(synced),
    exp: getCardExp(synced),
    power: getPower(synced),
    equippedWeapon: formatWeapons(synced),
    equippedDevilFruit: formatDevilFruit(synced),
    passiveBoostsApplied: {
      atk: Number(boosts.atk || 0),
      hp: Number(boosts.hp || 0),
      spd: Number(boosts.spd || 0),
      dmg: Number(boosts.dmg || 0),
      exp: Number(boosts.exp || 0),
    },
  };
}

function getTeamUnits(player, ownerTag = "player") {
  const boosts = getPassiveBoostSummary(player);

  const cards = (Array.isArray(player.cards) ? player.cards : [])
    .map((rawCard, sourceIndex) => {
      const hydrated = hydrateCard(rawCard);
      return hydrated ? { ...hydrated, sourceIndex } : null;
    })
    .filter(Boolean);

  const slots = Array.isArray(player?.team?.slots)
    ? player.team.slots
    : [null, null, null];

  return slots
    .map((instanceId, index) => {
      if (!instanceId) return null;

      const found = cards.find(
        (card) =>
          String(card.instanceId) === String(instanceId) &&
          String(card.cardRole || "").toLowerCase() !== "boost"
      );

      return found ? buildBattleUnit(found, index, ownerTag, boosts) : null;
    })
    .filter(Boolean);
}

function getAliveUnits(units) {
  return units.filter((unit) => Number(unit.hp || 0) > 0);
}

function aliveCount(units) {
  return getAliveUnits(units).length;
}

function getFirstAlive(units) {
  return units.find((unit) => Number(unit.hp || 0) > 0) || null;
}

function performAttack(attacker, defender) {
  const atk = Number(attacker.atk || 0);
  const defSpeed = Number(defender.speed || 0);
  const rolledAtk = Math.floor(atk * (0.85 + Math.random() * 0.3));
  const rawDamage = Math.max(1, rolledAtk - Math.floor(defSpeed * 0.12));
  const finalDamage = applyDamageBoost(rawDamage, attacker.passiveBoostsApplied);

  defender.hp = Math.max(0, Number(defender.hp || 0) - finalDamage);

  return finalDamage;
}

function resolveSpeedOrder(playerUnit, enemyUnit) {
  const playerSpeed = Number(playerUnit?.speed || 0);
  const enemySpeed = Number(enemyUnit?.speed || 0);

  if (playerSpeed > enemySpeed) return [playerUnit, enemyUnit];
  if (enemySpeed > playerSpeed) return [enemyUnit, playerUnit];

  const playerPower = Number(playerUnit?.power || 0);
  const enemyPower = Number(enemyUnit?.power || 0);

  if (playerPower >= enemyPower) return [playerUnit, enemyUnit];

  return [enemyUnit, playerUnit];
}

function renderHpBar(hp, maxHp, size = 10) {
  const current = Math.max(0, Number(hp || 0));
  const max = Math.max(1, Number(maxHp || 1));
  const filled = Math.round((current / max) * size);
  const safeFilled = Math.max(0, Math.min(size, filled));

  return `${"█".repeat(safeFilled)}${"░".repeat(size - safeFilled)} ${current}/${max}`;
}

function teamSummary(units) {
  return units
    .map((unit) =>
      [
        `**${unit.slot}. ${unit.name}** PWR \`${unit.power}\``,
        `ATK \`${formatAtkRange(unit.atk)}\` • SPD \`${unit.speed}\``,
        renderHpBar(unit.hp, unit.maxHp),
      ].join("\n")
    )
    .join("\n");
}

function getArenaTeamPower(units) {
  return ensureArray(units).reduce(
    (total, unit) => total + Number(unit?.power || unit?.currentPower || 0),
    0
  );
}

function compareArenaEntries(a, b) {
  const pointsA = Number(a?.points || 0);
  const pointsB = Number(b?.points || 0);

  if (pointsB !== pointsA) return pointsB - pointsA;

  const winsA = Number(a?.wins || 0);
  const winsB = Number(b?.wins || 0);

  if (winsB !== winsA) return winsB - winsA;

  const lossesA = Number(a?.losses || 0);
  const lossesB = Number(b?.losses || 0);

  if (lossesA !== lossesB) return lossesA - lossesB;

  const streakA = Number(a?.streak || 0);
  const streakB = Number(b?.streak || 0);

  if (streakB !== streakA) return streakB - streakA;

  const teamPowerA = Number(a?.teamPower || 0);
  const teamPowerB = Number(b?.teamPower || 0);

  if (teamPowerB !== teamPowerA) return teamPowerB - teamPowerA;

  if (Boolean(a?.isBot) !== Boolean(b?.isBot)) {
    return a?.isBot ? 1 : -1;
  }

  return String(a?.username || "").localeCompare(String(b?.username || ""));
}

function makeBotCard({ code, name, rarity, atk, hp, speed, power, slot }) {
  return buildBattleUnit(
    {
      code,
      instanceId: `arena_bot_${code}_${Date.now()}_${slot}`,
      name,
      displayName: name,
      rarity,
      currentTier: rarity,
      cardRole: "battle",
      atk,
      hp,
      speed,
      level: 1,
      currentPower: power,
      equippedWeapons: [],
      equippedDevilFruit: null,
    },
    slot,
    "bot"
  );
}

function buildBotTeam(points, botIndex) {
  const scale = Math.min(7.5, 1 + Math.max(0, Number(points || 0)) / 850);

  const base = [
    {
      code: `bot_marine_${botIndex}`,
      name: "Arena Marine",
      rarity: "C",
      atk: 95,
      hp: 900,
      speed: 55,
      power: 450,
    },
    {
      code: `bot_swordsman_${botIndex}`,
      name: "Arena Swordsman",
      rarity: "C",
      atk: 120,
      hp: 780,
      speed: 68,
      power: 500,
    },
    {
      code: `bot_captain_${botIndex}`,
      name: "Arena Captain",
      rarity: points >= 350 ? "B" : "C",
      atk: 145,
      hp: 1100,
      speed: 72,
      power: points >= 350 ? 820 : 600,
    },
  ];

  return base.map((entry, index) =>
    makeBotCard({
      ...entry,
      atk: Math.floor(entry.atk * scale),
      hp: Math.floor(entry.hp * scale),
      speed: Math.floor(entry.speed * Math.min(1.35, scale)),
      power: Math.floor(entry.power * scale),
      slot: index,
    })
  );
}

function makeArenaBotName(index) {
  const base = ARENA_BOT_NAMES[index % ARENA_BOT_NAMES.length];
  const suffix = Math.floor(index / ARENA_BOT_NAMES.length) + 1;

  return suffix > 1 ? `${base} ${suffix}` : base;
}

function makeArenaBotEntry(seed) {
  const points = getArenaBotPointsForSeed(seed);
  const teamUnits = buildBotTeam(points, seed);

  return {
    userId: `arena-bot-${seed}`,
    username: makeArenaBotName(seed - 1),
    points,
    wins: Math.max(0, Math.floor(points / 120)),
    losses: Math.max(0, Math.floor(seed / 35)),
    matches: Math.max(0, Math.floor(points / 90)),
    streak: 0,
    isBot: true,
    teamUnits,
    teamPower: getArenaTeamPower(teamUnits),
  };
}

function getRealArenaEntries(message) {
  const allPlayers = readPlayers();

  return Object.entries(allPlayers)
    .filter(([userId]) => String(userId) !== String(message?.client?.user?.id || ""))
    .map(([userId, raw]) => {
      const player = {
        userId,
        ...raw,
        username: raw?.username || "Unknown",
        cards: Array.isArray(raw?.cards) ? raw.cards : [],
        team: raw?.team || {
          slots: [null, null, null],
        },
      };

      const teamUnits = getTeamUnits(player, "opponent");

      return {
        ...player,
        points: Number(player?.arena?.points || 0),
        wins: Number(player?.arena?.wins || 0),
        losses: Number(player?.arena?.losses || 0),
        draws: Number(player?.arena?.draws || 0),
        matches: Number(player?.arena?.matches || 0),
        streak: Number(player?.arena?.streak || 0),
        isBot: false,
        teamUnits,
        teamPower: getArenaTeamPower(teamUnits),
      };
    })
    .filter((entry) => entry.teamUnits.length === 3);
}

function buildArenaVirtualLeaderboard(message) {
  const realEntries = getRealArenaEntries(message)
    .sort(compareArenaEntries)
    .slice(0, ARENA_TOTAL_RANK_SLOTS);

  const botCount = Math.max(0, ARENA_TOTAL_RANK_SLOTS - realEntries.length);

  const botEntries = Array.from({ length: botCount }, (_, index) =>
    makeArenaBotEntry(index + 1)
  );

  return [...realEntries, ...botEntries]
    .sort(compareArenaEntries)
    .slice(0, ARENA_TOTAL_RANK_SLOTS)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function getArenaRankForUser(message, userId) {
  const leaderboard = buildArenaVirtualLeaderboard(message);
  const found = leaderboard.find((entry) => String(entry.userId) === String(userId));

  return found?.rank || ARENA_TOTAL_RANK_SLOTS;
}

function buildOpponentPool(message, player) {
  const leaderboard = buildArenaVirtualLeaderboard(message);
  const playerPoints = Number(player?.arena?.points || 0);

  return leaderboard
    .filter((entry) => String(entry.userId) !== String(message.author.id))
    .sort((a, b) => {
      const diffA = Math.abs(Number(a.points || 0) - playerPoints);
      const diffB = Math.abs(Number(b.points || 0) - playerPoints);

      if (diffA !== diffB) return diffA - diffB;

      if (Number(a.rank || 999) !== Number(b.rank || 999)) {
        return Number(a.rank || 999) - Number(b.rank || 999);
      }

      return compareArenaEntries(a, b);
    })
    .slice(0, 25);
}

function addOrIncreaseInventory(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = String(item?.code || item?.name || "").toLowerCase();

  const index = arr.findIndex(
    (entry) => String(entry.code || entry.name || "").toLowerCase() === code
  );

  if (index >= 0) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 0) + Number(item.amount || 1),
    };

    return arr;
  }

  arr.push({
    ...item,
    amount: Number(item.amount || 1),
  });

  return arr;
}

function pickArenaStreakBox() {
  const roll = Math.random() * 100;

  if (roll < 60) return ITEMS.woodenMaterialBox;
  if (roll < 90) return ITEMS.ironMaterialBox;

  return ITEMS.royalMaterialBox;
}

function applyArenaStreakBoxReward(player, updatedArena) {
  const streak = Number(updatedArena?.streak || 0);

  if (streak <= 0 || streak % 5 !== 0) {
    return {
      boxes: player.boxes || [],
      rewardLine: null,
    };
  }

  const picked = pickArenaStreakBox();

  if (!picked) {
    return {
      boxes: player.boxes || [],
      rewardLine: null,
    };
  }

  const box = cloneItem(picked, 1);

  return {
    boxes: addOrIncreaseInventory(player.boxes || [], box),
    rewardLine: `+1 ${box.name}`,
  };
}

function applyArenaResult(arena, result) {
  const current = {
    points: Number(arena?.points || 0),
    wins: Number(arena?.wins || 0),
    losses: Number(arena?.losses || 0),
    draws: Number(arena?.draws || 0),
    streak: Number(arena?.streak || 0),
    bestStreak: Number(arena?.bestStreak || 0),
    matches: Number(arena?.matches || 0),
    dailyDateKey: getDateKey(),
    dailyUses: getArenaDailyUses(arena) + 1,
  };

  current.matches += 1;

  if (result === "win") {
    current.points += 12;
    current.wins += 1;
    current.streak += 1;

    if (current.streak > current.bestStreak) {
      current.bestStreak = current.streak;
    }
  } else {
    current.points = Math.max(0, current.points - 5);
    current.losses += 1;
    current.streak = 0;
  }

  return current;
}

function updateArenaPlayer(message, result) {
  const freshPlayer = getPlayer(message.author.id, message.author.username);
  const updatedArena = applyArenaResult(freshPlayer.arena, result);

  const streakBoxReward =
    result === "win"
      ? applyArenaStreakBoxReward(freshPlayer, updatedArena)
      : {
          boxes: freshPlayer.boxes || [],
          rewardLine: null,
        };

  let updatedDailyState = incrementQuestCounter(freshPlayer, "arenaMatches", 1);

  if (result === "win") {
    updatedDailyState = incrementQuestCounter(
      {
        ...freshPlayer,
        quests: {
          ...(freshPlayer.quests || {}),
          dailyState: updatedDailyState,
        },
      },
      "arenaWins",
      1
    );
  }

  const completed = Array.isArray(updatedDailyState.quests)
    ? updatedDailyState.quests.filter((quest) => {
        const progress = Number(updatedDailyState.progress?.[quest.key] || 0);
        return progress >= Number(quest.target || 0);
      }).length
    : 0;

  const total = Array.isArray(updatedDailyState.quests)
    ? updatedDailyState.quests.length
    : 0;

  updatePlayer(message.author.id, {
    arena: updatedArena,
    boxes: streakBoxReward.boxes,
    quests: {
      ...(freshPlayer.quests || {}),
      dailyState: updatedDailyState,
      daily: {
        ...(freshPlayer?.quests?.daily || {}),
        total,
        completed,
        left: Math.max(0, total - completed),
        lastSyncedAt: Date.now(),
      },
    },
  });

  return {
    ...updatedArena,
    arenaRank: getArenaRankForUser(message, message.author.id),
    streakRewardLine: streakBoxReward.rewardLine,
  };
}

function applyArenaOpponentLoss(arena) {
  const current = {
    points: Number(arena?.points || 0),
    wins: Number(arena?.wins || 0),
    losses: Number(arena?.losses || 0),
    draws: Number(arena?.draws || 0),
    streak: Number(arena?.streak || 0),
    bestStreak: Number(arena?.bestStreak || 0),
    matches: Number(arena?.matches || 0),
    dailyDateKey: arena?.dailyDateKey || getDateKey(),
    dailyUses: Number(arena?.dailyUses || 0),
  };

  current.points = Math.max(0, current.points - 5);
  current.losses += 1;
  current.matches += 1;

  current.streak = Number(arena?.streak || 0);

  return current;
}

function updateArenaOpponentAfterBattle(opponent, result) {
  if (!opponent || opponent.isBot) return null;
  if (result !== "win") return null;

  const players = readPlayers();
  const opponentId = String(opponent.userId || opponent.id || "");

  if (!opponentId || !players[opponentId]) return null;

  const opponentPlayer = players[opponentId];
  const updatedArena = applyArenaOpponentLoss(opponentPlayer.arena || {});

  players[opponentId] = {
    ...opponentPlayer,
    arena: updatedArena,
  };

  writePlayers(players);

  return updatedArena;
}

function getResultTitle(result) {
  return result === "win" ? "🏆 Arena Victory" : "💀 Arena Defeat";
}

function getResultColor(result, ended) {
  if (!ended) return 0x5865f2;
  return result === "win" ? 0x2ecc71 : 0xe74c3c;
}

function resolveNoDrawResult(myTeam, enemyTeam) {
  const myAlive = aliveCount(myTeam);
  const enemyAlive = aliveCount(enemyTeam);

  if (myAlive !== enemyAlive) return myAlive > enemyAlive ? "win" : "lose";

  const myTotalHp = myTeam.reduce(
    (sum, unit) => sum + Math.max(0, Number(unit.hp || 0)),
    0
  );

  const enemyTotalHp = enemyTeam.reduce(
    (sum, unit) => sum + Math.max(0, Number(unit.hp || 0)),
    0
  );

  if (myTotalHp !== enemyTotalHp) return myTotalHp > enemyTotalHp ? "win" : "lose";

  const myPower = myTeam.reduce((sum, unit) => sum + Number(unit.power || 0), 0);
  const enemyPower = enemyTeam.reduce((sum, unit) => sum + Number(unit.power || 0), 0);

  if (myPower !== enemyPower) return myPower > enemyPower ? "win" : "lose";

  const mySpeed = myTeam.reduce((sum, unit) => sum + Number(unit.speed || 0), 0);
  const enemySpeed = enemyTeam.reduce((sum, unit) => sum + Number(unit.speed || 0), 0);

  if (mySpeed !== enemySpeed) return mySpeed > enemySpeed ? "win" : "lose";

  return "win";
}

function buildArenaLobbyEmbed(player, opponents) {
  const arena = player.arena || {};
  const usesLeft = getArenaUsesLeft(arena);
  const playerPoints = Number(arena.points || 0);

  const rows = opponents.slice(0, 10).map((entry) => {
    const tag = entry.isBot ? "BOT" : "PLAYER";
    return `${formatArenaEntryRank(entry)} • **${entry.username}** • ${entry.points} pts • ${tag}`;
  });

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Global Arena")
    .setDescription(
      [
        "Select your arena opponent below.",
        "",
        `**Your Rank:** #${player.arenaRank || ARENA_TOTAL_RANK_SLOTS}`,
        `**Your Points:** ${playerPoints}`,
        `**Daily Battles Left:** ${usesLeft}/${ARENA_DAILY_LIMIT}`,
        "",
        "## Available Opponents",
        ...(rows.length ? rows : ["No opponent available."]),
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Arena Lobby",
    });
}

function buildOpponentMenu(opponents) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("arena_select_opponent")
        .setPlaceholder("Select arena opponent")
        .addOptions(
          opponents.slice(0, 25).map((opponent, index) => ({
            label: `${formatArenaEntryRank(opponent)} • ${opponent.username}`.slice(0, 100),
            description: `${opponent.points} pts • ${
              opponent.isBot ? "Bot opponent" : "Player opponent"
            }`.slice(0, 100),
            value: String(index),
          }))
        )
    ),
  ];
}

function buildArenaDescription({
  player,
  opponent,
  myTeam,
  enemyTeam,
  logs,
  arena,
  result,
  ended,
}) {
  const recentLogs = logs.slice(-2);

  return [
    `**You:** ${player.username || "Unknown"} • #${
      player.arenaRank || ARENA_TOTAL_RANK_SLOTS
    }`,
    `**Opponent:** ${opponent.username || "Unknown"} • ${formatArenaEntryRank(opponent)}`,
    ended ? `**Result:** ${String(result || "lose").toUpperCase()}` : "**Result:** In Progress",
    "",
    "## Battle Log",
    ...(recentLogs.length
      ? recentLogs
      : [
          "Choose one of your cards to attack.",
          "Target starts from opponent slot 1.",
          "SPD decides turn order.",
        ]),
    "",
    "## Opponent Team",
    teamSummary(enemyTeam),
    "",
    "## Your Team",
    teamSummary(myTeam),
  ].join("\n");
}

function buildArenaEmbed({
  player,
  opponent,
  myTeam,
  enemyTeam,
  logs,
  arena,
  result,
  ended,
}) {
  return new EmbedBuilder()
    .setColor(getResultColor(result, ended))
    .setTitle(ended ? getResultTitle(result) : "⚔️ Arena Battle")
    .setDescription(
      buildArenaDescription({
        player,
        opponent,
        myTeam,
        enemyTeam,
        logs,
        arena,
        result,
        ended,
      })
    )
    .setFooter({
      text: ended ? "One Piece Bot • Arena Ranked" : "One Piece Bot • Manual Arena Ranked",
    });
}

function buildArenaResultEmbed({ result, player, opponent, arena, logs, expLines = [] }) {
  return new EmbedBuilder()
    .setColor(getResultColor(result, true))
    .setTitle(getResultTitle(result))
    .setDescription(
      [
        `**You:** ${player.username || "Unknown"}`,
        `**Opponent:** ${opponent.username || "Unknown"}`,
        "",
        `**Your Rank:** #${arena?.arenaRank || ARENA_TOTAL_RANK_SLOTS}`,
        `**Arena Points:** ${Number(arena?.points || 0)}`,
        `**Daily Battles Left:** ${getArenaUsesLeft(arena)}/${ARENA_DAILY_LIMIT}`,
        `**Record:** ${Number(arena?.wins || 0)}W / ${Number(arena?.losses || 0)}L`,
        `**Streak:** ${Number(arena?.streak || 0)}`,
        arena?.streakRewardLine ? `**Streak Reward:** ${arena.streakRewardLine}` : null,
        "",
        "## Final Log",
        ...(logs.length ? logs.slice(-2) : ["No final log."]),
        "",
        expLines.length ? "## EXP" : null,
        ...expLines,
      ]
        .filter(Boolean)
        .join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Arena Result",
    });
}

function calculateArenaExp(playerTeam, won) {
  const baseExp = won ? ARENA_WIN_EXP_PER_CARD : ARENA_LOSE_EXP_PER_CARD;

  return playerTeam.map((unit) => {
    const level = Number(unit.level || 1);
    const cap = Number(unit.levelCap || 50);

    if (level >= cap) {
      return {
        sourceIndex: Number.isInteger(unit.sourceIndex) ? unit.sourceIndex : null,
        instanceId: unit.instanceId,
        expGain: 0,
        locked: true,
        level,
        cap,
        leveledUp: 0,
      };
    }

    return {
      sourceIndex: Number.isInteger(unit.sourceIndex) ? unit.sourceIndex : null,
      instanceId: unit.instanceId,
      expGain: baseExp,
      locked: false,
      level,
      cap,
      leveledUp: 0,
    };
  });
}

function formatArenaExpResults(playerTeam, expResults) {
  return expResults
    .map((entry) => {
      const unit =
        playerTeam.find(
          (card) =>
            Number.isInteger(entry.sourceIndex) &&
            Number.isInteger(card.sourceIndex) &&
            card.sourceIndex === entry.sourceIndex
        ) || playerTeam.find((card) => card.instanceId === entry.instanceId);

      if (!unit) return null;

      if (entry.locked) {
        if (Number(entry.level || 0) >= Number(entry.cap || 0) && Number(entry.cap || 0) >= 100) {
          return `✨ ${unit.name} is already MAX LEVEL (**${entry.level}/${entry.cap}**).`;
        }

        return `✨ ${unit.name} is level locked at **${entry.level}/${entry.cap}**. Awaken to continue.`;
      }

      const levelUpText =
        Number(entry.leveledUp || 0) > 0
          ? ` • Level Up +${Number(entry.leveledUp || 0)}`
          : "";

      return `✨ ${unit.name} gained **${entry.expGain} EXP**${levelUpText}.`;
    })
    .filter(Boolean);
}

function applyArenaExp(message, playerTeam, won) {
  const freshPlayer = getPlayer(message.author.id, message.author.username);
  const expResults = calculateArenaExp(playerTeam, won);

  const updatedCards = [...(freshPlayer.cards || [])].map((card, index) => {
    const expEntry =
      expResults.find(
        (entry) => Number.isInteger(entry.sourceIndex) && entry.sourceIndex === index
      ) || expResults.find((entry) => entry.instanceId === card.instanceId);

    if (!expEntry) return card;

    const nextCard = applyExpToCard(
      {
        ...card,
        level: Number(card.level || 1),
        exp: getCardExp(card),
        xp: getCardExp(card),
      },
      expEntry.expGain
    );

    expEntry.leveledUp = Number(nextCard.leveledUp || 0);

    return nextCard;
  });

  updatePlayer(message.author.id, {
    cards: updatedCards,
  });

  return formatArenaExpResults(playerTeam, expResults);
}

function buildActionRows(myTeam, ended) {
  const attackRow = new ActionRowBuilder();

  for (let i = 0; i < 3; i++) {
    const unit = myTeam[i];

    attackRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`arena_attack_${i}`)
        .setLabel(unit ? unit.name.slice(0, 20) : `Slot ${i + 1}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(ended || !unit || Number(unit.hp || 0) <= 0)
    );
  }

  const controlRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("arena_forfeit")
      .setLabel("Forfeit")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(ended)
  );

  return [attackRow, controlRow];
}

async function startArenaBattle({
  message,
  player,
  opponent,
  myTeam,
  enemyTeam,
  lobbyMessage,
}) {
  const logs = [];
  let ended = false;
  let result = null;
  let currentArena = {
    points: Number(player?.arena?.points || 0),
    wins: Number(player?.arena?.wins || 0),
    losses: Number(player?.arena?.losses || 0),
    draws: Number(player?.arena?.draws || 0),
    streak: Number(player?.arena?.streak || 0),
    bestStreak: Number(player?.arena?.bestStreak || 0),
    matches: Number(player?.arena?.matches || 0),
    dailyDateKey: player?.arena?.dailyDateKey || null,
    dailyUses: getArenaDailyUses(player?.arena || {}),
    arenaRank: player?.arenaRank || ARENA_TOTAL_RANK_SLOTS,
  };

  await lobbyMessage.edit({
    embeds: [
      buildArenaEmbed({
        player,
        opponent,
        myTeam,
        enemyTeam,
        logs,
        arena: currentArena,
        result,
        ended,
      }),
    ],
    components: buildActionRows(myTeam, ended),
  });

  const collector = lobbyMessage.createMessageComponentCollector({
    time: SESSION_TIMEOUT_MS,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      return interaction.reply({
        content: "Only the command user can control this arena battle.",
        ephemeral: true,
      });
    }

    if (ended) {
      return interaction.reply({
        content: "This arena battle has already ended.",
        ephemeral: true,
      });
    }

    await safeDeferUpdate(interaction);

    if (interaction.customId === "arena_forfeit") {
      ended = true;
      result = "lose";
      logs.length = 0;
      logs.push("🏳️ You forfeited the arena battle.");

      currentArena = updateArenaPlayer(message, result);
      const expLines = applyArenaExp(message, myTeam, false);

      await safeEditInteractionMessage(interaction, {
        embeds: [
          buildArenaResultEmbed({
            result,
            player,
            opponent,
            arena: currentArena,
            logs,
            expLines,
          }),
        ],
        components: [],
      });

      collector.stop("forfeit");
      return;
    }

    if (!interaction.customId.startsWith("arena_attack_")) {
      return safeEditInteractionMessage(interaction, {
        embeds: [
          buildArenaEmbed({
            player,
            opponent,
            myTeam,
            enemyTeam,
            logs,
            arena: currentArena,
            result,
            ended,
          }),
        ],
        components: buildActionRows(myTeam, ended),
      });
    }

    const index = Number(interaction.customId.replace("arena_attack_", ""));
    const playerAttacker = myTeam[index];

    if (!playerAttacker || Number(playerAttacker.hp || 0) <= 0) {
      return safeEphemeralReply(interaction, "That card cannot attack right now.");
    }

    const enemyTarget = getFirstAlive(enemyTeam);

    if (!enemyTarget) {
      return safeEphemeralReply(interaction, "No opponent card is available to fight.");
    }

    logs.length = 0;

    const [first, second] = resolveSpeedOrder(playerAttacker, enemyTarget);
    const firstIsPlayer = first === playerAttacker;
    const firstTarget = firstIsPlayer ? enemyTarget : playerAttacker;
    const firstDamage = performAttack(first, firstTarget);
    const firstKilled = Number(firstTarget.hp || 0) <= 0;

    logs.push(
      `⚡ ${first.name} moved first by SPD and dealt **${firstDamage}** damage to ${firstTarget.name}${firstKilled ? " (defeated)" : ""}.`
    );

    if (!firstKilled && Number(second.hp || 0) > 0) {
      const secondTarget = firstIsPlayer ? playerAttacker : enemyTarget;
      const secondDamage = performAttack(second, secondTarget);
      const secondKilled = Number(secondTarget.hp || 0) <= 0;

      logs.push(
        `⚔️ ${second.name} countered and dealt **${secondDamage}** damage to ${secondTarget.name}${secondKilled ? " (defeated)" : ""}.`
      );
    } else {
      logs.push(`☠️ ${firstTarget.name} was defeated and could not counter.`);
    }

    if (aliveCount(enemyTeam) <= 0) {
      ended = true;
      result = "win";

      currentArena = updateArenaPlayer(message, result);
      updateArenaOpponentAfterBattle(opponent, result);
      queueArenaRankRoleSync(message);

      const expLines = applyArenaExp(message, myTeam, true);

      await safeEditInteractionMessage(interaction, {
        embeds: [
          buildArenaResultEmbed({
            result,
            player,
            opponent,
            arena: currentArena,
            logs,
            expLines,
          }),
        ],
        components: [],
      });

      collector.stop("win");
      return;
    }

    if (aliveCount(myTeam) <= 0) {
      ended = true;
      result = "lose";

      currentArena = updateArenaPlayer(message, result);
      const expLines = applyArenaExp(message, myTeam, false);

      await safeEditInteractionMessage(interaction, {
        embeds: [
          buildArenaResultEmbed({
            result,
            player,
            opponent,
            arena: currentArena,
            logs,
            expLines,
          }),
        ],
        components: [],
      });

      collector.stop("lose");
      return;
    }

    await safeEditInteractionMessage(interaction, {
      embeds: [
        buildArenaEmbed({
          player,
          opponent,
          myTeam,
          enemyTeam,
          logs,
          arena: currentArena,
          result,
          ended,
        }),
      ],
      components: buildActionRows(myTeam, ended),
    });
  });

  collector.on("end", async (_collected, reason) => {
    if (ended) return;

    if (reason === "time") {
      ended = true;
      result = resolveNoDrawResult(myTeam, enemyTeam);
      logs.length = 0;
      logs.push("⌛ Arena battle timed out.");
      logs.push("Result decided by remaining HP.");

      currentArena = updateArenaPlayer(message, result);

      if (result === "win") {
        updateArenaOpponentAfterBattle(opponent, result);
        queueArenaRankRoleSync(message);
      }

      const expLines = applyArenaExp(message, myTeam, result === "win");

      try {
        await lobbyMessage.edit({
          embeds: [
            buildArenaResultEmbed({
              result,
              player,
              opponent,
              arena: currentArena,
              logs,
              expLines,
            }),
          ],
          components: [],
        });
      } catch (_) {}
    }
  });
}

module.exports = {
  name: "arena",
  aliases: ["pvp", "ranked"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    player.userId = String(message.author.id);

    const myTeam = getTeamUnits(player, "player");

    if (myTeam.length < 3) {
      return message.reply("You need a full team of 3 battle cards to use `op arena`.");
    }

    const usesLeft = getArenaUsesLeft(player.arena || {});

    if (usesLeft <= 0) {
      return message.reply(`You already used all **${ARENA_DAILY_LIMIT}/5** arena battles today.`);
    }

    const playerArenaRank = getArenaRankForUser(message, message.author.id);
    const rankedPlayer = {
      ...player,
      arenaRank: playerArenaRank,
    };

    const opponents = buildOpponentPool(message, rankedPlayer);

    if (!opponents.length) {
      return message.reply("No arena opponent was found.");
    }

    const lobbyMessage = await message.reply({
      embeds: [buildArenaLobbyEmbed(rankedPlayer, opponents)],
      components: buildOpponentMenu(opponents),
    });

    const lobbyCollector = lobbyMessage.createMessageComponentCollector({
      time: SESSION_TIMEOUT_MS,
    });

    lobbyCollector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the command user can select an arena opponent.",
          ephemeral: true,
        });
      }

      const selectedIndex = Number(interaction.values?.[0] || 0);
      const opponent = opponents[selectedIndex];

      if (!opponent) {
        return interaction.reply({
          content: "That opponent is no longer available.",
          ephemeral: true,
        });
      }

      const freshPlayer = getPlayer(message.author.id, message.author.username);
      freshPlayer.userId = String(message.author.id);

      const freshUsesLeft = getArenaUsesLeft(freshPlayer.arena || {});

      if (freshUsesLeft <= 0) {
        return interaction.reply({
          content: `You already used all **${ARENA_DAILY_LIMIT}/5** arena battles today.`,
          ephemeral: true,
        });
      }

      lobbyCollector.stop("selected");

      await interaction.deferUpdate();

      await startArenaBattle({
        message,
        player: {
          ...freshPlayer,
          arenaRank: getArenaRankForUser(message, message.author.id),
        },
        opponent,
        myTeam: getTeamUnits(freshPlayer, "player"),
        enemyTeam: opponent.teamUnits,
        lobbyMessage,
      });
    });

    lobbyCollector.on("end", async (_collected, reason) => {
      if (reason === "selected") return;

      try {
        await lobbyMessage.edit({
          components: [],
        });
      } catch {}
    });
  },
};