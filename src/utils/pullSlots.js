const SUPPORT_SERVER_ROLE = "Support Server";
const BOOSTER_ROLE = "Server Booster";
const PREMIUM_ROLE_NAME = "Mother Flame";

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function hasRole(message, roleName) {
  const target = normalize(roleName);

  return Boolean(
    message?.member?.roles?.cache?.some(
      (role) => normalize(role?.name) === target
    )
  );
}

function hasNamedRole(message, roleName) {
  return hasRole(message, roleName);
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
  const inGuild = Boolean(message?.guild && message?.member);

  if (!inGuild) {
    return saved;
  }

  return {
    supportMember: hasNamedRole(message, SUPPORT_SERVER_ROLE),
    booster: hasNamedRole(message, BOOSTER_ROLE),
    owner: isServerOwner(message),
    patreon: hasRole(message, PREMIUM_ROLE_NAME),
  };
}

function buildPullAccessSnapshot(player, message) {
  const current = resolveAccessFlags(player, message);
  const saved = getSavedAccess(player);

  return {
    supportMember: Boolean(current.supportMember || saved.supportMember),
    booster: Boolean(current.booster || saved.booster),
    owner: Boolean(current.owner || saved.owner),
    patreon: Boolean(current.patreon || saved.patreon),
  };
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
  hasNamedRole,
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