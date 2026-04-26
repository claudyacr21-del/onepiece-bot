const SUPPORT_SERVER_ROLE = "Support Server";
const BOOSTER_ROLE = "Server Booster";
const PREMIUM_ROLE_NAME = "Mother Flame";

const MAIN_SERVER_IDS = [
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

function hasBaccaratCard(player) {
  return (Array.isArray(player?.cards) ? player.cards : []).some((card) => {
    const code = normalize(card?.code);
    const name = normalize(card?.name || card?.displayName);

    return code.includes("baccarat") || name.includes("baccarat");
  });
}

function hasBaccaratFruitEquipped(player) {
  return (Array.isArray(player?.cards) ? player.cards : []).some((card) => {
    const fruit = normalize(
      card?.equippedDevilFruitName || card?.equippedDevilFruit || ""
    );

    return fruit.includes("baccarat");
  });
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

  return {
    base: {
      enabled: true,
      max: 6,
      used: Number(pulls.base?.used || 0),
    },
    supportMember: {
      enabled: access.supportMember,
      max: 1,
      used: Number(pulls.supportMember?.used || 0),
    },
    booster: {
      enabled: access.booster,
      max: 1,
      used: Number(pulls.booster?.used || 0),
    },
    owner: {
      enabled: access.owner,
      max: 1,
      used: Number(pulls.owner?.used || 0),
    },
    patreon: {
      enabled: access.patreon,
      max: 3,
      used: Number(pulls.patreon?.used || 0),
    },
    baccaratCard: {
      enabled: hasBaccaratCard(player),
      max: 1,
      used: Number(pulls.baccaratCard?.used || 0),
    },
    baccaratFruit: {
      enabled: hasBaccaratFruitEquipped(player),
      max: 1,
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
      max: 1,
    },
    baccaratFruit: {
      ...(pulls.baccaratFruit || {}),
      used: 0,
      max: 1,
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
  buildPullAccessSnapshot,
  getPullSlotStatus,
  getTotalPullUsage,
  getNextAvailablePullKey,
  consumePullSlot,
  consumeAllActivePullSlots,
  resetAllPullSlots,
};