const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("../playerStore");

const VOTE_COOLDOWN_MS = 12 * 60 * 60 * 1000;

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

function parseNumber(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function parseCooldownMode(value) {
  const mode = String(value || "").toLowerCase().trim();

  if (["ready", "now", "clear", "reset", "0"].includes(mode)) return "ready";
  if (["cooldown", "cd", "wait"].includes(mode)) return "cooldown";
  if (["keep", "same", "nochange"].includes(mode)) return "keep";

  return "keep";
}

module.exports = {
  name: "setvote",

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply({
        content: "Owner only command.",
        allowedMentions: { repliedUser: false },
      });
    }

    const mentionedUser = message.mentions.users.first();
    const targetId = mentionedUser?.id || parseUserId(args.shift());

    if (mentionedUser) {
      const mentionIndex = args.findIndex((arg) =>
        String(arg || "").includes(targetId)
      );
      if (mentionIndex !== -1) args.splice(mentionIndex, 1);
    }

    const streakRaw = args.shift();
    const totalVotesRaw = args.shift();
    const cooldownRaw = args.shift();

    if (!targetId || streakRaw === undefined) {
      return message.reply({
        content:
          "Usage:\n" +
          "`op setvote <@user/userId> <streak> [totalVotes] [ready/cooldown/keep]`",
        allowedMentions: { repliedUser: false },
      });
    }

    const newStreak = parseNumber(streakRaw);
    const requestedTotalVotes =
      totalVotesRaw === undefined ? null : parseNumber(totalVotesRaw);
    const cooldownMode = parseCooldownMode(cooldownRaw);

    let oldStreak = 0;
    let oldTotalVotes = 0;
    let newTotalVotes = 0;
    let cooldownUntil = 0;
    let username = mentionedUser?.username || targetId;

    updatePlayerAtomic(
      targetId,
      (fresh) => {
        const now = Date.now();
        const previousVote = fresh.vote || {};
        const previousCooldowns = fresh.cooldowns || {};

        oldStreak = Number(previousVote.streak || 0);
        oldTotalVotes = Number(previousVote.totalVotes || 0);

        newTotalVotes =
          requestedTotalVotes === null
            ? Math.max(oldTotalVotes, newStreak)
            : requestedTotalVotes;

        username = fresh.username || mentionedUser?.username || targetId;

        if (cooldownMode === "ready") {
          cooldownUntil = 0;
        } else if (cooldownMode === "cooldown") {
          cooldownUntil = now + VOTE_COOLDOWN_MS;
        } else {
          cooldownUntil = Number(previousCooldowns.vote || 0);
        }

        return {
          ...fresh,
          username,
          cooldowns: {
            ...previousCooldowns,
            vote: cooldownUntil,
          },
          vote: {
            ...previousVote,
            streak: newStreak,
            totalVotes: newTotalVotes,
            lastVoteAt:
              cooldownMode === "ready"
                ? 0
                : Number(previousVote.lastVoteAt || now),
            manualSetAt: now,
            manualSetBy: String(message.author.id),
          },
        };
      },
      username
    );

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("🗳️ Vote Data Updated")
      .setDescription(
        [
          `**User:** <@${targetId}>`,
          `**Streak:** ${oldStreak} → ${newStreak}`,
          `**Total Votes:** ${oldTotalVotes} → ${newTotalVotes}`,
          `**Cooldown:** ${
            cooldownUntil > Date.now()
              ? `Active until <t:${Math.floor(cooldownUntil / 1000)}:R>`
              : "Ready now"
          }`,
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Admin Vote" });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        users: [String(targetId)],
        repliedUser: false,
      },
    });
  },
};