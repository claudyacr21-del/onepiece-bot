const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("../playerStore");
const { getFragmentStorageInfo, getSacBerryValue } = require("../utils/autoSac");

const VALID_RARITIES = new Set(["C", "B", "A", "S", "SS", "UR"]);

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^model:\s*/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s.]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^model:\s*/i, "")
    .replace(/[^a-z0-9\s._-]+/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCompact(value) {
  return normalize(value).replace(/[\s._-]+/g, "");
}

function formatRarity(rarity) {
  const value = String(rarity || "C").toUpperCase();
  return VALID_RARITIES.has(value) ? value : "C";
}

function getFragmentName(fragment) {
  return (
    fragment?.displayName ||
    fragment?.name ||
    fragment?.cardName ||
    fragment?.title ||
    String(fragment?.code || "Unknown Fragment")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())
  );
}

function getFragmentAmount(fragment) {
  const amount = Number(fragment?.amount || 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function getFragmentCategory(fragment) {
  const category = String(fragment?.category || "").toLowerCase();
  const role = String(fragment?.cardRole || "").toLowerCase();
  const code = String(fragment?.code || "").toLowerCase();

  if (category) return category;
  if (role === "boost") return "boost";
  if (fragment?.weaponCode || code.startsWith("weapon_fragment_")) return "weapon";

  return "battle";
}

function getFragmentExactCodeFields(fragment) {
  return [
    fragment?.code,
    fragment?.cardCode,
    fragment?.baseCode,
    fragment?.characterCode,
    fragment?.weaponCode,
    fragment?.sourceCode,
    fragment?.id,
    fragment?.key,
  ].filter(Boolean);
}

function getFragmentFuzzySearchFields(fragment) {
  const rawName = String(fragment?.name || fragment?.displayName || "").trim();
  const rawCode = String(fragment?.code || "").trim();

  const cleanName = rawName.replace(/\s+fragment$/i, "").trim();

  // Keep this only for LOW priority fuzzy searching.
  // Never use this as an exact code match, because:
  // weapon_fragment_soul_solid must not equal soul_solid.
  const cleanWeaponCode = rawCode
    .replace(/^weapon_fragment_/i, "")
    .replace(/_fragment$/i, "")
    .trim();

  return [
    rawName,
    cleanName,
    fragment?.displayName,
    fragment?.cardName,
    fragment?.title,
    cleanWeaponCode,
  ].filter(Boolean);
}

function scoreFragment(fragment, query) {
  const q = normalize(query);
  const qc = normalizeCode(query);
  const qCompact = normalizeCompact(query);

  if (!q && !qc && !qCompact) return 0;

  let best = 0;

  // 1) Exact raw code match has the highest priority.
  // This keeps weapon_fragment_soul_solid different from soul_solid.
  for (const field of getFragmentExactCodeFields(fragment)) {
    const fc = normalizeCode(field);
    const fCompact = normalizeCompact(field);

    if (!fc && !fCompact) continue;

    if (fc === qc || fCompact === qCompact) {
      return 10000;
    }
  }

  // 2) Fuzzy/name matching is lower priority.
  // This can still show multiple matches when the name is genuinely ambiguous.
  for (const field of getFragmentFuzzySearchFields(fragment)) {
    const f = normalize(field);
    const fc = normalizeCode(field);
    const fCompact = normalizeCompact(field);

    if (!f && !fc && !fCompact) continue;

    if (f === q) {
      best = Math.max(best, 2500);
      continue;
    }

    if (f.startsWith(q)) {
      best = Math.max(best, 1500 + q.length);
      continue;
    }

    if (fc.startsWith(qc) || fCompact.startsWith(qCompact)) {
      best = Math.max(best, 1200 + qCompact.length);
      continue;
    }

    if (f.includes(q)) {
      best = Math.max(best, 700 + q.length);
      continue;
    }

    if (fc.includes(qc) || fCompact.includes(qCompact)) {
      best = Math.max(best, 600 + qCompact.length);
      continue;
    }

    const qWords = q.split(" ").filter(Boolean);

    if (qWords.length && qWords.every((word) => f.includes(word))) {
      best = Math.max(best, 500 + qWords.join("").length);
    }
  }

  return best;
}

function findFragmentMatch(fragments, query) {
  const scored = (Array.isArray(fragments) ? fragments : [])
    .map((fragment, index) => ({
      fragment,
      index,
      score: scoreFragment(fragment, query),
    }))
    .filter((entry) => entry.score > 0 && getFragmentAmount(entry.fragment) > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const amountDiff =
        getFragmentAmount(b.fragment) - getFragmentAmount(a.fragment);
      if (amountDiff !== 0) return amountDiff;

      return getFragmentName(a.fragment).localeCompare(getFragmentName(b.fragment));
    });

  if (!scored.length) {
    return {
      status: "not_found",
      index: -1,
      fragment: null,
      matches: [],
    };
  }

  const topScore = scored[0].score;
  const topMatches = scored.filter((entry) => entry.score === topScore);

  if (topMatches.length > 1) {
    return {
      status: "multiple",
      index: -1,
      fragment: null,
      matches: topMatches,
    };
  }

  return {
    status: "found",
    index: scored[0].index,
    fragment: scored[0].fragment,
    matches: scored,
  };
}

function parseSacArgs(args = []) {
  const parts = args.map((arg) => String(arg || "").trim()).filter(Boolean);

  if (parts.length < 2) {
    return {
      query: "",
      amountText: "",
    };
  }

  const first = String(parts[0] || "").toLowerCase();
  const last = String(parts[parts.length - 1] || "").toLowerCase();

  if (first === "all" || /^\d+$/.test(first)) {
    return {
      amountText: first,
      query: parts.slice(1).join(" ").trim(),
    };
  }

  return {
    query: parts.slice(0, -1).join(" ").trim(),
    amountText: last,
  };
}

function parseAmount(amountText, ownedAmount) {
  const raw = String(amountText || "").toLowerCase().trim();

  if (raw === "all") return ownedAmount;

  const amount = Math.floor(Number(raw));

  if (!Number.isFinite(amount) || amount <= 0) return 0;

  return amount;
}

function formatFragmentLine(fragment, index) {
  const category = getFragmentCategory(fragment);
  const exactCode = fragment?.code || "none";

  return `${index + 1}. **${getFragmentName(fragment)}** x${getFragmentAmount(
    fragment
  )} • ${formatRarity(fragment?.rarity)} • ${category} fragment • exact code: \`${exactCode}\``;
}

function getFragmentSample(fragments) {
  return (Array.isArray(fragments) ? fragments : [])
    .filter((fragment) => getFragmentAmount(fragment) > 0)
    .slice(0, 15)
    .map((fragment, index) => formatFragmentLine(fragment, index));
}

function getUsageText() {
  return [
    "Usage:",
    "`op sac <fragment name/code> <amount/all>`",
    "`op sac <amount/all> <fragment name/code>`",
    "",
    "Examples:",
    "`op sac luffy 5`",
    "`op sac 5 luffy`",
    "`op sac nami all`",
    "`op sac weapon_fragment_silencer_handgun all`",
  ].join("\n");
}

module.exports = {
  name: "sac",
  aliases: ["sacrifice"],

  async execute(message, args = []) {
    const { query, amountText } = parseSacArgs(args);

    if (!query || !amountText) {
      return message.reply({
        content: getUsageText(),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    let result = null;
    let newBerries = 0;
    let storage = null;
    let multipleMatches = [];
    let sample = [];

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const fragments = Array.isArray(fresh.fragments)
            ? fresh.fragments.map((fragment) => ({ ...fragment }))
            : [];

          const found = findFragmentMatch(fragments, query);

          if (found.status === "multiple") {
            multipleMatches = found.matches;
            throw new Error("MULTIPLE_FRAGMENT_MATCHES");
          }

          if (found.status === "not_found" || found.index === -1) {
            sample = getFragmentSample(fragments);
            throw new Error("FRAGMENT_NOT_FOUND");
          }

          const target = fragments[found.index];
          const ownedAmount = getFragmentAmount(target);
          const amount = parseAmount(amountText, ownedAmount);

          if (!amount || amount <= 0) {
            throw new Error("Invalid amount. Use a number or `all`.");
          }

          if (ownedAmount < amount) {
            throw new Error(`You only have **${ownedAmount}x ${getFragmentName(target)}**.`);
          }

          const rarity = formatRarity(target.rarity);
          const berries = getSacBerryValue(rarity, amount);
          const left = ownedAmount - amount;

          if (left <= 0) {
            fragments.splice(found.index, 1);
          } else {
            fragments[found.index] = {
              ...target,
              amount: left,
            };
          }

          newBerries = Number(fresh.berries || 0) + berries;
          storage = getFragmentStorageInfo(
            {
              ...fresh,
              id: message.author.id,
              userId: message.author.id,
              fragments,
            },
            fragments,
            message.author.id
          );

          result = {
            amount,
            name: getFragmentName(target),
            rarity,
            category: getFragmentCategory(target),
            code: target.code || "none",
            berries,
            left,
            fragments,
          };

          return {
            ...fresh,
            fragments,
            berries: newBerries,
          };
        },
        message.author.username
      );
    } catch (error) {
      if (error.message === "MULTIPLE_FRAGMENT_MATCHES") {
        return message.reply({
          content: [
            "Multiple fragments matched that query. Use the exact code below.",
            "",
            ...multipleMatches
              .slice(0, 10)
              .map((entry, index) => formatFragmentLine(entry.fragment, index)),
          ].join("\n"),
          allowedMentions: {
            repliedUser: false,
          },
        });
      }

      if (error.message === "FRAGMENT_NOT_FOUND") {
        return message.reply({
          content: [
            `Fragment matching \`${query}\` was not found in your fragment inventory.`,
            "",
            sample.length ? "**Fragment Inventory Sample:**" : "Your fragment inventory is empty.",
            ...sample,
          ]
            .filter(Boolean)
            .join("\n"),
          allowedMentions: {
            repliedUser: false,
          },
        });
      }

      return message.reply({
        content: error.message || "Failed to sacrifice fragment.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("🔥 Fragment Sacrificed")
      .setDescription(
        [
          `**Fragment:** ${result.name}`,
          `**Code:** \`${result.code}\``,
          `**Category:** ${result.category}`,
          `**Rarity:** ${result.rarity}`,
          `**Sacrificed:** ${result.amount}`,
          `**Fragments Left:** ${Math.max(0, result.left)}`,
          "",
          `**Berries Gained:** ${result.berries.toLocaleString("en-US")}`,
          `**Current Berries:** ${newBerries.toLocaleString("en-US")}`,
          `**Fragment Storage:** ${storage.total}/${storage.max}`,
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Sacrifice",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};