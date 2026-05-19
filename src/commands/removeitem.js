const { EmbedBuilder } = require("discord.js");
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

function normalizeLoose(value) {
  return normalize(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompact(value) {
  return normalize(value).replace(/[\s_-]+/g, "");
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatUsage() {
  return [
    "Usage:",
    "`op removeitem <userId> <bucket> <amount> <item_code/name>`",
    "",
    "Examples:",
    "`op removeitem 123456789012345678 tickets 2 raid_ticket`",
    "`op removeitem 123456789012345678 tickets 2 raid ticket`",
    "`op removeitem 123456789012345678 materials 5 iron_2`",
    "",
    `Buckets: ${VALID_BUCKETS.join(", ")}`,
  ].join("\n");
}

function getEntryCode(entry) {
  return String(entry?.code || entry?.id || "").trim();
}

function getEntryName(entry) {
  return String(entry?.name || entry?.displayName || entry?.title || "").trim();
}

function getEntryInstanceId(entry) {
  return String(entry?.instanceId || entry?.id || "").trim();
}

function getEntryAmount(entry) {
  return Number(entry?.amount ?? entry?.count ?? entry?.quantity ?? 1);
}

function setEntryAmount(entry, amount) {
  if (Object.prototype.hasOwnProperty.call(entry, "count")) {
    entry.count = amount;
    return;
  }

  if (Object.prototype.hasOwnProperty.call(entry, "quantity")) {
    entry.quantity = amount;
    return;
  }

  entry.amount = amount;
}

function findRemoveTarget(list, query) {
  const q = String(query || "").trim();
  const qNorm = normalize(q);
  const qLoose = normalizeLoose(q);
  const qCompact = normalizeCompact(q);

  const entries = ensureArray(list).map((entry, index) => {
    const code = getEntryCode(entry);
    const name = getEntryName(entry);
    const instanceId = getEntryInstanceId(entry);

    return {
      entry,
      index,
      code,
      name,
      instanceId,
      codeNorm: normalize(code),
      nameNorm: normalize(name),
      idNorm: normalize(instanceId),
      codeLoose: normalizeLoose(code),
      nameLoose: normalizeLoose(name),
      idLoose: normalizeLoose(instanceId),
      codeCompact: normalizeCompact(code),
      nameCompact: normalizeCompact(name),
      idCompact: normalizeCompact(instanceId),
    };
  });

  // 1. Exact instance ID / exact code. This must win first.
  const exactIdOrCode = entries.filter(
    (item) =>
      item.idNorm === qNorm ||
      item.codeNorm === qNorm ||
      item.idLoose === qLoose ||
      item.codeLoose === qLoose ||
      item.idCompact === qCompact ||
      item.codeCompact === qCompact
  );

  if (exactIdOrCode.length === 1) {
    return {
      status: "found",
      index: exactIdOrCode[0].index,
      entry: exactIdOrCode[0].entry,
    };
  }

  if (exactIdOrCode.length > 1) {
    return {
      status: "multiple",
      matches: exactIdOrCode,
    };
  }

  // 2. Exact name.
  const exactName = entries.filter(
    (item) =>
      item.nameNorm === qNorm ||
      item.nameLoose === qLoose ||
      item.nameCompact === qCompact
  );

  if (exactName.length === 1) {
    return {
      status: "found",
      index: exactName[0].index,
      entry: exactName[0].entry,
    };
  }

  if (exactName.length > 1) {
    return {
      status: "multiple",
      matches: exactName,
    };
  }

  // 3. Partial code first.
  const partialCode = entries.filter(
    (item) =>
      item.codeNorm.includes(qNorm) ||
      item.codeLoose.includes(qLoose) ||
      item.codeCompact.includes(qCompact)
  );

  if (partialCode.length === 1) {
    return {
      status: "found",
      index: partialCode[0].index,
      entry: partialCode[0].entry,
    };
  }

  if (partialCode.length > 1) {
    return {
      status: "multiple",
      matches: partialCode,
    };
  }

  // 4. Partial name last.
  const partialName = entries.filter(
    (item) =>
      item.nameNorm.includes(qNorm) ||
      item.nameLoose.includes(qLoose) ||
      item.nameCompact.includes(qCompact)
  );

  if (partialName.length === 1) {
    return {
      status: "found",
      index: partialName[0].index,
      entry: partialName[0].entry,
    };
  }

  if (partialName.length > 1) {
    return {
      status: "multiple",
      matches: partialName,
    };
  }

  return {
    status: "not_found",
    matches: [],
  };
}

function formatMatches(matches) {
  return matches
    .slice(0, 10)
    .map((match, index) => {
      const code = match.code || "none";
      const id = match.instanceId || "none";
      const name = match.name || match.code || "Unknown";

      return `${index + 1}. ${name} • code: \`${code}\` • id: \`${id}\``;
    })
    .join("\n");
}

module.exports = {
  name: "removeitem",
  aliases: ["delitem"],

  async execute(message, args = []) {
    if (!isAdmin(message.author.id)) {
      return message.reply({
        content: "Owner only command.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const userId = String(args.shift() || "").trim();
    const bucket = String(args.shift() || "").trim();
    const amount = Number(args.shift() || 0);
    const query = args.join(" ").trim();

    if (!userId || !bucket || !Number.isFinite(amount) || amount <= 0 || !query) {
      return message.reply({
        content: formatUsage(),
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

    const players = readPlayers();

    if (!players[userId]) {
      return message.reply({
        content: `User not found: \`${userId}\``,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    players[userId][bucket] = ensureArray(players[userId][bucket]);

    const found = findRemoveTarget(players[userId][bucket], query);

    if (found.status === "not_found") {
      return message.reply({
        content: `Item not found in \`${bucket}\` for user \`${userId}\`.\nQuery: \`${query}\``,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (found.status === "multiple") {
      return message.reply({
        content: [
          "Multiple items matched that query. Use exact code.",
          "",
          formatMatches(found.matches),
        ].join("\n"),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const entry = players[userId][bucket][found.index];
    const currentAmount = getEntryAmount(entry);
    const nextAmount = currentAmount - amount;
    const removedAmount = Math.min(amount, currentAmount);

    if (nextAmount <= 0) {
      players[userId][bucket].splice(found.index, 1);
    } else {
      setEntryAmount(entry, nextAmount);
    }

    writePlayers(players);

    const displayName = getEntryName(entry) || getEntryCode(entry) || query;
    const displayCode = getEntryCode(entry) || "none";
    const displayId = getEntryInstanceId(entry) || "none";

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("✅ Item Removed")
      .setDescription(
        [
          `**Target:** <@${userId}>`,
          `**User ID:** \`${userId}\``,
          `**Bucket:** \`${bucket}\``,
          `**Item:** ${displayName}`,
          `**Code:** \`${displayCode}\``,
          `**Removed:** ${removedAmount}`,
          `**Left:** ${Math.max(0, nextAmount)}`,
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Admin Remove Item",
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