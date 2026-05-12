const PREMIUM_ROLE_NAME =
  process.env.PATREON_PREMIUM_ROLE_NAME ||
  process.env.PREMIUM_ROLE_NAME ||
  "Mother Flame";

const LITE_PREMIUM_ROLE_NAME =
  process.env.PATREON_LITE_ROLE_NAME ||
  process.env.LITE_PREMIUM_ROLE_NAME ||
  "Vivre Card";

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

    const fetchedGuild = await client.guilds
      .fetch(String(guildId))
      .catch(() => null);

    if (fetchedGuild) return fetchedGuild;
  }

  return (
    client.guilds.cache.find(
      (guild) => normalize(guild?.name) === "one piece bot"
    ) ||
    client.guilds.cache.find((guild) =>
      normalize(guild?.name).includes("one piece")
    ) ||
    null
  );
}

async function fetchMainGuildMember(message) {
  const userId = message?.author?.id;
  if (!userId) return null;

  const mainGuild = await findMainGuild(message?.client);
  if (!mainGuild) return null;

  if (
    message?.guild &&
    String(message.guild.id) === String(mainGuild.id) &&
    message?.member
  ) {
    return message.member;
  }

  const cachedMember = mainGuild.members?.cache?.get(userId);
  if (cachedMember) return cachedMember;

  return mainGuild.members.fetch(userId).catch(() => null);
}

async function isPremiumUser(message) {
  const mainMember = await fetchMainGuildMember(message);

  if (hasRoleOnMember(mainMember, PREMIUM_ROLE_NAME)) return true;

  return hasRoleOnMember(message?.member, PREMIUM_ROLE_NAME);
}

async function isLitePremiumUser(message) {
  const mainMember = await fetchMainGuildMember(message);

  if (hasRoleOnMember(mainMember, LITE_PREMIUM_ROLE_NAME)) return true;

  return hasRoleOnMember(message?.member, LITE_PREMIUM_ROLE_NAME);
}

async function isAnyPremiumUser(message) {
  return (await isPremiumUser(message)) || (await isLitePremiumUser(message));
}

module.exports = {
  PREMIUM_ROLE_NAME,
  LITE_PREMIUM_ROLE_NAME,
  isPremiumUser,
  isLitePremiumUser,
  isAnyPremiumUser,
  fetchMainGuildMember,
  hasRoleOnMember,
};