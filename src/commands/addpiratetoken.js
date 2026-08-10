const { EmbedBuilder } = require("discord.js");
const {
  readPlayers,
  updatePlayerAtomic,
  flushPlayerNow,
} = require("../playerStore");
const {
  isUniversalAdmin,
} = require("../utils/universalAdmin");

const SAVE_BATCH_SIZE = 2;
const RESULT_LIST_LIMIT = 15;

function parseUserId(value) {
  return String(value || "")
    .replace(/[<@!>]/g, "")
    .trim();
}

function normalizeTokenAmount(value) {
  const amount = Math.floor(
    Number(value)
  );

  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    return 0;
  }

  return amount;
}

function getSafeTokenBalance(value) {
  const balance = Math.floor(
    Number(value || 0)
  );

  if (
    !Number.isSafeInteger(balance) ||
    balance < 0
  ) {
    return 0;
  }

  return balance;
}

function getAllPlayerTargets() {
  const players = readPlayers() || {};

  return Object.entries(players)
    .filter(([userId, player]) => {
      return (
        !String(userId).startsWith("__") &&
        player &&
        typeof player === "object"
      );
    })
    .map(([userId, player]) => ({
      userId: String(userId),
      username: String(
        player.username ||
          "Unknown Player"
      ),
    }));
}

function getSelectedTargets(
  message,
  args
) {
  const players = readPlayers() || {};
  const targets = new Map();

  for (
    const user of
    message.mentions.users.values()
  ) {
    targets.set(
      String(user.id),
      {
        userId: String(user.id),
        username:
          user.username ||
          players[user.id]?.username ||
          "Unknown Player",
      }
    );
  }

  const targetArgs = args.slice(
    0,
    -1
  );

  for (const value of targetArgs) {
    const userId = parseUserId(value);

    if (
      !/^\d{15,25}$/.test(userId)
    ) {
      continue;
    }

    if (targets.has(userId)) {
      continue;
    }

    targets.set(userId, {
      userId,
      username: String(
        players[userId]?.username ||
          "Unknown Player"
      ),
    });
  }

  return [...targets.values()];
}

async function addTokensToTargets(
  message,
  targets,
  amount
) {
  if (!targets.length) {
    return message.reply({
      content:
        "No valid players were found.",
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  const statusMessage =
    await message.reply({
      content:
        `Adding ${amount.toLocaleString("en-US")} Pirate Tokens to ${targets.length.toLocaleString("en-US")} player(s)...`,
      allowedMentions: {
        repliedUser: false,
      },
    });

  const changedPlayers = [];

  let totalBefore = 0;
  let totalAdded = 0;
  let totalAfter = 0;

  for (const target of targets) {
    let before = 0;
    let added = 0;
    let after = 0;

    updatePlayerAtomic(
      target.userId,
      (player) => {
        before =
          getSafeTokenBalance(
            player.pirateTokens
          );

        after = Math.min(
          Number.MAX_SAFE_INTEGER,
          before + amount
        );

        added = after - before;

        return {
          ...player,
          pirateTokens: after,
        };
      },
      target.username
    );

    totalBefore += before;
    totalAdded += added;
    totalAfter += after;

    changedPlayers.push({
      ...target,
      before,
      added,
      after,
    });
  }

  let savedPlayers = 0;
  let failedPlayers = 0;

  for (
    let index = 0;
    index < changedPlayers.length;
    index += SAVE_BATCH_SIZE
  ) {
    const batch =
      changedPlayers.slice(
        index,
        index + SAVE_BATCH_SIZE
      );

    const results =
      await Promise.all(
        batch.map((target) =>
          flushPlayerNow(
            target.userId,
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

  const playerLines =
    changedPlayers
      .slice(0, RESULT_LIST_LIMIT)
      .map((target, index) => {
        return [
          `\`${index + 1}.\` **${target.username}**`,
          `└ ${target.before.toLocaleString("en-US")} → **${target.after.toLocaleString("en-US")} tokens**`,
        ].join("\n");
      });

  if (
    changedPlayers.length >
    RESULT_LIST_LIMIT
  ) {
    playerLines.push(
      `\n...and **${changedPlayers.length - RESULT_LIST_LIMIT}** more players.`
    );
  }

  const embed =
    new EmbedBuilder()
      .setColor(
        failedPlayers > 0
          ? 0xf39c12
          : 0x2ecc71
      )
      .setTitle(
        targets.length > 1
          ? "Bulk Pirate Tokens Added"
          : "Pirate Tokens Added"
      )
      .setDescription(
        playerLines.join("\n\n")
      )
      .addFields(
        {
          name: "Players",
          value:
            changedPlayers.length.toLocaleString(
              "en-US"
            ),
          inline: true,
        },
        {
          name: "Added Each",
          value:
            `+${amount.toLocaleString("en-US")}`,
          inline: true,
        },
        {
          name: "Total Added",
          value:
            `+${totalAdded.toLocaleString("en-US")}`,
          inline: true,
        },
        {
          name: "Total Before",
          value:
            totalBefore.toLocaleString(
              "en-US"
            ),
          inline: true,
        },
        {
          name: "Total After",
          value:
            totalAfter.toLocaleString(
              "en-US"
            ),
          inline: true,
        },
        {
          name: "Database",
          value:
            failedPlayers > 0
              ? `${savedPlayers} saved • ${failedPlayers} failed`
              : `${savedPlayers} saved`,
          inline: true,
        }
      )
      .setFooter({
        text: "One Piece Bot • Admin Pirate Tokens",
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
  name: "addpiratetoken",
  aliases: [
    "aptoken",
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

    if (mode === "all") {
      const amount =
        normalizeTokenAmount(
          args[1]
        );

      if (!amount) {
        return message.reply({
          content:
            "Usage: `op addpiratetoken all <amount>`",
          allowedMentions: {
            repliedUser: false,
          },
        });
      }

      return addTokensToTargets(
        message,
        getAllPlayerTargets(),
        amount
      );
    }

    const amount =
      normalizeTokenAmount(
        args[args.length - 1]
      );

    const targets =
      getSelectedTargets(
        message,
        args
      );

    if (
      !amount ||
      !targets.length
    ) {
      return message.reply({
        content: [
          "Usage:",
          "`op addpiratetoken <@user/userId> <amount>`",
          "`op addpiratetoken <@user1> <@user2> <amount>`",
          "`op addpiratetoken all <amount>`",
        ].join("\n"),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    return addTokensToTargets(
      message,
      targets,
      amount
    );
  },
};