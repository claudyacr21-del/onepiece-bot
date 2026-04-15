const { getBoostCards } = require("./passiveBoosts");
const { PREMIUM_ROLE_NAME } = require("./pullAccess");

const SUPPORT_SERVER_ROLE = "Nakama";
const BOOSTER_ROLE = "New World";

function hasNamedRole(message, roleName) {
  if (!message.member?.roles?.cache) return false;
  return message.member.roles.cache.some((role) => role.name === roleName);
}

function hasRole(message, roleName) {
  if (!message.member?.roles?.cache || !roleName) return false;
  return message.member.roles.cache.some((role) => role.name === roleName);
}

function isServerOwner(message) {
  return Boolean(message.guild && message.author.id === message.guild.ownerId);
}

function hasBaccaratCard(player) {
  const ownedCards = Array.isArray(player?.cards) ? player.cards : [];
  return ownedCards.some((card) => card.code === "baccarat_lucky_draw");
}

function hasBaccaratFruitEquipped(player) {
  const boostCards = getBoostCards(player);
  return boostCards.some(
    (card) =>
      card.code === "baccarat_lucky_draw" &&
      String(card.equippedDevilFruit || "") === "unknown_fortune_fruit"
  );
}

function getPullSlotStatus(player, message) {
  const pulls = player.pulls || {};

  const slots = {
    base: {
      enabled: true,
      max: 6,
      used: Number(pulls.base?.used || 0)
    },
    supportMember: {
      enabled: hasNamedRole(message, SUPPORT_SERVER_ROLE),
      max: 1,
      used: Number(pulls.supportMember?.used || 0)
    },
    booster: {
      enabled: hasNamedRole(message, BOOSTER_ROLE),
      max: 1,
      used: Number(pulls.booster?.used || 0)
    },
    owner: {
      enabled: isServerOwner(message),
      max: 1,
      used: Number(pulls.owner?.used || 0)
    },
    patreon: {
      enabled: hasRole(message, PREMIUM_ROLE_NAME),
      max: 3,
      used: Number(pulls.patreon?.used || 0)
    },
    baccaratCard: {
      enabled: hasBaccaratCard(player),
      max: 1,
      used: Number(pulls.baccaratCard?.used || 0)
    },
    baccaratFruit: {
      enabled: hasBaccaratFruitEquipped(player),
      max: 1,
      used: Number(pulls.baccaratFruit?.used || 0)
    }
  };

  return slots;
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
    slots
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
    "baccaratFruit"
  ];

  for (const key of order) {
    const slot = slots[key];
    if (!slot?.enabled) continue;

    const remaining = Math.max(0, Number(slot.max || 0) - Number(slot.used || 0));
    if (remaining > 0) {
      return key;
    }
  }

  return null;
}

function consumePullSlot(player, key) {
  const pulls = { ...(player.pulls || {}) };
  const current = pulls[key] || { used: 0, max: 1 };

  pulls[key] = {
    ...current,
    used: Number(current.used || 0) + 1
  };

  return pulls;
}

function consumeAllActivePullSlots(player, message) {
  const pulls = { ...(player.pulls || {}) };
  const slots = getPullSlotStatus(player, message);

  for (const [key, slot] of Object.entries(slots)) {
    if (!slot.enabled) continue;

    pulls[key] = {
      ...(pulls[key] || { used: 0, max: slot.max }),
      used: Number(slot.max || 0),
      max: Number(slot.max || 0)
    };
  }

  return pulls;
}

function resetAllPullSlots(player) {
  const pulls = { ...(player.pulls || {}) };

  return {
    ...pulls,
    base: { ...(pulls.base || {}), used: 0, max: 6 },
    supportMember: { ...(pulls.supportMember || {}), used: 0, max: 1 },
    booster: { ...(pulls.booster || {}), used: 0, max: 1 },
    owner: { ...(pulls.owner || {}), used: 0, max: 1 },
    patreon: { ...(pulls.patreon || {}), used: 0, max: 3 },
    baccaratCard: { ...(pulls.baccaratCard || {}), used: 0, max: 1 },
    baccaratFruit: { ...(pulls.baccaratFruit || {}), used: 0, max: 1 }
  };
}

module.exports = {
  SUPPORT_SERVER_ROLE,
  BOOSTER_ROLE,
  hasNamedRole,
  isServerOwner,
  hasBaccaratCard,
  hasBaccaratFruitEquipped,
  getPullSlotStatus,
  getTotalPullUsage,
  getNextAvailablePullKey,
  consumePullSlot,
  consumeAllActivePullSlots,
  resetAllPullSlots
};