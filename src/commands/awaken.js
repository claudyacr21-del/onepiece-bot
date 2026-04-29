const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { getPlayer, updatePlayer } = require("../playerStore");
const { findOwnedCard, awakenOwnedCard } = require("../utils/evolution");

module.exports = {
  name: "awaken",
  aliases: ["evolve"],

  async execute(message, args) {
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply("Usage: `op awaken <card name>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const owned = findOwnedCard(player.cards || [], query);

    if (!owned) {
      return message.reply("You do not own that card.");
    }

    if (Number(owned.evolutionStage || 1) >= 3) {
      return message.reply("This card is already at M3.");
    }

    const currentStage = Number(owned.evolutionStage || 1);
    const nextStage = currentStage + 1;

    try {
      // Requirement validation only.
      // If anything is missing, awakenOwnedCard will throw and no UI will be shown.
      awakenOwnedCard(player, query);
    } catch (_) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("Awaken Failed")
            .setDescription(
              [
                `**${owned.displayName || owned.name}** cannot awaken to **M${nextStage}** yet.`,
                "",
                `Use \`op ci ${owned.displayName || owned.name}\` to check the full requirements.`,
              ].join("\n")
            ),
        ],
      });
    }

    const sent = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle(`✨ Awaken ${owned.displayName || owned.name}`)
          .setDescription(
            [
              `Current: **M${currentStage}**`,
              `Next: **M${nextStage}** • ${owned.evolutionForms?.[nextStage - 1]?.name || "Unknown"}`,
              "",
              "All requirements are ready.",
              "Press **Yes** to awaken or **Cancel** to stop.",
            ].join("\n")
          ),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("awaken_yes")
            .setLabel("Yes")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("awaken_cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Danger)
        ),
      ],
    });

    const collector = sent.createMessageComponentCollector({
      time: 10 * 60 * 1000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only you can control this awaken action.",
          ephemeral: true,
        });
      }

      if (interaction.customId === "awaken_cancel") {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x95a5a6)
              .setTitle("Awaken Cancelled")
              .setDescription("No changes were made."),
          ],
          components: [],
        });

        collector.stop("cancel");
        return;
      }

      try {
        const fresh = getPlayer(message.author.id, message.author.username);
        const result = awakenOwnedCard(fresh, query);

        updatePlayer(message.author.id, {
          cards: result.updatedCards,
          fragments: result.updatedFragments,
          berries: result.berries,
        });

        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle("✨ Awaken Success")
              .setDescription(
                [
                  `**${result.target.displayName || result.target.name}** reached **M${result.target.evolutionStage}**`,
                  `**Form:** ${result.target.evolutionForms?.[result.target.evolutionStage - 1]?.name || "Unknown"}`,
                  `**Tier:** ${result.target.currentTier || result.target.rarity}`,
                  `**Power:** ${result.target.currentPower || 0}`,
                  "",
                  `ATK: ${result.target.atk}`,
                  `HP: ${result.target.hp}`,
                  `SPD: ${result.target.speed}`,
                ].join("\n")
              ),
          ],
          components: [],
        });

        collector.stop("done");
      } catch (_) {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("Awaken Failed")
              .setDescription(
                [
                  `**${owned.displayName || owned.name}** cannot awaken right now.`,
                  "",
                  `Use \`op ci ${owned.displayName || owned.name}\` to check the full requirements.`,
                ].join("\n")
              ),
          ],
          components: [],
        });

        collector.stop("fail");
      }
    });
  },
};