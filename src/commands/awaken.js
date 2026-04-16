const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { findCardByQueryFromOwned, canAffordAwaken, awakenOwnedCard } = require("../utils/evolution");

function requirementText(req) {
  return [
    `Berries: ${Number(req.berries || 0).toLocaleString("en-US")}`,
    req.cards?.length ? `Battle Cards: ${req.cards.join(", ")}` : null,
    req.boosts?.length ? `Boost Cards: ${req.boosts.join(", ")}` : null,
    req.text || null,
  ].filter(Boolean).join("\n");
}

module.exports = {
  name: "awaken",
  aliases: ["evolve"],
  async execute(message, args) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("Usage: `op awaken <card name>`");

    const player = getPlayer(message.author.id, message.author.username);
    const card = findCardByQueryFromOwned(player.cards || [], query);
    if (!card) return message.reply("Card not found.");
    if (Number(card.evolutionStage || 1) >= 3) return message.reply("This card is already at M3.");

    const nextStage = Number(card.evolutionStage || 1) + 1;
    const check = canAffordAwaken(player, card, nextStage);
    const req = check.req || card.evolutionForms[nextStage - 1]?.require;
    if (!req) return message.reply("No awaken data found.");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("awaken_yes").setLabel("Yes").setStyle(ButtonStyle.Success).setDisabled(!check.ok),
      new ButtonBuilder().setCustomId("awaken_cancel").setLabel("Cancel").setStyle(ButtonStyle.Danger)
    );

    const sent = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(check.ok ? 0xf1c40f : 0xe74c3c)
          .setTitle(`✨ Awaken ${card.displayName || card.name}`)
          .setDescription(
            [
              `Current: **M${card.evolutionStage}**`,
              `Next: **M${nextStage}** • ${card.evolutionForms[nextStage - 1].name}`,
              "",
              requirementText(req),
              "",
              check.ok ? "Press **Yes** to awaken." : `Cannot awaken yet: ${check.reason}`,
            ].join("\n")
          ),
      ],
      components: [row],
    });

    const collector = sent.createMessageComponentCollector({ time: 10 * 60 * 1000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: "Only you can control this awaken action.", ephemeral: true });
      }

      if (i.customId === "awaken_cancel") {
        await i.update({
          embeds: [
            new EmbedBuilder().setColor(0x95a5a6).setTitle("Awaken Cancelled").setDescription("No changes were made."),
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
          berries: result.berries,
        });

        await i.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle("🌟 Awaken Success")
              .setDescription(
                [
                  `**${result.target.displayName || result.target.name}** reached **M${result.target.evolutionStage}**`,
                  `**Form:** ${result.target.evolutionForms[result.target.evolutionStage - 1].name}`,
                  `**Tier:** ${result.target.currentTier}`,
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
      } catch (err) {
        await i.update({
          embeds: [
            new EmbedBuilder().setColor(0xe74c3c).setTitle("Awaken Failed").setDescription(err.message),
          ],
          components: [],
        });
        collector.stop("fail");
      }
    });

    collector.on("end", async (_, reason) => {
      if (["done", "cancel", "fail"].includes(reason)) return;
      try {
        await sent.edit({ components: [] });
      } catch (_) {}
    });
  },
};