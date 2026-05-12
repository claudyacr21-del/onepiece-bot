const { EmbedBuilder } = require("discord.js");
const { setPatreonRole } = require("../utils/patreonRoleStore");

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
    reason: "Mother Flame Patreon 30 days manual claim",
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
    reason: "Vivre Card Patreon 30 days manual claim",
  },
};

function getAdminIds() {
  return String(
    process.env.ADMIN_USER_IDS ||
      process.env.DISCORD_OWNER_ID ||
      process.env.BOT_OWNER_ID ||
      ""
  )
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function isAdmin(userId) {
  return getAdminIds().includes(String(userId));
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
      await member.roles.remove(role.id, `Replacing Patreon tier with ${TIER_CONFIG[activeTier].label}`).catch(() => null);
    }
  }
}

module.exports = {
  name: "patreon30",
  aliases: ["mf30", "vivre30", "vc30"],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
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
          "",
          "Default tier: `mother`",
        ].join("\n")
      );
    }

    const tier = normalizeTier(args[1] || "mother_flame");
    const config = TIER_CONFIG[tier] || TIER_CONFIG.mother_flame;

    const role = await resolveTierRole(message, tier);
    if (!role) {
      return message.reply(
        `${config.label} role was not found. Set the role ID in Railway or create a role named \`${config.fallbackRoleName}\`.`
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

    const grantedAt = Date.now();
    const expiresAt = grantedAt + DEFAULT_DAYS * 24 * 60 * 60 * 1000;

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
          `**Duration:** ${DEFAULT_DAYS} days`,
          `**Granted At:** ${formatIndonesiaDate(grantedAt)} WIB`,
          `**Expires At:** ${formatIndonesiaDate(expiresAt)} WIB`,
          "",
          "This Patreon role was activated manually after ticket proof verification.",
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Patreon Admin",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};