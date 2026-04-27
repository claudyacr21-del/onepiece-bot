const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { getPlayer } = require("../playerStore");

const IMU_M1_ROLE_ID = process.env.IMU_M1_ROLE_ID || "";
const IMU_M3_ROLE_ID = process.env.IMU_M3_ROLE_ID || "";

const IMU_M1_ROLE_NAME = process.env.IMU_M1_ROLE_NAME || "IMU M1";
const IMU_M3_ROLE_NAME = process.env.IMU_M3_ROLE_NAME || "IMU M3";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function entryText(entry) {
  if (!entry || typeof entry !== "object") return "";

  return normalize(
    [
      entry.name,
      entry.displayName,
      entry.code,
      entry.id,
      entry.key,
      entry.title,
      entry.variant,
      entry.rarity,
      entry.type,
      entry.description,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function collectPlayerEntries(player) {
  const buckets = [
    "items",
    "materials",
    "tickets",
    "boxes",
    "weapons",
    "devilFruits",
    "fragments",
    "cards",
  ];

  const entries = [];

  for (const bucket of buckets) {
    const value = player?.[bucket];
    if (Array.isArray(value)) {
      entries.push(...value);
    }
  }

  return entries;
}

function hasImuTier(player, tier) {
  const targetTier = normalize(tier);

  return collectPlayerEntries(player).some((entry) => {
    const text = entryText(entry);

    if (!text.includes("imu")) return false;

    return (
      text.includes(targetTier) ||
      text.includes(`imu ${targetTier}`) ||
      text.includes(`imu${targetTier}`)
    );
  });
}

function findRole(guild, roleId, roleName) {
  if (!guild?.roles?.cache) return null;

  if (roleId) {
    const byId = guild.roles.cache.get(roleId);
    if (byId) return byId;
  }

  return guild.roles.cache.find(
    (role) => normalize(role.name) === normalize(roleName)
  );
}

async function addRoleIfNeeded(member, role) {
  if (!role) return false;
  if (member.roles.cache.has(role.id)) return false;

  await member.roles.add(role, "IMU auto role sync");
  return true;
}

module.exports = {
  name: "imu",
  aliases: ["imurole", "syncimu"],

  async execute(message) {
    if (!message.guild || !message.member) {
      return message.reply("This command can only be used on the server.");
    }

    const botMember = message.guild.members.me;
    if (
      !botMember ||
      !botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)
    ) {
      return message.reply(
        "The bot doesn't have the 'Manage Roles' permission yet, so it can't give it the IMU role yet.."
      );
    }

    const player = getPlayer(message.author.id, message.author.username);

    const hasM1 = hasImuTier(player, "m1");
    const hasM3 = hasImuTier(player, "m3");

    if (!hasM1 && !hasM3) {
      return message.reply(
        "You don't have one yet `IMU M1` or `IMU M3`"
      );
    }

    const m1Role = findRole(message.guild, IMU_M1_ROLE_ID, IMU_M1_ROLE_NAME);
    const m3Role = findRole(message.guild, IMU_M3_ROLE_ID, IMU_M3_ROLE_NAME);

    if (!m1Role) {
      return message.reply(
        "IMU M1 role not found yet. Set `IMU_M1_ROLE_ID` on Railway, or make sure the role name `IMU M1`."
      );
    }

    if (hasM3 && !m3Role) {
      return message.reply(
        "IMU M3 role not found yet. Set `IMU_M3_ROLE_ID` on Railway, or make sure the role name `IMU M3`."
      );
    }

    const granted = [];

    if (hasM1 || hasM3) {
      const addedM1 = await addRoleIfNeeded(message.member, m1Role);
      if (addedM1) granted.push(m1Role.name);
    }

    if (hasM3) {
      const addedM3 = await addRoleIfNeeded(message.member, m3Role);
      if (addedM3) granted.push(m3Role.name);
    }

    const ownedText = hasM3 ? "IMU M3" : "IMU M1";
    const roleText = hasM3
      ? `${m1Role.name} + ${m3Role.name}`
      : m1Role.name;

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("✅ IMU Role Synced")
      .setDescription(
        [
          `**Owned:** \`${ownedText}\``,
          `**Eligible Role:** \`${roleText}\``,
          "",
          granted.length
            ? `Role added: ${granted.map((name) => `\`${name}\``).join(", ")}`
            : "Your role is already correct, no new roles are added..",
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot" });

    return message.reply({ embeds: [embed] });
  },
};