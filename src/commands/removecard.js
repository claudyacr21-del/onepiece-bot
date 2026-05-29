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
  .replace(/[^a-z0-9\s,&]+/g, "")
  .replace(/\s+/g, " ");
}

function normalizeCode(value) {
 return String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[<@!>]/g, "");
}

function getCardLabel(card) {
 return (
  card?.displayName ||
  card?.name ||
  card?.title ||
  card?.code ||
  card?.instanceId ||
  card?.id ||
  "Unknown Card"
 );
}

function getCardTypeLabel(card) {
 return (
  card?.cardRole ||
  card?.role ||
  card?.category ||
  card?.type ||
  card?.rarity ||
  "card"
 );
}

function getCardFields(card) {
 return [
  card?.instanceId,
  card?.id,
  card?.cardId,
  card?.uid,
  card?.code,
  card?.name,
  card?.displayName,
  card?.title,
  card?.variant,
  card?.arc,
  card?.evolutionKey,
  card?.cardRole,
  card?.role,
  card?.category,
  card?.type,
  card?.mergeCode,
  card?.mergeRecipe,
  card?.mergeGroup,
 ];
}

function looksLikeCardObject(item) {
 if (!item || typeof item !== "object" || Array.isArray(item)) return false;

 return Boolean(
  item.instanceId ||
   item.id ||
   item.cardId ||
   item.code ||
   item.name ||
   item.displayName ||
   item.title ||
   item.cardRole ||
   item.role ||
   item.category ||
   item.type
 );
}

function scoreCard(card, query) {
 const q = normalize(query);
 const qc = normalizeCode(query);
 if (!q && !qc) return 0;

 let best = 0;

 for (const field of getCardFields(card)) {
  if (!field) continue;

  const fieldNorm = normalize(field);
  const fieldCode = normalizeCode(field);

  if (qc && fieldCode === qc) best = Math.max(best, 3000);
  if (q && fieldNorm === q) best = Math.max(best, 2800);

  if (qc && fieldCode.startsWith(qc)) best = Math.max(best, 1800 + qc.length);
  if (q && fieldNorm.startsWith(q)) best = Math.max(best, 1600 + q.length);

  if (qc && fieldCode.includes(qc)) best = Math.max(best, 1100 + qc.length);
  if (q && fieldNorm.includes(q)) best = Math.max(best, 900 + q.length);

  const words = q.split(" ").filter(Boolean);
  if (words.length && words.every((word) => fieldNorm.includes(word))) {
   best = Math.max(best, 600 + words.join("").length);
  }
 }

 const raw = JSON.stringify(card || {}).toLowerCase();
 const rawQuery = String(query || "").toLowerCase().trim();

 if (rawQuery && raw.includes(rawQuery)) best = Math.max(best, 500 + rawQuery.length);

 return best;
}

function findCardMatch(cards, query) {
 const list = Array.isArray(cards) ? cards : [];

 const scored = list
  .map((card, index) => ({
   card,
   index,
   score: looksLikeCardObject(card) ? scoreCard(card, query) : 0,
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

  const userId = message.mentions.users.first()?.id || parseUserId(args.shift());
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
    const result = findCardMatch(cards, query);

    if (result.ambiguous) {
     ambiguousMatches = result.matches;
     return fresh;
    }

    if (result.index === -1) {
     notFound = true;
     ownedCards = cards.filter(looksLikeCardObject);
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
     "Multiple cards matched that query. Use exact code or instance ID.",
     "",
     ...ambiguousMatches.slice(0, 10).map((entry, i) => {
      const card = entry.card;
      return `${i + 1}. ${getCardLabel(card)} • type: \`${getCardTypeLabel(card)}\` • code: \`${card.code || "none"}\` • id: \`${card.instanceId || card.id || "none"}\``;
     }),
    ].join("\n"),
    allowedMentions: { repliedUser: false },
   });
  }

  if (notFound || !removed) {
   return message.reply({
    content: [
     `Card matching \`${query}\` was not found for \`${userId}\`.`,
     ownedCards.length ? "" : "This user has no cards saved.",
     ownedCards.length ? "**Owned Cards Sample:**" : "",
     ...ownedCards.slice(0, 20).map((card, i) => {
      return `${i + 1}. ${getCardLabel(card)} • type: \`${getCardTypeLabel(card)}\` • code: \`${card.code || "no_code"}\` • id: \`${card.instanceId || card.id || "none"}\``;
     }),
    ]
     .filter(Boolean)
     .join("\n"),
    allowedMentions: { repliedUser: false },
   });
  }

  return message.reply({
   content: [
    `Removed card **${getCardLabel(removed)}** from \`${userId}\`.`,
    `Type: \`${getCardTypeLabel(removed)}\``,
    `Code: \`${removed.code || "none"}\``,
    `Instance ID: \`${removed.instanceId || removed.id || "none"}\``,
   ].join("\n"),
   allowedMentions: { repliedUser: false },
  });
 },
};
