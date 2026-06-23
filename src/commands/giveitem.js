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
    .replace(/\s+fragment$/i, "")
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
    typeof source.displayName === "string";

  if (hasIdentity) {
    const key = source.name || source.displayName;
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

/*
  IMPORTANT:
  Search is intentionally name/displayName only.
  Do not search by code/id/title/alias/item fields.
*/
function getCatalogKeys(entry) {
  const keys = [];

  addSearchKey(keys, entry?.name);
  addSearchKey(keys, entry?.displayName);

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

const fragmentEntries = [
  ...cardEntries.map((entry) => ({
    ...entry,
    fragmentSource: "card",
  })),
  ...weaponEntries.map((entry) => ({
    ...entry,
    fragmentSource: "weapon",
  })),
];

const weaponIndex = buildIndex(weaponEntries);
const fruitIndex = buildIndex(fruitEntries);
const itemIndex = buildIndex(itemEntries);
const fragmentIndex = buildIndex(fragmentEntries);

function getEntriesForBucket(bucket) {
  if (bucket === "weapons") return weaponEntries;
  if (bucket === "devilFruits") return fruitEntries;
  if (bucket === "fragments") return fragmentEntries;
  return itemEntries;
}

function getIndexForBucket(bucket) {
  if (bucket === "weapons") return weaponIndex;
  if (bucket === "devilFruits") return fruitIndex;
  if (bucket === "fragments") return fragmentIndex;
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

function cleanFragmentBaseName(name) {
  return String(name || "Unknown")
    .replace(/\s+fragment$/i, "")
    .trim();
}

function getFragmentRarityFromCatalog(catalogEntry) {
  const rarity = String(
    catalogEntry?.currentTier ||
      catalogEntry?.tier ||
      catalogEntry?.rarity ||
      catalogEntry?.baseTier ||
      catalogEntry?.baseRarity ||
      "C"
  ).toUpperCase();

  if (["C", "B", "A", "S", "SS", "UR", "M"].includes(rarity)) {
    return rarity;
  }

  return "C";
}

function buildCardFragmentEntry(catalogEntry, amount) {
  return {
    name: catalogEntry.displayName || catalogEntry.name || catalogEntry.code,
    amount,
    rarity: getFragmentRarityFromCatalog(catalogEntry),
    category: catalogEntry.cardRole === "boost" ? "boost" : "battle",
    code: catalogEntry.code,
    cardCode: catalogEntry.code,
    sourceCode: catalogEntry.code,
    image: catalogEntry.image || "",
  };
}

function buildWeaponFragmentEntry(catalogEntry, amount) {
  const rawName = catalogEntry.displayName || catalogEntry.name || catalogEntry.code || "Unknown Weapon";
  const baseName = cleanFragmentBaseName(rawName);
  const weaponCode = catalogEntry.code || normalizeCode(baseName);

  return {
    name: `${baseName} Fragment`,
    displayName: `${baseName} Fragment`,
    amount,
    rarity: catalogEntry.rarity || catalogEntry.baseTier || "C",
    category: "weapon",
    code: `weapon_fragment_${weaponCode}`,
    weaponCode,
    sourceCode: weaponCode,
    image: catalogEntry.image || "",
  };
}

function buildFragmentEntry(catalogEntry, amount) {
  if (String(catalogEntry.fragmentSource || "").toLowerCase() === "weapon") {
    return buildWeaponFragmentEntry(catalogEntry, amount);
  }

  return buildCardFragmentEntry(catalogEntry, amount);
}

function buildStoredEntry(bucket, catalogEntry, amount) {
  if (bucket === "fragments") {
    return buildFragmentEntry(catalogEntry, amount);
  }

  const base = {
    name: catalogEntry.name || catalogEntry.displayName || catalogEntry.code,
    displayName: catalogEntry.displayName || catalogEntry.name || catalogEntry.code,
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
    base.amount = 1;
  }

  return base;
}

function isSameWeaponFragment(a, b) {
  const aWeaponCode = normalizeCode(a?.weaponCode || a?.sourceCode || a?.code || a?.name);
  const bWeaponCode = normalizeCode(b?.weaponCode || b?.sourceCode || b?.code || b?.name);

  if (aWeaponCode && bWeaponCode) {
    const cleanA = aWeaponCode.replace(/^weapon_fragment_/, "");
    const cleanB = bWeaponCode.replace(/^weapon_fragment_/, "");
    return cleanA === cleanB;
  }

  return false;
}

function sameEntry(a, b) {
  const aCategory = String(a?.category || "").toLowerCase();
  const bCategory = String(b?.category || "").toLowerCase();

  if (aCategory === "weapon" || bCategory === "weapon") {
    if (isSameWeaponFragment(a, b)) return true;

    const aName = cleanFragmentBaseName(a?.name || a?.displayName);
    const bName = cleanFragmentBaseName(b?.name || b?.displayName);

    if (normalize(aName) && normalize(aName) === normalize(bName)) return true;
  }

  if (a?.code && b?.code) {
    return normalizeCode(a.code) === normalizeCode(b.code);
  }

  return normalize(a?.name) === normalize(b?.name);
}

function addOrIncreaseEntry(list, stored, amount) {
  const arr = ensureArray(list).map((entry) => ({ ...entry }));
  const existing = arr.find((entry) => sameEntry(entry, stored));

  if (existing) {
    existing.amount = Number(existing.amount || 0) + amount;

    for (const [key, value] of Object.entries(stored)) {
      if (key === "amount") continue;
      existing[key] = value;
    }
  } else {
    arr.push({
      ...stored,
      amount,
    });
  }

  return arr;
}

function playerOwnsWeapon(player, weaponEntry) {
  const weaponCode = normalizeCode(weaponEntry?.code);
  const weaponName = normalize(weaponEntry?.name || weaponEntry?.displayName);

  return ensureArray(player?.weapons).some((weapon) => {
    const ownedCode = normalizeCode(weapon?.code);
    const ownedName = normalize(weapon?.name || weapon?.displayName);

    if (weaponCode && ownedCode && weaponCode === ownedCode) return true;
    if (weaponName && ownedName && weaponName === ownedName) return true;

    return false;
  });
}

function getUsageText() {
  return [
    "Usage: `op giveitem <@user/userId> <bucket> <amount> <display name/card name>`",
    "",
    "Examples:",
    "`op giveitem @user devilfruits 1 Hito Hito no Mi, Model: Nika`",
    "`op giveitem @user fragments 5 Luffy`",
    "`op giveitem @user fragments 5 Sniper Focus`",
    "`op giveitem @user fragments 5 Wado Ichimonji`",
    "`op giveitem @user weapons 1 Wado Ichimonji`",
    "`op giveitem @user tickets 2 Common Raid Ticket`",
    "",
    "Search only checks name / displayName, not code, id, title, alias, or other fields.",
    "Fragments can be card fragments or weapon fragments.",
    "Weapon fragments are saved as `<Weapon Name> Fragment` so `op finv` and awaken stay synced.",
    "If a player already owns a weapon, giving that weapon converts it into weapon fragments.",
    `Buckets: ${VALID_BUCKETS.join(", ")}`,
  ].join("\n");
}

module.exports = {
  name: "giveitem",
  aliases: [],

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

    if (!userId || !bucket || !Number.isFinite(amount) || amount === 0 || !query) {
      return message.reply({
        content: getUsageText(),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (bucket === "weapons" && amount < 0) {
      return message.reply({
        content: "Negative amount is not supported for weapons. Use `op removeitem` for weapons.",
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
        content: `Invalid ${bucket} entry.\nMust match by name / displayName only.\nQuery: \`${query}\``,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const stored = buildStoredEntry(bucket, catalogEntry, amount);

    let finalBucket = storageBucket;
    let finalStored = stored;
    let convertedToFragments = false;
    let gaveWeapon = false;
    let convertedFragmentAmount = 0;

    updatePlayerAtomic(
      userId,
      (fresh) => {
        if (bucket === "weapons") {
          const ownsWeapon = playerOwnsWeapon(fresh, catalogEntry);
          const weaponFragment = buildWeaponFragmentEntry(catalogEntry, amount);

          if (ownsWeapon) {
            finalBucket = "fragments";
            finalStored = weaponFragment;
            convertedToFragments = true;
            convertedFragmentAmount = amount;

            return {
              ...fresh,
              fragments: addOrIncreaseEntry(fresh.fragments, weaponFragment, amount),
            };
          }

          const weaponList = ensureArray(fresh.weapons).map((entry) => ({ ...entry }));
          weaponList.push({
            ...stored,
            amount: 1,
          });

          gaveWeapon = true;

          if (amount <= 1) {
            finalStored = stored;

            return {
              ...fresh,
              weapons: weaponList,
            };
          }

          const extraFragments = amount - 1;
          const extraWeaponFragment = buildWeaponFragmentEntry(catalogEntry, extraFragments);

          convertedToFragments = true;
          convertedFragmentAmount = extraFragments;
          finalStored = extraWeaponFragment;

          return {
            ...fresh,
            weapons: weaponList,
            fragments: addOrIncreaseEntry(fresh.fragments, extraWeaponFragment, extraFragments),
          };
        }

        const list = ensureArray(fresh[storageBucket]).map((entry) => ({ ...entry }));
        const nextList = addOrIncreaseEntry(list, stored, amount);

        return {
          ...fresh,
          [storageBucket]: nextList,
        };
      },
      mentionedUser?.username || `User ${userId}`
    );

    const description = [
      `**Target:** <@${userId}>`,
      `**User ID:** \`${userId}\``,
      `**Bucket:** \`${bucket}\``,
      `**Item:** ${finalStored.name || stored.name}`,
      `**Amount:** ${amount}`,
    ];

    if (bucket === "weapons") {
      if (gaveWeapon) {
        description.push("**Weapon Added:** Yes");
      }

      if (convertedToFragments) {
        description.push(
          `**Converted To Fragments:** ${convertedFragmentAmount}x ${finalStored.name}`
        );
      }
    } else {
      description.push(`**Saved To:** \`${finalBucket}\``);
    }

    if (bucket === "fragments") {
      description.push(
        `**Fragment Type:** ${
          stored.category === "weapon"
            ? "Weapon"
            : stored.category === "boost"
            ? "Boost Card"
            : "Battle Card"
        }`
      );
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("✅ Item Added")
      .setDescription(description.join("\n"))
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