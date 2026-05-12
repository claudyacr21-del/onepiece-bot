const { readPlayers, writePlayers } = require("../playerStore");

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

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
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

function parseUserId(value) {
  return String(value || "").replace(/[<@!>]/g, "").trim();
}

function isBattleCard(card) {
  return String(card?.cardRole || "battle").toLowerCase() === "battle";
}

function getCardFields(card) {
  return [
    card?.code,
    card?.name,
    card?.displayName,
  ].filter(Boolean);
}

function findOwnedBattleCardIndex(cards, query) {
  const q = normalize(query);
  const qc = normalizeCode(query);

  const list = Array.isArray(cards) ? cards : [];

  let idx = list.findIndex((card) => {
    if (!isBattleCard(card)) return false;

    return getCardFields(card).some((field) => {
      return normalizeCode(field) === qc || normalize(field) === q;
    });
  });

  if (idx !== -1) return idx;

  idx = list.findIndex((card) => {
    if (!isBattleCard(card)) return false;

    return getCardFields(card).some((field) => {
      const fieldNorm = normalize(field);
      const fieldCode = normalizeCode(field);

      return (
        fieldNorm.startsWith(q) ||
        fieldCode.startsWith(qc)
      );
    });
  });

  if (idx !== -1) return idx;

  return list.findIndex((card) => {
    if (!isBattleCard(card)) return false;

    return getCardFields(card).some((field) => {
      const fieldNorm = normalize(field);
      const fieldCode = normalizeCode(field);

      return (
        fieldNorm.includes(q) ||
        fieldCode.includes(qc)
      );
    });
  });
}

module.exports = {
  name: "removecard",
  aliases: [],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const userId = parseUserId(args.shift());
    const query = args.join(" ").trim();

    if (!userId || !query) {
      return message.reply("Usage: `op removecard <userId/@user> <card>`");
    }

    const players = readPlayers();

    if (!players[userId]) {
      return message.reply(`User not found: \`${userId}\``);
    }

    players[userId].cards = Array.isArray(players[userId].cards)
      ? players[userId].cards
      : [];

    const idx = findOwnedBattleCardIndex(players[userId].cards, query);

    if (idx === -1) {
      const ownedCards = players[userId].cards
        .filter(isBattleCard)
        .map((card) => `\`${card.displayName || card.name || card.code}\` (${card.code || "no_code"})`)
        .slice(0, 10);

      return message.reply(
        [
          `Battle card matching \`${query}\` was not found for \`${userId}\`.`,
          ownedCards.length
            ? `Owned battle cards sample:\n${ownedCards.join("\n")}`
            : "This user has no battle cards saved.",
        ].join("\n")
      );
    }

    const removed = players[userId].cards[idx];
    players[userId].cards.splice(idx, 1);

    writePlayers(players);

    return message.reply(
      `Removed battle card \`${removed.displayName || removed.name || removed.code}\` (${removed.code || "no_code"}) from \`${userId}\`.`
    );
  },
};