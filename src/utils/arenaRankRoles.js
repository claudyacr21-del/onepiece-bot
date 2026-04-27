const { readPlayers } = require("../playerStore");

const ARENA_START_RANK = 500;
const ARENA_POINTS_PER_RANK = 10;

const ROLE_CONFIG = [
  {
    rank: 1,
    env: "ARENA_RANK_1_ROLE_ID",
  },
  {
    rank: 2,
    env: "ARENA_RANK_2_ROLE_ID",
  },
  {
    rank: 3,
    env: "ARENA_RANK_3_ROLE_ID",
  },
];

function getArenaRankFromPoints(points) {
  const safePoints = Math.max(0, Number(points || 0));

  return Math.max(
    1,
    ARENA_START_RANK - Math.floor(safePoints / ARENA_POINTS_PER_RANK)
  );
}

function getRequiredPointsForRank(rank) {
  const safeRank = Math.max(1, Math.min(ARENA_START_RANK, Number(rank || ARENA_START_RANK)));

  return Math.max(0, (ARENA_START_RANK - safeRank) * ARENA_POINTS_PER_RANK);
}

function getEligibleArenaRankRolePlayers() {
  const players = readPlayers() || {};

  const realPlayers = Object.entries(players)
    .map(([userId, player]) => {
      const points = Number(player?.arena?.points || 0);
      const wins = Number(player?.arena?.wins || 0);
      const losses = Number(player?.arena?.losses || 0);
      const matches = Number(player?.arena?.matches || 0);
      const rank = getArenaRankFromPoints(points);

      return {
        userId,
        username: player.username || "Unknown",
        points,
        wins,
        losses,
        matches,
        rank,
      };
    })
    .filter((entry) => entry.matches > 0 || entry.points > 0 || entry.wins > 0 || entry.losses > 0)
    .filter((entry) => entry.rank >= 1 && entry.rank <= 3)
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return String(a.username).localeCompare(String(b.username));
    });

  const byRank = new Map();

  for (const player of realPlayers) {
    if (!byRank.has(player.rank)) {
      byRank.set(player.rank, player);
    }
  }

  return byRank;
}

function getConfiguredRoleIds() {
  return ROLE_CONFIG.map((config) => ({
    ...config,
    roleId: process.env[config.env],
  })).filter((config) => Boolean(config.roleId));
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

  if (preferredGuild) return [preferredGuild];

  return [...client.guilds.cache.values()];
}

async function syncArenaRankRoles(client, preferredGuild = null) {
  if (!client?.guilds?.cache) return;

  const roleConfigs = getConfiguredRoleIds();

  if (!roleConfigs.length) {
    console.warn("[ARENA RANK ROLES] Missing ARENA_RANK_1_ROLE_ID / ARENA_RANK_2_ROLE_ID / ARENA_RANK_3_ROLE_ID");
    return;
  }

  const eligibleByRank = getEligibleArenaRankRolePlayers();
  const topRoleByUserId = new Map();

  for (const config of roleConfigs) {
    const player = eligibleByRank.get(config.rank);

    if (!player) continue;

    topRoleByUserId.set(String(player.userId), String(config.roleId));
  }

  const allRankRoleIds = new Set(roleConfigs.map((config) => String(config.roleId)));
  const guilds = await resolveGuilds(client, preferredGuild);

  for (const guild of guilds) {
    const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));

    if (!me?.permissions?.has("ManageRoles")) {
      console.warn(`[ARENA RANK ROLES] Missing Manage Roles permission in ${guild.name}`);
      continue;
    }

    await guild.members.fetch().catch(() => null);

    for (const member of guild.members.cache.values()) {
      if (member.user?.bot) continue;

      const desiredRoleId = topRoleByUserId.get(String(member.id)) || null;

      for (const roleId of allRankRoleIds) {
        const hasRole = member.roles.cache.has(roleId);
        const shouldHaveRole = desiredRoleId === roleId;

        if (hasRole && !shouldHaveRole) {
          await member.roles.remove(roleId, "Arena rank role sync").catch((error) => {
            console.warn(`[ARENA RANK ROLES] Failed removing role ${roleId} from ${member.user.tag}`, error?.message || error);
          });
        }

        if (!hasRole && shouldHaveRole) {
          await member.roles.add(roleId, "Arena rank role sync").catch((error) => {
            console.warn(`[ARENA RANK ROLES] Failed adding role ${roleId} to ${member.user.tag}`, error?.message || error);
          });
        }
      }
    }
  }
}

module.exports = {
  ARENA_START_RANK,
  ARENA_POINTS_PER_RANK,
  getArenaRankFromPoints,
  getRequiredPointsForRank,
  getEligibleArenaRankRolePlayers,
  syncArenaRankRoles,
};