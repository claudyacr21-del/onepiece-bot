const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("../playerStore");
const weaponsData = require("../data/weapons");
const devilFruitsData = require("../data/devilFruits");
const itemsData = require("../data/items");
const cardsData = require("../data/cards");

const VALID_BUCKETS = [
  "consumables",
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
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[<@!>]/g, "")
    .replace(/^model:\s*/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[<@!>]/g, "")
    .replace(/^model:\s*/i, "")
    .replace(/[^a-z0-9\s_-]+/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCompact(value) {
  return normalize(value).replace(/\s+/g, "");
}

function parseUserId(value) {
  return String(value || "").replace(/[<@!>]/g, "").trim();
}

function normalizeBucket(value) {
  const bucket = String(value || "").trim().toLowerCase();

  if (["item", "items", "consumable", "consumables"].includes(bucket)) {
    return "consumables";
  }

  if (
    [
      "devilfruit",
      "devilfruits",
      "devil_fruit",
      "devil_fruits",
      "fruit",
      "fruits",
      "df",
    ].includes(bucket)
  ) {
    return "devilFruits";
  }

  if (["weapon", "weapons"].includes(bucket)) return "weapons";
  if (["box", "boxes"].includes(bucket)) return "boxes";
  if (["ticket", "tickets"].includes(bucket)) return "tickets";
  if (["material", "materials"].includes(bucket)) return "materials";
  if (["fragment", "fragments", "frag", "frags"].includes(bucket)) return "fragments";

  return bucket;
}

function getStorageBucket(bucket) {
  if (bucket === "consumables") return "items";
  return bucket;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function collectCatalogEntries(source, out = [], seen = new Set()) {
  if (Array.isArray(source)) {
    for (const entry of source) collectCatalogEntries(entry, out, seen);
    return out;
  }

  if (!source || typeof source !== "object") return out;

  const hasIdentity =
    typeof source.name === "string" ||
    typeof source.code === "string" ||
    typeof source.id === "string" ||
    typeof source.displayName === "string";

  if (hasIdentity) {
    const key = source.code || source.id || source.name || source.displayName;
    const seenKey = `${key}_${out.length}`;

    if (!seen.has(seenKey)) {
      seen.add(seenKey);
      out.push(source);
    }
  }

  for (const value of Object.values(source)) {
    if (Array.isArray(value) || (value && typeof value === "object")) {
      collectCatalogEntries(value, out, seen);
    }
  }

  return out;
}

function addSearchKey(keys, value) {
  const raw = String(value || "").trim();
  if (!raw) return;

  keys.push(raw);
  keys.push(normalize(raw));
  keys.push(normalizeCompact(raw));
}

function getDisplayName(entry) {
  return entry?.displayName || entry?.name || "";
}

function getCatalogKeys(entry) {
  const keys = [];

  addSearchKey(keys, getDisplayName(entry));

  const name = String(entry?.name || "");
  const displayName = String(entry?.displayName || "");

  if (name.includes(",")) {
    name
      .split(",")
      .map((x) => x.trim())
      .forEach((part) => addSearchKey(keys, part));
  }

  if (displayName.includes(",")) {
    displayName
      .split(",")
      .map((x) => x.trim())
      .forEach((part) => addSearchKey(keys, part));
  }

  const modelMatch = name.match(/model:\s*(.+)$/i) || displayName.match(/model:\s*(.+)$/i);
  if (modelMatch?.[1]) {
    addSearchKey(keys, modelMatch[1]);
  }

  const noMiMatch = name.match(/^(.+?)\s+no\s+mi/i) || displayName.match(/^(.+?)\s+no\s+mi/i);
  if (noMiMatch?.[1]) {
    addSearchKey(keys, noMiMatch[1]);
  }

  return [...new Set(keys.map(String).filter(Boolean))];
}

function buildIndex(entries) {
  const map = new Map();

  for (const entry of entries) {
    const keys = getCatalogKeys(entry);

    for (const key of keys) {
      map.set(normalize(key), entry);
      map.set(normalizeCompact(key), entry);
    }
  }

  return map;
}

const weaponEntries = collectCatalogEntries(weaponsData);
const fruitEntries = collectCatalogEntries(devilFruitsData);
const itemEntries = collectCatalogEntries(itemsData);
const cardEntries = collectCatalogEntries(cardsData);

const weaponIndex = buildIndex(weaponEntries);
const fruitIndex = buildIndex(fruitEntries);
const itemIndex = buildIndex(itemEntries);
const cardIndex = buildIndex(cardEntries);

function getEntriesForBucket(bucket) {
  if (bucket === "weapons") return weaponEntries;
  if (bucket === "devilFruits") return fruitEntries;
  if (bucket === "fragments") return cardEntries;
  return itemEntries;
}

function getIndexForBucket(bucket) {
  if (bucket === "weapons") return weaponIndex;
  if (bucket === "devilFruits") return fruitIndex;
  if (bucket === "fragments") return cardIndex;
  return itemIndex;
}

function scoreEntry(entry, query) {
  const q = normalize(query);
  const qCompact = normalizeCompact(query);

  if (!q && !qCompact) return 0;

  let best = 0;

  for (const key of getCatalogKeys(entry)) {
    const k = normalize(key);
    const kCompact = normalizeCompact(key);

    if (k === q || kCompact === qCompact) {
      best = Math.max(best, 1000);
      continue;
    }

    if (k.startsWith(q) || kCompact.startsWith(qCompact)) {
      best = Math.max(best, 700);
      continue;
    }

    if (k.includes(q) || kCompact.includes(qCompact)) {
      best = Math.max(best, 400);
      continue;
    }

    const words = q.split(" ").filter(Boolean);
    if (words.length && words.every((word) => k.includes(word))) {
      best = Math.max(best, 250);
    }
  }

  return best;
}

function findCatalogEntry(bucket, query) {
  const q = normalize(query);
  const qCompact = normalizeCompact(query);
  const index = getIndexForBucket(bucket);
  const exact = index.get(q) || index.get(qCompact) || null;

  if (exact) return exact;

  const entries = getEntriesForBucket(bucket);
  const ranked = entries
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, query),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.entry || null;
}

function buildStoredEntry(bucket, catalogEntry, amount) {
  if (bucket === "fragments") {
    return {
      name: catalogEntry.displayName || catalogEntry.name || catalogEntry.code,
      amount,
      rarity: catalogEntry.baseTier || catalogEntry.rarity || "C",
      category: catalogEntry.cardRole === "boost" ? "boost" : "battle",
      code: catalogEntry.code,
      image: catalogEntry.image || "",
    };
  }

  const base = {
    name: catalogEntry.name || catalogEntry.displayName || catalogEntry.code,
    amount,
  };

  if (catalogEntry.code) base.code = catalogEntry.code;
  if (catalogEntry.rarity) base.rarity = catalogEntry.rarity;
  if (catalogEntry.baseTier && !base.rarity) base.rarity = catalogEntry.baseTier;
  if (catalogEntry.image) base.image = catalogEntry.image;
  if (catalogEntry.type) base.type = catalogEntry.type;
  if (catalogEntry.description) base.description = catalogEntry.description;
  if (catalogEntry.power) base.power = catalogEntry.power;

  if (catalogEntry.statPercent) {
    base.statPercent = { ...catalogEntry.statPercent };
  }

  if (catalogEntry.statBonus) {
    base.statBonus = { ...catalogEntry.statBonus };
  }

  if (catalogEntry.ownerBonusPercent) {
    base.ownerBonusPercent = { ...catalogEntry.ownerBonusPercent };
  }

  if (Array.isArray(catalogEntry.owners)) {
    base.owners = [...catalogEntry.owners];
  }

  if (catalogEntry.boostBonus) {
    base.boostBonus = { ...catalogEntry.boostBonus };
  }

  if (
    bucket === "consumables" ||
    bucket === "boxes" ||
    bucket === "tickets" ||
    bucket === "materials"
  ) {
    delete base.statPercent;
    delete base.statBonus;
    delete base.ownerBonusPercent;
    delete base.owners;
    delete base.boostBonus;
  }

  if (bucket === "weapons") {
    base.upgradeLevel = Number(catalogEntry.upgradeLevel || 0);
  }

  return base;
}

function sameEntry(a, b) {
  if (a?.code && b?.code) {
    return normalizeCode(a.code) === normalizeCode(b.code);
  }

  return normalize(a?.name) === normalize(b?.name);
}

function getUsageText() {
  return [
    "Usage: `op giveitem <@user/userId> <bucket> <amount> <display name/card name>`",
    "",
    "Examples:",
    "`op giveitem @user devilfruits 1 Hito Hito no Mi, Model: Nika`",
    "`op giveitem @user fragments 5 Luffy`",
    "`op giveitem @user fragments 5 Sniper Focus`",
    "`op giveitem @user tickets 2 Common Raid Ticket`",
    "",
    "Search only checks display name / card name, not code name.",
    `Buckets: ${VALID_BUCKETS.join(", ")}`,
  ].join("\n");
}

module.exports = {
  name: "giveitem",
  aliases: [],

  async execute(message, args = []) {
    if (!isAdmin(message.author.id)) {
      return message.reply({
        content: "Owner only command.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const targetArg = args.shift();
    const mentionedUser = message.mentions.users.first();
    const userId = mentionedUser?.id || parseUserId(targetArg);
    const bucket = normalizeBucket(args.shift());
    const storageBucket = getStorageBucket(bucket);
    const amount = Number(args.shift() || 0);
    const query = args.join(" ").trim();

    if (!userId || !bucket || !Number.isFinite(amount) || amount <= 0 || !query) {
      return message.reply({
        content: getUsageText(),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (!VALID_BUCKETS.includes(bucket)) {
      return message.reply({
        content: `Invalid bucket.\nUse: ${VALID_BUCKETS.join(", ")}`,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const catalogEntry = findCatalogEntry(bucket, query);

    if (!catalogEntry) {
      return message.reply({
        content: `Invalid ${bucket} entry.\nMust match by display name / card name only.\nQuery: \`${query}\``,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const stored = buildStoredEntry(bucket, catalogEntry, amount);

    updatePlayerAtomic(
      userId,
      (fresh) => {
        const list = ensureArray(fresh[storageBucket]).map((entry) => ({ ...entry }));
        const existing = list.find((entry) => sameEntry(entry, stored));

        if (existing) {
          existing.amount = Number(existing.amount || 0) + amount;

          for (const [key, value] of Object.entries(stored)) {
            if (key === "amount") continue;
            existing[key] = value;
          }
        } else {
          list.push(stored);
        }

        return {
          ...fresh,
          [storageBucket]: list,
        };
      },
      mentionedUser?.username || `User ${userId}`
    );

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("✅ Item Added")
      .setDescription(
        [
          `**Target:** <@${userId}>`,
          `**User ID:** \`${userId}\``,
          `**Bucket:** \`${bucket}\``,
          `**Item:** ${stored.name}`,
          `**Code:** \`${stored.code || "none"}\``,
          `**Amount:** ${amount}`,
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Admin Give Item" });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        users: [String(userId)],
        repliedUser: false,
      },
    });
  },
};