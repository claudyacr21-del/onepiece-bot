const { readPlayers } = require("../playerStore");

const ROLE_CONFIG = [
  {
    position: 1,
    env: "ARENA_RANK_1_ROLE_ID",
    fallbackNames: ["Pirate King", "Arena Rank 1", "Rank 1"],
  },
  {
    position: 2,
    env: "ARENA_RANK_2_ROLE_ID",
    fallbackNames: ["Yonko", "Arena Rank 2", "Rank 2"],
  },
  {
    position: 3,
    env: "ARENA_RANK_3_ROLE_ID",
    fallbackNames: ["Warlord", "Arena Rank 3", "Rank 3"],
  },
];

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function getArenaLeaderboardTop3() {
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
        matches: Number(arena.matches || 0),
        streak: Number(arena.streak || 0),
      };
    })
    .filter((entry) => {
      return (
        entry.points > 0 ||
        entry.wins > 0 ||
        entry.losses > 0 ||
        entry.matches > 0
      );
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      if (b.streak !== a.streak) return b.streak - a.streak;
      return String(a.username).localeCompare(String(b.username));
    })
    .slice(0, 3)
    .map((entry, index) => ({
      ...entry,
      position: index + 1,
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
    const byId =
      guild.roles.cache.get(config.roleId) ||
      (await guild.roles.fetch(config.roleId).catch(() => null));

    if (byId) return byId;
  }

  const names = new Set((config.fallbackNames || []).map(normalize));

  return (
    guild.roles.cache.find((role) => names.has(normalize(role.name))) ||
    null
  );
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

  const top3 = getArenaLeaderboardTop3();
  const configs = getConfiguredRoleConfigs();

  if (!configs.length) return;

  const desiredRoleByUserId = new Map();

  for (const player of top3) {
    const config = configs.find((entry) => entry.position === player.position);
    if (!config) continue;

    desiredRoleByUserId.set(String(player.userId), config);
  }

  const guilds = await resolveGuilds(client, preferredGuild);

  if (!guilds.length) {
    console.warn("[ARENA RANK ROLES] No guild found for arena rank role sync.");
    return;
  }

  for (const guild of guilds) {
    const me =
      guild.members.me ||
      (await guild.members.fetchMe().catch(() => null));

    if (!me?.permissions?.has("ManageRoles")) {
      console.warn(`[ARENA RANK ROLES] Missing Manage Roles permission in ${guild.name}`);
      continue;
    }

    const resolvedRoles = [];

    for (const config of configs) {
      const role = await resolveRole(guild, config);

      if (!role) {
        console.warn(
          `[ARENA RANK ROLES] Role not found for position ${config.position}. Set ${config.env} or create fallback role.`
        );
        continue;
      }

      if (role.position >= me.roles.highest.position) {
        console.warn(
          `[ARENA RANK ROLES] Bot role must be above ${role.name} in ${guild.name}.`
        );
        continue;
      }

      resolvedRoles.push({
        ...config,
        role,
      });
    }

    if (!resolvedRoles.length) continue;

    const allRankRoleIds = new Set(resolvedRoles.map((entry) => String(entry.role.id)));

    await guild.members.fetch().catch(() => null);

    for (const member of guild.members.cache.values()) {
      if (member.user?.bot) continue;

      const desiredConfig = desiredRoleByUserId.get(String(member.id)) || null;
      const desiredResolved = desiredConfig
        ? resolvedRoles.find((entry) => entry.position === desiredConfig.position)
        : null;

      const desiredRoleId = desiredResolved ? String(desiredResolved.role.id) : null;

      for (const roleId of allRankRoleIds) {
        const hasRole = member.roles.cache.has(roleId);
        const shouldHaveRole = desiredRoleId === roleId;

        if (hasRole && !shouldHaveRole) {
          await member.roles.remove(roleId, "Arena top rank role sync").catch((error) => {
            console.warn(
              `[ARENA RANK ROLES] Failed removing role ${roleId} from ${member.user.tag}:`,
              error?.message || error
            );
          });
        }

        if (!hasRole && shouldHaveRole) {
          await member.roles.add(roleId, "Arena top rank role sync").catch((error) => {
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
  getArenaLeaderboardTop3,
  syncArenaRankRoles,
};