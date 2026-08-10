function parseEnvIds(...values) {
  return values
    .flatMap((value) =>
      String(value || "").split(/[\s,]+/)
    )
    .map((id) =>
      id.replace(/[<@&>]/g, "").trim()
    )
    .filter(Boolean);
}

function getUniversalAdminUserIds() {
  return parseEnvIds(
    process.env.ADMIN_USER_IDS,
    process.env.DISCORD_OWNER_ID,
    process.env.BOT_OWNER_ID,
    process.env.BOT_OWNER_IDS,
    process.env.OWNER_IDS
  );
}

function getUniversalAdminRoleIds() {
  return parseEnvIds(
    process.env.ADMIN_ROLE_IDS,
    process.env.ADMIN_ROLE_ID,
    process.env.BOT_ADMIN_ROLE_IDS
  );
}

function getMainGuildId() {
  return String(
    process.env.ONEPIECE_MAIN_GUILD_ID ||
      process.env.MAIN_SERVER_ID ||
      process.env.SUPPORT_GUILD_ID ||
      process.env.SUPPORT_SERVER_ID ||
      process.env.GUILD_ID ||
      process.env.SERVER_ID ||
      ""
  ).trim();
}

function isUniversalAdmin(message) {
  const userId = String(
    message?.author?.id || ""
  );

  if (!userId) return false;

  if (
    getUniversalAdminUserIds().includes(userId)
  ) {
    return true;
  }

  const mainGuildId = getMainGuildId();
  if (!mainGuildId) return false;

  const mainGuild =
    message?.mainGuild || null;

  const directMainGuild =
    message?.guild &&
    String(message.guild.id) === mainGuildId
      ? message.guild
      : null;

  const verifiedGuild =
    mainGuild || directMainGuild;

  if (
    !verifiedGuild ||
    String(verifiedGuild.id) !== mainGuildId
  ) {
    return false;
  }

  const member =
    message?.mainMember ||
    (directMainGuild
      ? message?.member
      : null);

  if (
    !member ||
    String(member.id) !== userId
  ) {
    return false;
  }

  const roleIds =
    getUniversalAdminRoleIds();

  return Boolean(
    roleIds.length &&
      member?.roles?.cache &&
      roleIds.some((roleId) =>
        member.roles.cache.has(roleId)
      )
  );
}

module.exports = {
  isUniversalAdmin,
  getUniversalAdminUserIds,
  getUniversalAdminRoleIds,
};