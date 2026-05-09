const { EmbedBuilder } = require("discord.js");
const {
  readPatreonRoles,
  removePatreonRole,
} = require("../utils/patreonRoleStore");

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

async function resolveMotherFlameRole(message, storedRoleId = null) {
  const envRoleId =
    storedRoleId ||
    process.env.MOTHER_FLAME_ROLE_ID ||
    process.env.PATREON_MOTHER_FLAME_ROLE_ID ||
    process.env.PATREON_ROLE_ID ||
    null;

  if (envRoleId) {
    const role =
      message.guild.roles.cache.get(String(envRoleId)) ||
      (await message.guild.roles.fetch(String(envRoleId)).catch(() => null));

    if (role) return role;
  }

  const roleName =
    process.env.PATREON_PREMIUM_ROLE_NAME ||
    process.env.PREMIUM_ROLE_NAME ||
    "Mother Flame";

  return (
    message.guild.roles.cache.find(
      (role) => normalize(role.name) === normalize(roleName)
    ) || null
  );
}

module.exports = {
  name: "mfreset",
  aliases: ["mfr"],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    if (!message.guild) {
      return message.reply("This command can only be used inside a server.");
    }

    const targetId = parseUserId(args[0]);

    if (!targetId) {
      return message.reply("Usage: `op mfreset <@user/userId>`");
    }

    const data = readPatreonRoles();
    const entry = data[String(targetId)] || null;

    const role = await resolveMotherFlameRole(message, entry?.roleId || null);

    if (!role) {
      removePatreonRole(targetId);

      return message.reply(
        "Mother Flame role was not found, but the saved Patreon timer has been reset."
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
        "Bot role must be placed **above** the Mother Flame role in Discord role settings."
      );
    }

    const member = await message.guild.members.fetch(targetId).catch(() => null);

    let removedRole = false;

    if (member && member.roles.cache.has(role.id)) {
      await member.roles.remove(role.id, "Mother Flame Patreon reset by admin");
      removedRole = true;
    }

    removePatreonRole(targetId);

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("Mother Flame Reset")
      .setDescription(
        [
          `**User:** ${member ? member.user.tag : targetId}`,
          `**Role Removed:** ${removedRole ? "Yes" : "No / user did not have role"}`,
          `**Timer Reset:** Yes`,
          "",
          "Mother Flame access has been removed and the saved Patreon expiry data has been cleared.",
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Patreon Admin" });

    return message.reply({ embeds: [embed] });
  },
};