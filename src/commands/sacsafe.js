const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getAutoSacSettings, normalize } = require("../utils/autoSac");

function scoreQuery(query, candidates) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;

  for (const raw of candidates.filter(Boolean)) {
    const value = normalize(raw);
    if (!value) continue;

    if (value === q) best = Math.max(best, 1000 + value.length);
    else if (value.startsWith(q)) best = Math.max(best, 700 + q.length);
    else if (value.includes(q)) best = Math.max(best, 400 + q.length);
    else {
      const words = q.split(" ").filter(Boolean);
      if (words.length && words.every((word) => value.includes(word))) {
        best = Math.max(best, 250 + words.join("").length);
      }
    }
  }

  return best;
}

function findOwnedFragment(player, query) {
  const fragments = Array.isArray(player.fragments) ? player.fragments : [];

  const scored = fragments
    .map((item) => ({
      item,
      score: scoreQuery(query, [item.code, item.name, item.displayName]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].item : null;
}

function isSameEntry(entry, fragment) {
  const entryCode = normalize(entry?.code);
  const entryName = normalize(entry?.name);
  const fragmentCode = normalize(fragment?.code);
  const fragmentName = normalize(fragment?.name);

  return (
    (entryCode && fragmentCode && entryCode === fragmentCode) ||
    (entryName && fragmentName && entryName === fragmentName)
  );
}

function formatSafeCards(cards) {
  if (!Array.isArray(cards) || !cards.length) {
    return "No safelisted cards yet.";
  }

  return cards.map((card) => card.name || card.code || "Unknown Card").join(", ");
}

module.exports = {
  name: "sacsafe",
  aliases: ["safesac", "safelist"],

  async execute(message, args) {
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply({
        content: "Usage: `op sacsafe <fragment/card name>`",
        allowedMentions: { repliedUser: false },
      });
    }

    const player = getPlayer(message.author.id, message.author.username);
    const fragment = findOwnedFragment(player, query);

    if (!fragment) {
      return message.reply({
        content: "Fragment was not found.\nYou need to own that fragment first in `op finv`.",
        allowedMentions: { repliedUser: false },
      });
    }

    const settings = getAutoSacSettings(player);
    const safeCards = Array.isArray(settings.safeCards) ? [...settings.safeCards] : [];
    let cards = Array.isArray(settings.cards) ? [...settings.cards] : [];

    const existingIndex = safeCards.findIndex((entry) => isSameEntry(entry, fragment));

    let action = "added to";
    let color = 0x2ecc71;

    if (existingIndex !== -1) {
      safeCards.splice(existingIndex, 1);
      action = "removed from";
      color = 0xe74c3c;
    } else {
      safeCards.push({
        code: fragment.code || null,
        name: fragment.name || query,
        rarity: fragment.rarity || "C",
      });

      cards = cards.filter((entry) => !isSameEntry(entry, fragment));
    }

    updatePlayer(message.author.id, {
      autoSac: {
        ...settings,
        cards,
        safeCards,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle("Safe-Sacrifice Updated")
      .setDescription(
        [
          `**${fragment.name || query}** has been ${action} your safelist.`,
          "",
          "**Safelisted Cards**",
          formatSafeCards(safeCards),
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Safe Sacrifice" });

    return message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  },
};