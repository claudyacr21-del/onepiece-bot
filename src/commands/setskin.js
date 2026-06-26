const { EmbedBuilder } = require("discord.js");
const {
  getPlayer,
  updatePlayerAtomic,
  flushPlayerNow,
} = require("../playerStore");
const { findSkinSetByQuery } = require("../utils/customSkins");

module.exports = {
  name: "setskin",

  async execute(message, args) {
    const number = Number(args[0]);
    const query = args.slice(1).join(" ").trim();

    if (!Number.isInteger(number) || number <= 0 || !query) {
      return message.reply({
        content: "Usage: `op setskin <number> <character/skin name>`",
        allowedMentions: { repliedUser: false },
      });
    }

    const previewPlayer = getPlayer(message.author.id, message.author.username);
    const found = findSkinSetByQuery(previewPlayer, query);

    if (!found) {
      return message.reply({
        content: `No custom skins found for \`${query}\`.`,
        allowedMentions: { repliedUser: false },
      });
    }

    const variants = Array.isArray(found.skinSet.variants)
      ? found.skinSet.variants
      : [];

    const index = number - 1;

    if (index < 0 || index >= variants.length) {
      return message.reply({
        content: `Invalid skin number. This character has ${variants.length} skin variant(s).`,
        allowedMentions: { repliedUser: false },
      });
    }

    const pickedSkin = variants[index];

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const freshFound = findSkinSetByQuery(fresh, query);

          if (!freshFound) {
            throw new Error(`No custom skins found for \`${query}\`.`);
          }

          const freshVariants = Array.isArray(freshFound.skinSet.variants)
            ? freshFound.skinSet.variants
            : [];

          if (index < 0 || index >= freshVariants.length) {
            throw new Error(`Invalid skin number.`);
          }

          const customSkins = {
            ...(fresh.customSkins || {}),
            [freshFound.key]: {
              ...freshFound.skinSet,
              activeIndex: index,
            },
          };

          return {
            ...fresh,
            customSkins,
          };
        },
        message.author.username
      );

      await flushPlayerNow(
        message.author.id,
        Number(process.env.PLAYER_DB_COMMAND_FLUSH_MS || 8000)
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to set custom skin.",
        allowedMentions: { repliedUser: false },
      });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("Custom Skin Selected")
          .setDescription(
            [
              `**Skin:** ${pickedSkin.name}`,
              `**Title:** ${pickedSkin.title || "Exclusive Skin"}`,
              `**Skinned Character:** ${found.skinSet.originalName || found.skinSet.cardCode}`,
              `**Active Variant:** ${number}/${variants.length}`,
            ].join("\n")
          )
          .setImage(pickedSkin.image || null)
          .setFooter({ text: "One Piece Bot • Custom Skins" }),
      ],
      allowedMentions: { repliedUser: false },
    });
  },
};