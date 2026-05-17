const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getAutoSacSettings, normalize } = require("../utils/autoSac");

const COLOR_ADD = 0x2ecc71;
const COLOR_REMOVE = 0xe74c3c;

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

function parseSacAddArgs(args) {
  if (!Array.isArray(args) || !args.length) {
    return {
      ok: false,
      message: "Usage: `op sacadd <fragment/card name> <amount/all>`",
    };
  }

  const lastArg = String(args[args.length - 1] || "").toLowerCase();
  const hasModeArg = lastArg === "all" || /^\d+$/.test(lastArg);
  const query = hasModeArg ? args.slice(0, -1).join(" ").trim() : args.join(" ").trim();
  const mode = hasModeArg ? lastArg : "all";

  if (!query) {
    return {
      ok: false,
      message: "Usage: `op sacadd <fragment/card name> <amount/all>`",
    };
  }

  if (mode !== "all") {
    const amount = Math.floor(Number(mode));

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        ok: false,
        message: "Invalid amount. Use a positive number or `all`.",
      };
    }

    return {
      ok: true,
      query,
      mode: String(amount),
    };
  }

  return {
    ok: true,
    query,
    mode,
  };
}

function isSameAutoSacCard(entry, fragment) {
  const entryCode = normalize(entry?.code);
  const entryName = normalize(entry?.name);
  const fragmentCode = normalize(fragment?.code);
  const fragmentName = normalize(fragment?.name);

  return (
    (entryCode && fragmentCode && entryCode === fragmentCode) ||
    (entryName && fragmentName && entryName === fragmentName)
  );
}

function formatCurrentCards(cards) {
  if (!Array.isArray(cards) || !cards.length) {
    return "No specific cards are currently in the auto-sac list.";
  }

  return cards
    .map((card, index) => {
      const name = card.name || card.code || "Unknown Card";
      const rarity = String(card.rarity || "C").toUpperCase();
      const mode = card.mode || "all";

      return `${index + 1}. **${name}** • ${rarity} • ${mode}`;
    })
    .join("\n");
}

module.exports = {
  name: "sacadd",
  aliases: ["asacadd", "autosacadd"],

  async execute(message, args) {
    const parsed = parseSacAddArgs(args);

    if (!parsed.ok) {
      return message.reply({
        content: parsed.message,
        allowedMentions: { repliedUser: false },
      });
    }

    const player = getPlayer(message.author.id, message.author.username);
    const fragment = findOwnedFragment(player, parsed.query);

    if (!fragment) {
      return message.reply({
        content:
          "Fragment was not found in `op finv`.\nYou need to own that fragment first before adding it to the auto-sac list.",
        allowedMentions: { repliedUser: false },
      });
    }

    const settings = getAutoSacSettings(player);
    const cards = Array.isArray(settings.cards) ? [...settings.cards] : [];
    const safeCards = Array.isArray(settings.safeCards) ? [...settings.safeCards] : [];

    const existingSafeIndex = safeCards.findIndex((entry) =>
      isSameAutoSacCard(entry, fragment)
    );

    if (existingSafeIndex !== -1) {
      safeCards.splice(existingSafeIndex, 1);
    }

    const existingIndex = cards.findIndex((entry) => isSameAutoSacCard(entry, fragment));

    let actionText = "";
    let color = COLOR_ADD;

    if (existingIndex !== -1) {
      const removed = cards.splice(existingIndex, 1)[0];

      actionText = [
        `**${removed.name || fragment.name}** has been removed from the auto-sac list.`,
        "",
        "This card will no longer be auto-sacrificed unless its rarity toggle is enabled in `op autosac`.",
      ].join("\n");

      color = COLOR_REMOVE;
    } else {
      cards.push({
        code: fragment.code || null,
        name: fragment.name || parsed.query,
        rarity: fragment.rarity || "C",
        mode: parsed.mode,
      });

      actionText = [
        `**${fragment.name || parsed.query}** has been added to the auto-sac list.`,
        `Mode: **${parsed.mode}**`,
        "",
        "This only adds the card to the auto-sac list.",
        "Existing fragments are not removed and are not converted into berries.",
        "Auto-sac will trigger when you receive duplicate fragments from `op pull` / `op pa`.",
      ].join("\n");
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
      .setTitle("Auto-Sacrifice List Updated")
      .setDescription(
        [
          actionText,
          "",
          "**Current Auto-Sac Cards**",
          formatCurrentCards(cards),
          "",
          "**Manual Sacrifice**",
          "Use these commands if you want to sacrifice existing fragments immediately:",
          "`op sac <card name> <amount/all>`",
          "`op msac (luffy_5, zoro_2, nami_6)`",
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Auto Sacrifice" });

    return message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  },
};