const { readPlayers, writePlayers } = require("../playerStore");
const weaponsData = require("../data/weapons");
const devilFruitsData = require("../data/devilFruits");
const itemsData = require("../data/items");

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

function collectCatalogEntries(source, out = []) {
  if (Array.isArray(source)) {
    for (const entry of source) collectCatalogEntries(entry, out);
    return out;
  }

  if (!source || typeof source !== "object") return out;

  const hasIdentity =
    typeof source.name === "string" ||
    typeof source.code === "string" ||
    typeof source.id === "string";

  if (hasIdentity) {
    out.push(source);
  }

  for (const value of Object.values(source)) {
    if (Array.isArray(value) || (value && typeof value === "object")) {
      collectCatalogEntries(value, out);
    }
  }

  return out;
}

function buildIndex(entries) {
  const map = new Map();

  for (const entry of entries) {
    const keys = [
      entry?.code,
      entry?.name,
      entry?.id,
      entry?.key,
      entry?.title,
    ].filter(Boolean);

    for (const key of keys) {
      map.set(normalize(key), entry);
    }
  }

  return map;
}

const weaponIndex = buildIndex(collectCatalogEntries(weaponsData));
const fruitIndex = buildIndex(collectCatalogEntries(devilFruitsData));
const itemIndex = buildIndex(collectCatalogEntries(itemsData));

function findCatalogEntry(bucket, query) {
  const q = normalize(query);

  if (bucket === "weapons") return weaponIndex.get(q) || null;
  if (bucket === "devilFruits") return fruitIndex.get(q) || null;

  if (
    bucket === "items" ||
    bucket === "boxes" ||
    bucket === "tickets" ||
    bucket === "materials" ||
    bucket === "fragments"
  ) {
    return itemIndex.get(q) || null;
  }

  return null;
}

function buildStoredEntry(bucket, catalogEntry, amount) {
  const base = {
    name: catalogEntry.name || catalogEntry.code,
    amount,
  };

  if (catalogEntry.code) base.code = catalogEntry.code;
  if (catalogEntry.rarity) base.rarity = catalogEntry.rarity;
  if (catalogEntry.image) base.image = catalogEntry.image;
  if (catalogEntry.type) base.type = catalogEntry.type;
  if (catalogEntry.description) base.description = catalogEntry.description;
  if (catalogEntry.statBonus) base.statBonus = { ...catalogEntry.statBonus };
  if (catalogEntry.owners) base.owners = [...catalogEntry.owners];

  if (bucket === "boxes" || bucket === "tickets" || bucket === "materials" || bucket === "fragments") {
    delete base.statBonus;
    delete base.owners;
  }

  return base;
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
    const query = args.join(" ").trim();

    if (!userId || !bucket || !Number.isFinite(amount) || amount <= 0 || !query) {
      return message.reply(
        "Usage: `op giveitem <userId> <bucket> <amount> <exact item/weapon/fruit name or code>`"
      );
    }

    if (!VALID_BUCKETS.includes(bucket)) {
      return message.reply(`Invalid bucket. Use: ${VALID_BUCKETS.join(", ")}`);
    }

    const players = readPlayers();

    if (!players[userId]) {
      return message.reply(`User not found: \`${userId}\``);
    }

    const catalogEntry = findCatalogEntry(bucket, query);

    if (!catalogEntry) {
      return message.reply(
        `Invalid ${bucket} entry. Must match data exactly by name or code.`
      );
    }

    players[userId][bucket] = ensureArray(players[userId][bucket]);

    const stored = buildStoredEntry(bucket, catalogEntry, amount);

    const existing = players[userId][bucket].find((entry) => {
      if (stored.code && entry?.code) {
        return normalize(entry.code) === normalize(stored.code);
      }
      return normalize(entry?.name) === normalize(stored.name);
    });

    if (existing) {
      existing.amount = Number(existing.amount || 0) + amount;

      for (const [key, value] of Object.entries(stored)) {
        if (key === "amount") continue;
        existing[key] = value;
      }
    } else {
      players[userId][bucket].push(stored);
    }

    writePlayers(players);

    return message.reply(
      `Added ${amount}x \`${stored.name}\` to \`${userId}\` in \`${bucket}\`.`
    );
  },
};