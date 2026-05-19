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

const TICKET_ALIAS_TO_CODE = {
  craid: "common_raid_ticket",
  commonraid: "common_raid_ticket",
  common_raid: "common_raid_ticket",
  common_raid_ticket: "common_raid_ticket",
  "common raid": "common_raid_ticket",
  "common raid ticket": "common_raid_ticket",

  raid: "raid_ticket",
  raidticket: "raid_ticket",
  raid_ticket: "raid_ticket",
  "raid ticket": "raid_ticket",

  graid: "gold_raid_ticket",
  goldraid: "gold_raid_ticket",
  gold_raid: "gold_raid_ticket",
  gold_raid_ticket: "gold_raid_ticket",
  "gold raid": "gold_raid_ticket",
  "gold raid ticket": "gold_raid_ticket",
};

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

function addKey(keys, value) {
  const raw = String(value || "").trim();
  if (!raw) return;

  keys.push(raw);
  keys.push(normalize(raw));
  keys.push(normalizeCode(raw));
  keys.push(normalizeCompact(raw));
}

function getCatalogKeys(entry) {
  const keys = [];

  [
    entry?.code,
    entry?.name,
    entry?.displayName,
    entry?.id,
    entry?.key,
    entry?.title,
    entry?.variant,
    entry?.type,
  ].forEach((value) => addKey(keys, value));

  if (Array.isArray(entry?.owners)) {
    entry.owners.forEach((owner) => addKey(keys, owner));
  }

  const name = String(entry?.name || "");
  const code = String(entry?.code || "");

  if (name.includes(",")) {
    name
      .split(",")
      .map((x) => x.trim())
      .forEach((part) => addKey(keys, part));
  }

  const modelMatch = name.match(/model:\s*(.+)$/i);
  if (modelMatch?.[1]) {
    addKey(keys, modelMatch[1]);
  }

  const noMiMatch = name.match(/^(.+?)\s+no\s+mi/i);
  if (noMiMatch?.[1]) {
    addKey(keys, noMiMatch[1]);
  }

  const codeParts = code.split("_").filter(Boolean);
  if (codeParts.length) {
    addKey(keys, codeParts[codeParts.length - 1]);
    addKey(keys, codeParts.slice(-2).join("_"));
    addKey(keys, codeParts.slice(-2).join(" "));
  }

  const codeNorm = normalizeCode(code);
  const nameNorm = normalize(name);

  if (codeNorm === "common_raid_ticket" || nameNorm === "common raid ticket") {
    ["craid", "commonraid", "common raid", "common raid ticket"].forEach((value) =>
      addKey(keys, value)
    );
  }

  if (codeNorm === "raid_ticket" || nameNorm === "raid ticket") {
    ["raid", "raidticket", "raid ticket"].forEach((value) => addKey(keys, value));
  }

  if (codeNorm === "gold_raid_ticket" || nameNorm === "gold raid ticket") {
    ["graid", "goldraid", "gold raid", "gold raid ticket"].forEach((value) =>
      addKey(keys, value)
    );
  }

  if (
    normalize(name).includes("nika") ||
    normalizeCode(code).includes("nika") ||
    normalize(name).includes("hito hito no mi model nika")
  ) {
    [
      "nika",
      "hito hito nika",
      "hito hito no mi nika",
      "hito hito no mi model nika",
      "hito_hito_no_mi_model_nika",
      "sun god nika",
      "luffy fruit",
      "luffy df",
    ].forEach((value) => addKey(keys, value));
  }

  return [...new Set(keys.map(String).filter(Boolean))];
}

function buildIndex(entries) {
  const map = new Map();

  for (const entry of entries) {
    const keys = getCatalogKeys(entry);

    for (const key of keys) {
      const normalized = normalize(key);
      const code = normalizeCode(key);
      const compact = normalizeCompact(key);

      if (!map.has(normalized)) map.set(normalized, entry);
      if (!map.has(code)) map.set(code, entry);
      if (!map.has(compact)) map.set(compact, entry);
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

function resolveTicketAlias(query) {
  const q = normalize(query);
  const qc = normalizeCode(query);
  const compact = normalizeCompact(query);

  return (
    TICKET_ALIAS_TO_CODE[q] ||
    TICKET_ALIAS_TO_CODE[qc] ||
    TICKET_ALIAS_TO_CODE[compact] ||
    null
  );
}

function findExactCodeEntry(entries, code) {
  const target = normalizeCode(code);

  return (
    entries.find((entry) => normalizeCode(entry?.code) === target) ||
    entries.find((entry) => normalizeCode(entry?.id) === target) ||
    null
  );
}

function scoreEntry(entry, query) {
  const q = normalize(query);
  const qc = normalizeCode(query);
  const qCompact = normalizeCompact(query);

  if (!q && !qc && !qCompact) return 0;

  const entryCode = normalizeCode(entry?.code);
  const entryName = normalize(entry?.name || entry?.displayName);

  if (entryCode && entryCode === qc) return 5000;
  if (entryName && entryName === q) return 4500;

  let best = 0;

  for (const key of getCatalogKeys(entry)) {
    const k = normalize(key);
    const kc = normalizeCode(key);
    const kCompact = normalizeCompact(key);

    if (k === q || kc === qc || kCompact === qCompact) {
      best = Math.max(best, 1000);
      continue;
    }

    if (k.startsWith(q) || kc.startsWith(qc) || kCompact.startsWith(qCompact)) {
      best = Math.max(best, 700);
      continue;
    }

    if (k.includes(q) || kc.includes(qc) || kCompact.includes(qCompact)) {
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
  const entries = getEntriesForBucket(bucket);

  if (bucket === "tickets") {
    const aliasCode = resolveTicketAlias(query);

    if (aliasCode) {
      return findExactCodeEntry(entries, aliasCode);
    }
  }

  const q = normalize(query);
  const qc = normalizeCode(query);
  const qCompact = normalizeCompact(query);
  const index = getIndexForBucket(bucket);

  const exactCode = findExactCodeEntry(entries, qc);
  if (exactCode) return exactCode;

  const exact =
    index.get(q) ||
    index.get(qc) ||
    index.get(qCompact) ||
    null;

  if (exact) return exact;

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
    "Usage: `op giveitem <@user/userId> <bucket> <amount> <item_code/name>`",
    "",
    "Ticket aliases:",
    "`craid` = Common Raid Ticket",
    "`raid` = Raid Ticket",
    "`graid` = Gold Raid Ticket",
    "",
    "Examples:",
    "`op giveitem @user tickets 1 craid`",
    "`op giveitem @user tickets 1 raid`",
    "`op giveitem @user tickets 1 graid`",
    "`op giveitem @user devilfruits 1 nika`",
    "`op giveitem 123456789012345678 devilfruits 1 hito_hito_no_mi_model_nika`",
    "",
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
        content: `Invalid ${bucket} entry.\nMust match data by name or code.\nQuery: \`${query}\``,
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
      .setFooter({
        text: "One Piece Bot • Admin Give Item",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        users: [String(userId)],
        repliedUser: false,
      },
    });
  },
};