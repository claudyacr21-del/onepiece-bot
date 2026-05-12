const PREMIUM_ROLE_NAME =
  process.env.PATREON_PREMIUM_ROLE_NAME ||
  process.env.PREMIUM_ROLE_NAME ||
  "Mother Flame";

const LITE_PREMIUM_ROLE_NAME =
  process.env.PATREON_LITE_ROLE_NAME ||
  process.env.LITE_PREMIUM_ROLE_NAME ||
  "Vivre Card";

const PREMIUM_ROLE_IDS = [
  process.env.MOTHER_FLAME_ROLE_ID,
  process.env.PATREON_MOTHER_FLAME_ROLE_ID,
  process.env.PATREON_ROLE_ID,
  process.env.PREMIUM_ROLE_ID,
]
  .filter(Boolean)
  .map(String);

const LITE_PREMIUM_ROLE_IDS = [
  process.env.VIVRE_CARD_ROLE_ID,
  process.env.PATREON_VIVRE_CARD_ROLE_ID,
  process.env.LITE_PREMIUM_ROLE_ID,
]
  .filter(Boolean)
  .map(String);

const PREMIUM_ROLE_ALIASES = [
  PREMIUM_ROLE_NAME,
  "Mother Flame",
  "MotherFlame",
]
  .filter(Boolean)
  .map(String);

const LITE_PREMIUM_ROLE_ALIASES = [
  LITE_PREMIUM_ROLE_NAME,
  "Vivre Card",
  "VivreCard",
  "Vivre",
]
  .filter(Boolean)
  .map(String);

const MAIN_GUILD_IDS = [
  process.env.ONEPIECE_MAIN_GUILD_ID,
  process.env.MAIN_SERVER_ID,
  process.env.SUPPORT_GUILD_ID,
  process.env.SUPPORT_SERVER_ID,
].filter(Boolean);

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function normalizeSet(values) {
  return new Set(
    (Array.isArray(values) ? values : [values])
      .map(normalize)
      .filter(Boolean)
  );
}

function hasRoleOnMember(member, roleOrOptions = {}) {
  let roleNames = [];
  let roleIds = [];

  if (typeof roleOrOptions === "string") {
    roleNames = [roleOrOptions];
  } else if (Array.isArray(roleOrOptions)) {
    roleNames = roleOrOptions;
  } else if (roleOrOptions && typeof roleOrOptions === "object") {
    roleNames = roleOrOptions.roleNames || [];
    roleIds = roleOrOptions.roleIds || [];
  }

  const nameSet = normalizeSet(roleNames);
  const idSet = new Set(
    (Array.isArray(roleIds) ? roleIds : [roleIds])
      .filter(Boolean)
      .map(String)
  );

  return Boolean(
    member?.roles?.cache?.some((role) => {
      if (!role) return false;
      if (idSet.size && idSet.has(String(role.id))) return true;
      if (nameSet.size && nameSet.has(normalize(role.name))) return true;
      return false;
    })
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

  return (
    client.guilds.cache.find((guild) => normalize(guild?.name) === "one piece bot") ||
    client.guilds.cache.find((guild) => normalize(guild?.name).includes("one piece")) ||
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

function hasMotherFlameRole(member) {
  return hasRoleOnMember(member, {
    roleNames: PREMIUM_ROLE_ALIASES,
    roleIds: PREMIUM_ROLE_IDS,
  });
}

function hasVivreCardRole(member) {
  return hasRoleOnMember(member, {
    roleNames: LITE_PREMIUM_ROLE_ALIASES,
    roleIds: LITE_PREMIUM_ROLE_IDS,
  });
}

async function isPremiumUser(message) {
  const mainMember = await fetchMainGuildMember(message);
  if (hasMotherFlameRole(mainMember)) return true;
  return hasMotherFlameRole(message?.member);
}

async function isLitePremiumUser(message) {
  const mainMember = await fetchMainGuildMember(message);
  if (hasVivreCardRole(mainMember)) return true;
  return hasVivreCardRole(message?.member);
}

async function isAnyPremiumUser(message) {
  return (await isPremiumUser(message)) || (await isLitePremiumUser(message));
}

async function getPremiumTier(message) {
  if (await isPremiumUser(message)) return "motherFlame";
  if (await isLitePremiumUser(message)) return "vivreCard";
  return "normal";
}

module.exports = {
  PREMIUM_ROLE_NAME,
  LITE_PREMIUM_ROLE_NAME,
  PREMIUM_ROLE_IDS,
  LITE_PREMIUM_ROLE_IDS,
  isPremiumUser,
  isLitePremiumUser,
  isAnyPremiumUser,
  getPremiumTier,
  fetchMainGuildMember,
  hasRoleOnMember,
};