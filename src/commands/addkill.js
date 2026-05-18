const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const {
  canUseAdminCommand,
  getAdminAccessError,
} = require("../utils/adminAccess");

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function parseUserId(value) {
  return String(value || "").replace(/[<@!>]/g, "").trim();
}

function isPositiveNumberText(value) {
  return /^\d+$/.test(String(value || "").trim()) && Number(value) > 0;
}

function scoreNameOnly(query, names) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;
  const qWords = q.split(" ").filter(Boolean);

  for (const raw of names.filter(Boolean)) {
    const name = normalize(raw);
    if (!name) continue;

    if (name === q) best = Math.max(best, 1000 + name.length);
    else if (name.startsWith(q)) best = Math.max(best, 800 + q.length);
    else if (name.includes(q)) best = Math.max(best, 600 + q.length);
    else if (qWords.length && qWords.every((word) => name.includes(word))) {
      best = Math.max(best, 400 + qWords.join("").length);
    }
  }

  return best;
}

function parseArgs(message, args) {
  const parts = [...args];
  const mentionedUser = message.mentions?.users?.first();
  let targetId = mentionedUser?.id || null;

  if (!targetId && parts.length && /^\d{15,25}$/.test(String(parts[0] || ""))) {
    targetId = parseUserId(parts.shift());
  } else if (mentionedUser) {
    const mentionIndex = parts.findIndex((arg) =>
      String(arg || "").includes(mentionedUser.id)
    );

    if (mentionIndex !== -1) parts.splice(mentionIndex, 1);
  }

  if (!targetId) {
    return {
      ok: false,
      message:
        "Usage: `op addkill <@user/userId> <amount> <card>`\nExample: `op addkill @user 10 luffy`",
    };
  }

  let amount = 1;

  if (parts.length && isPositiveNumberText(parts[0])) {
    amount = Math.floor(Number(parts.shift()));
  } else if (parts.length && isPositiveNumberText(parts[parts.length - 1])) {
    amount = Math.floor(Number(parts.pop()));
  }

  const query = parts.join(" ").trim();

  if (!query) {
    return {
      ok: false,
      message:
        "Usage: `op addkill <@user/userId> <amount> <card>`\nExample: `op addkill @user 10 luffy`",
    };
  }

  return {
    ok: true,
    targetId,
    amount,
    query,
  };
}

function findOwnedBattleCardIndex(player, query) {
  const cards = Array.isArray(player?.cards) ? player.cards : [];

  const scored = cards
    .map((rawCard, index) => {
      const card = hydrateCard(rawCard);
      const role = String(card?.cardRole || rawCard?.cardRole || "").toLowerCase();

      if (role === "boost") return null;

      return {
        index,
        rawCard,
        card,
        score: scoreNameOnly(query, [
          card?.displayName,
          card?.name,
          rawCard?.displayName,
          rawCard?.name,
          card?.code,
          rawCard?.code,
          rawCard?.instanceId,
        ]),
      };
    })
    .filter((entry) => entry && entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;

  const topScore = scored[0].score;
  const topMatches = scored.filter((entry) => entry.score === topScore);

  if (topMatches.length > 1) {
    return {
      ambiguous: true,
      matches: topMatches,
    };
  }

  return topMatches[0];
}

module.exports = {
  name: "addkill",

  async execute(message, args) {
    if (!message.guild) {
      return message.reply({
        content: "This command can only be used in a server.",
        allowedMentions: { repliedUser: false },
      });
    }

    if (!canUseAdminCommand(message)) {
      return message.reply({
        content: getAdminAccessError(),
        allowedMentions: { repliedUser: false },
      });
    }

    const parsed = parseArgs(message, args);

    if (!parsed.ok) {
      return message.reply({
        content: parsed.message,
        allowedMentions: { repliedUser: false },
      });
    }

    let displayName = parsed.query;
    let beforeKills = 0;
    let afterKills = 0;
    let notFound = false;
    let ambiguous = [];

    updatePlayerAtomic(
      parsed.targetId,
      (fresh) => {
        const found = findOwnedBattleCardIndex(fresh, parsed.query);

        if (!found) {
          notFound = true;
          return fresh;
        }

        if (found.ambiguous) {
          ambiguous = found.matches;
          return fresh;
        }

        const cards = [...(fresh.cards || [])];
        beforeKills = Math.max(0, Number(cards[found.index]?.kills || 0));
        afterKills = beforeKills + parsed.amount;

        cards[found.index] = {
          ...cards[found.index],
          kills: afterKills,
        };

        displayName =
          found.card?.displayName ||
          found.card?.name ||
          found.rawCard?.displayName ||
          found.rawCard?.name ||
          parsed.query;

        return {
          ...fresh,
          cards,
        };
      },
      message.mentions?.users?.first()?.username || parsed.targetId
    );

    if (ambiguous.length) {
      return message.reply({
        content: [
          "Multiple battle cards matched that query. Use exact code or instance ID.",
          "",
          ...ambiguous.slice(0, 10).map((entry, i) => {
            const card = entry.rawCard || entry.card || {};
            return `${i + 1}. ${card.displayName || card.name || card.code || "Unknown"} • code: \`${card.code || "none"}\` • id: \`${card.instanceId || "none"}\``;
          }),
        ].join("\n"),
        allowedMentions: { users: [String(parsed.targetId)], repliedUser: false },
      });
    }

    if (notFound) {
      return message.reply({
        content: `Battle card matching \`${parsed.query}\` was not found for <@${parsed.targetId}>.`,
        allowedMentions: {
          users: [String(parsed.targetId)],
          repliedUser: false,
        },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("✅ Battle Card Kills Updated")
      .setDescription(
        [
          `**Target:** <@${parsed.targetId}>`,
          `**Card:** ${displayName}`,
          `**Added Kills:** +${parsed.amount}`,
          `**Kills:** ${beforeKills} → ${afterKills}`,
          "",
          "This value is now synced with `op mci` and other card displays that read the card kill count.",
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Admin Kill Update",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        users: [String(parsed.targetId)],
        repliedUser: false,
      },
    });
  },
};