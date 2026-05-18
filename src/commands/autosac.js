const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const { getAutoSacSettings } = require("../utils/autoSac");

const RARITIES = ["C", "B", "A", "S"];

function buildEmbed(message, player) {
  const settings = getAutoSacSettings(player);

  const rarityLines = RARITIES.map((rarity) => {
    const enabled = settings.rarities[rarity];
    return `${enabled ? "🟢" : "🔴"} **${rarity}**`;
  }).join(" ");

  const cardText = settings.cards.length
    ? settings.cards.map((card) => card.name || card.code || "Unknown Card").join(", ")
    : "Belum ada card khusus di autosac.";

  const safeText = settings.safeCards.length
    ? settings.safeCards.map((card) => card.name || card.code || "Unknown Card").join(", ")
    : "Belum ada card yang disafelisted.";

  return new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle("Fragment Auto-Sacrifice Settings")
    .setDescription(
      [
        "Set rarity fragment/card yang ingin otomatis di-sacrifice jadi berries saat pull / pa.",
        "Card di safelist tidak akan otomatis di-sacrifice walaupun rarity auto-sac aktif.",
        "",
        "**Rarity Auto-Sac**",
        rarityLines,
        "",
        "**Cards To Auto-Sac**",
        cardText,
        "",
        "**Safelisted Cards**",
        safeText,
        "",
        "**Commands**",
        "`op sac <card name> <amount/all>`",
        "`op sacadd <card name>`",
        "`op sacsafe <card name>`",
        "`op msac (luffy_5, zoro_2, nami_6)`",
      ].join("\n")
    )
    .setThumbnail(message.author.displayAvatarURL({ extension: "png", size: 512 }))
    .setFooter({ text: "One Piece Bot • Auto Sacrifice" });
}

function buildRows(settings) {
  return [
    new ActionRowBuilder().addComponents(
      RARITIES.map((rarity) => {
        const enabled = Boolean(settings.rarities?.[rarity]);

        return new ButtonBuilder()
          .setCustomId(`autosac_rarity_${rarity}`)
          .setLabel(rarity)
          .setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Danger);
      })
    ),
  ];
}

module.exports = {
  name: "autosac",
  aliases: ["asac", "autosacrifice"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const settings = getAutoSacSettings(player);

    const sent = await message.reply({
      embeds: [buildEmbed(message, player)],
      components: buildRows(settings),
      allowedMentions: {
        repliedUser: false,
      },
    });

    const collector = sent.createMessageComponentCollector({
      time: 120000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Menu autosac ini bukan punya kamu.",
          ephemeral: true,
        });
      }

      const rarity = String(interaction.customId || "")
        .replace("autosac_rarity_", "")
        .toUpperCase();

      if (!RARITIES.includes(rarity)) {
        return interaction.deferUpdate().catch(() => null);
      }

      let updatedPlayer = null;
      let updatedSettings = null;

      try {
        updatePlayerAtomic(
          message.author.id,
          (fresh) => {
            const freshSettings = getAutoSacSettings(fresh);

            freshSettings.rarities[rarity] = !Boolean(freshSettings.rarities[rarity]);

            updatedPlayer = {
              ...fresh,
              autoSac: freshSettings,
            };

            updatedSettings = freshSettings;

            return updatedPlayer;
          },
          message.author.username
        );
      } catch (error) {
        return interaction.reply({
          content: error.message || "Failed to update autosac setting.",
          ephemeral: true,
        });
      }

      return interaction.update({
        embeds: [buildEmbed(message, updatedPlayer)],
        components: buildRows(updatedSettings),
      });
    });

    collector.on("end", async () => {
      try {
        const latestPlayer = getPlayer(message.author.id, message.author.username);
        const latestSettings = getAutoSacSettings(latestPlayer);

        await sent.edit({
          embeds: [buildEmbed(message, latestPlayer)],
          components: buildRows(latestSettings),
        });
      } catch (_) {}
    });
  },
};