const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { getPlayer } = require("../playerStore");

const IMU_M3_ROLE_ID = process.env.IMU_M3_ROLE_ID || "";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCode(value) {
  return String(value || "").toLowerCase().trim();
}

function getCardText(card) {
  return normalize(
    [
      card?.name,
      card?.displayName,
      card?.code,
      card?.id,
      card?.key,
      card?.title,
      card?.variant,
      card?.rarity,
      card?.currentTier,
      card?.evolutionKey,
      card?.type,
      card?.description,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function isImuCard(card) {
  const text = getCardText(card);
  const code = normalizeCode(card?.code);

  return (
    text.includes("imu") ||
    text.includes("saint nerona") ||
    code === "imu" ||
    code.includes("imu")
  );
}

function getImuStage(card) {
  const evolutionStage = Number(card?.evolutionStage || 0);

  if (Number.isFinite(evolutionStage) && evolutionStage > 0) {
    return evolutionStage;
  }

  const evolutionKey = normalizeCode(card?.evolutionKey);

  if (evolutionKey === "m3") return 3;
  if (evolutionKey === "m2") return 2;
  if (evolutionKey === "m1") return 1;

  const text = getCardText(card);

  if (text.includes("m3") || text.includes("imu m3")) return 3;
  if (text.includes("m2") || text.includes("imu m2")) return 2;
  if (text.includes("m1") || text.includes("imu m1")) return 1;

  return 1;
}

function getOwnedImuStage(player) {
  const cards = Array.isArray(player?.cards) ? player.cards : [];
  let highestStage = 0;

  for (const card of cards) {
    if (!isImuCard(card)) continue;

    const stage = getImuStage(card);
    if (stage > highestStage) highestStage = stage;
  }

  return highestStage;
}

function findRoleById(guild, roleId) {
  if (!guild?.roles?.cache || !roleId) return null;
  return guild.roles.cache.get(String(roleId)) || null;
}

async function addRoleIfNeeded(member, role) {
  if (!role) return false;
  if (member.roles.cache.has(role.id)) return false;

  await member.roles.add(role, "IMU M3 auto role sync");
  return true;
}

module.exports = {
  name: "imu",
  aliases: ["imurole", "syncimu"],

  async execute(message) {
    if (!message.guild || !message.member) {
      return message.reply("This command can only be used in a server.");
    }

    if (!IMU_M3_ROLE_ID) {
      return message.reply(
        "IMU M3 role is not configured. Set `IMU_M3_ROLE_ID` in Render environment variables."
      );
    }

    const botMember = message.guild.members.me;

    if (
      !botMember ||
      !botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)
    ) {
      return message.reply(
        "The bot does not have the `Manage Roles` permission yet."
      );
    }

    const player = getPlayer(message.author.id, message.author.username);
    const ownedImuStage = getOwnedImuStage(player);
    const hasM3 = ownedImuStage >= 3;

    if (!hasM3) {
      return message.reply("You do not own `IMU M3` yet.");
    }

    const m3Role = findRoleById(message.guild, IMU_M3_ROLE_ID);

    if (!m3Role) {
      return message.reply(
        "The IMU M3 role was not found. Check `IMU_M3_ROLE_ID` in Render environment variables."
      );
    }

    if (!m3Role.editable) {
      return message.reply(
        "The bot cannot manage the IMU M3 role. Move the bot role above the IMU M3 role."
      );
    }

    const granted = [];
    const addedM3 = await addRoleIfNeeded(message.member, m3Role);

    if (addedM3) {
      granted.push(m3Role.name);
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("✅ IMU Role Synced")
      .setDescription(
        [
          "**Owned:** `IMU M3`",
          `**Eligible Role:** \`${m3Role.name}\``,
          "",
          granted.length
            ? `Role added: ${granted.map((name) => `\`${name}\``).join(", ")}`
            : "Your IMU M3 role is already synced.",
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot" });

    return message.reply({ embeds: [embed] });
  },
};