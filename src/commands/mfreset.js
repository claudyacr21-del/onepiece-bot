const { EmbedBuilder } = require("discord.js");
const {
  readPatreonRoles,
  removePatreonRole,
} = require("../utils/patreonRoleStore");

const CONFIG = {
  tier: "mother_flame",
  label: "Mother Flame",
  emoji: "🔥",
  color: 0xe74c3c,
  roleEnvIds: [
    "MOTHER_FLAME_ROLE_ID",
    "PATREON_MOTHER_FLAME_ROLE_ID",
    "PATREON_ROLE_ID",
    "PREMIUM_ROLE_ID",
  ],
  roleEnvNames: ["PATREON_PREMIUM_ROLE_NAME", "PREMIUM_ROLE_NAME"],
  fallbackRoleNames: ["Mother Flame", "MotherFlame"],
};

function getAdminIds() {
  return String(
    process.env.ADMIN_USER_IDS ||
      process.env.ADMIN_ROLE_IDS ||
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

function getUsageText() {
  return "Usage:\n`op mfr <@user/userId>`";
}

function getConfiguredRoleNames() {
  const names = [];

  for (const envName of CONFIG.roleEnvNames || []) {
    if (process.env[envName]) names.push(process.env[envName]);
  }

  for (const fallback of CONFIG.fallbackRoleNames || []) {
    names.push(fallback);
  }

  return [...new Set(names.filter(Boolean))];
}

async function resolveRoles(message, storedRoleId = null) {
  const found = new Map();

  if (storedRoleId) {
    const role =
      message.guild.roles.cache.get(String(storedRoleId)) ||
      (await message.guild.roles.fetch(String(storedRoleId)).catch(() => null));

    if (role) found.set(role.id, role);
  }

  for (const envName of CONFIG.roleEnvIds || []) {
    const roleId = process.env[envName];
    if (!roleId) continue;

    const role =
      message.guild.roles.cache.get(String(roleId)) ||
      (await message.guild.roles.fetch(String(roleId)).catch(() => null));

    if (role) found.set(role.id, role);
  }

  const roleNames = getConfiguredRoleNames().map(normalize);

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

function shouldClearStoredEntry(storedEntry) {
  if (!storedEntry) return false;

  const storedTier = String(storedEntry.tier || "").toLowerCase().trim();

  return storedTier === CONFIG.tier || !storedTier;
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
  name: "mfr",
  aliases: ["mfreset"],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    if (!message.guild) {
      return message.reply("This command can only be used inside a server.");
    }

    const targetId = parseUserId(args[0]);

    if (!targetId) {
      return message.reply(getUsageText());
    }

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
    const storedRoleId = shouldClearStoredEntry(storedEntry)
      ? storedEntry?.roleId
      : null;

    const roles = await resolveRoles(message, storedRoleId);

    const removedLines = [];
    const missingLines = [];
    const failedLines = [];
    const manageableRoles = [];

    for (const role of roles) {
      if (role.position >= botMember.roles.highest.position) {
        failedLines.push(
          `${CONFIG.emoji} ${CONFIG.label}: bot role is below/equal to **${role.name}**`
        );
        continue;
      }

      manageableRoles.push(role);
    }

    const result = await removeRolesFromMember(
      member,
      manageableRoles,
      `${CONFIG.label} reset by ${message.author.tag}`
    );

    if (result.removed.length) {
      removedLines.push(
        `${CONFIG.emoji} ${CONFIG.label}: removed ${result.removed
          .map((name) => `**${name}**`)
          .join(", ")}`
      );
    } else {
      missingLines.push(`${CONFIG.emoji} ${CONFIG.label}: no matching role on user`);
    }

    if (shouldClearStoredEntry(storedEntry)) {
      removePatreonRole(member.id);
    }

    const embed = new EmbedBuilder()
      .setColor(CONFIG.color)
      .setTitle(`${CONFIG.emoji} ${CONFIG.label} Reset`)
      .setDescription(
        [
          `**User:** ${member.user.tag}`,
          `**Reset Type:** ${CONFIG.label}`,
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
          shouldClearStoredEntry(storedEntry)
            ? "Mother Flame store data has been cleared for this user."
            : "No Mother Flame store data was cleared.",
        ]
          .filter(Boolean)
          .join("\n")
      )
      .setFooter({ text: "One Piece Bot • Mother Flame Reset" });

    return message.reply({
      embeds: [embed],
    });
  },
};