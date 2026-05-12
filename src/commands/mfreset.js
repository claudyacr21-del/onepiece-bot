const { EmbedBuilder } = require("discord.js");
const {
  readPatreonRoles,
  removePatreonRole,
} = require("../utils/patreonRoleStore");

const TIER_CONFIG = {
  mother_flame: {
    label: "Mother Flame",
    emoji: "🔥",
    color: 0x8e44ad,
    roleEnvIds: [
      "MOTHER_FLAME_ROLE_ID",
      "PATREON_MOTHER_FLAME_ROLE_ID",
      "PATREON_ROLE_ID",
      "PREMIUM_ROLE_ID",
    ],
    roleEnvNames: ["PATREON_PREMIUM_ROLE_NAME", "PREMIUM_ROLE_NAME"],
    fallbackRoleNames: ["Mother Flame", "MotherFlame"],
    aliases: ["mother", "mf", "motherflame", "mother_flame", "premium"],
  },

  vivre_card: {
    label: "Vivre Card",
    emoji: "🧭",
    color: 0x3498db,
    roleEnvIds: [
      "VIVRE_CARD_ROLE_ID",
      "PATREON_VIVRE_CARD_ROLE_ID",
      "LITE_PREMIUM_ROLE_ID",
    ],
    roleEnvNames: ["PATREON_LITE_ROLE_NAME", "LITE_PREMIUM_ROLE_NAME"],
    fallbackRoleNames: ["Vivre Card", "VivreCard", "Vivre"],
    aliases: ["vivre", "vc", "vcr", "vivrecard", "vivre_card", "lite"],
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

function normalizeTier(value, commandName = "") {
  const raw = normalize(value).replace(/[\s-]+/g, "_");
  const cmd = normalize(commandName);

  if (cmd === "vcr" || cmd === "vcreset") return "vivre_card";
  if (!raw) return "mother_flame";

  if (raw === "all" || raw === "both") return "all";

  for (const [tier, config] of Object.entries(TIER_CONFIG)) {
    if (tier === raw) return tier;

    const compactRaw = raw.replace(/_/g, "");
    if (config.aliases.includes(raw) || config.aliases.includes(compactRaw)) {
      return tier;
    }
  }

  return "mother_flame";
}

function getConfiguredRoleNames(config) {
  const names = [];

  for (const envName of config.roleEnvNames || []) {
    if (process.env[envName]) names.push(process.env[envName]);
  }

  for (const fallback of config.fallbackRoleNames || []) {
    names.push(fallback);
  }

  return [...new Set(names.filter(Boolean))];
}

async function resolveTierRoles(message, tier, storedRoleId = null) {
  const config = TIER_CONFIG[tier];
  const found = new Map();

  if (storedRoleId) {
    const role =
      message.guild.roles.cache.get(String(storedRoleId)) ||
      (await message.guild.roles.fetch(String(storedRoleId)).catch(() => null));

    if (role) found.set(role.id, role);
  }

  for (const envName of config.roleEnvIds || []) {
    const roleId = process.env[envName];
    if (!roleId) continue;

    const role =
      message.guild.roles.cache.get(String(roleId)) ||
      (await message.guild.roles.fetch(String(roleId)).catch(() => null));

    if (role) found.set(role.id, role);
  }

  const roleNames = getConfiguredRoleNames(config).map(normalize);

  for (const role of message.guild.roles.cache.values()) {
    if (roleNames.includes(normalize(role.name))) {
      found.set(role.id, role);
    }
  }

  return [...found.values()];
}

async function removeRolesFromMember(member, roles, reason) {
  const removed = [];
  const missing = [];

  for (const role of roles) {
    if (!role) continue;

    if (!member.roles.cache.has(role.id)) {
      missing.push(role.name);
      continue;
    }

    await member.roles.remove(role.id, reason);
    removed.push(role.name);
  }

  return { removed, missing };
}

function formatIndonesiaDate(timestamp) {
  return new Date(Number(timestamp || Date.now())).toLocaleString("en-US", {
    timeZone: process.env.PATREON_TIMEZONE || "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

module.exports = {
  name: "mfreset",
  aliases: ["mfr", "vcr", "vcreset"],

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
          "`op mfreset <@user/userId>`",
          "`op mfreset <@user/userId> mother`",
          "`op mfreset <@user/userId> vivre`",
          "`op mfreset <@user/userId> all`",
          "`op vcr <@user/userId>`",
        ].join("\n")
      );
    }

    const commandName = String(message.content || "")
      .trim()
      .split(/\s+/)[1]
      ?.replace(/^op\s+/i, "");

    const requestedTier = normalizeTier(args[1], commandName);

    const member = await message.guild.members.fetch(targetId).catch(() => null);
    if (!member) {
      return message.reply("Target user was not found in this server.");
    }

    const botMember =
      message.guild.members.me ||
      (await message.guild.members.fetchMe().catch(() => null));

    if (!botMember?.permissions?.has("ManageRoles")) {
      return message.reply("Bot does not have **Manage Roles** permission.");
    }

    const store = readPatreonRoles();
    const storedEntry = store[String(member.id)] || null;

    const tiersToReset =
      requestedTier === "all"
        ? ["mother_flame", "vivre_card"]
        : [requestedTier];

    const removedLines = [];
    const missingLines = [];
    const failedLines = [];

    for (const tier of tiersToReset) {
      const config = TIER_CONFIG[tier];
      const storedRoleId =
        storedEntry &&
        (storedEntry.tier === tier ||
          requestedTier === "all" ||
          !storedEntry.tier)
          ? storedEntry.roleId
          : null;

      const roles = await resolveTierRoles(message, tier, storedRoleId);

      const manageableRoles = [];
      for (const role of roles) {
        if (role.position >= botMember.roles.highest.position) {
          failedLines.push(
            `${config.emoji} ${config.label}: bot role is below/equal to **${role.name}**`
          );
          continue;
        }

        manageableRoles.push(role);
      }

      const result = await removeRolesFromMember(
        member,
        manageableRoles,
        `${config.label} Patreon reset by ${message.author.tag}`
      );

      if (result.removed.length) {
        removedLines.push(
          `${config.emoji} ${config.label}: removed ${result.removed
            .map((name) => `**${name}**`)
            .join(", ")}`
        );
      } else {
        missingLines.push(`${config.emoji} ${config.label}: no matching role on user`);
      }
    }

    if (
      requestedTier === "all" ||
      !storedEntry ||
      tiersToReset.includes(storedEntry.tier || requestedTier)
    ) {
      removePatreonRole(member.id);
    }

    const embed = new EmbedBuilder()
      .setColor(requestedTier === "vivre_card" ? 0x3498db : 0xe74c3c)
      .setTitle("Patreon Role Reset")
      .setDescription(
        [
          `**User:** ${member.user.tag}`,
          `**Reset Type:** ${
            requestedTier === "all"
              ? "All Premium Tiers"
              : TIER_CONFIG[requestedTier]?.label || "Mother Flame"
          }`,
          `**Reset At:** ${formatIndonesiaDate(Date.now())} WIB`,
          "",
          removedLines.length ? "**Removed Roles**" : null,
          ...removedLines,
          missingLines.length ? "" : null,
          missingLines.length ? "**Not Found / Already Removed**" : null,
          ...missingLines,
          failedLines.length ? "" : null,
          failedLines.length ? "**Failed**" : null,
          ...failedLines,
          "",
          "Patreon role store data has been cleared for this user when applicable.",
        ]
          .filter(Boolean)
          .join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Patreon Reset",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};