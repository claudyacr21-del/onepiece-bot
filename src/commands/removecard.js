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

function parseUserId(value) {
  return String(value || "")
    .replace(/[<@!>]/g, "")
    .trim();
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^model:\s*/i, "")
    .replace(/[<@!>]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[<@!>]/g, "");
}

function isBattleCard(card) {
  return String(card?.cardRole || "battle").toLowerCase() === "battle";
}

function getCardLabel(card) {
  return card?.displayName || card?.name || card?.code || "Unknown Card";
}

function getCardFields(card) {
  return [
    card?.instanceId,
    card?.code,
    card?.name,
    card?.displayName,
    card?.variant,
    card?.title,
    card?.arc,
    card?.evolutionKey,
  ].filter(Boolean);
}

function scoreBattleCard(card, query) {
  const q = normalize(query);
  const qc = normalizeCode(query);

  if (!q && !qc) return 0;

  let best = 0;

  for (const field of getCardFields(card)) {
    const fieldNorm = normalize(field);
    const fieldCode = normalizeCode(field);

    if (qc && fieldCode === qc) best = Math.max(best, 2000);
    if (q && fieldNorm === q) best = Math.max(best, 1800);

    if (qc && fieldCode.startsWith(qc)) best = Math.max(best, 1400 + qc.length);
    if (q && fieldNorm.startsWith(q)) best = Math.max(best, 1200 + q.length);

    if (qc && fieldCode.includes(qc)) best = Math.max(best, 900 + qc.length);
    if (q && fieldNorm.includes(q)) best = Math.max(best, 700 + q.length);

    const words = q.split(" ").filter(Boolean);
    if (words.length && words.every((word) => fieldNorm.includes(word))) {
      best = Math.max(best, 500 + words.join("").length);
    }
  }

  return best;
}

function findBattleCardMatch(cards, query) {
  const scored = (Array.isArray(cards) ? cards : [])
    .map((card, index) => ({
      card,
      index,
      score: isBattleCard(card) ? scoreBattleCard(card, query) : 0,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return {
      index: -1,
      matches: [],
      ambiguous: false,
    };
  }

  const topScore = scored[0].score;
  const topMatches = scored.filter((entry) => entry.score === topScore);

  return {
    index: topMatches.length === 1 ? topMatches[0].index : -1,
    matches: topMatches,
    ambiguous: topMatches.length > 1,
  };
}

module.exports = {
  name: "removecard",
  aliases: ["delcard", "deletecard"],

  async execute(message, args = []) {
    if (!isAdmin(message.author.id)) {
      return message.reply({
        content: "Owner only command.",
        allowedMentions: { repliedUser: false },
      });
    }

    const userId =
      message.mentions.users.first()?.id ||
      parseUserId(args.shift());

    const query = args.join(" ").trim();

    if (!userId || !query) {
      return message.reply({
        content: [
          "Usage:",
          "`op removecard <@user/user_id> <card name/code/instance_id>`",
          "",
          "Examples:",
          "`op removecard @user luffy`",
          "`op removecard 697763966650417193 zoro`",
          "`op removecard 697763966650417193 <instance_id>`",
        ].join("\n"),
        allowedMentions: { repliedUser: false },
      });
    }

    let removed = null;
    let notFound = false;
    let ambiguousMatches = [];
    let ownedCards = [];

    updatePlayerAtomic(
      userId,
      (fresh) => {
        const cards = Array.isArray(fresh.cards) ? [...fresh.cards] : [];
        const result = findBattleCardMatch(cards, query);

        if (result.ambiguous) {
          ambiguousMatches = result.matches;
          return fresh;
        }

        if (result.index === -1) {
          notFound = true;
          ownedCards = cards.filter(isBattleCard);
          return fresh;
        }

        [removed] = cards.splice(result.index, 1);

        return {
          ...fresh,
          cards,
        };
      },
      message.mentions.users.first()?.username || "Unknown"
    );

    if (ambiguousMatches.length) {
      return message.reply({
        content: [
          "Multiple battle cards matched that query. Use exact code or instance ID.",
          "",
          ...ambiguousMatches.slice(0, 10).map((entry, i) => {
            const card = entry.card;
            return `${i + 1}. ${getCardLabel(card)} • code: \`${card.code || "none"}\` • id: \`${card.instanceId || "none"}\``;
          }),
        ].join("\n"),
        allowedMentions: { repliedUser: false },
      });
    }

    if (notFound || !removed) {
      return message.reply({
        content: [
          `Battle card matching \`${query}\` was not found for \`${userId}\`.`,
          ownedCards.length ? "" : "This user has no battle cards saved.",
          ownedCards.length ? "**Owned Battle Cards Sample:**" : "",
          ...ownedCards
            .slice(0, 15)
            .map((card, i) => `${i + 1}. ${getCardLabel(card)} • \`${card.code || "no_code"}\` • id: \`${card.instanceId || "none"}\``),
        ]
          .filter(Boolean)
          .join("\n"),
        allowedMentions: { repliedUser: false },
      });
    }

    return message.reply({
      content: [
        `Removed battle card **${getCardLabel(removed)}** from \`${userId}\`.`,
        `Code: \`${removed.code || "none"}\``,
        `Instance ID: \`${removed.instanceId || "none"}\``,
      ].join("\n"),
      allowedMentions: { repliedUser: false },
    });
  },
};