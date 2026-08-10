const { EmbedBuilder } = require("discord.js");
const {
  readPlayers,
  updatePlayerAtomic,
  flushPlayerNow,
} = require("../playerStore");
const {
  isUniversalAdmin,
} = require("../utils/universalAdmin");

const PAGE_SIZE = 20;
const SAVE_BATCH_SIZE = 2;

function parseUserId(value) {
  return String(value || "")
    .replace(/[<@!>]/g, "")
    .trim();
}

function clampPage(value, totalPages) {
  const page = Math.floor(
    Number(value || 1)
  );

  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.max(
    1,
    Math.min(totalPages, page)
  );
}

function getTokenRows() {
  const players = readPlayers() || {};

  return Object.entries(players)
    .filter(([userId, player]) => {
      return (
        !String(userId).startsWith("__") &&
        Number(player?.pirateTokens || 0) > 0
      );
    })
    .map(([userId, player]) => ({
      userId: String(userId),
      username: String(
        player?.username ||
          "Unknown Player"
      ),
      tokens: Math.max(
        0,
        Math.floor(
          Number(
            player?.pirateTokens || 0
          )
        )
      ),
    }))
    .sort((a, b) => {
      if (b.tokens !== a.tokens) {
        return b.tokens - a.tokens;
      }

      return a.username.localeCompare(
        b.username
      );
    });
}

async function showTokenList(
  message,
  pageArg
) {
  const rows = getTokenRows();

  const totalTokens = rows.reduce(
    (sum, row) =>
      sum + row.tokens,
    0
  );

  const totalPages = Math.max(
    1,
    Math.ceil(
      rows.length / PAGE_SIZE
    )
  );

  const page = clampPage(
    pageArg,
    totalPages
  );

  const start =
    (page - 1) * PAGE_SIZE;

  const pageRows = rows.slice(
    start,
    start + PAGE_SIZE
  );

  const description =
    pageRows.length
      ? pageRows
          .map((row, index) => {
            const rank =
              start + index + 1;

            return [
              `**${rank}. ${row.username}**`,
              `<@${row.userId}> • \`${row.userId}\` • **${row.tokens.toLocaleString("en-US")} tokens**`,
            ].join("\n");
          })
          .join("\n\n")
      : "No players currently have Pirate Tokens.";

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(
      "Pirate Token Player List"
    )
    .setDescription(description)
    .addFields(
      {
        name: "Players With Tokens",
        value:
          rows.length.toLocaleString(
            "en-US"
          ),
        inline: true,
      },
      {
        name: "Total Tokens",
        value:
          totalTokens.toLocaleString(
            "en-US"
          ),
        inline: true,
      }
    )
    .setFooter({
      text: `Page ${page}/${totalPages} • Use: op removepiratetoken list <page>`,
    });

  return message.reply({
    embeds: [embed],
    allowedMentions: {
      parse: [],
      repliedUser: false,
    },
  });
}

async function removeTokensFromAll(
  message,
  amount
) {
  const rows = getTokenRows();

  if (!rows.length) {
    return message.reply({
      content:
        "No players currently have Pirate Tokens.",
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  const statusMessage =
    await message.reply({
      content:
        `Removing ${amount.toLocaleString("en-US")} Pirate Tokens from ${rows.length.toLocaleString("en-US")} players...`,
      allowedMentions: {
        repliedUser: false,
      },
    });

  let affectedPlayers = 0;
  let totalRemoved = 0;
  let totalBefore = 0;
  let totalAfter = 0;

  const changedUserIds = [];

  for (const row of rows) {
    let removedFromPlayer = 0;
    let playerBefore = 0;
    let playerAfter = 0;

    updatePlayerAtomic(
      row.userId,
      (player) => {
        playerBefore = Math.max(
          0,
          Math.floor(
            Number(
              player.pirateTokens || 0
            )
          )
        );

        removedFromPlayer = Math.min(
          playerBefore,
          amount
        );

        playerAfter =
          playerBefore -
          removedFromPlayer;

        return {
          ...player,
          pirateTokens: playerAfter,
        };
      },
      row.username
    );

    if (removedFromPlayer > 0) {
      affectedPlayers += 1;
      totalRemoved +=
        removedFromPlayer;
      totalBefore += playerBefore;
      totalAfter += playerAfter;

      changedUserIds.push(
        row.userId
      );
    }
  }

  let savedPlayers = 0;
  let failedPlayers = 0;

  for (
    let index = 0;
    index < changedUserIds.length;
    index += SAVE_BATCH_SIZE
  ) {
    const batch =
      changedUserIds.slice(
        index,
        index + SAVE_BATCH_SIZE
      );

    const results =
      await Promise.all(
        batch.map((userId) =>
          flushPlayerNow(
            userId,
            15000
          )
        )
      );

    for (const saved of results) {
      if (saved) {
        savedPlayers += 1;
      } else {
        failedPlayers += 1;
      }
    }
  }

  const embed = new EmbedBuilder()
    .setColor(
      failedPlayers > 0
        ? 0xf39c12
        : 0xe74c3c
    )
    .setTitle(
      "Bulk Pirate Token Removal"
    )
    .setDescription(
      [
        `**Removed From Each Player:** Up to ${amount.toLocaleString("en-US")}`,
        `**Affected Players:** ${affectedPlayers.toLocaleString("en-US")}`,
        `**Total Before:** ${totalBefore.toLocaleString("en-US")}`,
        `**Total Removed:** ${totalRemoved.toLocaleString("en-US")}`,
        `**Total Remaining:** ${totalAfter.toLocaleString("en-US")}`,
        "",
        `**Database Saved:** ${savedPlayers.toLocaleString("en-US")}`,
        `**Database Failed:** ${failedPlayers.toLocaleString("en-US")}`,
      ].join("\n")
    )
    .setFooter({
      text: "Run op removepiratetoken list to check the remaining balances.",
    });

  return statusMessage.edit({
    content: "",
    embeds: [embed],
    allowedMentions: {
      parse: [],
    },
  });
}

module.exports = {
  name: "removepiratetoken",
  aliases: [
    "rptoken",
  ],

  async execute(message, args) {
    if (!isUniversalAdmin(message)) {
      return message.reply({
        content:
          "Owner only command.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const mode = String(
      args[0] || ""
    ).toLowerCase();

    if (mode === "list") {
      return showTokenList(
        message,
        args[1]
      );
    }

    if (mode === "all") {
      const amount = Math.floor(
        Number(args[1])
      );

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return message.reply({
          content:
            "Usage: `op removepiratetoken all <amount>`",
          allowedMentions: {
            repliedUser: false,
          },
        });
      }

      return removeTokensFromAll(
        message,
        amount
      );
    }

    const mentionedUser =
      message.mentions.users.first();

    const targetId =
      mentionedUser?.id ||
      parseUserId(args[0]);

    const amount = Math.floor(
      Number(args[1])
    );

    if (
      !targetId ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return message.reply({
        content: [
          "Usage:",
          "`op removepiratetoken list [page]`",
          "`op removepiratetoken all <amount>`",
          "`op removepiratetoken <@user/userId> <amount>`",
        ].join("\n"),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    let before = 0;
    let removed = 0;
    let after = 0;

    updatePlayerAtomic(
      targetId,
      (player) => {
        before = Math.max(
          0,
          Math.floor(
            Number(
              player.pirateTokens || 0
            )
          )
        );

        removed = Math.min(
          before,
          amount
        );

        after =
          before - removed;

        return {
          ...player,
          pirateTokens: after,
        };
      },
      mentionedUser?.username ||
        targetId
    );

    const saved =
      await flushPlayerNow(
        targetId,
        15000
      );

    const embed =
      new EmbedBuilder()
        .setColor(
          saved
            ? 0xe74c3c
            : 0xf39c12
        )
        .setTitle(
          "Pirate Tokens Removed"
        )
        .setDescription(
          [
            `**User:** <@${targetId}>`,
            `**Before:** ${before.toLocaleString("en-US")}`,
            `**Removed:** ${removed.toLocaleString("en-US")}`,
            `**After:** ${after.toLocaleString("en-US")}`,
            `**Database Sync:** ${saved ? "Saved" : "Failed"}`,
          ].join("\n")
        )
        .setFooter({
          text: "One Piece Bot • Admin Pirate Tokens",
        });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        users: [
          String(targetId),
        ],
        repliedUser: false,
      },
    });
  },
};