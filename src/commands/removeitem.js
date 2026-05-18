const { updatePlayerAtomic } = require("../playerStore");

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
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[<@!>]/g, "")
    .replace(/^model:\s*/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[<@!>]/g, "");
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseUserId(value) {
  return String(value || "").replace(/[<@!>]/g, "").trim();
}

function matchEntry(entry, query) {
  const q = normalize(query);
  const qc = normalizeCode(query);

  return (
    normalize(entry?.name) === q ||
    normalize(entry?.displayName) === q ||
    normalize(entry?.code) === q ||
    normalizeCode(entry?.code) === qc ||
    normalizeCode(entry?.instanceId) === qc ||
    normalize(entry?.name).includes(q) ||
    normalize(entry?.displayName).includes(q) ||
    normalize(entry?.code).includes(q)
  );
}

module.exports = {
  name: "removeitem",
  aliases: ["delitem"],

  async execute(message, args = []) {
    if (!isAdmin(message.author.id)) {
      return message.reply({
        content: "Owner only command.",
        allowedMentions: { repliedUser: false },
      });
    }

    const userId =
      message.mentions.users.first()?.id ||
      parseUserId(args.shift());

    const bucket = String(args.shift() || "").trim();
    const amount = Number(args.shift() || 0);
    const query = args.join(" ").trim();

    if (!userId || !bucket || !Number.isFinite(amount) || amount <= 0 || !query) {
      return message.reply({
        content: "Usage: `op removeitem <@user/userId> <bucket> <amount> <item name/code>`",
        allowedMentions: { repliedUser: false },
      });
    }

    if (!VALID_BUCKETS.includes(bucket)) {
      return message.reply({
        content: `Invalid bucket.\nUse: ${VALID_BUCKETS.join(", ")}`,
        allowedMentions: { repliedUser: false },
      });
    }

    let removedName = "";
    let notFound = false;
    let notEnough = false;
    let ownedAmount = 0;
    let ambiguous = [];

    updatePlayerAtomic(
      userId,
      (fresh) => {
        const list = ensureArray(fresh[bucket]).map((entry) => ({ ...entry }));
        const matches = list
          .map((entry, index) => ({ entry, index }))
          .filter(({ entry }) => matchEntry(entry, query));

        if (!matches.length) {
          notFound = true;
          return fresh;
        }

        if (matches.length > 1) {
          ambiguous = matches.slice(0, 10);
          return fresh;
        }

        const { entry, index } = matches[0];
        ownedAmount = Number(entry.amount || 0);

        if (ownedAmount < amount) {
          notEnough = true;
          removedName = entry.name || entry.code || query;
          return fresh;
        }

        const nextAmount = ownedAmount - amount;
        removedName = entry.name || entry.code || query;

        if (nextAmount <= 0) {
          list.splice(index, 1);
        } else {
          list[index] = {
            ...entry,
            amount: nextAmount,
          };
        }

        return {
          ...fresh,
          [bucket]: list,
        };
      },
      message.mentions.users.first()?.username || "Unknown"
    );

    if (ambiguous.length) {
      return message.reply({
        content: [
          "Multiple items matched that query. Use exact code or instance ID.",
          "",
          ...ambiguous.map(({ entry }, i) => {
            return `${i + 1}. ${entry.name || entry.code || "Unknown"} • code: \`${entry.code || "none"}\` • id: \`${entry.instanceId || "none"}\``;
          }),
        ].join("\n"),
        allowedMentions: { repliedUser: false },
      });
    }

    if (notFound) {
      return message.reply({
        content: `Item not found in \`${bucket}\` for user \`${userId}\`.`,
        allowedMentions: { repliedUser: false },
      });
    }

    if (notEnough) {
      return message.reply({
        content: `Not enough \`${removedName}\` in \`${bucket}\`. Owned: ${ownedAmount}, requested remove: ${amount}.`,
        allowedMentions: { repliedUser: false },
      });
    }

    return message.reply({
      content: `Removed ${amount}x \`${removedName}\` from \`${userId}\` in \`${bucket}\`.`,
      allowedMentions: { repliedUser: false },
    });
  },
};