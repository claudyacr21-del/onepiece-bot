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

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseExtras(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

module.exports = {
  name: "giveitem",
  aliases: [],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const userId = String(args.shift() || "").trim();
    const bucket = String(args.shift() || "").trim();
    const amount = Number(args.shift() || 0);

    if (!userId || !bucket || !Number.isFinite(amount) || amount <= 0) {
      return message.reply(
        "Usage: `op giveitem <userId> <bucket> <amount> <item name> [extrasJson]`"
      );
    }

    if (!VALID_BUCKETS.includes(bucket)) {
      return message.reply(`Invalid bucket. Use: ${VALID_BUCKETS.join(", ")}`);
    }

    const players = readPlayers();

    if (!players[userId]) {
      return message.reply(`User not found: \`${userId}\``);
    }

    const rawRest = args.join(" ").trim();
    if (!rawRest) {
      return message.reply(
        "Usage: `op giveitem <userId> <bucket> <amount> <item name> [extrasJson]`"
      );
    }

    let itemName = rawRest;
    let extras = {};

    const jsonStart = rawRest.indexOf("{");
    if (jsonStart !== -1) {
      itemName = rawRest.slice(0, jsonStart).trim();
      const parsed = parseExtras(rawRest.slice(jsonStart).trim());

      if (parsed === null) {
        return message.reply("Invalid extras JSON.");
      }

      extras = parsed;
    }

    if (!itemName) {
      return message.reply("Item name is required.");
    }

    players[userId][bucket] = ensureArray(players[userId][bucket]);

    const existing = players[userId][bucket].find((entry) => {
      const sameName = normalizeName(entry?.name) === normalizeName(itemName);
      const sameCode = extras.code
        ? normalizeName(entry?.code) === normalizeName(extras.code)
        : true;
      return sameName && sameCode;
    });

    if (existing) {
      existing.amount = Number(existing.amount || 0) + amount;
      for (const [key, value] of Object.entries(extras)) {
        if (key === "amount") continue;
        existing[key] = value;
      }
    } else {
      players[userId][bucket].push({
        name: itemName,
        amount,
        ...extras,
      });
    }

    writePlayers(players);

    return message.reply(
      `Added ${amount}x \`${itemName}\` to \`${userId}\` in \`${bucket}\`.`
    );
  },
};