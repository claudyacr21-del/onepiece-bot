const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const { hydrateCard, findCardTemplate } = require("../utils/evolution");
const { buildCardStyleEmbed } = require("../utils/cardView");
const { getCardImage } = require("../config/assetLinks");

function getPower(card) {
  return Number(card.currentPower || 0);
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function getSafeForm(card) {
  const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
  const form = card.evolutionForms?.[stage - 1] || null;

  return {
    stage,
    name: form?.name || card.variant || card.displayName || card.name || "Unknown Card",
    badgeImage: form?.badgeImage || card.badgeImage || "",
    tier: form?.tier || card.currentTier || card.rarity || "C",
  };
}

function getStageImage(card) {
  const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
  const stageKey = `M${stage}`;

  return (
    card.evolutionForms?.[stage - 1]?.image ||
    card.stageImages?.[stageKey] ||
    getCardImage(card.code, stageKey, card.image) ||
    card.image ||
    ""
  );
}

function mergeOwnedCardWithLatestTemplate(rawCard) {
  const template = findCardTemplate(rawCard.code || rawCard.name || "");
  if (!template) return hydrateCard(rawCard);

  return hydrateCard({
    ...template,

    instanceId: rawCard.instanceId,
    ownerId: rawCard.ownerId,

    level: rawCard.level,
    xp: rawCard.xp,
    kills: rawCard.kills,
    fragments: rawCard.fragments,

    evolutionStage: rawCard.evolutionStage,
    evolutionKey: rawCard.evolutionKey,
    currentTier: rawCard.currentTier || template.currentTier,
    rarity: rawCard.rarity || template.rarity,

    equippedWeapons: Array.isArray(rawCard.equippedWeapons) ? rawCard.equippedWeapons : [],
    equippedWeapon: rawCard.equippedWeapon || null,
    equippedWeaponName: rawCard.equippedWeaponName || null,
    equippedWeaponCode: rawCard.equippedWeaponCode || null,
    equippedWeaponLevel: rawCard.equippedWeaponLevel || 0,

    equippedDevilFruit: rawCard.equippedDevilFruit || null,
    equippedDevilFruitName: rawCard.equippedDevilFruitName || null,

    cardRole: rawCard.cardRole || template.cardRole,
  });
}

function buildViewerEmbed(ownerName, card, index, total, label = "Collection") {
  const form = getSafeForm(card);
  const stageImage = getStageImage(card);
  const atkMin = Math.floor((card.atk || 0) * 0.85);
  const atkMax = Math.floor((card.atk || 0) * 1.15);
  const extraLines =
    card.cardRole === "boost"
      ? [
          `Form: ${card.evolutionKey || `M${form.stage}`}`,
          `Tier: ${card.currentTier || card.rarity || "C"}`,
          `Power: ${getPower(card)}`,
          `Effect: ${card.effectText || "No effect text"}`,
          `Target: ${card.boostTarget || "team"}`,
          `Boost Type: ${card.boostType || "unknown"}`,
          `Fragments: ${card.fragments || 0}`,
        ]
      : [
          `Form: ${card.evolutionKey || `M${form.stage}`}`,
          `Tier: ${card.currentTier || card.rarity || "C"}`,
          `Level: ${card.level || 1}`,
          `Power: ${getPower(card)}`,
          `Health: ${card.hp}`,
          `Speed: ${card.speed}`,
          `Attack: ${atkMin}-${atkMax}`,
          `Weapons: ${card.displayWeaponName || "None"}`,
          `Devil Fruit: ${card.displayFruitName || "None"}`,
          `Type: ${card.type || card.cardRole || "Unknown"}`,
          `Kills: ${card.kills || 0}`,
          `Fragments: ${card.fragments || 0}`,
        ];

  return buildCardStyleEmbed({
    color: card.cardRole === "boost" ? 0x9b59b6 : 0x3498db,
    ownerName,
    card,
    badgeImage: form.badgeImage,
    image: stageImage,
    formName: form.name,
    tier: form.tier,
    footerText: `${label} ${index + 1}/${total} • This card belongs to ${ownerName}`,
    extraLines,
  });
}

function buildRows(index, total) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("mc_prev")
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index <= 0),
      new ButtonBuilder()
        .setCustomId("mc_next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index >= total - 1)
    ),
  ];
}

function dedupeCollection(cards) {
  const map = new Map();

  for (const card of cards) {
    const key = String(card.code || "").toLowerCase();
    if (!key) continue;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, card);
      continue;
    }

    if (getPower(card) > getPower(existing)) {
      map.set(key, card);
      continue;
    }

    if (
      getPower(card) === getPower(existing) &&
      Number(card.evolutionStage || 1) > Number(existing.evolutionStage || 1)
    ) {
      map.set(key, card);
    }
  }

  return [...map.values()];
}

function buildTextLines(cards) {
  const uniqueCards = dedupeCollection(cards);

  return uniqueCards.map((card, i) => {
    const rarity = String(card.currentTier || card.rarity || "C").toUpperCase();
    const name = card.displayName || card.name || "Unknown Card";
    const stage = card.evolutionKey || `M${card.evolutionStage || 1}`;
    const power = getPower(card);
    const level = Number(card.level || 1);

    if (card.cardRole === "boost") {
      return [
        `${i + 1}. **${name}** | ${stage} | ${power}`,
        `${card.effectText || "No effect text"} | ${rarity} | Lv.${level}`,
      ].join("\n");
    }

    const currentHp = card.hp;
    const currentSpd = card.speed;
    const atkRange = formatAtkRange(card.atk);

    return [
      `${i + 1}. **${name}** | ${stage} | ${power} | ${currentHp}/${currentHp} | ${currentSpd} | ${atkRange}`,
      `${rarity} | Lv.${level}`,
    ].join("\n");
  });
}

function buildTextPageEmbed(ownerName, lines, pageIndex, pageSize = 10) {
  const start = pageIndex * pageSize;
  const pageLines = lines.slice(start, start + pageSize);

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`${ownerName}'s Card Collection`)
    .setDescription(pageLines.join("\n\n"))
    .setFooter({
      text: `Showing ${start + 1}-${Math.min(start + pageSize, lines.length)} of ${lines.length} unique entries`,
    });
}

function buildTextRows(pageIndex, totalPages) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("mc_text_prev")
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex <= 0),
      new ButtonBuilder()
        .setCustomId("mc_text_next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex >= totalPages - 1)
    ),
  ];
}

module.exports = {
  name: "mc",
  aliases: ["mycards"],

  async execute(message, args) {
    const player = getPlayer(message.author.id, message.author.username);
    const {
      getPlayerCombatCards,
    } = require("../utils/combatStats");

    const cards = getPlayerCombatCards(player);

    if (!cards.length) {
      return message.reply("You do not own any cards yet.");
    }

    const sub1 = String(args?.[0] || "").toLowerCase();

    let working = [...cards];
    let title = "Collection";

    if (sub1 === "boost") {
      working = working.filter((card) => card.cardRole === "boost");
      title = "Boost Collection";
    }

    if (!working.length) {
      return message.reply(
        sub1 === "boost"
          ? "You do not own any boost cards yet."
          : "You do not own any cards yet."
      );
    }

    working.sort((a, b) => {
      const powerDiff = getPower(b) - getPower(a);
      if (powerDiff !== 0) return powerDiff;

      if ((a.cardRole || "") !== (b.cardRole || "")) {
        return String(a.cardRole || "").localeCompare(String(b.cardRole || ""));
      }

      return String(a.displayName || a.name).localeCompare(
        String(b.displayName || b.name)
      );
    });

    if (sub1 === "text") {
      const lines = buildTextLines(working);
      const pageSize = 10;
      const totalPages = Math.max(1, Math.ceil(lines.length / pageSize));
      let pageIndex = 0;

      const sent = await message.reply({
        embeds: [buildTextPageEmbed(message.author.username, lines, pageIndex, pageSize)],
        components: buildTextRows(pageIndex, totalPages),
      });

      const collector = sent.createMessageComponentCollector({
        time: 10 * 60 * 1000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== message.author.id) {
          return i.reply({
            content: "Only you can control this text viewer.",
            ephemeral: true,
          });
        }

        if (i.customId === "mc_text_prev") pageIndex = Math.max(0, pageIndex - 1);
        if (i.customId === "mc_text_next") pageIndex = Math.min(totalPages - 1, pageIndex + 1);

        return i.update({
          embeds: [buildTextPageEmbed(message.author.username, lines, pageIndex, pageSize)],
          components: buildTextRows(pageIndex, totalPages),
        });
      });

      collector.on("end", async () => {
        try {
          await sent.edit({ components: [] });
        } catch {}
      });

      return;
    }

    let index = 0;

    const sent = await message.reply({
      embeds: [
        buildViewerEmbed(
          message.author.username,
          working[index],
          index,
          working.length,
          title
        ),
      ],
      components: buildRows(index, working.length),
    });

    const collector = sent.createMessageComponentCollector({
      time: 10 * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({
          content: "Only you can control this card viewer.",
          ephemeral: true,
        });
      }

      if (i.customId === "mc_prev") index = Math.max(0, index - 1);
      if (i.customId === "mc_next") index = Math.min(working.length - 1, index + 1);

      return i.update({
        embeds: [
          buildViewerEmbed(
            message.author.username,
            working[index],
            index,
            working.length,
            title
          ),
        ],
        components: buildRows(index, working.length),
      });
    });

    collector.on("end", async () => {
      try {
        await sent.edit({ components: [] });
      } catch {}
    });
  },
};