const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { findOwnedCard, awakenOwnedCard } = require("../utils/evolution");

function formatReqEntry(entry) {
  if (!entry) return "Unknown";

  if (typeof entry === "string") return entry;

  return `${entry.code} M${Number(entry.stage || 1)}`;
}

function reqText(card, req) {
  return [
    `Berries: ${Number(req.berries || 0).toLocaleString("en-US")}`,
    `Self Fragments: ${Number(req.selfFragments || 0)}x ${card.displayName || card.name}`,
    card.cardRole === "battle" ? `Min Level: ${Number(req.minLevel || 0)}` : "Min Level: Not required",
    req.cards?.length ? `Battle Cards: ${req.cards.map(formatReqEntry).join(", ")}` : null,
    req.boosts?.length ? `Boost Cards: ${req.boosts.map(formatReqEntry).join(", ")}` : null,
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
    const owned = findOwnedCard(player.cards || [], query);
    if (!owned) return message.reply("You do not own that card.");
    if (Number(owned.evolutionStage || 1) >= 3) return message.reply("This card is already at M3.");

    const nextStage = Number(owned.evolutionStage || 1) + 1;
    const req = owned.awakenRequirements?.[`M${nextStage}`];
    if (!req) return message.reply("No awaken requirement found.");

    const sent = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle(`✨ Awaken ${owned.displayName || owned.name}`)
          .setDescription(
            [
              `Current: **M${owned.evolutionStage}**`,
              `Next: **M${nextStage}** • ${owned.evolutionForms?.[nextStage - 1]?.name || "Unknown"}`,
              "",
              reqText(owned, req),
              "",
              "Press **Yes** to proceed or **Cancel** to stop.",
            ].join("\n")
          ),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("awaken_yes").setLabel("Yes").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("awaken_cancel").setLabel("Cancel").setStyle(ButtonStyle.Danger)
        ),
      ],
    });

    const collector = sent.createMessageComponentCollector({ time: 10 * 60 * 1000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: "Only you can control this awaken action.", ephemeral: true });
      }

      if (i.customId === "awaken_cancel") {
        await i.update({
          embeds: [new EmbedBuilder().setColor(0x95a5a6).setTitle("Awaken Cancelled").setDescription("No changes were made.")],
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

        await i.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle("🌟 Awaken Success")
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
      } catch (err) {
        await i.update({
          embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("Awaken Failed").setDescription(err.message)],
          components: [],
        });
        collector.stop("fail");
      }
    });
  },
};