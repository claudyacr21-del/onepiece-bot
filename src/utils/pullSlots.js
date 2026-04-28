const devilFruits = require("../data/devilFruits");

const SUPPORT_SERVER_ROLE = "Support Server";
const BOOSTER_ROLE = "Server Booster";
const PREMIUM_ROLE_NAME = "Mother Flame";

const MAIN_SERVER_IDS = [
  process.env.ONEPIECE_MAIN_GUILD_ID,
  process.env.MAIN_SERVER_ID,
  process.env.SUPPORT_GUILD_ID,
  process.env.SUPPORT_SERVER_ID,
].filter(Boolean);

const BACCARAT_CARD_MAX_PULLS = 3;
const DEFAULT_BACCARAT_FRUIT_MAX_PULLS = 2;

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function normalizeKey(value) {
  return normalize(value).replace(/[_-]+/g, "").replace(/\s+/g, "");
}

function hasRoleOnMember(member, roleName) {
  const target = normalize(roleName);

  return Boolean(
    member?.roles?.cache?.some((role) => normalize(role?.name) === target)
  );
}

function isBoosterMember(member) {
  if (!member) return false;
  if (member.premiumSince || member.premiumSinceTimestamp) return true;

  return Boolean(
    member.roles?.cache?.some((role) => {
      if (normalize(role?.name) === normalize(BOOSTER_ROLE)) return true;
      if (role?.tags?.premiumSubscriberRole) return true;

      return false;
    })
  );
}

function getConfiguredMainGuild(message) {
  const guilds = message?.client?.guilds?.cache;
  if (!guilds) return null;

  for (const id of MAIN_SERVER_IDS) {
    const guild = guilds.get(String(id));
    if (guild) return guild;
  }

  const byName =
    guilds.find((guild) => normalize(guild?.name) === "one piece bot") ||
    guilds.find((guild) => normalize(guild?.name).includes("one piece"));

  if (byName) return byName;

  return message?.guild || null;
}

function getMainGuildMember(message) {
  const userId = message?.author?.id;
  const mainGuild = getConfiguredMainGuild(message);

  if (!userId || !mainGuild) return null;

  if (mainGuild.members?.cache?.has(userId)) {
    return mainGuild.members.cache.get(userId);
  }

  if (message?.guild?.id === mainGuild.id && message?.member) {
    return message.member;
  }

  return null;
}

function hasRole(message, roleName) {
  if (message?.member && hasRoleOnMember(message.member, roleName)) return true;

  const mainMember = getMainGuildMember(message);

  return hasRoleOnMember(mainMember, roleName);
}

function hasMainServerRole(message, roleName) {
  const mainMember = getMainGuildMember(message);

  return hasRoleOnMember(mainMember, roleName);
}

function hasNamedRole(message, roleName) {
  return hasRole(message, roleName);
}

function isSupportServerMember(message) {
  const mainGuild = getConfiguredMainGuild(message);
  const mainMember = getMainGuildMember(message);

  if (mainMember) return true;
  if (message?.guild && mainGuild && message.guild.id === mainGuild.id) return true;

  return false;
}

function isSupportServerBooster(message) {
  const mainMember = getMainGuildMember(message);

  if (isBoosterMember(mainMember)) return true;

  if (message?.guild && getConfiguredMainGuild(message)?.id === message.guild.id) {
    return isBoosterMember(message.member);
  }

  return false;
}

function isCurrentGuildOwner(message) {
  return Boolean(
    message?.guild?.ownerId &&
      message?.author?.id &&
      String(message.guild.ownerId) === String(message.author.id)
  );
}

function isOwnerOfAnyBotGuild(message) {
  const userId = message?.author?.id;
  const guilds = message?.client?.guilds?.cache;

  if (!userId || !guilds) return false;

  return guilds.some((guild) => String(guild?.ownerId || "") === String(userId));
}

function isServerOwner(message) {
  return isCurrentGuildOwner(message) || isOwnerOfAnyBotGuild(message);
}

function isBaccaratCard(card) {
  const code = normalizeKey(card?.code);
  const name = normalize(card?.name || card?.displayName);

  return code.includes("baccarat") || name.includes("baccarat");
}

function getBaccaratCardStage(card) {
  const stageFromNumber = Number(card?.evolutionStage || 0);

  if (Number.isFinite(stageFromNumber) && stageFromNumber > 0) {
    return Math.max(1, Math.min(BACCARAT_CARD_MAX_PULLS, stageFromNumber));
  }

  const stageFromKey = normalizeKey(card?.evolutionKey);

  if (stageFromKey === "m3") return 3;
  if (stageFromKey === "m2") return 2;
  if (stageFromKey === "m1") return 1;

  return 1;
}

function getBaccaratCardPullBonus(player) {
  const cards = Array.isArray(player?.cards) ? player.cards : [];

  let highestStage = 0;

  for (const card of cards) {
    if (!isBaccaratCard(card)) continue;

    highestStage = Math.max(highestStage, getBaccaratCardStage(card));
  }

  return Math.max(0, Math.min(BACCARAT_CARD_MAX_PULLS, highestStage));
}

function hasBaccaratCard(player) {
  return getBaccaratCardPullBonus(player) > 0;
}

function findDevilFruitData(value) {
  const target = normalizeKey(value);
  if (!target) return null;

  return (
    devilFruits.find((fruit) => normalizeKey(fruit.code) === target) ||
    devilFruits.find((fruit) => normalizeKey(fruit.name) === target) ||
    devilFruits.find((fruit) => normalizeKey(fruit.code).includes(target)) ||
    devilFruits.find((fruit) => normalizeKey(fruit.name).includes(target)) ||
    null
  );
}

function isBaccaratFruitData(fruit) {
  if (!fruit) return false;

  const code = normalizeKey(fruit.code);
  const name = normalize(fruit.name);
  const owners = Array.isArray(fruit.owners) ? fruit.owners.map(normalizeKey) : [];

  return (
    code.includes("baccarat") ||
    name.includes("baccarat") ||
    owners.includes("baccarat") ||
    Number(fruit.resetPullBonus || 0) > 0
  );
}

function getEquippedFruitData(card) {
  return (
    findDevilFruitData(card?.equippedDevilFruit) ||
    findDevilFruitData(card?.equippedDevilFruitCode) ||
    findDevilFruitData(card?.equippedDevilFruitName) ||
    null
  );
}

function getBaccaratFruitPullBonus(player) {
  const cards = Array.isArray(player?.cards) ? player.cards : [];

  let highestBonus = 0;

  for (const card of cards) {
    if (!isBaccaratCard(card)) continue;
    if (!card?.equippedDevilFruit && !card?.equippedDevilFruitName) continue;

    const fruit = getEquippedFruitData(card);
    if (!isBaccaratFruitData(fruit)) continue;

    highestBonus = Math.max(
      highestBonus,
      Number(fruit?.resetPullBonus || DEFAULT_BACCARAT_FRUIT_MAX_PULLS)
    );
  }

  return Math.max(0, highestBonus);
}

function hasBaccaratFruitEquipped(player) {
  return getBaccaratFruitPullBonus(player) > 0;
}

function getSavedAccess(player) {
  return {
    supportMember: Boolean(player?.pullAccessSnapshot?.supportMember),
    booster: Boolean(player?.pullAccessSnapshot?.booster),
    owner: Boolean(player?.pullAccessSnapshot?.owner),
    patreon: Boolean(player?.pullAccessSnapshot?.patreon),
  };
}

function resolveAccessFlags(player, message) {
  const saved = getSavedAccess(player);

  return {
    supportMember: Boolean(isSupportServerMember(message) || saved.supportMember),
    booster: Boolean(isSupportServerBooster(message) || saved.booster),
    owner: Boolean(isServerOwner(message) || saved.owner),
    patreon: Boolean(hasRole(message, PREMIUM_ROLE_NAME) || saved.patreon),
  };
}

function buildPullAccessSnapshot(player, message) {
  return resolveAccessFlags(player, message);
}

function getPullSlotStatus(player, message) {
  const pulls = player?.pulls || {};
  const access = buildPullAccessSnapshot(player, message);

  const baccaratCardBonus = getBaccaratCardPullBonus(player);
  const baccaratFruitBonus = getBaccaratFruitPullBonus(player);

  return {
    base: {
      enabled: true,
      max: 6,
      displayMax: 6,
      used: Number(pulls.base?.used || 0),
    },
    supportMember: {
      enabled: access.supportMember,
      max: access.supportMember ? 1 : 0,
      displayMax: 1,
      used: Number(pulls.supportMember?.used || 0),
    },
    booster: {
      enabled: access.booster,
      max: access.booster ? 1 : 0,
      displayMax: 1,
      used: Number(pulls.booster?.used || 0),
    },
    owner: {
      enabled: access.owner,
      max: access.owner ? 1 : 0,
      displayMax: 1,
      used: Number(pulls.owner?.used || 0),
    },
    patreon: {
      enabled: access.patreon,
      max: access.patreon ? 3 : 0,
      displayMax: 3,
      used: Number(pulls.patreon?.used || 0),
    },
    baccaratCard: {
      enabled: baccaratCardBonus > 0,
      max: baccaratCardBonus,
      displayMax: BACCARAT_CARD_MAX_PULLS,
      used: Number(pulls.baccaratCard?.used || 0),
    },
    baccaratFruit: {
      enabled: baccaratFruitBonus > 0,
      max: baccaratFruitBonus,
      displayMax: Math.max(DEFAULT_BACCARAT_FRUIT_MAX_PULLS, baccaratFruitBonus),
      used: Number(pulls.baccaratFruit?.used || 0),
    },
  };
}

function getTotalPullUsage(player, message) {
  const slots = getPullSlotStatus(player, message);

  let totalMax = 0;
  let totalUsed = 0;

  for (const slot of Object.values(slots)) {
    if (!slot.enabled) continue;

    totalMax += Number(slot.max || 0);
    totalUsed += Math.min(Number(slot.used || 0), Number(slot.max || 0));
  }

  return {
    totalUsed,
    totalMax,
    slots,
  };
}

function getNextAvailablePullKey(player, message) {
  const slots = getPullSlotStatus(player, message);

  const order = [
    "base",
    "supportMember",
    "booster",
    "owner",
    "patreon",
    "baccaratCard",
    "baccaratFruit",
  ];

  for (const key of order) {
    const slot = slots[key];
    if (!slot?.enabled) continue;

    const remaining = Math.max(0, Number(slot.max || 0) - Number(slot.used || 0));
    if (remaining > 0) return key;
  }

  return null;
}

function consumePullSlot(player, key) {
  const pulls = {
    ...(player.pulls || {}),
  };

  const current = pulls[key] || {
    used: 0,
    max: 1,
  };

  pulls[key] = {
    ...current,
    used: Number(current.used || 0) + 1,
  };

  return pulls;
}

function consumeAllActivePullSlots(player, message) {
  const pulls = {
    ...(player.pulls || {}),
  };

  const slots = getPullSlotStatus(player, message);

  for (const [key, slot] of Object.entries(slots)) {
    if (!slot.enabled) continue;

    pulls[key] = {
      ...(pulls[key] || {
        used: 0,
        max: slot.max,
      }),
      used: Number(slot.max || 0),
      max: Number(slot.max || 0),
    };
  }

  return pulls;
}

function resetAllPullSlots(player) {
  const pulls = {
    ...(player.pulls || {}),
  };

  return {
    ...pulls,
    base: {
      ...(pulls.base || {}),
      used: 0,
      max: 6,
    },
    supportMember: {
      ...(pulls.supportMember || {}),
      used: 0,
      max: 1,
    },
    booster: {
      ...(pulls.booster || {}),
      used: 0,
      max: 1,
    },
    owner: {
      ...(pulls.owner || {}),
      used: 0,
      max: 1,
    },
    patreon: {
      ...(pulls.patreon || {}),
      used: 0,
      max: 3,
    },
    baccaratCard: {
      ...(pulls.baccaratCard || {}),
      used: 0,
      max: BACCARAT_CARD_MAX_PULLS,
    },
    baccaratFruit: {
      ...(pulls.baccaratFruit || {}),
      used: 0,
      max: DEFAULT_BACCARAT_FRUIT_MAX_PULLS,
    },
  };
}

module.exports = {
  SUPPORT_SERVER_ROLE,
  BOOSTER_ROLE,
  PREMIUM_ROLE_NAME,
  hasNamedRole,
  hasMainServerRole,
  isSupportServerMember,
  isSupportServerBooster,
  isServerOwner,
  hasBaccaratCard,
  hasBaccaratFruitEquipped,
  getBaccaratCardPullBonus,
  getBaccaratFruitPullBonus,
  buildPullAccessSnapshot,
  getPullSlotStatus,
  getTotalPullUsage,
  getNextAvailablePullKey,
  consumePullSlot,
  consumeAllActivePullSlots,
  resetAllPullSlots,
};