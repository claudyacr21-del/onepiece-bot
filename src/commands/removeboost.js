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
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeRaw(value) {
  return String(value || "").trim().toLowerCase();
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
    card?.code,
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
  const rawQ = normalizeRaw(query);

  if (!q && !rawQ) return 0;

  let best = 0;

  for (const field of getSearchFields(card)) {
    const clean = normalize(field);
    const raw = normalizeRaw(field);

    if (!clean && !raw) continue;

    if (rawQ && raw === rawQ) best = Math.max(best, 2000);
    if (q && clean === q) best = Math.max(best, 1800);

    if (rawQ && raw.startsWith(rawQ)) best = Math.max(best, 1400 + rawQ.length);
    if (q && clean.startsWith(q)) best = Math.max(best, 1200 + q.length);

    if (rawQ && raw.includes(rawQ)) best = Math.max(best, 900 + rawQ.length);
    if (q && clean.includes(q)) best = Math.max(best, 700 + q.length);

    const words = q.split(" ").filter(Boolean);
    if (words.length && words.every((word) => clean.includes(word))) {
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
  name: "removeboost",
  aliases: ["delboost", "deleteboost"],

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
          "`op removeboost <@user/user_id> <boost name/code/instance_id>`",
          "",
          "Examples:",
          "`op removeboost @user chopper`",
          "`op removeboost 697763966650417193 chopper`",
          "`op removeboost 697763966650417193 <instance_id>`",
        ].join("\n"),
        allowedMentions: { repliedUser: false },
      });
    }

    let removed = null;
    let notFound = false;
    let ambiguousMatches = [];
    let ownedBoosts = [];

    updatePlayerAtomic(
      userId,
      (fresh) => {
        const cards = Array.isArray(fresh.cards) ? [...fresh.cards] : [];
        const result = findBoostCardMatch(cards, query);

        if (result.ambiguous) {
          ambiguousMatches = result.matches;
          return fresh;
        }

        if (result.index === -1) {
          notFound = true;
          ownedBoosts = cards.filter(isBoostCard);
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
          "Multiple boost cards matched that query. Use exact code or instance ID.",
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
          "Boost card not found.",
          ownedBoosts.length ? "" : "This user has no boost cards.",
          ownedBoosts.length ? "**Owned Boosts:**" : "",
          ...ownedBoosts
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
        `Removed boost card **${getCardLabel(removed)}** from \`${userId}\`.`,
        `Code: \`${removed.code || "none"}\``,
        `Instance ID: \`${removed.instanceId || "none"}\``,
      ].join("\n"),
      allowedMentions: { repliedUser: false },
    });
  },
};