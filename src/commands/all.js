const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { getAllCards } = require("../utils/evolution");
const { buildCardStyleEmbed } = require("../utils/cardView");
const weapons = require("../data/weapons");
const devilFruits = require("../data/devilFruits");
const {
  getRarityBadge,
  getWeaponImage,
  getDevilFruitImage,
} = require("../config/assetLinks");

function getCardPower(card) {
  return Number(card.powerCaps?.M3 || card.currentPower || 0);
}

function getItemPower(item) {
  const bonus = item?.statBonus || {};
  return Math.floor(
    Number(bonus.atk || 0) * 1.4 +
    Number(bonus.hp || 0) * 0.22 +
    Number(bonus.speed || 0) * 9
  );
}

function getUpgradedItemPower(item, level = 0) {
  const lv = Math.max(0, Number(level || 0));
  const base = item?.statBonus || {};
  return getItemPower({
    ...item,
    statBonus: {
      atk: Number(base.atk || 0) + lv * 3,
      hp: Number(base.hp || 0) + lv * 8,
      speed: Number(base.speed || 0) + lv * 1,
    },
  });
}

function getUpgradedBonus(item, level = 0) {
  const lv = Math.max(0, Number(level || 0));
  const base = item?.statBonus || {};
  return {
    atk: Number(base.atk || 0) + lv * 3,
    hp: Number(base.hp || 0) + lv * 8,
    speed: Number(base.speed || 0) + lv * 1,
  };
}

function tierScore(tier) {
  return { C: 1, B: 2, A: 3, S: 4, SS: 5, UR: 6 }[String(tier || "").toUpperCase()] || 0;
}

function statEffectText(item) {
  const bonus = item?.statBonus || {};
  const parts = [];
  if (Number(bonus.atk || 0)) parts.push(`+${Number(bonus.atk)} ATK`);
  if (Number(bonus.hp || 0)) parts.push(`+${Number(bonus.hp)} HP`);
  if (Number(bonus.speed || 0)) parts.push(`+${Number(bonus.speed)} SPD`);
  return parts.length ? parts.join(" / ") : "No stat bonus";
}

function buildCardEmbed(card, index, total, mode) {
  const m3 = card.evolutionForms?.[2];

  return buildCardStyleEmbed({
    color: mode === "boost" ? 0x9b59b6 : 0xe67e22,
    header: mode === "boost" ? "All Boost Cards" : "All Battle Cards",
    card: { ...card, badgeImage: m3?.badgeImage || card.badgeImage || "" },
    badgeImage: m3?.badgeImage || card.badgeImage || "",
    formName: m3?.name || "Final",
    tier: m3?.tier || card.currentTier || card.rarity,
    footerText: `${mode === "boost" ? "Boost" : "Battle"} ${index + 1}/${total} • Code: ${card.code}`,
    extraLines: [
      `Role: ${card.cardRole}`,
      `Base Power: ${card.basePower || 0}`,
      `Power Cap M1/M2/M3: ${card.powerCaps?.M1 || 0} / ${card.powerCaps?.M2 || 0} / ${card.powerCaps?.M3 || 0}`,
      mode === "boost"
        ? `Effect M1/M2/M3: ${card.evolutionForms?.[0]?.effectText || "-"} | ${card.evolutionForms?.[1]?.effectText || "-"} | ${card.evolutionForms?.[2]?.effectText || "-"}`
        : `Type: ${card.type || "Battle"}`,
      "",
      `Power (M3): ${getCardPower(card)}`,
    ],
  });
}

function buildWeaponEmbed(item, index, total) {
  const bonus0 = getUpgradedBonus(item, 0);
  const bonus5 = getUpgradedBonus(item, 5);

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle("All Weapons")
    .setDescription(
      [
        `**${item.name || item.code}**`,
        item.type || "Weapon",
        "",
        `Rarity: ${String(item.rarity || "B").toUpperCase()}`,
        `Effect: ${item.description || statEffectText(item)}`,
        `Power (Base): ${getItemPower(item)}`,
        `Power (Max +5): ${getUpgradedItemPower(item, 5)}`,
        `Bonus (Base): +${bonus0.atk} ATK / +${bonus0.hp} HP / +${bonus0.speed} SPD`,
        `Bonus (Max +5): +${bonus5.atk} ATK / +${bonus5.hp} HP / +${bonus5.speed} SPD`,
        `Owners: ${Array.isArray(item.owners) && item.owners.length ? item.owners.join(", ") : "General"}`,
      ].join("\n")
    )
    .setThumbnail(getRarityBadge(item.rarity || "B") || null)
    .setImage(getWeaponImage(item.code, item.image || "") || null)
    .setFooter({ text: `Weapon ${index + 1}/${total} • Code: ${item.code}` });
}

function buildFruitEmbed(item, index, total) {
  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("All Devil Fruits")
    .setDescription(
      [
        `**${item.name || item.code}**`,
        item.type || "Devil Fruit",
        "",
        `Rarity: ${String(item.rarity || "B").toUpperCase()}`,
        `Effect: ${item.description || statEffectText(item)}`,
        `Power: ${getItemPower(item)}`,
      ].join("\n")
    )
    .setThumbnail(getRarityBadge(item.rarity || "B") || null)
    .setImage(getDevilFruitImage(item.code, item.image || "") || null)
    .setFooter({ text: `Fruit ${index + 1}/${total} • Code: ${item.code}` });
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
    const rawMode = String(args.join(" ").trim()).toLowerCase();
    const mode = rawMode === "boost" ? "boost" : rawMode === "weapon" ? "weapon" : rawMode === "fruit" ? "fruit" : "battle";

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
        const powerDiff = getUpgradedItemPower(b, 5) - getUpgradedItemPower(a, 5);
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
  },
};