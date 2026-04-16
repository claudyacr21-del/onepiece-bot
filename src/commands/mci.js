const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const { findOwnedCard } = require("../utils/evolution");
const { buildCardStyleEmbed } = require("../utils/cardView");

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
        "🧩 **Requirement Panel**",
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

function buildEmbed(ownerName, card, stage) {
  const form = card.evolutionForms?.[stage - 1];
  const mult =
    card.code === "luffy_straw_hat"
      ? stage === 1
        ? 1
        : stage === 2
        ? 1.75
        : 2.35
      : stage === 1
      ? 1
      : stage === 2
      ? 1.2
      : 1.45;

  return buildCardStyleEmbed({
    color: 0x1abc9c,
    ownerName,
    card,
    badgeImage: form?.badgeImage || card.badgeImage || "",
    formName: form?.name || "Unknown Form",
    tier: form?.tier || card.currentTier || card.rarity,
    footerText: `This card belongs to ${ownerName}`,
    extraLines: [
      `Form: ${form?.key || `M${stage}`}`,
      `Tier: ${form?.tier || card.currentTier || card.rarity}`,
      `Level: ${card.level || 1}`,
      `Power: ${Math.floor((Math.floor(Number(card.baseAtk || 0) * mult) + Number(card.weaponBonus?.atk || 0)) * 1.4 + (Math.floor(Number(card.baseHp || 0) * mult) + Number(card.weaponBonus?.hp || 0)) * 0.22 + (Math.floor(Number(card.baseSpeed || 0) * mult) + Number(card.weaponBonus?.speed || 0)) * 9)}`,
      `Health: ${Math.floor(Number(card.baseHp || 0) * mult) + Number(card.weaponBonus?.hp || 0)}`,
      `Speed: ${Math.floor(Number(card.baseSpeed || 0) * mult) + Number(card.weaponBonus?.speed || 0)}`,
      `Attack: ${Math.floor(Number(card.baseAtk || 0) * mult) + Number(card.weaponBonus?.atk || 0)}`,
      `Weapon: ${card.equippedWeapon || "None"}`,
      `Devil Fruit: ${card.equippedDevilFruit || "None"}`,
      `Type: ${card.type || card.cardRole}`,
    ],
  });
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
      embeds: [buildEmbed(message.author.username, card, stage)],
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
        return i.reply({ ephemeral: true, embeds: [buildReqEmbed(card, stage)] });
      }

      return i.update({
        embeds: [buildEmbed(message.author.username, card, stage)],
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