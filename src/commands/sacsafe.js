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

function normalizeNameOnly(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ");
}

function stripFragmentSuffix(value) {
  return String(value || "")
    .replace(/\s+fragment$/i, "")
    .trim();
}

function getNameOnlyCandidates(item = {}) {
  const itemName =
    String(item.name || "")
      .trim();

  if (!itemName) {
    return [];
  }

  return [
    itemName,
    stripFragmentSuffix(
      itemName
    ),
  ]
    .map((name) =>
      normalizeNameOnly(name)
    )
    .filter(Boolean);
}

function scoreNameOnlyQuery(query, item = {}) {
  const q = normalizeNameOnly(query);

  if (!q) {
    return 0;
  }

  const queryWords =
    q.split(" ")
      .filter(Boolean);

  const candidates =
    getNameOnlyCandidates(item);

  let best = 0;

  for (const name of candidates) {
    if (name === q) {
      best = Math.max(
        best,
        10000 + name.length
      );

      continue;
    }

    const nameWords =
      name.split(" ")
        .filter(Boolean);

    const matchesWholeWords =
      queryWords.length > 0 &&
      queryWords.every(
        (word) =>
          nameWords.includes(word)
      );

    if (matchesWholeWords) {
      best = Math.max(
        best,
        7000 +
          queryWords
            .join("")
            .length
      );
    }
  }

  return best;
}

function findBestNameOnlyMatch(items = [], query) {
  const scored = items
    .map((item) => ({
      item,
      score: scoreNameOnlyQuery(query, item),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].item : null;
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

  const found = findBestNameOnlyMatch(
    cards.filter(
      (card) =>
        String(card.code || "").toLowerCase() !== "imu"
    ),
    query
  );

  return found ? toTargetFromCard(found) : null;
}

function findWeaponTemplate(query) {
  const weapons = Array.isArray(rawWeapons) ? rawWeapons : [];

  const found = findBestNameOnlyMatch(
    weapons,
    query
  );

  return found ? toTargetFromWeapon(found) : null;
}

function findSafeTarget(query) {
  return findCardTemplate(query) || findWeaponTemplate(query) || null;
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

  const maxDisplayed = 20;
  const displayedCards = cards.slice(
    0,
    maxDisplayed
  );

  const entries = displayedCards.map(
    (card) => {
      const name =
        card.name ||
        card.code ||
        "Unknown Card";

      const rarity = String(
        card.rarity || "C"
      ).toUpperCase();

      const category =
        card.category
          ? ` • ${card.category}`
          : "";

      return `**${name}** • ${rarity}${category}`;
    }
  );

  const hiddenAmount =
    cards.length -
    displayedCards.length;

  if (hiddenAmount > 0) {
    entries.push(
      `...and **${hiddenAmount}** more`
    );
  }

  return entries.join(", ");
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

    const previewTarget = findSafeTarget(query);

    if (!previewTarget) {
      return message.reply({
        content: `Safe-sacrifice target was not found: \`${query}\`.\nUse a valid card or weapon name from the game data.`,
        allowedMentions: { repliedUser: false },
      });
    }

    let target = previewTarget;
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

          const freshTarget = findSafeTarget(query);

          if (!freshTarget) {
            throw new Error(
              `Safe-sacrifice target was not found: \`${query}\`.\nUse a valid card or weapon name from the game data.`
            );
          }

          target = freshTarget;

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