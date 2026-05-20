const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("../playerStore");

const MAX_PRESTIGE = 200;

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
  return String(value || "").replace(/[<@!>]/g, "").trim();
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^model:\s*/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function clampPrestige(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(MAX_PRESTIGE, Math.floor(n)));
}

function scoreQuery(query, candidates) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;

  for (const raw of candidates) {
    const candidate = normalize(raw);
    if (!candidate) continue;

    if (candidate === q) best = Math.max(best, 1000 + candidate.length);
    else if (candidate.startsWith(q)) best = Math.max(best, 700 + q.length);
    else if (candidate.includes(q)) best = Math.max(best, 400 + q.length);
    else {
      const qWords = q.split(" ").filter(Boolean);

      if (qWords.length && qWords.every((word) => candidate.includes(word))) {
        best = Math.max(best, 250 + qWords.join("").length);
      }
    }
  }

  return best;
}

function findOwnedBattleCard(player, query) {
  const cards = Array.isArray(player.cards) ? player.cards : [];

  const scored = cards
    .map((card, index) => ({
      card,
      index,
      score: scoreQuery(query, [
        card.code,
        card.name,
        card.displayName,
        card.variant,
        card.title,
        card.instanceId,
      ]),
    }))
    .filter((entry) => {
      if (!entry.card) return false;
      if (String(entry.card.cardRole || "").toLowerCase() === "boost") return false;
      return entry.score > 0;
    })
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
  name: "addprestige",
  aliases: ["prestige"],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply({
        content: "Owner only command.",
        allowedMentions: { repliedUser: false },
      });
    }

    const targetId =
      message.mentions.users.first()?.id ||
      parseUserId(args.shift());

    if (message.mentions.users.first()) {
      const mentionIndex = args.findIndex((arg) =>
        String(arg || "").includes(targetId)
      );
      if (mentionIndex !== -1) args.splice(mentionIndex, 1);
    }

    const amountRaw = args.shift();
    const amount = Number(amountRaw);
    const query = args.join(" ").trim();

    if (!targetId || !Number.isFinite(amount) || amount <= 0 || !query) {
      return message.reply({
        content:
          "Usage: `op prestige @peace 10 imu`",
        allowedMentions: { repliedUser: false },
      });
    }

    let cardName = query;
    let oldPrestige = 0;
    let newPrestige = 0;
    let realAdded = 0;
    let notFound = false;
    let ambiguous = [];

    updatePlayerAtomic(
      targetId,
      (fresh) => {
        const found = findOwnedBattleCard(fresh, query);

        if (!found) {
          notFound = true;
          return fresh;
        }

        if (found.ambiguous) {
          ambiguous = found.matches;
          return fresh;
        }

        const cards = Array.isArray(fresh.cards)
          ? fresh.cards.map((card) => ({ ...card }))
          : [];

        const card = cards[found.index];
        oldPrestige = clampPrestige(card.raidPrestige);
        const requestedAdd = Math.floor(amount);
        newPrestige = clampPrestige(oldPrestige + requestedAdd);
        realAdded = newPrestige - oldPrestige;

        cards[found.index] = {
          ...card,
          raidPrestige: newPrestige,
        };

        cardName = card.displayName || card.name || card.code || "Unknown Card";

        return {
          ...fresh,
          cards,
        };
      },
      message.mentions.users.first()?.username || targetId
    );

    if (ambiguous.length) {
      return message.reply({
        content: [
          "Multiple battle cards matched that query. Use exact code.",
          "",
          ...ambiguous.slice(0, 10).map((entry, i) => {
            const card = entry.card || {};
            return `${i + 1}. ${card.displayName || card.name || card.code || "Unknown"} • code: \`${card.code || "none"}\` • id: \`${card.instanceId || "none"}\``;
          }),
        ].join("\n"),
        allowedMentions: { repliedUser: false },
      });
    }

    if (notFound) {
      return message.reply({
        content: `Battle card not found for \`${targetId}\` matching \`${query}\`.`,
        allowedMentions: { repliedUser: false },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("⭐ Raid Prestige Added")
      .setDescription(
        [
          `**User:** <@${targetId}>`,
          `**Card:** ${cardName}`,
          `**Added:** +${realAdded}`,
          `**Prestige:** ${oldPrestige}/${MAX_PRESTIGE} → ${newPrestige}/${MAX_PRESTIGE}`,
          "",
          newPrestige >= MAX_PRESTIGE
            ? "This card has reached max raid prestige."
            : "Raid prestige updated successfully.",
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Admin Prestige",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: { users: [String(targetId)], repliedUser: false },
    });
  },
};