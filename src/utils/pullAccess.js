const PREMIUM_ROLE_NAME = "Mother Flame";

function hasRole(message, roleName) {
  if (!message.member?.roles?.cache || !roleName) return false;
  return message.member.roles.cache.some((role) => role.name === roleName);
}

function isServerOwner(message) {
  return message.guild?.ownerId === message.author.id;
}

function isServerBooster(message) {
  return Boolean(message.member?.premiumSince);
}

function isSupportServerMember(message) {
  return Boolean(message.guild && message.member);
}

function isMotherFlame(message) {
  return hasRole(message, PREMIUM_ROLE_NAME);
}

function getPullAccess(message) {
  return {
    base: 6,
    supportMember: isSupportServerMember(message) ? 1 : 0,
    booster: isServerBooster(message) ? 1 : 0,
    owner: isServerOwner(message) ? 1 : 0,
    motherFlame: isMotherFlame(message) ? 3 : 0
  };
}

module.exports = {
  PREMIUM_ROLE_NAME,
  hasRole,
  isServerOwner,
  isServerBooster,
  isSupportServerMember,
  isMotherFlame,
  getPullAccess
};