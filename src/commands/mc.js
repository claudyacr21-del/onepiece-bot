const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const { buildCardStyleEmbed } = require("../utils/cardView");
const { getCardImage } = require("../config/assetLinks");

function getPower(card) {
  return Math.floor(
    Number(card.atk || 0) * 1.4 +
      Number(card.hp || 0) * 0.22 +
      Number(card.speed || 0) * 9
  );
}

function formatOwnedWeapons(card) {
  if (Array.isArray(card.equippedWeapons) && card.equippedWeapons.length) {
    return card.equippedWeapons
      .map(
        (w) =>
          `${w.name}${Number(w.upgradeLevel || 0) > 0 ? ` +${w.upgradeLevel}` : ""}`
      )
      .join(", ");
  }
  return card.equippedWeapon || "None";
}

function getSafeForm(card) {
  const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
  const form = card.evolutionForms?.[stage - 1] || null;

  return {
    stage,
    name:
      form?.name ||
      card.variant ||
      card.displayName ||
      card.name ||
      "Unknown Card",
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

function buildViewerEmbed(ownerName, card, index, total, label = "Collection") {
  const form = getSafeForm(card);
  const stageImage = getStageImage(card);

  return buildCardStyleEmbed({
    color: card.cardRole === "boost" ? 0x9b59b6 : 0x3498db,
    ownerName,
    card,
    badgeImage: form.badgeImage,
    image: stageImage,
    formName: form.name,
    tier: form.tier,
    footerText: `${label} ${index + 1}/${total} • This card belongs to ${ownerName}`,
    extraLines: [
      `Form: ${card.evolutionKey || `M${form.stage}`}`,
      `Tier: ${card.currentTier || card.rarity || "C"}`,
      `Level: ${card.level || 1}`,
      `Power: ${getPower(card)}`,
      `Health: ${card.hp || 0}`,
      `Speed: ${card.speed || 0}`,
      `Attack: ${card.atk || 0}`,
      `Weapons: ${formatOwnedWeapons(card)}`,
      `Devil Fruit: ${card.equippedDevilFruit || "None"}`,
      card.cardRole === "boost"
        ? `Effect: ${card.effectText || "No effect text"}`
        : `Type: ${card.type || card.cardRole || "Unknown"}`,
      `Kills: ${card.kills || 0}`,
      `Fragments: ${card.fragments || 0}`,
    ],
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
    }
  }

  return [...map.values()];
}

function buildTextEmbeds(ownerName, cards) {
  const uniqueCards = dedupeCollection(cards);
  const lines = uniqueCards.map((card, i) => {
    const role = card.cardRole === "boost" ? "BOOST" : "CARD";
    const rarity = String(card.currentTier || card.rarity || "C").toUpperCase();
    const name = card.displayName || card.name || "Unknown Card";
    const stage = card.evolutionKey || `M${card.evolutionStage || 1}`;
    const power = getPower(card);

    return `${i + 1}. **${name}** • ${role} • ${stage} • ${rarity} • ${power}`;
  });

  const chunkSize = 20;
  const embeds = [];

  for (let i = 0; i < lines.length; i += chunkSize) {
    embeds.push(
      new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`${ownerName}'s Collection`)
        .setDescription(
          [
            "You are viewing your collection in text mode!",
            "Cards and boosts are combined in one list.",
            "",
            ...lines.slice(i, i + chunkSize),
          ].join("\n")
        )
        .setFooter({
          text: `Showing ${i + 1}-${Math.min(i + chunkSize, lines.length)} of ${lines.length} unique entries`,
        })
    );
  }

  return embeds;
}

module.exports = {
  name: "mc",
  aliases: ["mycards"],

  async execute(message, args) {
    const player = getPlayer(message.author.id, message.author.username);
    const cards = (player.cards || []).map(hydrateCard).filter(Boolean);

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
        return String(a.cardRole || "").localeCompare(
          String(b.cardRole || "")
        );
      }

      return String(a.displayName || a.name).localeCompare(
        String(b.displayName || b.name)
      );
    });

    if (sub1 === "text") {
      return message.reply({
        embeds: buildTextEmbeds(message.author.username, working),
      });
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
      } catch (_) {}
    });
  },
};