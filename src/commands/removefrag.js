const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("../playerStore");

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

function stripMention(value) {
  return String(value || "").replace(/[<@!>]/g, "").trim();
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[<@!>]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s.]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[<@!>]/g, "")
    .replace(/[^a-z0-9\s._-]+/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCompact(value) {
  return normalize(value).replace(/[\s._-]+/g, "");
}

function isUserId(value) {
  return /^\d{15,25}$/.test(stripMention(value));
}

function isMention(value) {
  return /^<@!?\d{15,25}>$/.test(String(value || "").trim());
}

function getTargetAmountAndQuery(message, args = []) {
  const parts = [...args].map((arg) => String(arg || "").trim()).filter(Boolean);
  const mentionedUser = message.mentions?.users?.first() || null;

  let userId = mentionedUser?.id || null;
  let removedTarget = false;
  let amount = 0;
  let removedAmount = false;
  const queryParts = [];

  for (const part of parts) {
    const cleaned = stripMention(part);

    if (!removedTarget && userId && (isMention(part) || cleaned === userId)) {
      removedTarget = true;
      continue;
    }

    if (!removedTarget && !userId && isUserId(part)) {
      userId = cleaned;
      removedTarget = true;
      continue;
    }

    if (!removedAmount && /^\d+$/.test(cleaned)) {
      amount = Math.floor(Number(cleaned));
      removedAmount = true;
      continue;
    }

    queryParts.push(part);
  }

  return {
    userId,
    username: mentionedUser?.username || `User ${userId || "Unknown"}`,
    amount,
    query: queryParts.join(" ").trim(),
  };
}

function getFragmentLabel(fragment) {
  return fragment?.name || fragment?.displayName || fragment?.code || "Unknown Fragment";
}

function getFragmentFields(fragment) {
  return [
    fragment?.code,
    fragment?.name,
    fragment?.displayName,
    fragment?.id,
    fragment?.key,
    fragment?.cardCode,
    fragment?.baseCode,
    fragment?.characterCode,
  ].filter(Boolean);
}

function scoreFragment(fragment, query) {
  const q = normalize(query);
  const qc = normalizeCode(query);
  const qCompact = normalizeCompact(query);

  if (!q && !qc && !qCompact) return 0;

  let best = 0;

  for (const field of getFragmentFields(fragment)) {
    const f = normalize(field);
    const fc = normalizeCode(field);
    const fCompact = normalizeCompact(field);

    if (fc === qc || fCompact === qCompact) {
      best = Math.max(best, 3000);
      continue;
    }

    if (f === q) {
      best = Math.max(best, 2500);
      continue;
    }

    if (fc.startsWith(qc) || fCompact.startsWith(qCompact)) {
      best = Math.max(best, 1800 + qCompact.length);
      continue;
    }

    if (f.startsWith(q)) {
      best = Math.max(best, 1500 + q.length);
      continue;
    }

    if (fc.includes(qc) || fCompact.includes(qCompact)) {
      best = Math.max(best, 900 + qCompact.length);
      continue;
    }

    if (f.includes(q)) {
      best = Math.max(best, 700 + q.length);
      continue;
    }

    const words = q.split(" ").filter(Boolean);
    if (words.length && words.every((word) => f.includes(word))) {
      best = Math.max(best, 500 + words.join("").length);
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
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return normalize(getFragmentLabel(a.fragment)).length - normalize(getFragmentLabel(b.fragment)).length;
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

function formatFragmentLine(fragment, index) {
  return `${index + 1}. **${getFragmentLabel(fragment)}** • code: \`${fragment.code || "none"}\` • amount: \`${Number(fragment.amount || 0)}\``;
}

module.exports = {
  name: "removefrag",
  aliases: ["rfrag"],

  async execute(message, args = []) {
    if (!(await isAdmin(message))) {
      return message.reply({
        content: "Owner only command.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const { userId, username, amount, query } = getTargetAmountAndQuery(message, args);

    if (!userId || !amount || amount <= 0 || !query) {
      return message.reply({
        content: [
          "Usage:",
          "`op removefrag <@user/userId> <amount> <fragment name/code>`",
          "",
          "Examples:",
          "`op removefrag @user 5 luffy`",
          "`op removefrag 697763966650417193 5 luffy_straw_hat`",
          "`op removefrag 697763966650417193 10 Monkey D. Luffy`",
        ].join("\n"),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    let target = null;
    let removedAmount = 0;
    let remaining = 0;
    let resultStatus = "not_found";
    let ambiguousMatches = [];
    let sample = [];

    updatePlayerAtomic(
      userId,
      (fresh) => {
        const fragments = Array.isArray(fresh.fragments)
          ? fresh.fragments.map((frag) => ({ ...frag }))
          : [];

        const result = findFragmentMatch(fragments, query);
        resultStatus = result.status;

        if (result.status === "multiple") {
          ambiguousMatches = result.matches;
          return fresh;
        }

        if (result.status === "not_found" || result.index === -1) {
          sample = fragments.slice(0, 15);
          return fresh;
        }

        target = fragments[result.index];
        const current = Number(target.amount || 0);

        removedAmount = Math.min(current, amount);
        remaining = current - removedAmount;

        if (remaining <= 0) {
          fragments.splice(result.index, 1);
        } else {
          fragments[result.index] = {
            ...target,
            amount: remaining,
          };
        }

        return {
          ...fresh,
          fragments,
        };
      },
      username
    );

    if (resultStatus === "multiple") {
      return message.reply({
        content: [
          "Multiple fragments matched that query. Use exact code.",
          "",
          ...ambiguousMatches.slice(0, 10).map((entry, index) =>
            formatFragmentLine(entry.fragment, index)
          ),
        ].join("\n"),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (!target) {
      return message.reply({
        content: [
          `Fragment matching \`${query}\` was not found for \`${userId}\`.`,
          "",
          sample.length ? "**Fragment Sample:**" : "This user has no fragments.",
          ...sample.map((fragment, index) => formatFragmentLine(fragment, index)),
        ]
          .filter(Boolean)
          .join("\n"),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("✅ Fragment Removed")
      .setDescription(
        [
          `**Target:** <@${userId}>`,
          `**User ID:** \`${userId}\``,
          `**Fragment:** ${getFragmentLabel(target)}`,
          `**Code:** \`${target.code || "none"}\``,
          `**Removed:** ${removedAmount}`,
          `**Remaining:** ${Math.max(0, remaining)}`,
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Admin Remove Fragment",
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