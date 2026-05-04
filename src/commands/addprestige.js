const { EmbedBuilder } = require("discord.js");
const { readPlayers, writePlayers } = require("../playerStore");

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
      ]),
    }))
    .filter((entry) => {
      if (!entry.card) return false;
      if (String(entry.card.cardRole || "").toLowerCase() === "boost") return false;
      return entry.score > 0;
    })
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0] : null;
}

module.exports = {
  name: "addprestige",
  aliases: ["prestige"],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const targetId = parseUserId(args.shift());
    const amountRaw = args.shift();
    const amount = Number(amountRaw);
    const query = args.join(" ").trim();

    if (!targetId || !Number.isFinite(amount) || amount <= 0 || !query) {
      return message.reply(
        "Usage: `op addprestige <@user/userId> <amount> <card name/code>`\nExample: `op addprestige @peace 10 imu`"
      );
    }

    const players = readPlayers();

    if (!players[targetId]) {
      return message.reply(`User not found: \`${targetId}\``);
    }

    const player = players[targetId];
    player.cards = Array.isArray(player.cards) ? player.cards : [];

    const found = findOwnedBattleCard(player, query);

    if (!found) {
      return message.reply(
        `Battle card not found for \`${targetId}\` matching \`${query}\`.`
      );
    }

    const card = found.card;
    const oldPrestige = clampPrestige(card.raidPrestige);
    const requestedAdd = Math.floor(amount);
    const newPrestige = clampPrestige(oldPrestige + requestedAdd);
    const realAdded = newPrestige - oldPrestige;

    player.cards[found.index] = {
      ...card,
      raidPrestige: newPrestige,
    };

    writePlayers(players);

    const cardName = card.displayName || card.name || card.code || "Unknown Card";

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
      .setFooter({ text: "One Piece Bot • Admin Prestige" });

    return message.reply({ embeds: [embed] });
  },
};