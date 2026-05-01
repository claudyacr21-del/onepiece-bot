const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { getPlayer, updatePlayer } = require("../playerStore");
const {
  getAutoSacSettings,
  getFragmentStorageInfo,
} = require("../utils/autoSac");

const COLOR = 0x8e44ad;
const RARITIES = ["C", "B", "A", "S"];

function getMemberAvatar(message) {
  return (
    message.member?.displayAvatarURL({
      extension: "png",
      size: 512,
    }) ||
    message.author.displayAvatarURL({
      extension: "png",
      size: 512,
    })
  );
}

function getStatusEmoji(enabled) {
  return enabled ? "🟢" : "🔴";
}

function buildEmbed(message, player) {
  const settings = getAutoSacSettings(player);
  const storage = getFragmentStorageInfo(player);
  const memberAvatar = getMemberAvatar(message);
  const displayName = message.member?.displayName || message.author.username;

  const rarityText = RARITIES.map((rarity) => {
    const enabled = Boolean(settings.rarities?.[rarity]);
    return `${getStatusEmoji(enabled)} **${rarity}**`;
  }).join("  ");

  const cardText = settings.cards.length
    ? settings.cards
        .map((card) => `• ${card.name || card.code || "Unknown Card"}`)
        .join("\n")
    : "Belum ada card khusus di autosac.";

  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("Fragment Auto-Sacrifice Settings")
    .setDescription(
      [
        "Set rarity fragment/card yang ingin otomatis di-sacrifice jadi berries saat pull / pa.",
        "Kalau storage fragment sudah full, duplicate fragment otomatis convert ke berries juga.",
        "",
        `**Fragment Storage:** ${storage.total}/${storage.max}`,
        "",
        "**Rarity Auto-Sac**",
        rarityText,
        "",
        "**Cards To Auto-Sac**",
        cardText,
        "",
        "**Commands**",
        "`op sac <card name> <amount/all>`",
        "`op sacadd <card name> <amount/all>`",
        "`op msac (luffy_5, zoro_2, nami_6)`",
      ].join("\n")
    )
    .setThumbnail(memberAvatar)
    .setFooter({
      text: `${displayName} • Auto Sacrifice`,
      iconURL: memberAvatar,
    });
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
        return interaction.deferUpdate();
      }

      const freshPlayer = getPlayer(message.author.id, message.author.username);
      const freshSettings = getAutoSacSettings(freshPlayer);

      freshSettings.rarities[rarity] = !Boolean(freshSettings.rarities[rarity]);

      updatePlayer(message.author.id, {
        autoSac: freshSettings,
      });

      const updatedPlayer = getPlayer(message.author.id, message.author.username);
      const updatedSettings = getAutoSacSettings(updatedPlayer);

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