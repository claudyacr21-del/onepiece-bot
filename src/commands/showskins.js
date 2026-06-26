const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const {
  findSkinSetByQuery,
  getSkinVariantLabel,
} = require("../utils/customSkins");

function buildSkinEmbed(player, username, skinSet, index) {
  const variants = Array.isArray(skinSet.variants) ? skinSet.variants : [];
  const safeIndex = Math.max(0, Math.min(Number(index || 0), variants.length - 1));
  const skin = variants[safeIndex];

  const activeIndex = Number(skinSet.activeIndex || 0);
  const isActive = safeIndex === activeIndex;

  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`${username}'s Custom Skin: ${skin?.name || "Unknown"}`)
    .setDescription(
      [
        `**Skinned Character:** ${skinSet.originalName || skinSet.cardCode || "Unknown"}`,
        `**Total Skin Variants:** ${variants.length}`,
        `**Viewing:** ${safeIndex + 1}/${variants.length}`,
        `**Status:** ${isActive ? "Active Skin" : "Inactive Skin"}`,
        "",
        `\`op setskin ${safeIndex + 1} ${skin?.name || skinSet.cardCode}\` To set this skin`,
      ].join("\n")
    )
    .setImage(skin?.image || null)
    .setFooter({ text: "One Piece Bot • Custom Skins" });
}

function buildRows(disabled = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("skin_prev")
        .setLabel("Previous")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId("skin_next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled)
    ),
  ];
}

module.exports = {
  name: "showskins",

  async execute(message, args) {
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply({
        content: "Usage: `op showskins <character/skin name>`",
        allowedMentions: { repliedUser: false },
      });
    }

    const player = getPlayer(message.author.id, message.author.username);
    const found = findSkinSetByQuery(player, query);

    if (!found) {
      return message.reply({
        content: `No custom skins found for \`${query}\`.`,
        allowedMentions: { repliedUser: false },
      });
    }

    const variants = Array.isArray(found.skinSet.variants)
      ? found.skinSet.variants
      : [];

    if (!variants.length) {
      return message.reply({
        content: `No custom skins found for \`${query}\`.`,
        allowedMentions: { repliedUser: false },
      });
    }

    let page = Math.max(
      0,
      Math.min(Number(found.skinSet.activeIndex || 0), variants.length - 1)
    );

    const sent = await message.reply({
      embeds: [buildSkinEmbed(player, message.author.username, found.skinSet, page)],
      components: variants.length > 1 ? buildRows(false) : [],
      allowedMentions: { repliedUser: false },
    });

    if (variants.length <= 1) return null;

    const collector = sent.createMessageComponentCollector({
      time: 120_000,
      filter: (interaction) => interaction.user.id === message.author.id,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "skin_prev") {
        page = page <= 0 ? variants.length - 1 : page - 1;
      }

      if (interaction.customId === "skin_next") {
        page = page >= variants.length - 1 ? 0 : page + 1;
      }

      await interaction.update({
        embeds: [buildSkinEmbed(player, message.author.username, found.skinSet, page)],
        components: buildRows(false),
      });
    });

    collector.on("end", async () => {
      await sent.edit({
        components: buildRows(true),
      }).catch(() => null);
    });

    return null;
  },
};