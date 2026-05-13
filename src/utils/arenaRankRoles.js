const { readPlayers } = require("../playerStore");
const { hydrateCard } = require("./evolution");
const { getPassiveBoostSummary } = require("./passiveBoosts");

const ARENA_TOTAL_RANK_SLOTS = 500;
const ARENA_POINTS_PER_RANK = 10;

const ROLE_CONFIG = [
  {
    rank: 1,
    env: "ARENA_RANK_1_ROLE_ID",
    fallbackNames: ["Pirate King", "Arena Rank 1", "Rank 1"],
  },
  {
    rank: 2,
    env: "ARENA_RANK_2_ROLE_ID",
    fallbackNames: ["Grand Champion", "Yonko", "Arena Rank 2", "Rank 2"],
  },
  {
    rank: 3,
    env: "ARENA_RANK_3_ROLE_ID",
    fallbackNames: ["Champion", "Warlord", "Arena Rank 3", "Rank 3"],
  },
];

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function getPower(card) {
  return Number(
    card?.currentPower ||
      Math.floor(
        Number(card?.atk || 0) * 1.4 +
          Number(card?.hp || 0) * 0.22 +
          Number(card?.speed || 0) * 9
      )
  );
}

function getTeamPower(player) {
  const boosts = getPassiveBoostSummary(player);

  const cards = (Array.isArray(player?.cards) ? player.cards : [])
    .map((card) => hydrateCard(card))
    .filter(Boolean)
    .map((card) => {
      if (String(card.cardRole || "").toLowerCase() === "boost") return null;

      return {
        ...card,
        atk: Math.floor(Number(card.atk || 0) * (1 + Number(boosts.atk || 0) / 100)),
        hp: Math.floor(Number(card.hp || 0) * (1 + Number(boosts.hp || 0) / 100)),
        speed: Math.floor(Number(card.speed || 0) * (1 + Number(boosts.spd || 0) / 100)),
      };
    })
    .filter(Boolean);

  const slots = Array.isArray(player?.team?.slots)
    ? player.team.slots.slice(0, 3)
    : [null, null, null];

  return slots.reduce((total, instanceId) => {
    if (!instanceId) return total;

    const found = cards.find(
      (card) => String(card.instanceId) === String(instanceId)
    );

    return total + (found ? getPower(found) : 0);
  }, 0);
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

  if (Number(b.teamPower || 0) !== Number(a.teamPower || 0)) {
    return Number(b.teamPower || 0) - Number(a.teamPower || 0);
  }

  if (Boolean(a.isBot) !== Boolean(b.isBot)) {
    return a.isBot ? 1 : -1;
  }

  return String(a.username || "").localeCompare(String(b.username || ""));
}

function getArenaBotPointsForSeed(seed) {
  const safeSeed = Math.max(
    1,
    Math.min(ARENA_TOTAL_RANK_SLOTS, Number(seed || 1))
  );

  return Math.max(0, (ARENA_TOTAL_RANK_SLOTS - safeSeed) * ARENA_POINTS_PER_RANK);
}

function buildBotEntry(seed) {
  const points = getArenaBotPointsForSeed(seed);

  return {
    userId: `arena-bot-${seed}`,
    username: `Arena Bot ${seed}`,
    points,
    wins: Math.max(0, Math.floor(points / 120)),
    losses: Math.max(0, Math.floor(seed / 35)),
    matches: Math.max(0, Math.floor(points / 90)),
    streak: 0,
    teamPower: Math.max(0, Math.floor(points * 2)),
    isBot: true,
  };
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
        teamPower: getTeamPower(player),
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

function buildArenaLeaderboard() {
  const realEntries = getRealArenaEntries()
    .sort(compareArenaEntries)
    .slice(0, ARENA_TOTAL_RANK_SLOTS);

  const botCount = Math.max(0, ARENA_TOTAL_RANK_SLOTS - realEntries.length);

  const bots = Array.from({ length: botCount }, (_, index) =>
    buildBotEntry(index + 1)
  );

  return [...realEntries, ...bots]
    .sort(compareArenaEntries)
    .slice(0, ARENA_TOTAL_RANK_SLOTS)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function getArenaRealTopRankHolders() {
  return buildArenaLeaderboard()
    .filter((entry) => !entry.isBot && [1, 2, 3].includes(Number(entry.rank)))
    .map((entry) => ({
      userId: String(entry.userId),
      username: entry.username || "Unknown",
      rank: Number(entry.rank),
      points: Number(entry.points || 0),
    }));
}

function getConfiguredRoleConfigs() {
  return ROLE_CONFIG.map((config) => ({
    ...config,
    roleId: process.env[config.env] ? String(process.env[config.env]) : null,
  }));
}

async function resolveRole(guild, config) {
  if (!guild) return null;

  if (config.roleId) {
    const role =
      guild.roles.cache.get(config.roleId) ||
      (await guild.roles.fetch(config.roleId).catch(() => null));

    if (role) return role;

    console.warn(`[ARENA RANK ROLES] ${config.env} is set but role was not found.`);
  }

  const names = new Set((config.fallbackNames || []).map(normalize));

  return guild.roles.cache.find((role) => names.has(normalize(role.name))) || null;
}

async function resolveGuilds(client, preferredGuild = null) {
  const targetGuildId =
    process.env.ARENA_RANK_GUILD_ID ||
    process.env.ONEPIECE_MAIN_GUILD_ID ||
    process.env.MAIN_SERVER_ID ||
    process.env.SUPPORT_GUILD_ID ||
    process.env.SUPPORT_SERVER_ID ||
    null;

  if (targetGuildId) {
    const guild =
      client.guilds.cache.get(String(targetGuildId)) ||
      (await client.guilds.fetch(String(targetGuildId)).catch(() => null));

    return guild ? [guild] : [];
  }

  return preferredGuild ? [preferredGuild] : [...client.guilds.cache.values()];
}

async function syncArenaRankRoles(client, preferredGuild = null) {
  if (!client?.guilds?.cache) return;

  const rankHolders = getArenaRealTopRankHolders();
  const configs = getConfiguredRoleConfigs();
  const guilds = await resolveGuilds(client, preferredGuild);

  const desiredRankByUserId = new Map();

  for (const holder of rankHolders) {
    desiredRankByUserId.set(String(holder.userId), Number(holder.rank));
  }

  for (const guild of guilds) {
    const me =
      guild.members.me ||
      (await guild.members.fetchMe().catch(() => null));

    if (!me?.permissions?.has("ManageRoles")) {
      console.warn(`[ARENA RANK ROLES] Missing Manage Roles in ${guild.name}`);
      continue;
    }

    const resolvedRoles = [];

    for (const config of configs) {
      const role = await resolveRole(guild, config);

      if (!role) {
        console.warn(`[ARENA RANK ROLES] Role not found for ${config.env}`);
        continue;
      }

      if (role.position >= me.roles.highest.position) {
        console.warn(`[ARENA RANK ROLES] Bot role must be above ${role.name}`);
        continue;
      }

      resolvedRoles.push({
        ...config,
        role,
      });
    }

    if (!resolvedRoles.length) continue;

    const allRankRoleIds = new Set(
      resolvedRoles.map((entry) => String(entry.role.id))
    );

    await guild.members.fetch().catch(() => null);

    for (const member of guild.members.cache.values()) {
      if (member.user?.bot) continue;

      const desiredRank = desiredRankByUserId.get(String(member.id)) || null;
      const desiredRole = desiredRank
        ? resolvedRoles.find((entry) => Number(entry.rank) === Number(desiredRank))
        : null;

      const desiredRoleId = desiredRole ? String(desiredRole.role.id) : null;

      for (const roleId of allRankRoleIds) {
        const hasRole = member.roles.cache.has(roleId);
        const shouldHave = desiredRoleId === roleId;

        if (hasRole && !shouldHave) {
          await member.roles.remove(roleId, "Arena rank role sync").catch((error) => {
            console.warn(
              `[ARENA RANK ROLES] Failed removing role ${roleId} from ${member.user.tag}:`,
              error?.message || error
            );
          });
        }

        if (!hasRole && shouldHave) {
          await member.roles.add(roleId, "Arena rank role sync").catch((error) => {
            console.warn(
              `[ARENA RANK ROLES] Failed adding role ${roleId} to ${member.user.tag}:`,
              error?.message || error
            );
          });
        }
      }
    }
  }
}

module.exports = {
  buildArenaLeaderboard,
  getArenaRealTopRankHolders,
  syncArenaRankRoles,
};