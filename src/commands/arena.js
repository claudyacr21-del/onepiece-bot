const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags,
} = require("discord.js");

const {
  getPlayer,
  readPlayers,
  updatePlayerAtomic,
} = require("../playerStore");
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

const ARENA_PLAYERS_CACHE_TTL_MS = Number(process.env.ARENA_CACHE_TTL_MS || 5 * 60 * 1000);
const ARENA_ROLE_SYNC_ENABLED = String(process.env.ARENA_ROLE_SYNC_ENABLED || "false").toLowerCase() === "true";
const ARENA_ROLE_SYNC_DELAY_MS = Number(process.env.ARENA_ROLE_SYNC_DELAY_MS || 15000);
const ARENA_MAX_OPPONENT_SCAN = Number(process.env.ARENA_MAX_OPPONENT_SCAN || 120);

let arenaPlayersCache = {
  updatedAt: 0,
  players: null,
};

function invalidateArenaPlayersCache() {
  arenaPlayersCache = {
    updatedAt: 0,
    players: null,
  };
}

function getCachedArenaPlayers() {
  const now = Date.now();

  if (
    arenaPlayersCache.players &&
    now - Number(arenaPlayersCache.updatedAt || 0) < ARENA_PLAYERS_CACHE_TTL_MS
  ) {
    return arenaPlayersCache.players;
  }

  const players = readPlayers() || {};

  arenaPlayersCache = {
    updatedAt: now,
    players,
  };

  return players;
}

function looksLikeDiscordUserId(value) {
  return /^\d{15,25}$/.test(String(value || "").trim());
}

function cleanArenaUsername(value) {
  const text = String(value || "").trim();
  if (!text || looksLikeDiscordUserId(text)) return null;
  if (/^<@!?\d{15,25}>$/.test(text)) return null;
  return text;
}

function getArenaDisplayName(message, userId, raw = {}) {
  const id = String(userId || "");

  const memberName = cleanArenaUsername(
    message?.guild?.members?.cache?.get(id)?.displayName
  );

  const userName = cleanArenaUsername(
    message?.client?.users?.cache?.get(id)?.username
  );

  const storedName =
    cleanArenaUsername(raw?.displayName) ||
    cleanArenaUsername(raw?.globalName) ||
    cleanArenaUsername(raw?.username) ||
    cleanArenaUsername(raw?.name) ||
    cleanArenaUsername(raw?.tag);

  return memberName || userName || storedName || `Player ${id.slice(-4)}`;
}

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const ARENA_DAILY_LIMIT = 5;
const ARENA_TOTAL_RANK_SLOTS = 500;
const ARENA_WIN_EXP_PER_CARD = 350;
const ARENA_LOSE_EXP_PER_CARD = 175;


const __fightSystem3ActionLocks = new Set();

function __getActionLockKey(interaction) {
  return [
    interaction?.message?.id || "no-message",
    interaction?.user?.id || "no-user",
  ].join(":");
}

async function __tryStartAction(interaction, safeDeferFn = null) {
  const key = __getActionLockKey(interaction);

  if (__fightSystem3ActionLocks.has(key)) {
    if (typeof safeDeferFn === "function") {
      await safeDeferFn(interaction).catch(() => null);
    }
    return {
      ok: false,
      key,
    };
  }

  __fightSystem3ActionLocks.add(key);

  return {
    ok: true,
    key,
  };
}

function __endAction(key) {
  if (!key) return;
  __fightSystem3ActionLocks.delete(key);
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function isIgnorableInteractionError(error) {
  const code = Number(error?.code || error?.rawError?.code || 0);
  const status = Number(error?.status || error?.rawError?.status || 0);
  const message = String(error?.message || "");

  return (
    code === 10062 ||
    code === 40060 ||
    status === 404 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes("Unknown interaction") ||
    message.includes("Interaction has already been acknowledged") ||
    message.includes("Service Unavailable")
  );
}

async function safeDeferUpdate(interaction) {
  if (!interaction) return false;
  if (interaction.deferred || interaction.replied) return true;

  try {
    await interaction.deferUpdate();
    return true;
  } catch (error) {
    if (!isIgnorableInteractionError(error)) {
      console.error("[ARENA DEFER UPDATE ERROR]", error);
    }
    return false;
  }
}

async function safeEphemeralReply(interaction, content) {
  try {
    if (!interaction) return null;

    const payload = {
      content,
      flags: MessageFlags.Ephemeral,
    };

    if (interaction.deferred || interaction.replied) {
      return await interaction.followUp(payload);
    }

    return await interaction.reply(payload);
  } catch (error) {
    if (!isIgnorableInteractionError(error)) {
      console.error("[ARENA EPHEMERAL REPLY ERROR]", error);
    }
    return null;
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
  if (!ARENA_ROLE_SYNC_ENABLED) return;
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
  }, ARENA_ROLE_SYNC_DELAY_MS);
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

function getFastArenaTeamCards(raw) {
  const cards = Array.isArray(raw?.cards) ? raw.cards : [];
  const slots = Array.isArray(raw?.team?.slots) ? raw.team.slots.slice(0, 3) : [];

  if (slots.filter(Boolean).length < 3 || cards.length < 3) return [];

  return slots
    .map((instanceId) =>
      cards.find(
        (card) =>
          String(card?.instanceId || "") === String(instanceId || "") &&
          String(card?.cardRole || "").toLowerCase() !== "boost"
      )
    )
    .filter(Boolean);
}

function getFastArenaTeamPower(cards) {
  return ensureArray(cards).reduce((total, card) => {
    const power = Number(
      card?.currentPower ||
        card?.power ||
        card?.powerCaps?.M3 ||
        Math.floor(
          Number(card?.atk || 0) * 1.4 +
            Number(card?.hp || 0) * 0.22 +
            Number(card?.speed || 0) * 9
        )
    );

    return total + power;
  }, 0);
}

function getRealArenaEntries(message) {
  const allPlayers = getCachedArenaPlayers();
  const maxScan = Math.max(
    ARENA_TOTAL_RANK_SLOTS,
    Number(ARENA_MAX_OPPONENT_SCAN || 650)
  );

  const quickEntries = Object.entries(allPlayers)
    .filter(([userId]) => {
      const id = String(userId || "");
      if (!id || id.startsWith("__")) return false;
      return id !== String(message?.client?.user?.id || "");
    })
    .map(([userId, raw]) => {
      const teamCards = getFastArenaTeamCards(raw);
      if (teamCards.length !== 3) return null;

      const arena = raw?.arena || {};

      return {
        userId,
        ...raw,
        username: raw?.username || "Unknown",
        points: Number(arena?.points || 0),
        wins: Number(arena?.wins || 0),
        losses: Number(arena?.losses || 0),
        draws: Number(arena?.draws || 0),
        matches: Number(arena?.matches || 0),
        streak: Number(arena?.streak || 0),
        isBot: false,
        teamPower: getFastArenaTeamPower(teamCards),
        __teamCardsReady: true,
      };
    })
    .filter(Boolean)
    .sort(compareArenaEntries)
    .slice(0, maxScan);

  return quickEntries
    .map((player) => {
      const teamUnits = getTeamUnits(player, "opponent");
      if (teamUnits.length !== 3) return null;

      return {
        ...player,
        username: getArenaDisplayName(message, player.userId, player),
        teamUnits,
        teamPower: getArenaTeamPower(teamUnits),
      };
    })
    .filter(Boolean);
}

function buildArenaVirtualLeaderboard(message) {
  return getRealArenaEntries(message)
    .sort(compareArenaEntries)
    .slice(0, ARENA_TOTAL_RANK_SLOTS)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      isBot: false,
    }));
}

function getArenaRankFromLeaderboard(leaderboard, userId) {
  const found = ensureArray(leaderboard).find(
    (entry) => String(entry.userId) === String(userId)
  );

  return found?.rank || Math.min(ARENA_TOTAL_RANK_SLOTS, ensureArray(leaderboard).length + 1);
}

function buildOpponentPoolFromLeaderboard(leaderboard, message, player) {
  const playerPoints = Number(player?.arena?.points || 0);

  return ensureArray(leaderboard)
    .filter((entry) => String(entry.userId) !== String(message.author.id))
    .map((entry) => ({
      ...entry,
      pointDiff: Math.abs(Number(entry.points || 0) - playerPoints),
    }))
    .sort((a, b) => {
      if (Number(a.pointDiff || 0) !== Number(b.pointDiff || 0)) {
        return Number(a.pointDiff || 0) - Number(b.pointDiff || 0);
      }

      if (Number(a.rank || 999) !== Number(b.rank || 999)) {
        return Number(a.rank || 999) - Number(b.rank || 999);
      }

      return compareArenaEntries(a, b);
    })
    .slice(0, 25);
}

function getArenaRankForUser(message, userId, prebuiltLeaderboard = null) {
  const leaderboard = prebuiltLeaderboard || buildArenaVirtualLeaderboard(message);
  const found = leaderboard.find((entry) => String(entry.userId) === String(userId));

  return found?.rank || Math.min(ARENA_TOTAL_RANK_SLOTS, leaderboard.length + 1);
}

function buildOpponentPool(message, player) {
  const leaderboard = buildArenaVirtualLeaderboard(message);
  return buildOpponentPoolFromLeaderboard(leaderboard, message, player);
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

function calculateArenaWinPoints(playerRank, opponentRank) {
  const myRank = Number(playerRank || ARENA_TOTAL_RANK_SLOTS);
  const enemyRank = Number(opponentRank || ARENA_TOTAL_RANK_SLOTS);

  if (!Number.isFinite(myRank) || !Number.isFinite(enemyRank)) return 10;

  // enemyRank lebih besar = lawan rank-nya lebih rendah dari kita.
  // Contoh: kita #50, lawan #120. Reward harus kecil.
  if (enemyRank > myRank) {
    const gap = enemyRank - myRank;

    if (gap >= 200) return 1;
    if (gap >= 100) return 2;
    if (gap >= 50) return 3;
    if (gap >= 25) return 4;
    if (gap >= 10) return 5;

    return 6;
  }

  // enemyRank lebih kecil = lawan rank-nya lebih tinggi dari kita.
  // Contoh: kita #120, lawan #50. Reward harus besar.
  if (enemyRank < myRank) {
    const gap = myRank - enemyRank;

    if (gap >= 200) return 24;
    if (gap >= 100) return 20;
    if (gap >= 50) return 17;
    if (gap >= 25) return 14;
    if (gap >= 10) return 12;

    return 10;
  }

  return 8;
}

function applyArenaResult(arena, result, context = {}) {
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
    lastPointChange: 0,
  };

  current.matches += 1;

  if (result === "win") {
    const gained = calculateArenaWinPoints(
      context.playerRank,
      context.opponentRank
    );

    current.points += gained;
    current.lastPointChange = gained;
    current.wins += 1;
    current.streak += 1;

    if (current.streak > current.bestStreak) {
      current.bestStreak = current.streak;
    }
  } else {
    current.points = Math.max(0, current.points - 3);
    current.lastPointChange = -3;
    current.losses += 1;
    current.streak = 0;
  }

  return current;
}

function updateArenaPlayer(message, result, opponent = null, prebuiltLeaderboard = null) {
  let finalArena = null;
  let streakRewardLine = null;

  const leaderboard = prebuiltLeaderboard || buildArenaVirtualLeaderboard(message);
  const playerRankBefore = getArenaRankForUser(message, message.author.id, leaderboard);
  const opponentRank = Number(opponent?.rank || ARENA_TOTAL_RANK_SLOTS);

  updatePlayerAtomic(
    message.author.id,
    (freshPlayer) => {
      const updatedArena = applyArenaResult(freshPlayer.arena, result, {
        playerRank: playerRankBefore,
        opponentRank,
      });

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

      finalArena = {
        ...updatedArena,
        arenaRank: null,
        streakRewardLine: streakBoxReward.rewardLine,
      };

      streakRewardLine = streakBoxReward.rewardLine;

      return {
        ...freshPlayer,
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
      };
    },
    message.author.username
  );

  invalidateArenaPlayersCache();

  const arenaRank = getArenaRankForUser(message, message.author.id, leaderboard);

  return {
    ...(finalArena || {}),
    arenaRank,
    streakRewardLine,
  };
}

function applyArenaOpponentLoss(arena) {
  const current = {
    points: Number(arena?.points || 0),
    wins: Number(arena?.wins || 0),
    losses: Number(arena?.losses || 0),
    draws: Number(arena?.draws || 0),

    // Important:
    // Defensive losses must NOT reset winstreak.
    // Streak only resets when the user actively attacks another player and loses.
    streak: Number(arena?.streak || 0),
    bestStreak: Number(arena?.bestStreak || 0),

    matches: Number(arena?.matches || 0),
    dailyDateKey: arena?.dailyDateKey || getDateKey(),
    dailyUses: Number(arena?.dailyUses || 0),
    lastPointChange: -3,
  };

  current.points = Math.max(0, current.points - 3);
  current.losses += 1;
  current.matches += 1;

  return current;
}

function applyArenaOpponentWin(arena, context = {}) {
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
    lastPointChange: 0,
  };

  const gained = calculateArenaWinPoints(
    context.opponentRank,
    context.playerRank
  );

  current.points += gained;
  current.lastPointChange = gained;
  current.wins += 1;
  current.matches += 1;
  current.streak += 1;

  if (current.streak > current.bestStreak) {
    current.bestStreak = current.streak;
  }

  return current;
}

function updateArenaOpponentAfterBattle(opponent, result, context = {}) {
  if (!opponent || opponent.isBot) return null;

  const opponentId = String(opponent.userId || opponent.id || "");
  if (!opponentId) return null;

  let updatedArena = null;

  updatePlayerAtomic(
    opponentId,
    (fresh) => {
      updatedArena =
        result === "win"
          ? applyArenaOpponentLoss(fresh.arena || {})
          : applyArenaOpponentWin(fresh.arena || {}, context);

      return {
        ...fresh,
        arena: updatedArena,
      };
    },
    opponent.username || "Unknown"
  );

  invalidateArenaPlayersCache();

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
    return `${formatArenaEntryRank(entry)} • **${entry.username}** • ${entry.points} pts`;
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
        ...(rows.length ? rows : ["No real player opponent available."]),
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
            label: `${formatArenaEntryRank(opponent)} • ${opponent.username}`.slice(
              0,
              100
            ),
            description: `${opponent.points} pts • Player opponent`.slice(0, 100),
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
        `**Point Change:** ${Number(arena?.lastPointChange || 0) >= 0 ? "+" : ""}${Number(
          arena?.lastPointChange || 0
        )}`,
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
  const expResults = calculateArenaExp(playerTeam, won);

  updatePlayerAtomic(
    message.author.id,
    (freshPlayer) => {
      const updatedCards = [...(freshPlayer.cards || [])].map((card, index) => {
        const expEntry =
          expResults.find(
            (entry) =>
              Number.isInteger(entry.sourceIndex) && entry.sourceIndex === index
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

      return {
        ...freshPlayer,
        cards: updatedCards,
      };
    },
    message.author.username
  );

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

function disableArenaRows(rows = []) {
  return rows.map((row) => {
    const nextRow = ActionRowBuilder.from(row);

    nextRow.setComponents(
      row.components.map((component) =>
        ButtonBuilder.from(component).setDisabled(true)
      )
    );

    return nextRow;
  });
}

function buildArenaProcessingEmbed({
  player,
  opponent,
  myTeam,
  enemyTeam,
  logs,
  arena,
  result,
}) {
  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("⏳ Processing Arena Result...")
    .setDescription(
      [
        "Saving arena points, EXP, quest progress, streak, and rank roles.",
        "Please wait a moment.",
        "",
        "## Final Action",
        ...(logs.length ? logs.slice(-4) : ["Final attack is being processed."]),
        "",
        "## Your Team",
        teamSummary(myTeam),
        "",
        "## Opponent Team",
        teamSummary(enemyTeam),
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Saving Arena Result",
    });
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
  let processing = false;
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

        let __actionLock = null;
if (interaction.user.id !== message.author.id) {
      await safeEphemeralReply(
        interaction,
        "Only the command user can control this arena battle."
      );
      return;
    }

    if (ended) {
      await safeEphemeralReply(interaction, "This arena battle has already ended.");
      return;
    }

    if (processing) {
      await safeDeferUpdate(interaction);
      return;
    }

    processing = true;

    try {
      await safeDeferUpdate(interaction);

      if (interaction.customId === "arena_forfeit") {
        ended = true;
        result = "lose";
        logs.length = 0;
        logs.push("🏳️ You forfeited the arena battle.");

        currentArena = updateArenaPlayer(message, result, opponent);
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
        return;
      }

      const index = Number(interaction.customId.replace("arena_attack_", ""));
      const playerAttacker = myTeam[index];

      if (!playerAttacker || Number(playerAttacker.hp || 0) <= 0) {
        await safeEphemeralReply(interaction, "That card cannot attack right now.");
        return;
      }

      const enemyTarget = getFirstAlive(enemyTeam);

      if (!enemyTarget) {
        await safeEphemeralReply(
          interaction,
          "No opponent card is available to fight."
        );
        return;
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

        await safeEditInteractionMessage(interaction, {
          embeds: [
            buildArenaProcessingEmbed({
              player,
              opponent,
              myTeam,
              enemyTeam,
              logs,
              arena: currentArena,
              result,
            }),
          ],
          components: disableArenaRows(buildActionRows(myTeam, true)),
        });

        currentArena = updateArenaPlayer(message, result, opponent);
        updateArenaOpponentAfterBattle(opponent, result, {
          playerRank: player?.arenaRank || getArenaRankForUser(message, message.author.id),
          opponentRank: opponent?.rank || ARENA_TOTAL_RANK_SLOTS,
        });
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

        await safeEditInteractionMessage(interaction, {
          embeds: [
            buildArenaProcessingEmbed({
              player,
              opponent,
              myTeam,
              enemyTeam,
              logs,
              arena: currentArena,
              result,
            }),
          ],
          components: disableArenaRows(buildActionRows(myTeam, true)),
        });

        currentArena = updateArenaPlayer(message, result, opponent);
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
    } catch (error) {
      console.error("[ARENA BATTLE COLLECTOR ERROR]", error);
      await safeEphemeralReply(
        interaction,
        "Arena interaction error. Please try again."
      );
    } finally {
      processing = false;
    }
  });

  collector.on("end", async (_collected, reason) => {
    if (ended) return;

    if (reason === "time") {
      ended = true;
      result = resolveNoDrawResult(myTeam, enemyTeam);
      logs.length = 0;
      logs.push("⌛ Arena battle timed out.");
      logs.push("Result decided by remaining HP.");

      currentArena = updateArenaPlayer(message, result, opponent);

      if (result === "win") {
        updateArenaOpponentAfterBattle(opponent, result, {
          playerRank: player?.arenaRank || getArenaRankForUser(message, message.author.id),
          opponentRank: opponent?.rank || ARENA_TOTAL_RANK_SLOTS,
        });
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
    player.username = getArenaDisplayName(message, message.author.id, player);

    const myTeam = getTeamUnits(player, "player");

    if (myTeam.length < 3) {
      return message.reply("You need a full team of 3 battle cards to use `op arena`.");
    }

    const usesLeft = getArenaUsesLeft(player.arena || {});

    if (usesLeft <= 0) {
      return message.reply(`You already used all **${ARENA_DAILY_LIMIT}/5** arena battles today.`);
    }

    const loadingMessage = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("Global Arena")
          .setDescription("Loading arena opponents...\nPlease wait a moment.")
          .setFooter({ text: "One Piece Bot • Arena Loading" }),
      ],
      allowedMentions: { repliedUser: false },
    });

    let leaderboardSnapshot = [];
    let playerArenaRank = ARENA_TOTAL_RANK_SLOTS;
    let rankedPlayer = null;
    let opponents = [];

    try {
      leaderboardSnapshot = buildArenaVirtualLeaderboard(message);
      playerArenaRank = getArenaRankFromLeaderboard(
        leaderboardSnapshot,
        message.author.id
      );

      rankedPlayer = {
        ...player,
        arenaRank: playerArenaRank,
      };

      opponents = buildOpponentPoolFromLeaderboard(
        leaderboardSnapshot,
        message,
        rankedPlayer
      );
    } catch (error) {
      console.error("[ARENA LOBBY BUILD ERROR]", error);

      return loadingMessage.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("Arena Error")
            .setDescription("Arena failed to load opponents. Please try again later."),
        ],
        components: [],
      });
    }

    if (!opponents.length) {
      return loadingMessage.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("Global Arena")
            .setDescription("No arena opponent was found."),
        ],
        components: [],
      });
    }

    const lobbyMessage = await loadingMessage.edit({
      embeds: [buildArenaLobbyEmbed(rankedPlayer, opponents)],
      components: buildOpponentMenu(opponents),
    });

    const lobbyCollector = lobbyMessage.createMessageComponentCollector({
      time: SESSION_TIMEOUT_MS,
    });

    lobbyCollector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        await safeEphemeralReply(
          interaction,
          "Only the command user can select an arena opponent."
        );
        return;
      }

      const selectedIndex = Number(interaction.values?.[0] || 0);
      const opponent = opponents[selectedIndex];

      if (!opponent) {
        await safeEphemeralReply(interaction, "That opponent is no longer available.");
        return;
      }

      const freshPlayer = getPlayer(message.author.id, message.author.username);
      freshPlayer.userId = String(message.author.id);
      freshPlayer.username = getArenaDisplayName(message, message.author.id, freshPlayer);

      const freshUsesLeft = getArenaUsesLeft(freshPlayer.arena || {});

      if (freshUsesLeft <= 0) {
        await safeEphemeralReply(
          interaction,
          `You already used all **${ARENA_DAILY_LIMIT}/5** arena battles today.`
        );
        return;
      }

      lobbyCollector.stop("selected");
      await safeDeferUpdate(interaction);

      await startArenaBattle({
        message,
        player: {
          ...freshPlayer,
          arenaRank: playerArenaRank,
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