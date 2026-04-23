const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const { findOwnedCard } = require("../utils/evolution");
const { buildCardStyleEmbed } = require("../utils/cardView");
const { getCardImage, getDevilFruitImage, getRarityBadge } = require("../config/assetLinks");
const devilFruitsDb = require("../data/devilFruits");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/^model:\s*/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function getCurrentForm(card) {
  const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
  return card.evolutionForms?.[stage - 1] || null;
}

function getCurrentStageImage(card) {
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

function scoreQuery(query, candidates) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;

  for (const raw of candidates) {
    const candidate = normalize(raw);
    if (!candidate) continue;

    if (candidate === q) {
      best = Math.max(best, 1000 + candidate.length);
      continue;
    }

    if (candidate.startsWith(q)) {
      best = Math.max(best, 700 + q.length);
      continue;
    }

    if (candidate.includes(q)) {
      best = Math.max(best, 400 + q.length);
      continue;
    }

    const qWords = q.split(" ").filter(Boolean);
    if (qWords.length && qWords.every((w) => candidate.includes(w))) {
      best = Math.max(best, 250 + qWords.join("").length);
    }
  }

  return best;
}

function findFruitTemplate(value) {
  const q = normalize(value);
  if (!q) return null;

  return (
    devilFruitsDb.find((item) => normalize(item.code) === q) ||
    devilFruitsDb.find((item) => normalize(item.name) === q) ||
    devilFruitsDb.find((item) => normalize(item.code).includes(q)) ||
    devilFruitsDb.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

function buildOwnedFruitPool(player) {
  const fruits = new Map();

  for (const entry of Array.isArray(player.devilFruits) ? player.devilFruits : []) {
    const template = findFruitTemplate(entry.code || entry.name);
    if (!template) continue;

    const key = String(template.code);
    const existing = fruits.get(key) || {
      ...template,
      amount: 0,
      equippedOn: [],
    };

    existing.amount += Math.max(1, Number(entry.amount || 1));
    fruits.set(key, existing);
  }

  for (const rawCard of Array.isArray(player.cards) ? player.cards : []) {
    if (!rawCard.equippedDevilFruit) continue;

    const template = findFruitTemplate(
      rawCard.equippedDevilFruitName || rawCard.equippedDevilFruit
    );
    if (!template) continue;

    const key = String(template.code);
    const existing = fruits.get(key) || {
      ...template,
      amount: 0,
      equippedOn: [],
    };

    existing.equippedOn.push(rawCard.displayName || rawCard.name || rawCard.code);
    fruits.set(key, existing);
  }

  return [...fruits.values()];
}

function findOwnedFruit(player, query) {
  const pool = buildOwnedFruitPool(player);

  const scored = pool
    .map((fruit) => {
      const score = scoreQuery(query, [
        fruit.name,
        fruit.code,
        fruit.type,
      ]);
      return { fruit, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].fruit : null;
}

function buildOwnedFruitEmbed(ownerName, fruit) {
  const percent = fruit.statPercent || fruit.statBonus || { atk: 0, hp: 0, speed: 0 };
  const equippedText =
    Array.isArray(fruit.equippedOn) && fruit.equippedOn.length
      ? fruit.equippedOn.join(", ")
      : "Not equipped";

  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`${ownerName}'s Devil Fruit`)
    .setDescription(
      [
        `**${fruit.name}**`,
        `${fruit.type || "Devil Fruit"}`,
        "",
        `Rarity: ${String(fruit.rarity || "B").toUpperCase()}`,
        `ATK: +${Number(percent.atk || 0)}%`,
        `HP: +${Number(percent.hp || 0)}%`,
        `SPD: +${Number(percent.speed || 0)}%`,
        `Owned Amount: ${Math.max(0, Number(fruit.amount || 0))}`,
        `Equipped On: ${equippedText}`,
        "",
        `${fruit.description || "No description."}`,
      ].join("\n")
    )
    .setThumbnail(getRarityBadge(fruit.rarity || "B") || null)
    .setImage(getDevilFruitImage(fruit.code, fruit.image || "") || null)
    .setFooter({ text: `Owned devil fruit info • ${ownerName}` });
}

function buildOwnedCardEmbed(ownerName, card) {
  const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
  const form = getCurrentForm(card);
  const stageImage = getCurrentStageImage(card);

  const extraLines =
    card.cardRole === "boost"
      ? [
          `Form: ${card.evolutionKey || `M${stage}`}`,
          `Tier: ${card.currentTier || card.rarity}`,
          `Power: ${Number(card.currentPower || 0)}`,
          `Effect: ${card.effectText || "No effect text"}`,
          `Target: ${card.boostTarget || "team"}`,
          `Boost Type: ${card.boostType || "unknown"}`,
          `Fragments: ${Number(card.fragments || 0)}`,
        ]
      : [
          `Form: ${card.evolutionKey || `M${stage}`}`,
          `Tier: ${card.currentTier || card.rarity}`,
          `Level: ${Number(card.level || 1)}`,
          `Power: ${Number(card.currentPower || 0)}`,
          `Health: ${Number(card.hp || 0)}`,
          `Speed: ${Number(card.speed || 0)}`,
          `Attack: ${formatAtkRange(card.atk)}`,
          `Weapons: ${card.displayWeaponName || "None"}`,
          `Devil Fruit: ${card.displayFruitName || "None"}`,
          `Type: ${card.type || card.cardRole}`,
          `Kills: ${Number(card.kills || 0)}`,
          `Fragments: ${Number(card.fragments || 0)}`,
        ];

  return buildCardStyleEmbed({
    color: 0x1abc9c,
    ownerName,
    card,
    image: stageImage,
    badgeImage: form?.badgeImage || card.badgeImage || "",
    formName: form?.name || card.variant || "Unknown Form",
    tier: card.currentTier || card.rarity,
    footerText: `Owned card info • ${ownerName}`,
    extraLines,
  });
}

module.exports = {
  name: "mci",
  aliases: ["mycardinfo"],

  async execute(message, args) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("Usage: `op mci <card or devil fruit>`");

    const player = getPlayer(message.author.id, message.author.username);

    const ownedFruit = findOwnedFruit(player, query);
    if (ownedFruit) {
      return message.reply({
        embeds: [buildOwnedFruitEmbed(message.author.username, ownedFruit)],
      });
    }

    const card = findOwnedCard(player.cards || [], query);
    if (!card) {
      return message.reply("You do not own that card or devil fruit.");
    }

    return message.reply({
      embeds: [buildOwnedCardEmbed(message.author.username, card)],
    });
  },
};