const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const { findCardByQueryFromOwned, hydrateCard } = require("../utils/evolution");

function reqText(req) {
  if (!req) return "Base form. No requirement.";
  const lines = [`Berries: ${Number(req.berries || 0).toLocaleString("en-US")}`];
  if (req.cards?.length) lines.push(`Battle Cards: ${req.cards.join(", ")}`);
  if (req.boosts?.length) lines.push(`Boost Cards: ${req.boosts.join(", ")}`);
  if (req.text) lines.push(req.text);
  return lines.join("\n");
}

function buildEmbed(card, stage) {
  const form = card.evolutionForms[stage - 1];
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🃏 Card Info • ${card.displayName || card.name}`)
    .setDescription(
      [
        `**Form:** ${form.key} • ${form.name}`,
        `**Tier:** ${form.tier}`,
        `**Role:** ${card.cardRole}`,
        `**Base Tier Ceiling Path:** ${card.baseTier} -> ${card.evolutionForms.map((x) => x.tier).join(" -> ")}`,
        "",
        `**ATK:** ${stage === card.evolutionStage ? card.atk : Math.floor(card.baseAtk * (stage === 1 ? 1 : stage === 2 ? 1.2 : 1.45)) + Number(card.weaponBonus?.atk || 0)}`,
        `**HP:** ${stage === card.evolutionStage ? card.hp : Math.floor(card.baseHp * (stage === 1 ? 1 : stage === 2 ? 1.2 : 1.45)) + Number(card.weaponBonus?.hp || 0)}`,
        `**SPD:** ${stage === card.evolutionStage ? card.speed : Math.floor(card.baseSpeed * (stage === 1 ? 1 : stage === 2 ? 1.2 : 1.45)) + Number(card.weaponBonus?.speed || 0)}`,
        "",
        `Current Owned Stage: **M${card.evolutionStage}**`,
      ].join("\n")
    )
    .setImage(card.image || null);
}

function buildRows(stage) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ci_prev").setLabel("Prev").setStyle(ButtonStyle.Secondary).setDisabled(stage <= 1),
      new ButtonBuilder().setCustomId("ci_info").setLabel("(i)").setStyle(ButtonStyle.Primary).setDisabled(stage <= 1),
      new ButtonBuilder().setCustomId("ci_next").setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(stage >= 3)
    ),
  ];
}

module.exports = {
  name: "ci",
  aliases: ["cardinfo"],
  async execute(message, args) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("Usage: `op ci <card name>`");

    const player = getPlayer(message.author.id, message.author.username);
    const card = findCardByQueryFromOwned(player.cards || [], query);
    if (!card) return message.reply("Card not found.");

    let stage = 1;

    const sent = await message.reply({
      embeds: [buildEmbed(card, stage)],
      components: buildRows(stage),
    });

    const collector = sent.createMessageComponentCollector({ time: 10 * 60 * 1000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: "Only you can control this card viewer.", ephemeral: true });
      }

      if (i.customId === "ci_prev") stage = Math.max(1, stage - 1);
      if (i.customId === "ci_next") stage = Math.min(3, stage + 1);

      if (i.customId === "ci_info") {
        const req = hydrateCard(card).evolutionForms[stage - 1]?.require;
        return i.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle(`ℹ️ Requirement • ${card.displayName || card.name} • M${stage}`)
              .setDescription(reqText(req)),
          ],
        });
      }

      return i.update({
        embeds: [buildEmbed(hydrateCard(card), stage)],
        components: buildRows(stage),
      });
    });

    collector.on("end", async () => {
      try {
        await sent.edit({ components: [] });
      } catch (_) {}
    });
  },
};