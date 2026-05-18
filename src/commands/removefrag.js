const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("../playerStore");

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

function parseUserId(value) {
  return String(value || "").replace(/[<@!>]/g, "").trim();
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[<@!>]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function findFragmentIndex(fragments, query) {
  const q = normalize(query);
  const list = Array.isArray(fragments) ? fragments : [];

  let index = list.findIndex((frag) => {
    return normalize(frag.code) === q || normalize(frag.name) === q;
  });

  if (index !== -1) return index;

  index = list.findIndex((frag) => {
    return normalize(frag.code).startsWith(q) || normalize(frag.name).startsWith(q);
  });

  if (index !== -1) return index;

  return list.findIndex((frag) => {
    return normalize(frag.code).includes(q) || normalize(frag.name).includes(q);
  });
}

module.exports = {
  name: "removefrag",
  aliases: ["rfrag"],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const userId = parseUserId(args.shift());
    const amountRaw = args.shift();
    const amount = Math.floor(Number(amountRaw || 0));
    const query = args.join(" ").trim();

    if (!userId || !amount || amount <= 0 || !query) {
      return message.reply(
        "Usage: `op removefrag <userId/@user> <amount> <fragment/card/weapon>`"
      );
    }

    let target = null;
    let removedAmount = 0;
    let remaining = 0;
    let notFound = false;
    let sample = [];

    updatePlayerAtomic(
      userId,
      (fresh) => {
        const fragments = Array.isArray(fresh.fragments)
          ? fresh.fragments.map((frag) => ({ ...frag }))
          : [];

        const index = findFragmentIndex(fragments, query);

        if (index === -1) {
          notFound = true;
          sample = fragments
            .map((frag) => `\`${frag.name || frag.code}\` x${Number(frag.amount || 0)}`)
            .slice(0, 10);
          return fresh;
        }

        target = fragments[index];
        const current = Number(target.amount || 0);
        removedAmount = Math.min(current, amount);
        remaining = current - removedAmount;

        if (remaining <= 0) {
          fragments.splice(index, 1);
        } else {
          fragments[index] = {
            ...target,
            amount: remaining,
          };
        }

        return {
          ...fresh,
          fragments,
        };
      },
      message.mentions.users.first()?.username || "Unknown"
    );

    if (notFound) {
      return message.reply(
        [
          `Fragment matching \`${query}\` was not found for \`${userId}\`.`,
          sample.length ? `Fragment sample:\n${sample.join("\n")}` : "This user has no fragments.",
        ].join("\n")
      );
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Fragment Removed")
          .setDescription(
            [
              `**User:** ${userId}`,
              `**Fragment:** ${target.name || target.code}`,
              `**Removed:** ${removedAmount}`,
              `**Remaining:** ${Math.max(0, remaining)}`,
            ].join("\n")
          )
          .setFooter({ text: "One Piece Bot • Admin Remove Fragment" }),
      ],
    });
  },
};