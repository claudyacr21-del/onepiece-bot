const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");

const ESSENCE_CODE = "fruit_essence";
const ESSENCE_NAME = "Fruit Essence";

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

function parseAmount(value) {
  const amount = Math.floor(Number(value || 0));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function getEssenceIndex(materials) {
  return (Array.isArray(materials) ? materials : []).findIndex(
    (item) => String(item.code || "").toLowerCase() === ESSENCE_CODE
  );
}

function getEssenceAmount(player) {
  const materials = Array.isArray(player.materials) ? player.materials : [];
  const index = getEssenceIndex(materials);
  return index >= 0 ? Number(materials[index].amount || 0) : 0;
}

function setEssenceAmount(player, amount) {
  const materials = Array.isArray(player.materials) ? [...player.materials] : [];
  const index = getEssenceIndex(materials);
  const safeAmount = Math.max(0, Math.floor(Number(amount || 0)));

  if (safeAmount <= 0) {
    if (index >= 0) materials.splice(index, 1);
    return materials;
  }

  const essenceItem = {
    code: ESSENCE_CODE,
    name: ESSENCE_NAME,
    type: "material",
    rarity: "Rare",
    amount: safeAmount,
  };

  if (index >= 0) {
    materials[index] = {
      ...materials[index],
      ...essenceItem,
      amount: safeAmount,
    };
  } else {
    materials.push(essenceItem);
  }

  return materials;
}

function buildUsage() {
  return [
    "**Examples**",
    "`op fe check @user`",
    "`op fe add 123456789012345678 100`",
    "`op fe remove @user 25`",
    "`op fe set @user 500`",
  ].join("\n");
}

module.exports = {
  name: "essence",
  aliases: ["fe"],

  async execute(message, args = []) {
    if (!isAdmin(message.author.id)) {
      return message.reply({
        content: "Owner only command.",
        allowedMentions: { repliedUser: false },
      });
    }

    const action = String(args[0] || "").toLowerCase().trim();

    if (!["check", "add", "remove", "set"].includes(action)) {
      return message.reply({
        content: buildUsage(),
        allowedMentions: { repliedUser: false },
      });
    }

    const targetId =
      message.mentions.users.first()?.id ||
      parseUserId(args[1]);

    if (!targetId) {
      return message.reply({
        content: buildUsage(),
        allowedMentions: { repliedUser: false },
      });
    }

    const targetUser =
      message.mentions.users.first() ||
      (await message.client.users.fetch(targetId).catch(() => null));

    if (!targetUser) {
      return message.reply({
        content: "Target user was not found. Use a valid mention or user ID.",
        allowedMentions: { repliedUser: false },
      });
    }

    const player = getPlayer(targetUser.id, targetUser.username);
    const currentEssence = getEssenceAmount(player);

    if (action === "check") {
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle("🟢 Fruit Essence Admin")
        .setDescription(
          [
            `**User:** ${targetUser.tag || targetUser.username}`,
            `**User ID:** ${targetUser.id}`,
            `**Fruit Essence:** ${currentEssence.toLocaleString("en-US")}`,
          ].join("\n")
        )
        .setFooter({ text: "One Piece Bot • Essence Admin" });

      return message.reply({
        embeds: [embed],
        allowedMentions: { repliedUser: false },
      });
    }

    const amount = parseAmount(args[2]);

    if (!amount) {
      return message.reply({
        content: "Please enter a valid amount above 0.",
        allowedMentions: { repliedUser: false },
      });
    }

    let nextEssence = currentEssence;

    if (action === "add") {
      nextEssence = currentEssence + amount;
    }

    if (action === "remove") {
      nextEssence = Math.max(0, currentEssence - amount);
    }

    if (action === "set") {
      nextEssence = amount;
    }

    const materials = setEssenceAmount(player, nextEssence);

    updatePlayer(targetUser.id, {
      materials,
    });

    const actionLabel = {
      add: "Added",
      remove: "Removed",
      set: "Set",
    }[action];

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("🟢 Fruit Essence Updated")
      .setDescription(
        [
          `**User:** ${targetUser.tag || targetUser.username}`,
          `**User ID:** ${targetUser.id}`,
          `**Action:** ${actionLabel}`,
          `**Amount:** ${amount.toLocaleString("en-US")}`,
          `**Before:** ${currentEssence.toLocaleString("en-US")}`,
          `**After:** ${nextEssence.toLocaleString("en-US")}`,
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Essence Admin" });

    return message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  },
};