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
  return String(value || "")
    .replace(/[<@!>]/g, "")
    .trim();
}

function parseNumber(value, fallback = 0) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return fallback;
  }

  return Math.max(0, Math.floor(n));
}

function parseCooldownMode(value) {
  const mode = String(value || "")
    .toLowerCase()
    .trim();

  if (
    ["ready", "now", "clear", "reset", "0"].includes(mode)
  ) {
    return "ready";
  }

  if (
    ["cooldown", "cd", "wait"].includes(mode)
  ) {
    return "cooldown";
  }

  if (
    ["keep", "same", "nochange"].includes(mode)
  ) {
    return "keep";
  }

  return "keep";
}

function parseVotePlatform(value) {
  const platform = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "");

  if (
    [
      "topgg",
      "top",
      "topg",
    ].includes(platform)
  ) {
    return "topgg";
  }

  if (
    [
      "discordlist",
      "discordlistgg",
      "dlist",
      "dl",
    ].includes(platform)
  ) {
    return "discordlist";
  }

  return null;
}

function getPlatformLabel(platform) {
  if (platform === "discordlist") {
    return "DiscordList.gg";
  }

  return "Top.gg";
}

function getUsageText() {
  return [
    "**Top.gg**",
    "`op setvote topgg <@user/userId> <streak> [totalVotes] [ready/cooldown/keep]`",
    "",
    "**DiscordList.gg**",
    "`op setvote discordlist <@user/userId> <totalVotes> [ready/cooldown/keep]`",
    "",
    "**Examples**",
    "`op setvote topgg @user 10 25 ready`",
    "`op setvote topgg @user 10 25 cooldown`",
    "`op setvote discordlist @user 5 ready`",
    "`op setvote dlist @user 5 cooldown`",
  ].join("\n");
}

module.exports = {
  name: "setvote",

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply({
        content: "Owner only command.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const platform = parseVotePlatform(
      args.shift()
    );

    if (!platform) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("Invalid Vote Platform")
            .setDescription(
              [
                "Choose one of these platforms:",
                "",
                "• `topgg`",
                "• `discordlist`",
                "",
                getUsageText(),
              ].join("\n")
            ),
        ],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const mentionedUser =
      message.mentions.users.first();

    const targetId =
      mentionedUser?.id ||
      parseUserId(args.shift());

    if (mentionedUser) {
      const mentionIndex = args.findIndex(
        (arg) =>
          String(arg || "").includes(
            targetId
          )
      );

      if (mentionIndex !== -1) {
        args.splice(mentionIndex, 1);
      }
    }

    if (!targetId) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("Missing User")
            .setDescription(getUsageText()),
        ],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (platform === "topgg") {
      const streakRaw = args.shift();
      const totalVotesRaw = args.shift();
      const cooldownRaw = args.shift();

      if (streakRaw === undefined) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("Missing Top.gg Vote Data")
              .setDescription(getUsageText()),
          ],
          allowedMentions: {
            repliedUser: false,
          },
        });
      }

      const newStreak =
        parseNumber(streakRaw);

      const requestedTotalVotes =
        totalVotesRaw === undefined
          ? null
          : parseNumber(totalVotesRaw);

      const cooldownMode =
        parseCooldownMode(cooldownRaw);

      let oldStreak = 0;
      let oldTotalVotes = 0;
      let newTotalVotes = 0;
      let cooldownUntil = 0;
      let username =
        mentionedUser?.username ||
        targetId;

      updatePlayerAtomic(
        targetId,
        (fresh) => {
          const now = Date.now();

          const previousVote =
            fresh?.vote &&
            typeof fresh.vote === "object"
              ? fresh.vote
              : {};

          const previousCooldowns =
            fresh?.cooldowns &&
            typeof fresh.cooldowns === "object"
              ? fresh.cooldowns
              : {};

          oldStreak = Math.max(
            0,
            Math.floor(
              Number(
                previousVote.streak || 0
              )
            )
          );

          oldTotalVotes = Math.max(
            0,
            Math.floor(
              Number(
                previousVote.totalVotes || 0
              )
            )
          );

          newTotalVotes =
            requestedTotalVotes === null
              ? Math.max(
                  oldTotalVotes,
                  newStreak
                )
              : requestedTotalVotes;

          username =
            fresh.username ||
            mentionedUser?.username ||
            targetId;

          if (cooldownMode === "ready") {
            cooldownUntil = 0;
          } else if (
            cooldownMode === "cooldown"
          ) {
            cooldownUntil =
              now + VOTE_COOLDOWN_MS;
          } else {
            cooldownUntil = Math.max(
              0,
              Number(
                previousCooldowns.vote || 0
              )
            );
          }

          const lastVoteAt =
            cooldownMode === "ready"
              ? 0
              : cooldownMode === "cooldown"
                ? now
                : Math.max(
                    0,
                    Number(
                      previousVote.lastVoteAt ||
                        0
                    )
                  );

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
              lastVoteAt,
              manualSetAt: now,
              manualSetBy: String(
                message.author.id
              ),
            },
          };
        },
        username
      );

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(
          "🗳️ Top.gg Vote Data Updated"
        )
        .setDescription(
          [
            `**User:** <@${targetId}>`,
            `**Platform:** ${getPlatformLabel(
              platform
            )}`,
            `**Streak:** ${oldStreak} → ${newStreak}`,
            `**Total Votes:** ${oldTotalVotes} → ${newTotalVotes}`,
            `**Cooldown:** ${
              cooldownUntil > Date.now()
                ? `Active until <t:${Math.floor(
                    cooldownUntil / 1000
                  )}:R>`
                : "Ready now"
            }`,
          ].join("\n")
        )
        .setFooter({
          text: "One Piece Bot • Admin Vote",
        });

      return message.reply({
        embeds: [embed],
        allowedMentions: {
          users: [String(targetId)],
          repliedUser: false,
        },
      });
    }

    const totalVotesRaw = args.shift();
    const cooldownRaw = args.shift();

    if (totalVotesRaw === undefined) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle(
              "Missing DiscordList.gg Vote Data"
            )
            .setDescription(getUsageText()),
        ],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const newTotalVotes =
      parseNumber(totalVotesRaw);

    const cooldownMode =
      parseCooldownMode(cooldownRaw);

    let oldTotalVotes = 0;
    let cooldownUntil = 0;
    let username =
      mentionedUser?.username ||
      targetId;

    updatePlayerAtomic(
      targetId,
      (fresh) => {
        const now = Date.now();

        const previousVote =
          fresh?.discordListVote &&
          typeof fresh.discordListVote ===
            "object"
            ? fresh.discordListVote
            : {};

        oldTotalVotes = Math.max(
          0,
          Math.floor(
            Number(
              previousVote.totalVotes || 0
            )
          )
        );

        username =
          fresh.username ||
          mentionedUser?.username ||
          targetId;

        if (cooldownMode === "ready") {
          cooldownUntil = 0;
        } else if (
          cooldownMode === "cooldown"
        ) {
          cooldownUntil =
            now + VOTE_COOLDOWN_MS;
        } else {
          cooldownUntil = Math.max(
            0,
            Number(
              previousVote.cooldownUntil || 0
            )
          );
        }

        const lastVoteAt =
          cooldownMode === "ready"
            ? 0
            : cooldownMode === "cooldown"
              ? now
              : Math.max(
                  0,
                  Number(
                    previousVote.lastVoteAt ||
                      0
                  )
                );

        return {
          ...fresh,
          username,

          discordListVote: {
            ...previousVote,
            totalVotes: newTotalVotes,
            lastVoteAt,
            cooldownUntil,
            manualSetAt: now,
            manualSetBy: String(
              message.author.id
            ),
          },
        };
      },
      username
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(
        "🗳️ DiscordList.gg Vote Data Updated"
      )
      .setDescription(
        [
          `**User:** <@${targetId}>`,
          `**Platform:** ${getPlatformLabel(
            platform
          )}`,
          `**Total Votes:** ${oldTotalVotes} → ${newTotalVotes}`,
          `**Cooldown:** ${
            cooldownUntil > Date.now()
              ? `Active until <t:${Math.floor(
                  cooldownUntil / 1000
                )}:R>`
              : "Ready now"
          }`,
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Admin Vote",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        users: [String(targetId)],
        repliedUser: false,
      },
    });
  },
};