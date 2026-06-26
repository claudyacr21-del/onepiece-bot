const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const {
  getPlayer,
  updatePlayerAtomic,
  flushPlayerNow,
} = require("../playerStore");
const {
  findSkinSetByQuery,
} = require("../utils/customSkins");

function isAdmin(message) {
  const adminIds = String(
    process.env.ADMIN_IDS ||
      process.env.OWNER_IDS ||
      process.env.BOT_OWNER_IDS ||
      process.env.BOT_OWNER_ID ||
      ""
  )
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter(Boolean);

  if (adminIds.includes(String(message.author.id))) return true;

  return Boolean(
    message.member?.permissions?.has(PermissionsBitField.Flags.Administrator)
  );
}

module.exports = {
  name: "removeskin",

  async execute(message, args) {
    if (!isAdmin(message)) {
      return message.reply({
        content: "Only admins can use this command.",
        allowedMentions: { repliedUser: false },
      });
    }

    const targetUser = message.mentions.users.first();
    const number = Number(args.find((arg) => /^\d+$/.test(String(arg || ""))));

    if (!targetUser || !Number.isInteger(number) || number <= 0) {
      return message.reply({
        content:
          "Usage: `op removeskin @user <number> <character/skin name>`\nExample: `op removeskin @user 1 sesshomaru`",
        allowedMentions: { repliedUser: false },
      });
    }

    const query = args
      .filter((arg) => {
        const raw = String(arg || "");
        if (raw.includes(targetUser.id)) return false;
        if (/^\d+$/.test(raw)) return false;
        return true;
      })
      .join(" ")
      .trim();

    if (!query) {
      return message.reply({
        content:
          "Usage: `op removeskin @user <number> <character/skin name>`\nExample: `op removeskin @user 1 sesshomaru`",
        allowedMentions: { repliedUser: false },
      });
    }

    const previewPlayer = getPlayer(targetUser.id, targetUser.username);
    const found = findSkinSetByQuery(previewPlayer, query);

    if (!found) {
      return message.reply({
        content: `No custom skins found for \`${query}\`.`,
        allowedMentions: { repliedUser: false },
      });
    }

    const index = number - 1;
    const variants = Array.isArray(found.skinSet.variants)
      ? found.skinSet.variants
      : [];

    if (index < 0 || index >= variants.length) {
      return message.reply({
        content: `Invalid skin number. This character has ${variants.length} skin variant(s).`,
        allowedMentions: { repliedUser: false },
      });
    }

    const removedSkin = variants[index];
    let remaining = 0;
    let removedSet = false;

    try {
      updatePlayerAtomic(
        targetUser.id,
        (fresh) => {
          const freshFound = findSkinSetByQuery(fresh, query);

          if (!freshFound) {
            throw new Error(`No custom skins found for \`${query}\`.`);
          }

          const customSkins =
            fresh.customSkins && typeof fresh.customSkins === "object"
              ? { ...fresh.customSkins }
              : {};

          const freshVariants = Array.isArray(freshFound.skinSet.variants)
            ? [...freshFound.skinSet.variants]
            : [];

          if (index < 0 || index >= freshVariants.length) {
            throw new Error("Invalid skin number.");
          }

          freshVariants.splice(index, 1);
          remaining = freshVariants.length;

          if (!freshVariants.length) {
            delete customSkins[freshFound.key];
            removedSet = true;
          } else {
            const oldActive = Number(freshFound.skinSet.activeIndex || 0);
            let nextActive = oldActive;

            if (oldActive === index) {
              nextActive = 0;
            } else if (oldActive > index) {
              nextActive = oldActive - 1;
            }

            nextActive = Math.max(
              0,
              Math.min(nextActive, freshVariants.length - 1)
            );

            customSkins[freshFound.key] = {
              ...freshFound.skinSet,
              activeIndex: nextActive,
              variants: freshVariants,
            };
          }

          return {
            ...fresh,
            customSkins,
          };
        },
        targetUser.username
      );

      await flushPlayerNow(
        targetUser.id,
        Number(process.env.PLAYER_DB_COMMAND_FLUSH_MS || 8000)
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to remove custom skin.",
        allowedMentions: { repliedUser: false },
      });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Custom Skin Removed")
          .setDescription(
            [
              `**User:** <@${targetUser.id}>`,
              `**Removed Skin:** ${removedSkin.name}`,
              `**Skin Title:** ${removedSkin.title || "Exclusive Skin"}`,
              `**Remaining Slots:** ${remaining}/20`,
              removedSet ? "" : `View: \`op showskins ${query}\``,
            ]
              .filter(Boolean)
              .join("\n")
          )
          .setImage(removedSkin.image || null)
          .setFooter({ text: "One Piece Bot • Custom Skins" }),
      ],
      allowedMentions: {
        repliedUser: false,
        parse: [],
      },
    });
  },
};