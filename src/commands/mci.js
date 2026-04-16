const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const { findOwnedCard } = require("../utils/evolution");

function buildReqEmbed(card, stage) {
  const req = card.awakenRequirements?.[`M${stage}`];
  if (!req) {
    return new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`ℹ️ Requirement • ${card.displayName || card.name} • M${stage}`)
      .setDescription("Base form. No requirement.");
  }

  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`ℹ️ Requirement • ${card.displayName || card.name} • M${stage}`)
    .setDescription(
      [
        "🧩 **Fragments / Path Requirement**",
        `↪ ${card.evolutionForms?.[stage - 1]?.name || `M${stage}`}`,
        "",
        "💰 **Berries Required**",
        `↪ ${Number(req.berries || 0).toLocaleString("en-US")}`,
        "",
        "🃏 **Cards Required**",
        ...(req.cards?.length ? req.cards.map((x) => `↪ ${x}`) : ["↪ None"]),
        "",
        "✨ **Boosts Required**",
        ...(req.boosts?.length ? req.boosts.map((x) => `↪ ${x}`) : ["↪ None"]),
        "",
        "📜 **Notes**",
        `↪ ${req.text || "No extra notes."}`,
      ].join("\n")
    );
}

function buildEmbed(card, stage) {
  const form = card.evolutionForms?.[stage - 1];
  const mult = stage === 1 ? 1 : stage === 2 ? 1.2 : 1.45;

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
        `**ATK:** ${Math.floor(Number(card.baseAtk || 0) * mult) + Number(card.weaponBonus?.atk || 0)}`,
        `**HP:** ${Math.floor(Number(card.baseHp || 0) * mult) + Number(card.weaponBonus?.hp || 0)}`,
        `**SPD:** ${Math.floor(Number(card.baseSpeed || 0) * mult) + Number(card.weaponBonus?.speed || 0)}`,
        "",
        `**Weapon:** ${card.equippedWeapon || "None"}`,
        `**Base Tier:** ${card.baseTier}`,
      ].join("\n")
    )
    .setThumbnail(form?.badgeImage || card.badgeImage || null)
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
        return i.reply({
          ephemeral: true,
          embeds: [buildReqEmbed(card, stage)],
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