const {
  EmbedBuilder,
} = require("discord.js");

const {
  readPlayers,
} = require("../playerStore");

const rawCards =
  require("../data/cards");

const {
  getRequiredBattleCardCodes,
} = require(
  "../utils/allBattleCardMasterRole"
);

const {
  canUseAdminCommand,
  getAdminAccessError,
} = require(
  "../utils/adminAccess"
);

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(
      /[_\-\s]+/g,
      "_"
    )
    .replace(
      /[^a-z0-9_]+/g,
      ""
    )
    .replace(
      /^_+|_+$/g,
      ""
    );
}

function parseUserId(value) {
  return String(value || "")
    .replace(
      /[<@!>]/g,
      ""
    )
    .trim();
}

function getCardCode(card) {
  return normalizeText(
    card?.code ||
      card?.baseCode ||
      card?.cardCode ||
      card?.name ||
      card?.displayName ||
      card?.cardName
  );
}

function getCardStage(card) {
  const numericStage =
    Number(
      card?.evolutionStage ||
        card?.stageLevel ||
        0
    );

  if (
    Number.isFinite(
      numericStage
    ) &&
    numericStage > 0
  ) {
    return Math.max(
      1,
      Math.floor(
        numericStage
      )
    );
  }

  const key = String(
    card?.evolutionKey ||
      card?.form ||
      card?.stage ||
      ""
  )
    .toUpperCase()
    .trim();

  const matched =
    key.match(/M([123])/);

  if (matched) {
    return Number(
      matched[1]
    );
  }

  return 1;
}

function getCardLevel(card) {
  return Math.max(
    0,
    Number(
      card?.level || 0
    ),
    Number(
      card?.currentLevel || 0
    ),
    Number(
      card?.lvl || 0
    )
  );
}

function getCardName(code) {
  const normalizedCode =
    normalizeText(code);

  const template =
    (
      Array.isArray(rawCards)
        ? rawCards
        : []
    ).find(
      (card) =>
        getCardCode(card) ===
        normalizedCode
    );

  return (
    template?.displayName ||
    template?.name ||
    code
  );
}

function getBestOwnedCard(
  player,
  code
) {
  const targetCode =
    normalizeText(code);

  const matches =
    (
      Array.isArray(
        player?.cards
      )
        ? player.cards
        : []
    )
      .filter(
        (card) =>
          getCardCode(card) ===
          targetCode
      )
      .sort((a, b) => {
        const stageDifference =
          getCardStage(b) -
          getCardStage(a);

        if (
          stageDifference !== 0
        ) {
          return stageDifference;
        }

        return (
          getCardLevel(b) -
          getCardLevel(a)
        );
      });

  return matches[0] || null;
}

function chunkLines(
  lines,
  size = 20
) {
  const chunks = [];

  for (
    let index = 0;
    index < lines.length;
    index += size
  ) {
    chunks.push(
      lines.slice(
        index,
        index + size
      )
    );
  }

  return chunks;
}

module.exports = {
  name: "checkmaster",

  async execute(
    message,
    args
  ) {
    if (
      !canUseAdminCommand(
        message
      )
    ) {
      return message.reply({
        content:
          getAdminAccessError(),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const mentionedUser =
      message.mentions.users
        .first();

    const targetId =
      mentionedUser?.id ||
      parseUserId(args[0]);

    if (!targetId) {
      return message.reply({
        content:
          "Usage: `op checkmaster <@user/userId>`",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const players =
      readPlayers();

    const player =
      players?.[targetId];

    if (!player) {
      return message.reply({
        content:
          `Player data was not found for \`${targetId}\`.`,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const requiredCodes =
      getRequiredBattleCardCodes();

    const completed = [];
    const incomplete = [];
    const missing = [];

    for (
      const code of
      requiredCodes
    ) {
      const name =
        getCardName(code);

      const ownedCard =
        getBestOwnedCard(
          player,
          code
        );

      if (!ownedCard) {
        missing.push({
          code,
          name,
        });

        continue;
      }

      const stage =
        getCardStage(
          ownedCard
        );

      const level =
        getCardLevel(
          ownedCard
        );

      if (
        stage >= 3 &&
        level >= 100
      ) {
        completed.push({
          code,
          name,
          stage,
          level,
        });

        continue;
      }

      incomplete.push({
        code,
        name,
        stage,
        level,
      });
    }

    const targetName =
      mentionedUser?.username ||
      player?.username ||
      player?.name ||
      targetId;

    const detailLines = [
      ...incomplete.map(
        (card) =>
          `⚠️ **${card.name}** — M${card.stage} Level ${card.level}/100`
      ),

      ...missing.map(
        (card) =>
          `❌ **${card.name}** — Not Owned`
      ),
    ];

    const progressPercent =
      requiredCodes.length
        ? (
            completed.length /
            requiredCodes.length *
            100
          ).toFixed(1)
        : "0.0";

    const summaryLines = [
      `**Player:** ${targetName}`,
      `**User ID:** \`${targetId}\``,
      "",
      `✅ Completed: **${completed.length}/${requiredCodes.length}**`,
      `⚠️ Not Maxed: **${incomplete.length}**`,
      `❌ Not Owned: **${missing.length}**`,
      `📊 Progress: **${progressPercent}%**`,
    ];

    if (
      !detailLines.length
    ) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(
              0x2ecc71
            )
            .setTitle(
              "🏆 Battle Card Master Check"
            )
            .setDescription(
              [
                ...summaryLines,
                "",
                "This player owns every required battle card at M3 Level 100.",
              ].join("\n")
            )
            .setFooter({
              text:
                "EV, Boost and Merge Cards are excluded.",
            }),
        ],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const chunks =
      chunkLines(
        detailLines,
        20
      );

    const embeds =
      chunks
        .slice(0, 10)
        .map(
          (
            chunk,
            index
          ) => {
            const description =
              index === 0
                ? [
                    ...summaryLines,
                    "",
                    "## Incomplete Battle Cards",
                    ...chunk,
                  ].join("\n")
                : [
                    "## Incomplete Battle Cards",
                    ...chunk,
                  ].join("\n");

            return new EmbedBuilder()
              .setColor(
                0xf39c12
              )
              .setTitle(
                chunks.length > 1
                  ? `🔍 Battle Card Master Check ${index + 1}/${chunks.length}`
                  : "🔍 Battle Card Master Check"
              )
              .setDescription(
                description
              )
              .setFooter({
                text:
                  "EV, Boost and Merge Cards are excluded.",
              });
          }
        );

    return message.reply({
      embeds,
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};