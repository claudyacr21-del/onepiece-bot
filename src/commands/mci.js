const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const { findOwnedCard } = require("../utils/evolution");

function reqText(req) {
  if (!req) return "Base form. No requirement.";
  return [
    `Berries: ${Number(req.berries || 0).toLocaleString("en-US")}`,
    req.cards?.length ? `Battle Cards: ${req.cards.join(", ")}` : null,
    req.boosts?.length ? `Boost Cards: ${req.boosts.join(", ")}` : null,
    req.text || null,
  ].filter(Boolean).join("\n");
}

function stageStats(card, stage) {
  const mult = stage === 1 ? 1 : stage === 2 ? 1.2 : 1.45;
  return {
    atk: Math.floor(Number(card.baseAtk || 0) * mult) + Number(card.weaponBonus?.atk || 0),
    hp: Math.floor(Number(card.baseHp || 0) * mult) + Number(card.weaponBonus?.hp || 0),
    speed: Math.floor(Number(card.baseSpeed || 0) * mult) + Number(card.weaponBonus?.speed || 0),
  };
}

function buildEmbed(card, stage) {
  const form = card.evolutionForms?.[stage - 1];
  const stats = stageStats(card, stage);

  return new EmbedBuilder()
    .setColor(0x1abc9c)
    .setTitle(`🧾 My Card Info • ${card.displayName || card.name}`)
    .setDescription(
      [
        `**Owned Stage:** ${card.evolutionKey}`,
        `**Viewing Form:** ${form?.key || `M${stage}`} • ${form?.name || "Unknown"}`,
        `**Tier:** ${form?.tier || card.currentTier || card.rarity}`,
        `**Role:** ${card.cardRole}`,
        "",
        `**ATK:** ${stats.atk}`,
        `**HP:** ${stats.hp}`,
        `**SPD:** ${stats.speed}`,
        "",
        `**Weapon:** ${card.equippedWeapon || "None"}`,
        `**Base Tier:** ${card.baseTier}`,
      ].join("\n")
    )
    .setImage(card.image || null)
    .setFooter({ text: "Owned Card Viewer" });
}

function buildRows(stage) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("mci_prev").setLabel("Prev").setStyle(ButtonStyle.Secondary).setDisabled(stage <= 1),
      new ButtonBuilder().setCustomId("mci_info").setLabel("(i)").setStyle(ButtonStyle.Primary).setDisabled(stage <= 1),
      new ButtonBuilder().setCustomId("mci_next").setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(stage >= 3)
    ),
  ];
}

module.exports = {
  name: "mci",
  aliases: ["mycardinfo"],
  async execute(message, args) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("Usage: `op mci <card name>`");

    const player = getPlayer(message.author.id, message.author.username);
    const card = findOwnedCard(player.cards || [], query);
    if (!card) return message.reply("You do not own that card.");

    let stage = Number(card.evolutionStage || 1);

    const sent = await message.reply({
      embeds: [buildEmbed(card, stage)],
      components: buildRows(stage),
    });

    const collector = sent.createMessageComponentCollector({ time: 10 * 60 * 1000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: "Only you can control this card viewer.", ephemeral: true });
      }

      if (i.customId === "mci_prev") stage = Math.max(1, stage - 1);
      if (i.customId === "mci_next") stage = Math.min(3, stage + 1);

      if (i.customId === "mci_info") {
        const req = card.awakenRequirements?.[`M${stage}`];
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
        embeds: [buildEmbed(card, stage)],
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