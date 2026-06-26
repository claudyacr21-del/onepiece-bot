const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("../playerStore");
const { getAutoSacSettings, normalize } = require("../utils/autoSac");
const rawCards = require("../data/cards");
const rawWeapons = require("../data/weapons");

function normalizeCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getSearchWords(value) {
  return normalize(value)
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);
}

function scoreQuery(query, candidates) {
  const q = normalize(query);
  if (!q) return 0;

  const queryWords = getSearchWords(q);
  if (!queryWords.length) return 0;

  let best = 0;

  for (const raw of candidates.filter(Boolean)) {
    const value = normalize(raw);
    if (!value) continue;

    const valueWords = getSearchWords(value);
    if (!valueWords.length) continue;

    // Exact full name match: "fish karate" only matches "fish karate".
    if (value === q) {
      best = Math.max(best, 1000 + value.length);
      continue;
    }

    // Single word must match a full word only.
    // Example: "fish" can match names with word fish, but not partial text.
    if (queryWords.length === 1) {
      if (valueWords.includes(queryWords[0])) {
        best = Math.max(best, 850 + queryWords[0].length);
      }

      continue;
    }

    // Multiple words must match full words only and same amount of words.
    // This prevents:
    // "fish karate" matching "fishman karate"
    // "fish karate" matching "fish man karate"
    if (
      queryWords.length === valueWords.length &&
      queryWords.every((word, index) => valueWords[index] === word)
    ) {
      best = Math.max(best, 750 + queryWords.join("").length);
    }
  }

  return best;
}

function toTargetFromCard(card) {
  return {
    code: card.code || null,
    name: card.displayName || card.name || card.code || "Unknown Card",
    rarity: card.baseTier || card.rarity || "C",
    category: String(card.cardRole || "").toLowerCase() === "boost" ? "boost" : "battle",
  };
}

function toTargetFromWeapon(weapon) {
  return {
    code: `weapon_fragment_${weapon.code}`,
    name: `${weapon.name} Fragment`,
    rarity: weapon.rarity || "C",
    category: "weapon",
    weaponCode: weapon.code,
  };
}

function findCardTemplate(query) {
  const cards = Array.isArray(rawCards) ? rawCards : [];

  const scored = cards
    .map((card) => ({
      card,
      score: scoreQuery(query, [
        card.name,
        card.displayName,
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const aName = normalize(a.card.displayName || a.card.name || "");
      const bName = normalize(b.card.displayName || b.card.name || "");

      return aName.length - bName.length;
    });

  return scored.length ? toTargetFromCard(scored[0].card) : null;
}

function findWeaponTemplate(query) {
  const weapons = Array.isArray(rawWeapons) ? rawWeapons : [];

  const scored = weapons
    .map((weapon) => ({
      weapon,
      score: scoreQuery(query, [
        weapon.name,
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const aName = normalize(a.weapon.name || "");
      const bName = normalize(b.weapon.name || "");

      return aName.length - bName.length;
    });

  return scored.length ? toTargetFromWeapon(scored[0].weapon) : null;
}

function makeFallbackTarget(query) {
  const code = normalizeCode(query);

  return {
    code,
    name: query
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
    rarity: "C",
    category: "battle",
  };
}

function findSafeTarget(query) {
  return findCardTemplate(query) || findWeaponTemplate(query) || makeFallbackTarget(query);
}

function isSameEntry(entry, target) {
  const entryCode = normalizeCode(entry?.code || entry?.weaponCode || "");
  const entryName = normalize(entry?.name || entry?.displayName || "");
  const targetCode = normalizeCode(target?.code || target?.weaponCode || "");
  const targetName = normalize(target?.name || target?.displayName || "");

  return (
    (entryCode && targetCode && entryCode === targetCode) ||
    (entryName && targetName && entryName === targetName)
  );
}

function formatSafeCards(cards) {
  if (!Array.isArray(cards) || !cards.length) {
    return "No safelisted cards yet.";
  }

  return cards
    .map((card, index) => {
      const name = card.name || card.code || "Unknown Card";
      const rarity = String(card.rarity || "C").toUpperCase();
      const category = card.category ? ` • ${card.category}` : "";
      return `${index + 1}. **${name}** • ${rarity}${category}`;
    })
    .join("\n");
}

module.exports = {
  name: "sacsafe",
  aliases: ["safesac", "safelist"],

  async execute(message, args) {
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply({
        content: "Usage: `op sacsafe <card/weapon/fragment name>`",
        allowedMentions: { repliedUser: false },
      });
    }

    let target = findSafeTarget(query);
    let safeCards = [];
    let action = "added to";
    let color = 0x2ecc71;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const settings = getAutoSacSettings(fresh);
          safeCards = Array.isArray(settings.safeCards) ? [...settings.safeCards] : [];
          let cards = Array.isArray(settings.cards) ? [...settings.cards] : [];

          target = findSafeTarget(query);

          const existingIndex = safeCards.findIndex((entry) =>
            isSameEntry(entry, target)
          );

          if (existingIndex !== -1) {
            safeCards.splice(existingIndex, 1);
            action = "removed from";
            color = 0xe74c3c;
          } else {
            safeCards.push({
              code: target.code || null,
              name: target.name || query,
              rarity: target.rarity || "C",
              category: target.category || "battle",
              weaponCode: target.weaponCode || undefined,
            });

            cards = cards.filter((entry) => !isSameEntry(entry, target));
            action = "added to";
            color = 0x2ecc71;
          }

          return {
            ...fresh,
            autoSac: {
              ...settings,
              cards,
              safeCards,
            },
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to update safelist.",
        allowedMentions: { repliedUser: false },
      });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setTitle("Safe-Sacrifice Updated")
          .setDescription(
            [
              `**${target.name || query}** has been ${action} your safelist.`,
              "",
              "You do not need to own the fragment first.",
              "",
              "**Safelisted Cards**",
              formatSafeCards(safeCards),
            ].join("\n")
          )
          .setFooter({ text: "One Piece Bot • Safe Sacrifice" }),
      ],
      allowedMentions: { repliedUser: false },
    });
  },
};