const { EmbedBuilder } = require("discord.js");
const { readPatreonRoles, setPatreonRole } = require("../utils/patreonRoleStore");

const DEFAULT_DAYS = 30;
const INDONESIA_TIMEZONE = process.env.PATREON_TIMEZONE || "Asia/Jakarta";

const TIER_CONFIG = {
  mother_flame: {
    label: "Mother Flame",
    roleEnvIds: [
      "MOTHER_FLAME_ROLE_ID",
      "PATREON_MOTHER_FLAME_ROLE_ID",
      "PATREON_ROLE_ID",
      "PREMIUM_ROLE_ID",
    ],
    roleEnvNames: ["PATREON_PREMIUM_ROLE_NAME", "PREMIUM_ROLE_NAME"],
    fallbackRoleName: "Mother Flame",
    aliases: ["mother", "mf", "motherflame", "mother_flame", "premium"],
    color: 0x8e44ad,
    title: "🔥 Mother Flame Activated",
    reason: "Mother Flame Patreon manual claim",
  },

  vivre_card: {
    label: "Vivre Card",
    roleEnvIds: [
      "VIVRE_CARD_ROLE_ID",
      "PATREON_VIVRE_CARD_ROLE_ID",
      "LITE_PREMIUM_ROLE_ID",
    ],
    roleEnvNames: ["PATREON_LITE_ROLE_NAME", "LITE_PREMIUM_ROLE_NAME"],
    fallbackRoleName: "Vivre Card",
    aliases: ["vivre", "vc", "vivrecard", "vivre_card", "lite"],
    color: 0x2ecc71,
    title: "🧭 Vivre Card Activated",
    reason: "Vivre Card Patreon manual claim",
  },
};

function getAdminUserIds() {
  return parseEnvIds(
    process.env.ADMIN_USER_IDS,
    process.env.DISCORD_OWNER_ID,
    process.env.BOT_OWNER_ID,
  );
}

function getAdminRoleIds() {
  return parseEnvIds(process.env.ADMIN_ROLE_IDS);
}

function memberHasAdminRole(message) {
  const roleIds = getAdminRoleIds();

  if (!roleIds.length) return false;

  const member =
    message?.resolvedMember ||
    message?.mainMember ||
    message?.member ||
    null;

  if (!member?.roles?.cache) return false;

  return roleIds.some((roleId) => member.roles.cache.has(roleId));
}

function isAdmin(message) {
  const userId = String(message?.author?.id || "");

  return getAdminUserIds().includes(userId) || memberHasAdminRole(message);
}

function parseUserId(value) {
  return String(value || "").replace(/[<@!>]/g, "").trim();
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function normalizeTier(value) {
  const key = normalize(value || "mother_flame").replace(/[\s-]+/g, "_");

  for (const [tier, config] of Object.entries(TIER_CONFIG)) {
    if (tier === key) return tier;
    if (config.aliases.includes(key)) return tier;
    if (config.aliases.includes(key.replace(/_/g, ""))) return tier;
  }

  return "mother_flame";
}

function parseDays(value) {
  const days = Number(value || DEFAULT_DAYS);

  if (!Number.isFinite(days) || days <= 0) return DEFAULT_DAYS;
  if (days > 365) return 365;

  return Math.floor(days);
}

function formatIndonesiaDate(timestamp) {
  return new Date(Number(timestamp || Date.now())).toLocaleString("en-US", {
    timeZone: INDONESIA_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatRemaining(ms) {
  const safeMs = Math.max(0, Number(ms || 0));
  const totalMinutes = Math.floor(safeMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getConfiguredRoleNames(config) {
  const names = [];

  for (const envName of config.roleEnvNames || []) {
    if (process.env[envName]) names.push(process.env[envName]);
  }

  names.push(config.fallbackRoleName);

  return [...new Set(names.filter(Boolean))];
}

async function resolveTierRole(message, tier) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.mother_flame;

  for (const envName of config.roleEnvIds || []) {
    const roleId = process.env[envName];
    if (!roleId) continue;

    const role =
      message.guild.roles.cache.get(String(roleId)) ||
      (await message.guild.roles.fetch(String(roleId)).catch(() => null));

    if (role) return role;
  }

  const roleNames = getConfiguredRoleNames(config).map(normalize);

  return (
    message.guild.roles.cache.find((role) => roleNames.includes(normalize(role.name))) ||
    null
  );
}

async function removeOtherPatreonTierRoles(member, activeTier) {
  for (const tier of Object.keys(TIER_CONFIG)) {
    if (tier === activeTier) continue;

    const config = TIER_CONFIG[tier];
    const roleIds = config.roleEnvIds
      .map((envName) => process.env[envName])
      .filter(Boolean)
      .map(String);

    const roleNames = getConfiguredRoleNames(config).map(normalize);

    const rolesToRemove = member.roles.cache.filter((role) => {
      if (roleIds.includes(String(role.id))) return true;
      return roleNames.includes(normalize(role.name));
    });

    for (const role of rolesToRemove.values()) {
      await member.roles
        .remove(role.id, `Replacing Patreon tier with ${TIER_CONFIG[activeTier].label}`)
        .catch(() => null);
    }
  }
}

module.exports = {
  name: "patreon30",
  aliases: ["mf30", "vivre30", "vc30"],

  async execute(message, args) {
    if (!isAdmin(message)) {
      return message.reply("Owner only command.");
    }

    if (!message.guild) {
      return message.reply("This command can only be used inside a server.");
    }

    const targetId = parseUserId(args[0]);

    if (!targetId) {
      return message.reply(
        [
          "Usage:",
          "`op patreon30 <@user/userId> mother`",
          "`op patreon30 <@user/userId> vivre`",
          "`op patreon30 <@user/userId> mother 5`",
          "`op patreon30 <@user/userId> vivre 5`",
          "",
          "Default tier: `mother`",
          "Default duration: `30 days`",
          "Custom days can be used for recovery.",
        ].join("\n")
      );
    }

    const raw = String(message.content || "").trim().split(/\s+/);
    const usedCommandRaw = String(raw[1] || "").toLowerCase();

    function getTierFromCommandOrArgs(commandName, tierArg) {
      const cmd = normalize(commandName);

      if (cmd === "vc30" || cmd === "vivre30") return "vivre_card";
      if (cmd === "mf30") return "mother_flame";

      return normalizeTier(tierArg || "mother_flame");
    }

    const tier = getTierFromCommandOrArgs(usedCommandRaw, args[1]);
    const days = parseDays(args[2]);
    const config = TIER_CONFIG[tier] || TIER_CONFIG.mother_flame;

    const role = await resolveTierRole(message, tier);

    if (!role) {
      return message.reply(
        `${config.label} role was not found. Set the role ID in Render/Railway or create a role named \`${config.fallbackRoleName}\`.`
      );
    }

    const botMember =
      message.guild.members.me ||
      (await message.guild.members.fetchMe().catch(() => null));

    if (!botMember?.permissions?.has("ManageRoles")) {
      return message.reply("Bot does not have **Manage Roles** permission.");
    }

    if (role.position >= botMember.roles.highest.position) {
      return message.reply(
        `Bot role must be placed **above** the ${config.label} role in Discord role settings.`
      );
    }

    const member = await message.guild.members.fetch(targetId).catch(() => null);

    if (!member) {
      return message.reply("Target user was not found in this server.");
    }

    await removeOtherPatreonTierRoles(member, tier);
    await member.roles.add(role.id, config.reason);

    const now = Date.now();
    const currentRoles = readPatreonRoles();
    const existing = currentRoles[String(member.id)] || null;
    const existingExpiresAt = Number(existing?.expiresAt || 0);

    const baseExpiresAt = existingExpiresAt > now ? existingExpiresAt : now;
    const grantedAt = now;
    const expiresAt = baseExpiresAt + days * 24 * 60 * 60 * 1000;
    const wasExtended = existingExpiresAt > now;

    setPatreonRole(member.id, {
      tier,
      roleId: role.id,
      guildId: message.guild.id,
      grantedBy: message.author.id,
      grantedAt,
      expiresAt,
    });

    const embed = new EmbedBuilder()
      .setColor(config.color)
      .setTitle(config.title)
      .setDescription(
        [
          `**User:** ${member.user.tag}`,
          `**Tier:** ${config.label}`,
          `**Role:** ${role.name}`,
          `**Added Duration:** ${days} days`,
          `**Mode:** ${wasExtended ? "Extended from existing active expiry" : "Started from now"}`,
          wasExtended ? `**Previous Expires At:** ${formatIndonesiaDate(existingExpiresAt)} WIB` : null,
          `**Granted At:** ${formatIndonesiaDate(grantedAt)} WIB`,
          `**Expires At:** ${formatIndonesiaDate(expiresAt)} WIB`,
          `**Remaining:** ${formatRemaining(expiresAt - now)}`,
          "",
          "This Patreon role was activated manually after ticket proof verification.",
        ]
          .filter(Boolean)
          .join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Patreon Admin",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};