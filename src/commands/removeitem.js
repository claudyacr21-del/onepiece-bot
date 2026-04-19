const { readPlayers, writePlayers } = require("../playerStore");

const VALID_BUCKETS = [
  "items",
  "weapons",
  "devilFruits",
  "boxes",
  "tickets",
  "materials",
  "fragments",
];

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
  return String(value || "").trim().toLowerCase();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

module.exports = {
  name: "removeitem",
  aliases: ["delitem"],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const userId = String(args.shift() || "").trim();
    const bucket = String(args.shift() || "").trim();
    const amount = Number(args.shift() || 0);
    const query = args.join(" ").trim();

    if (!userId || !bucket || !Number.isFinite(amount) || amount <= 0 || !query) {
      return message.reply(
        "Usage: `op removeitem <userId> <bucket> <amount> <item/weapon/fruit name or code>`"
      );
    }

    if (!VALID_BUCKETS.includes(bucket)) {
      return message.reply(`Invalid bucket. Use: ${VALID_BUCKETS.join(", ")}`);
    }

    const players = readPlayers();

    if (!players[userId]) {
      return message.reply(`User not found: \`${userId}\``);
    }

    players[userId][bucket] = ensureArray(players[userId][bucket]);

    const idx = players[userId][bucket].findIndex((entry) => {
      return (
        normalize(entry?.name) === normalize(query) ||
        normalize(entry?.code) === normalize(query)
      );
    });

    if (idx === -1) {
      return message.reply(`Item not found in \`${bucket}\` for user \`${userId}\`.`);
    }

    const entry = players[userId][bucket][idx];
    entry.amount = Number(entry.amount || 0) - amount;

    if (entry.amount <= 0) {
      players[userId][bucket].splice(idx, 1);
    }

    writePlayers(players);

    return message.reply(
      `Removed ${amount}x \`${entry.name || entry.code}\` from \`${userId}\` in \`${bucket}\`.`
    );
  },
};