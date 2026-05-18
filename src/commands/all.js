const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { getAllCards, getRarityPower, getWeaponPower, getFruitPower } = require("../utils/evolution");
const { buildCardStyleEmbed } = require("../utils/cardView");
const weapons = require("../data/weapons");
const devilFruits = require("../data/devilFruits");
const {
  getRarityBadge,
  getCardImage,
  getWeaponImage,
  getDevilFruitImage,
} = require("../config/assetLinks");

function getCardPower(card, stageKey = "M1") {
  return Number(
    card.powerCaps?.[stageKey] ||
      card.basePower ||
      card.power ||
      card.currentPower ||
      0
  );
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function getBaseCardStats(card, form = null) {
  return {
    atk: Number(form?.atk ?? form?.baseAtk ?? card.baseAtk ?? card.atk ?? 0),
    hp: Number(form?.hp ?? form?.baseHp ?? card.baseHp ?? card.hp ?? 0),
    speed: Number(
      form?.speed ?? form?.spd ?? form?.baseSpeed ?? card.baseSpeed ?? card.speed ?? 0
    ),
  };
}

function getUpgradedWeaponPercent(item, level = 5) {
  const base = item?.statPercent || {};
  const lv = Math.max(0, Number(level || 0));
  return {
    atk: Number(base.atk || 0) + lv * 1,
    hp: Number(base.hp || 0) + lv * 1,
    speed: Number(base.speed || 0),
  };
}

function tierScore(tier) {
  return (
    {
      C: 1,
      B: 2,
      A: 3,
      S: 4,
      SS: 5,
      UR: 6,
    }[String(tier || "").toUpperCase()] || 0
  );
}

function statEffectText(item) {
  const percent = item?.statPercent || item?.statBonus || {};
  const parts = [];
  if (Number(percent.atk || 0)) parts.push(`+${Number(percent.atk)}% ATK`);
  if (Number(percent.hp || 0)) parts.push(`+${Number(percent.hp)}% HP`);
  if (Number(percent.speed || 0)) parts.push(`+${Number(percent.speed)}% SPD`);
  return parts.length ? parts.join(" / ") : "No stat bonus";
}

function normalizeOwnerText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getOwnerDisplayName(ownerValue) {
  const q = normalizeOwnerText(ownerValue);

  if (!q) return null;

  const cards = getAllCards();

  const found =
    cards.find((card) => normalizeOwnerText(card.displayName) === q) ||
    cards.find((card) => normalizeOwnerText(card.name) === q) ||
    cards.find((card) => normalizeOwnerText(card.code) === q) ||
    cards.find((card) => normalizeOwnerText(card.displayName).includes(q)) ||
    cards.find((card) => q.includes(normalizeOwnerText(card.displayName)));

  return found?.displayName || null;
}

function formatOwnersByDisplayName(item, fallback = "Unknown") {
  const rawOwners = Array.isArray(item?.owners) ? item.owners : [];

  const ownerNames = rawOwners
    .map((owner) => getOwnerDisplayName(owner) || owner)
    .map((owner) => String(owner || "").trim())
    .filter(Boolean);

  const uniqueNames = [...new Set(ownerNames)];

  return uniqueNames.length ? uniqueNames.join(", ") : fallback;
}

function buildCardEmbed(card, index, total, mode) {
  const stageIndex = 0;
  const stageKey = "M1";
  const form = card.evolutionForms?.[stageIndex] || null;
  const baseStats = getBaseCardStats(card, form);

  const stageImage =
    form?.image ||
    card.stageImages?.[stageKey] ||
    getCardImage(card.code, stageKey, card.image) ||
    card.image ||
    "";

  const extraLines =
    mode === "boost"
      ? [
          `Role: ${card.cardRole}`,
          `Faction: ${card.faction || "Unknown"}`,
          `Form: ${form?.name || "M1"}`,
          `Effect: ${form?.effectText || card.effectText || "No effect text"}`,
          "",
          `Power: ${getCardPower(card, stageKey)}`,
        ]
      : [
          `Role: ${card.cardRole}`,
          `Type: ${card.type || "Battle"}`,
          `Form: ${form?.name || "M1"}`,
          `ATK: ${formatAtkRange(baseStats.atk)}`,
          `HP: ${baseStats.hp}`,
          `SPD: ${baseStats.speed}`,
          "",
          `Power: ${getCardPower(card, stageKey)}`,
        ];

  return buildCardStyleEmbed({
    color: mode === "boost" ? 0x9b59b6 : 0xe67e22,
    header: mode === "boost" ? "All Boost Cards" : "All Battle Cards",
    card: {
      ...card,
      atk: baseStats.atk,
      hp: baseStats.hp,
      speed: baseStats.speed,
      currentPower: getCardPower(card, stageKey),
      badgeImage: form?.badgeImage || card.badgeImage || "",
    },
    badgeImage: form?.badgeImage || card.badgeImage || "",
    image: stageImage,
    formName: form?.name || stageKey,
    tier: form?.tier || card.baseTier || card.rarity,
    footerText: `${mode === "boost" ? "Boost" : "Battle"} ${
      index + 1
    }/${total} • Code: ${card.code}`,
    extraLines,
  });
}

function buildWeaponEmbed(item, index, total) {
  const percent5 = getUpgradedWeaponPercent(item, 5);
  const effectText = [
    Number(percent5.atk || 0) ? `+${Number(percent5.atk || 0)}% ATK` : null,
    Number(percent5.hp || 0) ? `+${Number(percent5.hp || 0)}% HP` : null,
    Number(percent5.speed || 0) ? `+${Number(percent5.speed || 0)}% SPD` : null,
  ].filter(Boolean).join(" / ") || "No stat bonus";

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle("All Weapons")
    .setDescription(
      [
        `**${item.name || item.code}**`,
        item.type || "Weapon",
        "",
        `Rarity: ${String(item.rarity || "B").toUpperCase()}`,
        `Effect: ${effectText}`,
        `Description: ${item.description || "No description."}`,
        `Power: ${getWeaponPower(item, 5)}`,
        "",
        `Owners: ${formatOwnersByDisplayName(item, "General")}`,
      ].join("\n")
    )
    .setThumbnail(getRarityBadge(item.rarity || "B") || null)
    .setImage(getWeaponImage(item.code, item.image || "") || null)
    .setFooter({ text: `Weapon ${index + 1}/${total} • Code: ${item.code}` });
}

function buildFruitEmbed(item, index, total) {
  const effectText = statEffectText(item);

  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("All Devil Fruits")
    .setDescription(
      [
        `**${item.name || item.code}**`,
        item.type || "Devil Fruit",
        "",
        `Rarity: ${String(item.rarity || "B").toUpperCase()}`,
        `Effect: ${effectText}`,
        `Description: ${item.description || "No description."}`,
        `Power: ${getFruitPower(item)}`,
        "",
        `Owners: ${formatOwnersByDisplayName(item, "Unknown")}`,
      ].join("\n")
    )
    .setThumbnail(getRarityBadge(item.rarity || "B") || null)
    .setImage(getDevilFruitImage(item.code, item.image || "") || null)
    .setFooter({ text: `Fruit ${index + 1}/${total} • Code: ${item.code}` });
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

module.exports = {
  name: "all",
  aliases: ["allcards"],

  async execute(message, args) {
    const rawMode = String(args.join(" ").trim()).toLowerCase();
    const mode =
      rawMode === "boost"
        ? "boost"
        : rawMode === "weapon"
          ? "weapon"
          : rawMode === "fruit"
            ? "fruit"
            : "battle";

    let list = [];
    let renderer = null;

    if (mode === "battle" || mode === "boost") {
      list = getAllCards()
        .filter((c) => c.cardRole === mode)
        .sort((a, b) => {
          if (mode === "boost") {
            const tierDiff =
              tierScore(b?.evolutionForms?.[2]?.tier || b.currentTier || b.rarity) -
              tierScore(a?.evolutionForms?.[2]?.tier || a.currentTier || a.rarity);
            if (tierDiff !== 0) return tierDiff;

            const powerDiff = getCardPower(b) - getCardPower(a);
            if (powerDiff !== 0) return powerDiff;
          } else {
            const powerDiff = getCardPower(b) - getCardPower(a);
            if (powerDiff !== 0) return powerDiff;

            const tierDiff =
              tierScore(b?.evolutionForms?.[2]?.tier || b.currentTier || b.rarity) -
              tierScore(a?.evolutionForms?.[2]?.tier || a.currentTier || a.rarity);
            if (tierDiff !== 0) return tierDiff;
          }

          return String(a.displayName || a.name).localeCompare(
            String(b.displayName || b.name)
          );
        });

      renderer = (item, index, total) => buildCardEmbed(item, index, total, mode);
    }

    if (mode === "weapon") {
      list = [...weapons].sort((a, b) => {
        const powerDiff = getWeaponPower(b, 5) - getWeaponPower(a, 5);
        if (powerDiff !== 0) return powerDiff;

        const tierDiff = tierScore(b.rarity) - tierScore(a.rarity);
        if (tierDiff !== 0) return tierDiff;

        return String(a.name || a.code).localeCompare(String(b.name || b.code));
      });

      renderer = buildWeaponEmbed;
    }

    if (mode === "fruit") {
      list = [...devilFruits].sort((a, b) => {
        const powerDiff = getFruitPower(b) - getFruitPower(a);
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

    const collector = sent.createMessageComponentCollector({
      time: 10 * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({
          content: "Only you can control this viewer.",
          ephemeral: true,
        });
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