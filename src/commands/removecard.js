const { EmbedBuilder } = require("discord.js");
const { readPlayers, writePlayers } = require("../playerStore");

function getAdminIds() {
  return String(process.env.ADMIN_USER_IDS || process.env.ADMIN_ROLE_IDS || process.env.DISCORD_OWNER_ID || process.env.BOT_OWNER_ID || "")
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
    .replace(/[^a-z0-9\s._-]+/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCompact(value) {
  return normalize(value).replace(/[\s._-]+/g, "");
}

function isSnowflake(value) {
  return /^\d{15,25}$/.test(String(value || "").trim());
}

function parseTargetAndQuery(message, args = []) {
  const rawArgs = args.map((x) => String(x || "").trim()).filter(Boolean);
  let text = rawArgs.join(" ").trim();
  let userId = null;

  const mentionMatch = text.match(/<@!?(\d{15,25})>/);
  if (mentionMatch) {
    userId = mentionMatch[1];
    text = text.replace(mentionMatch[0], " ").trim();
  }

  if (!userId) {
    const idIndex = rawArgs.findIndex((arg) => isSnowflake(stripMention(arg)));
    if (idIndex !== -1) {
      userId = stripMention(rawArgs[idIndex]);
      rawArgs.splice(idIndex, 1);
      text = rawArgs.join(" ").trim();
    }
  }

  if (!userId && message.mentions?.users?.size) {
    const mentioned = message.mentions.users.find((u) => u?.id && u.id !== message.client?.user?.id);
    if (mentioned?.id) {
      userId = mentioned.id;
      text = text.replace(new RegExp(`<@!?${mentioned.id}>`, "g"), " ").trim();
    }
  }

  return {
    userId: userId ? String(userId) : null,
    query: String(text || "").replace(/\s+/g, " ").trim(),
  };
}

function isBattleCard(card) {
  return String(card?.cardRole || "battle").toLowerCase() === "battle";
}

function getCardLabel(card) {
  return card?.displayName || card?.name || card?.variant || card?.code || "Unknown Card";
}

function getCardFields(card) {
  return [
    card?.instanceId,
    card?.id,
    card?.code,
    card?.baseCode,
    card?.name,
    card?.displayName,
    card?.variant,
    card?.title,
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

  for (const field of getCardFields(card)) {
    const f = normalize(field);
    const fc = normalizeCode(field);
    const fCompact = normalizeCompact(field);
    if (!f && !fc && !fCompact) continue;

    if (fc === qc || fCompact === qCompact) best = Math.max(best, 3000);
    else if (f === q) best = Math.max(best, 2500);
    else if (fc.startsWith(qc) || fCompact.startsWith(qCompact)) best = Math.max(best, 1800 + qCompact.length);
    else if (f.startsWith(q)) best = Math.max(best, 1500 + q.length);
    else if (fc.includes(qc) || fCompact.includes(qCompact)) best = Math.max(best, 900 + qCompact.length);
    else if (f.includes(q)) best = Math.max(best, 700 + q.length);
    else {
      const words = q.split(" ").filter(Boolean);
      if (words.length && words.every((word) => f.includes(word))) {
        best = Math.max(best, 500 + words.join("").length);
      }
    }
  }

  return best;
}

function findOwnedBattleCard(cards, query) {
  const scored = (Array.isArray(cards) ? cards : [])
    .map((card, index) => ({
      card,
      index,
      score: isBattleCard(card) ? scoreCard(card, query) : 0,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aLabel = normalize(getCardLabel(a.card));
      const bLabel = normalize(getCardLabel(b.card));
      return aLabel.length - bLabel.length;
    });

  if (!scored.length) {
    return { status: "not_found", index: -1, card: null, matches: [] };
  }

  const topScore = scored[0].score;
  const topMatches = scored.filter((entry) => entry.score === topScore);

  if (topMatches.length > 1) {
    return { status: "multiple", index: -1, card: null, matches: topMatches };
  }

  return { status: "found", index: scored[0].index, card: scored[0].card, matches: scored };
}

function formatCardLine(card, index) {
  return `${index + 1}. **${getCardLabel(card)}** • code: \`${card.code || "none"}\` • id: \`${card.instanceId || "none"}\``;
}

function getOwnedBattleSample(cards) {
  return (Array.isArray(cards) ? cards : [])
    .filter(isBattleCard)
    .slice(0, 15)
    .map((card, index) => formatCardLine(card, index));
}

function clearRemovedCardFromTeam(player, removedCard) {
  const removedId = String(removedCard?.instanceId || "");
  if (!removedId) return player;

  const slots = Array.isArray(player?.team?.slots) ? player.team.slots : null;
  if (!slots) return player;

  return {
    ...player,
    team: {
      ...(player.team || {}),
      slots: slots.map((slot) => (String(slot || "") === removedId ? null : slot)),
    },
  };
}

module.exports = {
  name: "removecard",
  aliases: ["delcard", "deletecard"],

  async execute(message, args = []) {
    if (!isAdmin(message.author.id)) {
      return message.reply({
        content: "Owner only command.",
        allowedMentions: { parse: [], repliedUser: false },
      });
    }

    const { userId, query } = parseTargetAndQuery(message, args);

    if (!userId || !query) {
      return message.reply({
        content: [
          "Usage:",
          "`op removecard <@user/userId> <card name/code/id>`",
          "",
          "Examples:",
          "`op removecard @user Gecko Moria`",
          "`op removecard 697763966650417193 gecko_moria`",
        ].join("\n"),
        allowedMentions: { parse: [], repliedUser: false },
      });
    }

    const players = readPlayers();
    const player = players[String(userId)];

    if (!player) {
      return message.reply({
        content: `User not found: \`${userId}\``,
        allowedMentions: { parse: [], repliedUser: false },
      });
    }

    player.cards = Array.isArray(player.cards) ? player.cards : [];

    const result = findOwnedBattleCard(player.cards, query);

    if (result.status === "multiple") {
      const lines = result.matches.slice(0, 10).map((entry, index) => formatCardLine(entry.card, index));
      return message.reply({
        content: ["Multiple battle cards matched that query. Use exact code.", "", ...lines].join("\n"),
        allowedMentions: { parse: [], repliedUser: false },
      });
    }

    if (result.status === "not_found" || result.index === -1) {
      const sample = getOwnedBattleSample(player.cards);
      return message.reply({
        content: [
          `Battle card matching \`${query}\` was not found for \`${userId}\`.`,
          "",
          sample.length ? "**Owned Battle Cards Sample:**" : "This user has no battle cards saved.",
          ...sample,
        ].filter(Boolean).join("\n"),
        allowedMentions: { parse: [], repliedUser: false },
      });
    }

    const [removed] = player.cards.splice(result.index, 1);
    const cleanedPlayer = clearRemovedCardFromTeam(player, removed);

    players[String(userId)] = cleanedPlayer;
    writePlayers(players);

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("✅ Battle Card Removed")
      .setDescription([
        `**Target:** <@${userId}>`,
        `**User ID:** \`${userId}\``,
        `**Card:** ${getCardLabel(removed)}`,
        `**Code:** \`${removed.code || "none"}\``,
        `**Instance ID:** \`${removed.instanceId || "none"}\``,
        "",
        "If this card was in the active team, its team slot has been cleared.",
      ].join("\n"))
      .setFooter({ text: "One Piece Bot • Admin Remove Card" });

    return message.reply({
      embeds: [embed],
      allowedMentions: { parse: [], repliedUser: false },
    });
  },
};