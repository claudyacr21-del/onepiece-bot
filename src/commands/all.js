const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getAllCards } = require("../utils/evolution");
const weapons = require("../data/weapons");
const devilFruits = require("../data/devilFruits");
const {
  getRarityBadge,
  getWeaponImage,
  getDevilFruitImage,
} = require("../config/assetLinks");
const { buildCardStyleEmbed } = require("../utils/cardView");

function getM3Stats(card) {
  const mult = card.code === "luffy_straw_hat" ? 2.35 : 1.45;
  return {
    atk: Math.floor(Number(card.baseAtk || 0) * mult),
    hp: Math.floor(Number(card.baseHp || 0) * mult),
    speed: Math.floor(Number(card.baseSpeed || 0) * mult),
  };
}

function getCardPower(card) {
  const s = getM3Stats(card);
  return Math.floor(s.atk * 1.4 + s.hp * 0.22 + s.speed * 9);
}

function getItemPower(item) {
  const bonus = item?.statBonus || {};
  return Math.floor(Number(bonus.atk || 0) * 1.4 + Number(bonus.hp || 0) * 0.22 + Number(bonus.speed || 0) * 9);
}

function tierScore(tier) {
  return { C: 1, B: 2, A: 3, S: 4, SS: 5, UR: 6 }[String(tier || "").toUpperCase()] || 0;
}

function rows(index, total) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("all_prev")
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index <= 0),
      new ButtonBuilder()
        .setCustomId("all_next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index >= total - 1)
    ),
  ];
}

function buildCardEmbed(card, index, total, mode) {
  const m3 = card.evolutionForms?.[2];
  const stats = getM3Stats(card);

  return buildCardStyleEmbed({
    color: mode === "boost" ? 0x9b59b6 : 0xe67e22,
    header: mode === "boost" ? "All Boost Cards" : "All Battle Cards",
    card: {
      ...card,
      badgeImage: m3?.badgeImage || card.badgeImage || "",
    },
    badgeImage: m3?.badgeImage || card.badgeImage || "",
    formName: m3?.name || "Final",
    tier: m3?.tier || card.currentTier || card.rarity,
    footerText: `${mode === "boost" ? "Boost" : "Battle"} ${index + 1}/${total} • Code: ${card.code}`,
    extraLines: [
      `Role: ${card.cardRole}`,
      `Base Tier: ${card.baseTier}`,
      `Max Form: ${m3?.key || "M3"}`,
      `Max Tier: ${m3?.tier || card.currentTier || card.rarity}`,
      `ATK (M3): ${stats.atk}`,
      `HP (M3): ${stats.hp}`,
      `SPD (M3): ${stats.speed}`,
      `Power (M3): ${getCardPower(card)}`,
      mode === "boost" ? `Boost Type: ${card.boostType || "None"}` : `Type: ${card.type || "Battle"}`,
    ],
  });
}

function buildWeaponEmbed(item, index, total) {
  const bonus = item?.statBonus || {};
  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle("All Weapons")
    .setDescription(
      [
        `**${item.name || item.code}**`,
        item.type || "Weapon",
        "",
        `Rarity: ${String(item.rarity || "B").toUpperCase()}`,
        `ATK Bonus: +${Number(bonus.atk || 0)}`,
        `HP Bonus: +${Number(bonus.hp || 0)}`,
        `SPD Bonus: +${Number(bonus.speed || 0)}`,
        `Power: ${getItemPower(item)}`,
        `Owners: ${Array.isArray(item.owners) && item.owners.length ? item.owners.join(", ") : "General"}`,
      ].join("\n")
    )
    .setThumbnail(getRarityBadge(item.rarity || "B") || null)
    .setImage(getWeaponImage(item.code, item.image || "") || null)
    .setFooter({ text: `Weapon ${index + 1}/${total} • Code: ${item.code}` });
}

function buildFruitEmbed(item, index, total) {
  const bonus = item?.statBonus || {};
  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("All Devil Fruits")
    .setDescription(
      [
        `**${item.name || item.code}**`,
        item.type || "Devil Fruit",
        "",
        `Rarity: ${String(item.rarity || "B").toUpperCase()}`,
        `ATK Bonus: +${Number(bonus.atk || 0)}`,
        `HP Bonus: +${Number(bonus.hp || 0)}`,
        `SPD Bonus: +${Number(bonus.speed || 0)}`,
        `Power: ${getItemPower(item)}`,
      ].join("\n")
    )
    .setThumbnail(getRarityBadge(item.rarity || "B") || null)
    .setImage(getDevilFruitImage(item.code, item.image || "") || null)
    .setFooter({ text: `Fruit ${index + 1}/${total} • Code: ${item.code}` });
}

module.exports = {
  name: "all",
  aliases: ["allcards"],
  async execute(message, args) {
    const rawMode = String(args.join(" ").trim()).toLowerCase();
    const mode =
      rawMode === "boost" ? "boost" :
      rawMode === "weapon" ? "weapon" :
      rawMode === "fruit" ? "fruit" :
      "battle";

    let list = [];
    let renderer = null;

    if (mode === "battle" || mode === "boost") {
      list = getAllCards()
        .filter((c) => c.cardRole === mode)
        .sort((a, b) => {
          const powerDiff = getCardPower(b) - getCardPower(a);
          if (powerDiff !== 0) return powerDiff;
          const tierDiff = tierScore(b?.evolutionForms?.[2]?.tier) - tierScore(a?.evolutionForms?.[2]?.tier);
          if (tierDiff !== 0) return tierDiff;
          return String(a.displayName || a.name).localeCompare(String(b.displayName || b.name));
        });
      renderer = (item, index, total) => buildCardEmbed(item, index, total, mode);
    }

    if (mode === "weapon") {
      list = [...weapons].sort((a, b) => {
        const powerDiff = getItemPower(b) - getItemPower(a);
        if (powerDiff !== 0) return powerDiff;
        const tierDiff = tierScore(b.rarity) - tierScore(a.rarity);
        if (tierDiff !== 0) return tierDiff;
        return String(a.name || a.code).localeCompare(String(b.name || b.code));
      });
      renderer = buildWeaponEmbed;
    }

    if (mode === "fruit") {
      list = [...devilFruits].sort((a, b) => {
        const powerDiff = getItemPower(b) - getItemPower(a);
        if (powerDiff !== 0) return powerDiff;
        const tierDiff = tierScore(b.rarity) - tierScore(a.rarity);
        if (tierDiff !== 0) return tierDiff;
        return String(a.name || a.code).localeCompare(String(b.name || b.code));
      });
      renderer = buildFruitEmbed;
    }

    if (!list.length) return message.reply("No data found.");

    let index = 0;

    const sent = await message.reply({
      embeds: [renderer(list[index], index, list.length)],
      components: rows(index, list.length),
    });

    const collector = sent.createMessageComponentCollector({ time: 10 * 60 * 1000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: "Only you can control this viewer.", ephemeral: true });
      }

      if (i.customId === "all_prev") index = Math.max(0, index - 1);
      if (i.customId === "all_next") index = Math.min(list.length - 1, index + 1);

      return i.update({
        embeds: [renderer(list[index], index, list.length)],
        components: rows(index, list.length),
      });
    });

    collector.on("end", async () => {
      try { await sent.edit({ components: [] }); } catch (_) {}
    });
  },
};