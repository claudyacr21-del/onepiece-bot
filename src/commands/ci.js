const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const { findCardTemplate, findCardByQueryFromOwned, hydrateCard } = require("../utils/evolution");

function stageMultiplier(stage) {
  if (stage === 1) return 1;
  if (stage === 2) return 1.2;
  return 1.45;
}

function reqText(req) {
  if (!req) return "Base form. No requirement.";
  return [
    `Berries: ${Number(req.berries || 0).toLocaleString("en-US")}`,
    req.cards?.length ? `Battle Cards: ${req.cards.join(", ")}` : null,
    req.boosts?.length ? `Boost Cards: ${req.boosts.join(", ")}` : null,
    req.text || null,
  ]
    .filter(Boolean)
    .join("\n");
}

function calcStageStats(card, stage) {
  const mult = stageMultiplier(stage);
  return {
    atk: Math.floor(Number(card.baseAtk || 0) * mult),
    hp: Math.floor(Number(card.baseHp || 0) * mult),
    speed: Math.floor(Number(card.baseSpeed || 0) * mult),
  };
}

function buildEmbed(card, ownedCard, stage) {
  const form = card.evolutionForms[stage - 1];
  const stats = calcStageStats(card, stage);

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🃏 Card Info • ${card.displayName || card.name}`)
    .setDescription(
      [
        `**Form:** ${form.key} • ${form.name}`,
        `**Tier:** ${form.tier}`,
        `**Role:** ${card.cardRole}`,
        `**Base Path:** ${card.baseTier} -> ${card.evolutionForms.map((x) => x.tier).join(" -> ")}`,
        "",
        `**ATK:** ${stats.atk}`,
        `**HP:** ${stats.hp}`,
        `**SPD:** ${stats.speed}`,
        "",
        ownedCard
          ? `**Owned Stage:** M${ownedCard.evolutionStage} • ${ownedCard.evolutionForms[ownedCard.evolutionStage - 1].name}`
          : "**Owned Stage:** Not owned",
      ].join("\n")
    )
    .setImage(card.image || null)
    .setFooter({
      text: ownedCard
        ? "Global Card Viewer • Owned card detected"
        : "Global Card Viewer • Not required to own the card",
    });
}

function buildRows(stage) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ci_prev")
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(stage <= 1),
      new ButtonBuilder()
        .setCustomId("ci_info")
        .setLabel("(i)")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(stage <= 1),
      new ButtonBuilder()
        .setCustomId("ci_next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(stage >= 3)
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
    const template = findCardTemplate(query);

    if (!template) {
      return message.reply("Card not found in global database.");
    }

    const globalCard = hydrateCard({
      ...template,
      evolutionStage: 1,
      weaponBonus: { atk: 0, hp: 0, speed: 0 },
    });

    const ownedCard = findCardByQueryFromOwned(player.cards || [], query);
    let stage = 1;

    const sent = await message.reply({
      embeds: [buildEmbed(globalCard, ownedCard, stage)],
      components: buildRows(stage),
    });

    const collector = sent.createMessageComponentCollector({ time: 10 * 60 * 1000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({
          content: "Only you can control this card viewer.",
          ephemeral: true,
        });
      }

      if (i.customId === "ci_prev") stage = Math.max(1, stage - 1);
      if (i.customId === "ci_next") stage = Math.min(3, stage + 1);

      if (i.customId === "ci_info") {
        const req = globalCard.evolutionForms[stage - 1]?.require;
        return i.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle(`ℹ️ Requirement • ${globalCard.displayName || globalCard.name} • M${stage}`)
              .setDescription(reqText(req)),
          ],
        });
      }

      return i.update({
        embeds: [buildEmbed(globalCard, ownedCard, stage)],
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