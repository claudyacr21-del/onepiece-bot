const { EmbedBuilder } = require("discord.js");
const {
  updatePlayerAtomic,
  flushPlayerNow,
} = require("../playerStore");
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

function parseEnvIds(...values) {
  return values
    .flatMap((value) => String(value || "").split(","))
    .map((value) =>
      value
        .replace(/[<@&>]/g, "")
        .trim()
    )
    .filter(Boolean);
}

function getAdminUserIds() {
  return parseEnvIds(
    process.env.ADMIN_USER_IDS,
    process.env.DISCORD_OWNER_ID,
    process.env.BOT_OWNER_ID,
    process.env.BOT_OWNER_IDS,
    process.env.OWNER_IDS
  );
}

function getAdminRoleIds() {
  return parseEnvIds(process.env.ADMIN_ROLE_IDS);
}

async function getCommandMember(message) {
  if (!message?.guild || !message?.author?.id) return null;

  return (
    message?.resolvedMember ||
    message?.mainMember ||
    message?.member ||
    message.guild.members.cache.get(message.author.id) ||
    (await message.guild.members.fetch(message.author.id).catch(() => null))
  );
}

async function memberHasAdminRole(message) {
  const roleIds = getAdminRoleIds();

  if (!roleIds.length) return false;

  const member = await getCommandMember(message);

  if (!member?.roles?.cache) return false;

  return roleIds.some((roleId) => member.roles.cache.has(roleId));
}

async function isAdmin(message) {
  const userId = String(message?.author?.id || "");

  return getAdminUserIds().includes(userId) || await memberHasAdminRole(message);
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

function getOwnedAmountForRemove(entry, bucket) {
  const rawAmount = Number(
    entry?.amount ??
      entry?.count ??
      entry?.quantity ??
      entry?.qty
  );

  if (Number.isFinite(rawAmount)) {
    return rawAmount;
  }

  if (bucket === "weapons" || bucket === "devilFruits") {
    return 1;
  }

  return 0;
}

function shouldRemoveEntryWhenZeroOrBelow(bucket) {
  return bucket === "weapons" || bucket === "devilFruits";
}

function canCreateNegativeEntry(bucket) {
  return !["weapons", "devilFruits"].includes(bucket);
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
  return entry?.displayName || entry?.name || entry?.title || entry?.code || "Unknown";
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

function sameEntry(a, b) {
  if (a?.code && b?.code) {
    return normalizeCode(a.code) === normalizeCode(b.code);
  }

  return normalize(a?.name || a?.displayName) === normalize(b?.name || b?.displayName);
}

function buildNegativeEntry(bucket, catalogEntry, amount) {
  const entry = buildSearchEntry(bucket, catalogEntry);
  return {
    ...entry,
    displayName: entry.displayName || entry.name,
    amount: -Math.abs(amount),
  };
}

function buildSearchEntry(bucket, catalogEntry) {
  if (bucket === "fragments") {
    return {
      name: catalogEntry.displayName || catalogEntry.name || catalogEntry.code,
      rarity: catalogEntry.baseTier || catalogEntry.rarity || "C",
      category: catalogEntry.cardRole === "boost" ? "boost" : "battle",
      code: catalogEntry.code,
      image: catalogEntry.image || "",
    };
  }

  return {
    name: catalogEntry.name || catalogEntry.displayName || catalogEntry.code,
    code: catalogEntry.code,
  };
}

function findOwnedEntryIndex(list, bucket, query) {
  const catalogEntry = findCatalogEntry(bucket, query);

  if (catalogEntry) {
    const searchEntry = buildSearchEntry(bucket, catalogEntry);
    const exactIndex = list.findIndex((entry) => sameEntry(entry, searchEntry));

    if (exactIndex !== -1) {
      return {
        index: exactIndex,
        catalogEntry,
        searchEntry,
        matchedBy: "catalog",
      };
    }
  }

  const q = normalize(query);
  const qCompact = normalizeCompact(query);
  const qCode = normalizeCode(query);

  const matches = list
    .map((entry, index) => {
      const keys = [
        entry?.displayName,
        entry?.name,
        entry?.title,
        entry?.code,
        entry?.instanceId,
      ].filter(Boolean);

      let score = 0;

      for (const key of keys) {
        const n = normalize(key);
        const c = normalizeCompact(key);
        const code = normalizeCode(key);

        if (n === q || c === qCompact || code === qCode) score = Math.max(score, 1000);
        else if (n.startsWith(q) || c.startsWith(qCompact)) score = Math.max(score, 700);
        else if (n.includes(q) || c.includes(qCompact)) score = Math.max(score, 400);
      }

      return {
        entry,
        index,
        score,
      };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!matches.length) {
    return {
      index: -1,
      catalogEntry,
      searchEntry: null,
      matchedBy: catalogEntry ? "catalog_missing_owned" : "none",
    };
  }

  const bestScore = matches[0].score;
  const bestMatches = matches.filter((hit) => hit.score === bestScore);

  if (bestMatches.length > 1) {
    return {
      index: -2,
      ambiguous: bestMatches.slice(0, 10),
      catalogEntry,
      searchEntry: null,
      matchedBy: "ambiguous",
    };
  }

  return {
    index: matches[0].index,
    catalogEntry,
    searchEntry: null,
    matchedBy: "owned",
  };
}

function getUsageText() {
  return [
    "Usage: `op removeitem <@user/userId> <bucket> <amount> <display name/card name>`",
    "",
    "Examples:",
    "`op removeitem @user devilfruits 1 Hito Hito no Mi, Model: Nika`",
    "`op removeitem @user df 1 Hito hito`",
    "`op removeitem @user fragments 5 Luffy`",
    "`op removeitem @user tickets 2 Common Raid Ticket`",
    "",
    "Search is synced with giveitem display name / card name search.",
    `Buckets: ${VALID_BUCKETS.join(", ")}`,
  ].join("\n");
}

module.exports = {
  name: "removeitem",
  aliases: ["delitem"],

  async execute(message, args = []) {
    if (!(await isAdmin(message))) {
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

    let removedName = "";
    let removedCode = "";
    let ownedAmount = 0;
    let status = "ok";
    let ambiguous = [];

    updatePlayerAtomic(
      userId,
      (fresh) => {
        const list = ensureArray(fresh[storageBucket]).map((entry) => ({ ...entry }));
        const found = findOwnedEntryIndex(list, bucket, query);

        if (found.index === -2) {
          status = "ambiguous";
          ambiguous = found.ambiguous || [];
          return fresh;
        }

        if (found.index < 0) {
          const catalogEntry = found.catalogEntry || findCatalogEntry(bucket, query);

          if (!catalogEntry || !canCreateNegativeEntry(bucket)) {
            status = "not_found";
            return fresh;
          }

          const negativeEntry = buildNegativeEntry(bucket, catalogEntry, amount);

          ownedAmount = 0;
          removedName = getDisplayName(negativeEntry);
          removedCode = negativeEntry.code || "none";

          list.push(negativeEntry);

          return {
            ...fresh,
            [storageBucket]: list,
          };
        }

        const entry = list[found.index];

        ownedAmount = getOwnedAmountForRemove(entry, bucket);
        removedName = getDisplayName(entry);
        removedCode = entry.code || "none";

        const nextAmount = ownedAmount - amount;

        if (
          nextAmount <= 0 &&
          shouldRemoveEntryWhenZeroOrBelow(bucket)
        ) {
          list.splice(found.index, 1);
        } else if (nextAmount === 0) {
          list.splice(found.index, 1);
        } else {
          list[found.index] = {
            ...entry,
            amount: nextAmount,
          };
        }

        return {
          ...fresh,
          [storageBucket]: list,
        };
      },
      mentionedUser?.username || `User ${userId}`
    );

    await flushPlayerNow(
      userId,
      Number(process.env.PLAYER_DB_COMMAND_FLUSH_MS || 8000)
    );

    if (status === "ambiguous") {
      return message.reply({
        content: [
          "Multiple owned entries matched that query.",
          "Use a more specific display name / card name.",
          "",
          ...ambiguous.map(({ entry }, i) => {
            return `${i + 1}. ${getDisplayName(entry)} • code: \`${entry.code || "none"}\` • id: \`${entry.instanceId || "none"}\``;
          }),
        ].join("\n"),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (status === "not_found") {
      return message.reply({
        content: `Item not found in \`${bucket}\` for user \`${userId}\`.\nQuery: \`${query}\``,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("✅ Item Removed")
      .setDescription(
        [
          `**Target:** <@${userId}>`,
          `**User ID:** \`${userId}\``,
          `**Bucket:** \`${bucket}\``,
          `**Item:** ${removedName}`,
          `**Code:** \`${removedCode}\``,
          `**Amount Removed:** ${amount}`,
          `**Remaining:** ${Math.max(0, ownedAmount - amount)}`,
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Admin Remove Item" });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        users: [String(userId)],
        repliedUser: false,
      },
    });
  },
};