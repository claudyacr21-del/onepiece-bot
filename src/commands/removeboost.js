const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("../playerStore");

function getAdminIds() {
  return String(
    process.env.ADMIN_USER_IDS ||
      process.env.DISCORD_OWNER_ID ||
      process.env.BOT_OWNER_ID ||
      ""
  )
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function isAdmin(userId) {
  return getAdminIds().includes(String(userId));
}

function stripMention(value) {
  return String(value || "").replace(/[<@!>]/g, "").trim();
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[<@!>]/g, "")
    .replace(/^model:\s*/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s.]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[<@!>]/g, "")
    .replace(/^model:\s*/i, "")
    .replace(/[^a-z0-9\s._-]+/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCompact(value) {
  return normalize(value).replace(/[\s._-]+/g, "");
}

function isUserId(value) {
  return /^\d{15,25}$/.test(stripMention(value));
}

function isMention(value) {
  return /^<@!?\d{15,25}>$/.test(String(value || "").trim());
}

function getTargetAndQuery(message, args = []) {
  const parts = [...args].map((arg) => String(arg || "").trim()).filter(Boolean);
  const mentionedUser = message.mentions?.users?.first() || null;

  let userId = mentionedUser?.id || null;
  let removedTarget = false;
  const queryParts = [];

  for (const part of parts) {
    const cleaned = stripMention(part);

    if (!removedTarget && userId && (isMention(part) || cleaned === userId)) {
      removedTarget = true;
      continue;
    }

    if (!removedTarget && !userId && isUserId(part)) {
      userId = cleaned;
      removedTarget = true;
      continue;
    }

    queryParts.push(part);
  }

  return {
    userId,
    username: mentionedUser?.username || `User ${userId || "Unknown"}`,
    query: queryParts.join(" ").trim(),
  };
}

function isBoostCard(card) {
  return String(card?.cardRole || "").toLowerCase() === "boost";
}

function getCardLabel(card) {
  return card?.displayName || card?.name || card?.code || "Unknown Boost";
}

function getSearchFields(card) {
  return [
    card?.instanceId,
    card?.id,
    card?.code,
    card?.baseCode,
    card?.name,
    card?.displayName,
    card?.variant,
    card?.title,
    card?.arc,
    card?.evolutionKey,
    `${card?.name || ""} ${card?.variant || ""}`.trim(),
    `${card?.displayName || ""} ${card?.variant || ""}`.trim(),
  ].filter(Boolean);
}

function scoreCard(card, query) {
  const q = normalize(query);
  const qc = normalizeCode(query);
  const qCompact = normalizeCompact(query);

  if (!q && !qc && !qCompact) return 0;

  let best = 0;

  for (const field of getSearchFields(card)) {
    const f = normalize(field);
    const fc = normalizeCode(field);
    const fCompact = normalizeCompact(field);

    if (fc === qc || fCompact === qCompact) {
      best = Math.max(best, 3000);
      continue;
    }

    if (f === q) {
      best = Math.max(best, 2500);
      continue;
    }

    if (fc.startsWith(qc) || fCompact.startsWith(qCompact)) {
      best = Math.max(best, 1800 + qCompact.length);
      continue;
    }

    if (f.startsWith(q)) {
      best = Math.max(best, 1500 + q.length);
      continue;
    }

    if (fc.includes(qc) || fCompact.includes(qCompact)) {
      best = Math.max(best, 900 + qCompact.length);
      continue;
    }

    if (f.includes(q)) {
      best = Math.max(best, 700 + q.length);
      continue;
    }

    const words = q.split(" ").filter(Boolean);
    if (words.length && words.every((word) => f.includes(word))) {
      best = Math.max(best, 500 + words.join("").length);
    }
  }

  return best;
}

function findBoostCardMatch(cards, query) {
  const scored = (Array.isArray(cards) ? cards : [])
    .map((card, index) => ({
      card,
      index,
      score: isBoostCard(card) ? scoreCard(card, query) : 0,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return normalize(getCardLabel(a.card)).length - normalize(getCardLabel(b.card)).length;
    });

  if (!scored.length) {
    return {
      status: "not_found",
      index: -1,
      card: null,
      matches: [],
    };
  }

  const topScore = scored[0].score;
  const topMatches = scored.filter((entry) => entry.score === topScore);

  if (topMatches.length > 1) {
    return {
      status: "multiple",
      index: -1,
      card: null,
      matches: topMatches,
    };
  }

  return {
    status: "found",
    index: scored[0].index,
    card: scored[0].card,
    matches: scored,
  };
}

function formatBoostLine(card, index) {
  return `${index + 1}. **${getCardLabel(card)}** • code: \`${card.code || "none"}\` • id: \`${card.instanceId || "none"}\``;
}

module.exports = {
  name: "removeboost",
  aliases: ["delboost", "deleteboost"],

  async execute(message, args = []) {
    if (!isAdmin(message.author.id)) {
      return message.reply({
        content: "Owner only command.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const { userId, username, query } = getTargetAndQuery(message, args);

    if (!userId || !query) {
      return message.reply({
        content: [
          "Usage:",
          "`op removeboost <@user/userId> <boost name/code>`",
          "",
          "Examples:",
          "`op removeboost @user chopper`",
          "`op removeboost 697763966650417193 chopper`",
          "`op removeboost 697763966650417193 chopper_boost_123`",
        ].join("\n"),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    let removed = null;
    let resultStatus = "not_found";
    let ambiguousMatches = [];
    let ownedBoosts = [];

    updatePlayerAtomic(
      userId,
      (fresh) => {
        const cards = Array.isArray(fresh.cards) ? [...fresh.cards] : [];
        const result = findBoostCardMatch(cards, query);

        resultStatus = result.status;

        if (result.status === "multiple") {
          ambiguousMatches = result.matches;
          return fresh;
        }

        if (result.status === "not_found" || result.index === -1) {
          ownedBoosts = cards.filter(isBoostCard);
          return fresh;
        }

        [removed] = cards.splice(result.index, 1);

        return {
          ...fresh,
          cards,
        };
      },
      username
    );

    if (resultStatus === "multiple") {
      return message.reply({
        content: [
          "Multiple boost cards matched that query. Use exact code.",
          "",
          ...ambiguousMatches.slice(0, 10).map((entry, index) =>
            formatBoostLine(entry.card, index)
          ),
        ].join("\n"),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (!removed) {
      return message.reply({
        content: [
          `Boost card matching \`${query}\` was not found for \`${userId}\`.`,
          "",
          ownedBoosts.length ? "**Owned Boosts Sample:**" : "This user has no boost cards.",
          ...ownedBoosts.slice(0, 15).map((card, index) => formatBoostLine(card, index)),
        ]
          .filter(Boolean)
          .join("\n"),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("✅ Boost Card Removed")
      .setDescription(
        [
          `**Target:** <@${userId}>`,
          `**User ID:** \`${userId}\``,
          `**Boost:** ${getCardLabel(removed)}`,
          `**Code:** \`${removed.code || "none"}\``,
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Admin Remove Boost",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        users: [String(userId)],
        repliedUser: false,
      },
    });
  },
};