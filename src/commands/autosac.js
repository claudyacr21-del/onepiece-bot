const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getAutoSacSettings, getFragmentStorageInfo } = require("../utils/autoSac");

const RARITIES = ["C", "B", "A", "S"];

function buildEmbed(message, player) {
  const settings = getAutoSacSettings(player);
  const storage = getFragmentStorageInfo(player);

  const rarityLines = RARITIES.map((rarity) => {
    const enabled = settings.rarities[rarity];
    return `${enabled ? "🟢" : "🔴"} **${rarity}**`;
  }).join("  ");

  const cardText = settings.cards.length
    ? settings.cards.map((card) => card.name || card.code || "Unknown Card").join(", ")
    : "Belum ada card khusus di autosac.";

  return new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle("Fragment Auto-Sacrifice Settings")
    .setDescription(
      [
        "Set rarity fragment/card yang ingin otomatis di-sacrifice jadi berries saat pull / pa.",
        "Kalau storage fragment sudah full, duplicate fragment otomatis convert ke berries juga.",
        "",
        `**Fragment Storage:** ${storage.total}/${storage.max}`,
        "",
        "**Rarity Auto-Sac**",
        rarityLines,
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
    .setThumbnail(message.author.displayAvatarURL({ extension: "png", size: 512 }))
    .setFooter({ text: "One Piece Bot • Auto Sacrifice" });
}

function buildRows(settings) {
  const rarityRow = new ActionRowBuilder().addComponents(
    RARITIES.map((rarity) =>
      new ButtonBuilder()
        .setCustomId(`autosac_rarity_${rarity}`)
        .setLabel(rarity)
        .setStyle(settings.rarities[rarity] ? ButtonStyle.Success : ButtonStyle.Danger)
    )
  );

  return [rarityRow];
}

module.exports = {
  name: "autosac",
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    let settings = getAutoSacSettings(player);

    const sent = await message.reply({
      embeds: [buildEmbed(message, player)],
      components: buildRows(settings),
    });

    const collector = sent.createMessageComponentCollector({ time: 120000 });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Menu autosac ini bukan punya kamu.",
          ephemeral: true,
        });
      }

      const rarity = String(interaction.customId || "").replace("autosac_rarity_", "").toUpperCase();
      if (!RARITIES.includes(rarity)) {
        return interaction.deferUpdate();
      }

      const freshPlayer = getPlayer(message.author.id, message.author.username);
      settings = getAutoSacSettings(freshPlayer);
      settings.rarities[rarity] = !settings.rarities[rarity];

      updatePlayer(message.author.id, {
        autoSac: settings,
      });

      const updatedPlayer = getPlayer(message.author.id, message.author.username);

      return interaction.update({
        embeds: [buildEmbed(message, updatedPlayer)],
        components: buildRows(getAutoSacSettings(updatedPlayer)),
      });
    });
  },
};