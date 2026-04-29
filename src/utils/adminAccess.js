const { PermissionsBitField } = require("discord.js");

function splitEnv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAdminUserIds() {
  return splitEnv(
    process.env.ADMIN_USER_IDS ||
      process.env.DISCORD_OWNER_ID ||
      process.env.BOT_OWNER_ID ||
      ""
  );
}

function getAdminRoleIds() {
  return splitEnv(
    process.env.ADMIN_ROLE_IDS ||
      process.env.ADMIN_ROLE_ID ||
      process.env.STAFF_ROLE_IDS ||
      ""
  );
}

function hasAdminRole(message) {
  const adminRoleIds = getAdminRoleIds();

  if (!adminRoleIds.length) return false;
  if (!message?.member?.roles?.cache) return false;

  return adminRoleIds.some((roleId) => message.member.roles.cache.has(roleId));
}

function isAdminUser(message) {
  const userId = message?.author?.id;
  if (!userId) return false;

  return getAdminUserIds().includes(String(userId));
}

function hasDiscordAdministrator(message) {
  return Boolean(
    message?.member?.permissions?.has(PermissionsBitField.Flags.Administrator)
  );
}

function canUseAdminCommand(message) {
  return (
    isAdminUser(message) ||
    hasAdminRole(message) ||
    hasDiscordAdministrator(message)
  );
}

function getAdminAccessError() {
  return "Only administrators or approved admin roles can use this command.";
}

module.exports = {
  getAdminUserIds,
  getAdminRoleIds,
  hasAdminRole,
  isAdminUser,
  hasDiscordAdministrator,
  canUseAdminCommand,
  getAdminAccessError,
};