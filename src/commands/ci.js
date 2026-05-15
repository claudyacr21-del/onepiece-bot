const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const {
  findCardTemplate,
  findOwnedCard,
  hydrateCard,
  getAllCards,
} = require("../utils/evolution");
const { buildCardStyleEmbed } = require("../utils/cardView");
const { getCardImage, getRarityBadge } = require("../config/assetLinks");

const cardsData = require("../data/cards");

const SPECIAL_FORMS = cardsData.SPECIAL_FORMS || cardsData.specialForms || {
  luffy_straw_hat: ["The Beginning", "Revival", "Gear 5"],
};

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function getAllGlobalCard(card) {
  const code = String(card?.code || "").toLowerCase();

  if (!code) return card;

  return (
    getAllCards().find(
      (entry) => String(entry.code || "").toLowerCase() === code
    ) || card
  );
}

function getAllGlobalPower(card) {
  return Number(card?.currentPower || card?.powerCaps?.M3 || 0);
}

function getStageRawForm(card, stage) {
  return card?.evolutionForms?.[stage - 1] || {};
}

function getStageRawStat(card, stageCard, stage, key, fallbackKey = key) {
  const form = getStageRawForm(card, stage);

  return (
    form?.[key] ??
    form?.[fallbackKey] ??
    card?.stageStats?.[`M${stage}`]?.[key] ??
    card?.stageStats?.[`M${stage}`]?.[fallbackKey] ??
    card?.stats?.[`M${stage}`]?.[key] ??
    card?.stats?.[`M${stage}`]?.[fallbackKey] ??
    stageCard?.[key] ??
    stageCard?.[fallbackKey] ??
    card?.[key] ??
    card?.[fallbackKey] ??
    0
  );
}

function getStageRawPower(card, stageCard, stage) {
  const form = getStageRawForm(card, stage);
  const stageKey = `M${stage}`;

  return Number(
    form?.currentPower ??
      form?.power ??
      form?.powerCaps?.[stageKey] ??
      card?.powerCaps?.[stageKey] ??
      stageCard?.currentPower ??
      card?.currentPower ??
      card?.powerCaps?.M3 ??
      0
  );
}

function getStageDisplayStats(card, stageCard, stage) {
  if (Number(stage) === 3) {
    const allGlobalCard = getAllGlobalCard(card);

    return {
      source: allGlobalCard,
      atk: Number(allGlobalCard?.atk || 0),
      hp: Number(allGlobalCard?.hp || 0),
      speed: Number(allGlobalCard?.speed || 0),
      power: getAllGlobalPower(allGlobalCard),
    };
  }

  return {
    source: card,
    atk: Number(getStageRawStat(card, stageCard, stage, "atk") || 0),
    hp: Number(getStageRawStat(card, stageCard, stage, "hp") || 0),
    speed: Number(getStageRawStat(card, stageCard, stage, "speed", "spd") || 0),
    power: getStageRawPower(card, stageCard, stage),
  };
}

function prettifyCode(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatReqEntry(entry) {
  if (!entry) return "Unknown";

  if (typeof entry === "string") {
    return prettifyCode(entry);
  }

  const name = entry.name || entry.displayName || prettifyCode(entry.code);
  const stage = Number(entry.stage || 1);

  return `${name} M${stage}`;
}

function getReqLines(req, key, textKey) {
  if (Array.isArray(req?.[key]) && req[key].length) {
    return req[key].map((entry) => `↪ ${formatReqEntry(entry)}`);
  }

  if (Array.isArray(req?.[textKey]) && req[textKey].length) {
    return req[textKey].map((entry) => `↪ ${entry}`);
  }

  return ["↪ None"];
}

function getStageCard(card, stage) {
  return hydrateCard({
    ...card,
    evolutionStage: stage,
    evolutionKey: `M${stage}`,
  });
}

function getDefaultAwakenGemsCostForStage(stage) {
  const targetStage = Number(stage || 1);

  if (targetStage === 2) return 750;
  if (targetStage === 3) return 1500;

  return 0;
}

function getDisplayAwakenGemsCost(req, stage) {
  if (req && Object.prototype.hasOwnProperty.call(req, "gems")) {
    return Number(req.gems || 0);
  }

  return getDefaultAwakenGemsCostForStage(stage);
}

function buildReqEmbed(card, stage) {
  const stageCard = getStageCard(card, stage);
  const req =
    stageCard.awakenRequirements?.[`M${stage}`] ||
    card.awakenRequirements?.[`M${stage}`];

  if (!req) {
    return new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(
        `ℹ️ Requirement • ${
          stageCard.displayName || card.displayName || card.name
        } • M${stage}`
      )
      .setDescription("Base form.\nNo requirement.");
  }

  const levelText =
    stageCard.cardRole === "battle" ? Number(req.minLevel || 0) : "Not required";

  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(
      `ℹ️ Requirement • ${
        stageCard.displayName || card.displayName || card.name
      } • M${stage}`
    )
    .setDescription(
      [
        "**Requirement Panel**",
        "",
        "**Berries Required**",
        `↪ ${Number(req.berries || 0).toLocaleString("en-US")}`,
        "",
        "**Gems Required**",
        `↪ ${getDisplayAwakenGemsCost(req, stage).toLocaleString("en-US")}`,
        "",
        "**Self Fragments Required**",
        `↪ ${Number(req.selfFragments || 0)}x ${
          stageCard.displayName || card.displayName || card.name
        }`,
        "",
        "**Level Requirement**",
        `↪ ${levelText}`,
        "",
        "**Cards Required**",
        ...getReqLines(req, "cards", "cardsText"),
        "",
        "✨ **Boosts Required**",
        ...getReqLines(req, "boosts", "boostsText"),
      ].join("\n")
    );
}

function getStageImage(card, stageCard, stage) {
  const stageKey = `M${stage}`;

  return (
    stageCard?.evolutionForms?.[stage - 1]?.image ||
    card.evolutionForms?.[stage - 1]?.image ||
    stageCard?.stageImages?.[stageKey] ||
    card.stageImages?.[stageKey] ||
    getCardImage(
      card.code,
      stageKey,
      stageCard?.stageImages?.[stageKey] ||
        card.stageImages?.[stageKey] ||
        stageCard?.image ||
        card.image ||
        ""
    ) ||
    stageCard?.image ||
    card.image ||
    ""
  );
}

function getStageBadge(card, stageCard, stage) {
  const form =
    stageCard?.evolutionForms?.[stage - 1] || card.evolutionForms?.[stage - 1];

  return (
    form?.badgeImage ||
    getRarityBadge(form?.tier || stageCard?.currentTier || card.rarity)
  );
}

function getStageLabel(stage) {
  return `M${Number(stage || 1)}`;
}

function isBadSpecialFormName(value) {
  const text = String(value || "").trim().toLowerCase();

  return !text || ["base", "m1", "m2", "m3", "unknown form"].includes(text);
}

function getSpecialFormName(card, stageCard, form, stage) {
  const stageIndex = Math.max(0, Number(stage || 1) - 1);
  const code = String(card?.code || stageCard?.code || "").trim();

  const candidates = [
    stageCard?.specialForms?.[stageIndex],
    stageCard?.special_forms?.[stageIndex],
    card?.specialForms?.[stageIndex],
    card?.special_forms?.[stageIndex],
    SPECIAL_FORMS?.[code]?.[stageIndex],
    stageCard?.evolutionForms?.[stageIndex]?.specialName,
    card?.evolutionForms?.[stageIndex]?.specialName,
    stageCard?.evolutionForms?.[stageIndex]?.formTitle,
    card?.evolutionForms?.[stageIndex]?.formTitle,
    form?.specialName,
    form?.formTitle,
    form?.name,
    form?.formName,
    stageCard?.evolutionForms?.[stageIndex]?.name,
    card?.evolutionForms?.[stageIndex]?.name,
    stageCard?.evolutionForms?.[stageIndex]?.formName,
    card?.evolutionForms?.[stageIndex]?.formName,
  ];

  const found = candidates.find((value) => !isBadSpecialFormName(value));

  return found || getStageLabel(stage);
}

function buildEmbed(card, owned, stage) {
  const stageCard = getStageCard(card, stage);
  const form =
    stageCard.evolutionForms?.[stage - 1] || card.evolutionForms?.[stage - 1];

  const stageLabel = getStageLabel(stage);
  const specialFormName = getSpecialFormName(card, stageCard, form, stage);
  const stageImage = getStageImage(card, stageCard, stage);
  const stageBadge = getStageBadge(card, stageCard, stage);
  const displayStats = getStageDisplayStats(card, stageCard, stage);
  const statSource = displayStats.source || card;

  const extraLines =
    stageCard.cardRole === "boost"
      ? [
          `Form: ${stageLabel}`,
          `Tier: ${form?.tier || stageCard.currentTier || stageCard.rarity}`,
          `Role: ${stageCard.cardRole}`,
          `Power: ${displayStats.power}`,
          `Effect: ${
            form?.effectText || stageCard.effectText || "No effect text"
          }`,
          `Target: ${stageCard.boostTarget || "team"}`,
          `Boost Type: ${stageCard.boostType || "unknown"}`,
          `Fragments: ${Number(owned?.fragments || 0)}`,
        ]
      : [
          `Form: ${stageLabel}`,
          `Tier: ${form?.tier || stageCard.currentTier || stageCard.rarity}`,
          `Role: ${statSource.cardRole || card.cardRole || stageCard.cardRole}`,
          `Power: ${displayStats.power}`,
          `Type: ${statSource.type || card.type || stageCard.type || "Battle"}`,
          "",
          `ATK: ${formatAtkRange(displayStats.atk)}`,
          `HP: ${Number(displayStats.hp || 0)}`,
          `SPD: ${Number(displayStats.speed || 0)}`,
          `Weapon Set: ${statSource.weapon || card.weapon || "None"}`,
          `Devil Fruit: ${statSource.devilFruit || card.devilFruit || "None"}`,
        ];

  return buildCardStyleEmbed({
    color: 0x5865f2,
    header: "Global Card Viewer",
    card: stageCard,
    image: stageImage,
    badgeImage: stageBadge,
    formName: specialFormName,
    tier: form?.tier || stageCard.currentTier || stageCard.rarity,
    footerText: "Global Card Viewer • Not required to own the card",
    extraLines,
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

function normalizeNameSearch(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function scoreNameOnly(query, names) {
  const q = normalizeNameSearch(query);
  if (!q) return 0;

  let best = 0;

  for (const raw of names) {
    const name = normalizeNameSearch(raw);
    if (!name) continue;

    if (name === q) best = Math.max(best, 1000 + name.length);
    else if (name.startsWith(q)) best = Math.max(best, 700 + q.length);
    else if (name.includes(q)) best = Math.max(best, 400 + q.length);
    else {
      const words = q.split(" ").filter(Boolean);
      if (words.length && words.every((word) => name.includes(word))) {
        best = Math.max(best, 250 + words.join("").length);
      }
    }
  }

  return best;
}

function findCardTemplateByNameOnly(query) {
  const scored = getAllCards()
    .map((card) => ({
      card,
      score: scoreNameOnly(query, [
        card.displayName,
        card.name,
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].card : null;
}

  async execute(message, args) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("Usage: `op ci <card>`");

    const player = getPlayer(message.author.id, message.author.username);
    const globalCard = findCardTemplateByNameOnly(query);

    if (!globalCard) return message.reply("Card not found in global database.");

    const owned = findOwnedCard(player.cards || [], query);
    let stage = 1;

    const sent = await message.reply({
      embeds: [buildEmbed(globalCard, owned, stage)],
      components: buildRows(stage),
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

      if (i.customId === "ci_prev") stage = Math.max(1, stage - 1);
      if (i.customId === "ci_next") stage = Math.min(3, stage + 1);

      if (i.customId === "ci_info") {
        return i.reply({
          ephemeral: true,
          embeds: [buildReqEmbed(globalCard, stage)],
        });
      }

      return i.update({
        embeds: [buildEmbed(globalCard, owned, stage)],
        components: buildRows(stage),
      });
    });
  },
};