const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getAllCards } = require("../utils/evolution");
const { buildCardStyleEmbed } = require("../utils/cardView");

function getM3Stats(card) {
  const mult = 1.45;
  return {
    atk: Math.floor(Number(card.baseAtk || 0) * mult),
    hp: Math.floor(Number(card.baseHp || 0) * mult),
    speed: Math.floor(Number(card.baseSpeed || 0) * mult),
  };
}

function getPower(card) {
  const s = getM3Stats(card);
  return Math.floor(s.atk * 1.4 + s.hp * 0.22 + s.speed * 9);
}

function buildEmbed(card, index, total, mode) {
  const m3 = card.evolutionForms?.[2];
  const stats = getM3Stats(card);

  return buildCardStyleEmbed({
    color: mode === "boost" ? 0x9b59b6 : 0xe67e22,
    header: mode === "boost" ? "All Boost Cards" : "All Battle Cards",
    card: {
      ...card,
      badgeImage: m3?.badgeImage || card.badgeImage || "",
    },
    formName: m3?.name || "Final",
    tier: m3?.tier || card.currentTier || card.rarity,
    footerText: `${mode === "boost" ? "Boost" : "Battle"} ${index + 1}/${total} • Code: ${card.code}`,
    extraLines: [
      `Role: ${card.cardRole}`,
      `Base Tier: ${card.baseTier}`,
      `Max Form: ${m3?.key || "M3"}`,
      `Max Tier: ${m3?.tier || card.currentTier || card.rarity}`,
      `Path: ${card.evolutionForms.map((x) => x.tier).join(" -> ")}`,
      "",
      `ATK (M3): ${stats.atk}`,
      `HP (M3): ${stats.hp}`,
      `SPD (M3): ${stats.speed}`,
      `Power (M3): ${getPower(card)}`,
      mode === "boost" ? `Boost Type: ${card.boostType || "None"}` : `Type: ${card.type || "Battle"}`,
    ],
  });
}

function rows(index, total) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("all_prev").setLabel("Prev").setStyle(ButtonStyle.Secondary).setDisabled(index <= 0),
      new ButtonBuilder().setCustomId("all_next").setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(index >= total - 1)
    ),
  ];
}

module.exports = {
  name: "all",
  aliases: ["allcards"],
  async execute(message, args) {
    const mode = String(args.join(" ").trim()).toLowerCase() === "boost" ? "boost" : "battle";

    const cards = getAllCards()
      .filter((c) => c.cardRole === mode)
      .sort((a, b) => {
        const powerDiff = getPower(b) - getPower(a);
        if (powerDiff !== 0) return powerDiff;

        const tierOrder = { C: 1, B: 2, A: 3, S: 4, SS: 5, UR: 6 };
        const aTier = tierOrder[a?.evolutionForms?.[2]?.tier] || 0;
        const bTier = tierOrder[b?.evolutionForms?.[2]?.tier] || 0;
        if (bTier !== aTier) return bTier - aTier;

        return String(a.displayName || a.name).localeCompare(String(b.displayName || b.name));
      });

    if (!cards.length) return message.reply("No cards found.");

    let index = 0;

    const sent = await message.reply({
      embeds: [buildEmbed(cards[index], index, cards.length, mode)],
      components: rows(index, cards.length),
    });

    const collector = sent.createMessageComponentCollector({ time: 10 * 60 * 1000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: "Only you can control this card viewer.", ephemeral: true });
      }

      if (i.customId === "all_prev") index = Math.max(0, index - 1);
      if (i.customId === "all_next") index = Math.min(cards.length - 1, index + 1);

      return i.update({
        embeds: [buildEmbed(cards[index], index, cards.length, mode)],
        components: rows(index, cards.length),
      });
    });

    collector.on("end", async () => {
      try { await sent.edit({ components: [] }); } catch (_) {}
    });
  },
};