const PREMIUM_ROLE_NAME =
  process.env.PATREON_PREMIUM_ROLE_NAME ||
  process.env.PREMIUM_ROLE_NAME ||
  "Mother Flame";

const MAIN_GUILD_IDS = [
  process.env.ONEPIECE_MAIN_GUILD_ID,
  process.env.MAIN_SERVER_ID,
  process.env.SUPPORT_GUILD_ID,
  process.env.SUPPORT_SERVER_ID,
].filter(Boolean);

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function hasRoleOnMember(member, roleName) {
  const target = normalize(roleName);

  return Boolean(
    member?.roles?.cache?.some((role) => normalize(role?.name) === target)
  );
}

async function findMainGuild(client) {
  if (!client?.guilds) return null;

  for (const guildId of MAIN_GUILD_IDS) {
    const cachedGuild = client.guilds.cache.get(String(guildId));
    if (cachedGuild) return cachedGuild;

    const fetchedGuild = await client.guilds.fetch(String(guildId)).catch(() => null);
    if (fetchedGuild) return fetchedGuild;
  }

  const cachedByName =
    client.guilds.cache.find((guild) => normalize(guild?.name) === "one piece bot") ||
    client.guilds.cache.find((guild) => normalize(guild?.name).includes("one piece"));

  if (cachedByName) return cachedByName;

  return null;
}

async function fetchMainGuildMember(message) {
  const userId = message?.author?.id;
  if (!userId) return null;

  if (message?.member) return message.member;

  const guild = await findMainGuild(message?.client);
  if (!guild) return null;

  return guild.members.fetch(userId).catch(() => null);
}

async function isPremiumUser(message) {
  const roleName = PREMIUM_ROLE_NAME;

  if (hasRoleOnMember(message?.member, roleName)) {
    return true;
  }

  const member = await fetchMainGuildMember(message);

  return hasRoleOnMember(member, roleName);
}

module.exports = {
  PREMIUM_ROLE_NAME,
  isPremiumUser,
  fetchMainGuildMember,
};