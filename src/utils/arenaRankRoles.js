const { getArenaLeaderboard } = require("./arenaLeaderboard");

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

function getArenaRealTopRankHolders() {
  return getArenaLeaderboard()
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
  getArenaRealTopRankHolders,
  syncArenaRankRoles,
};