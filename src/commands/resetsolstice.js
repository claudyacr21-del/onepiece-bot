const { EmbedBuilder } = require("discord.js");

const {
  readPlayers,
  writePlayers,
  flushPlayerStoreNow,
} = require("../playerStore");

const EVENT_ID = "midsummer_2026";
const GLOBAL_STORE_ID =
  "__midsummer_2026_global";

function parseEnvIds(...values) {
  return values
    .flatMap((value) =>
      String(value || "").split(",")
    )
    .map((value) =>
      value
        .replace(/[<@&>]/g, "")
        .trim()
    )
    .filter(Boolean);
}

function getOwnerIds() {
  return parseEnvIds(
    process.env.ADMIN_USER_IDS,
    process.env.DISCORD_OWNER_ID,
    process.env.BOT_OWNER_ID,
    process.env.BOT_OWNER_IDS,
    process.env.OWNER_IDS
  );
}

function isOwner(message) {
  return getOwnerIds().includes(
    String(message?.author?.id || "")
  );
}

module.exports = {
  name: "resetsolstice",

  async execute(message, args = []) {
    if (!isOwner(message)) {
      return message.reply({
        content: "Owner only command.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (
      String(args[0] || "")
        .toLowerCase()
        .trim() !== "confirm"
    ) {
      return message.reply({
        content: [
          "This will reset all Solstice damage, attacks, battle logs, and the Nika leaderboard.",
          "Golden Foil Coins, Radiant Tickets, and player inventories will not be changed.",
          "",
          "Use `op resetsolstice confirm` to continue.",
        ].join("\n"),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const players = readPlayers();
    let resetPlayers = 0;

    for (
      const [userId, player]
      of Object.entries(players)
    ) {
      if (
        String(userId).startsWith("__") ||
        !player ||
        typeof player !== "object"
      ) {
        continue;
      }

      const events = {
        ...(player.events || {}),
      };

      const current =
        events[EVENT_ID] &&
        typeof events[EVENT_ID] ===
          "object"
          ? events[EVENT_ID]
          : null;

      if (!current) continue;

      events[EVENT_ID] = {
        ...current,
        damage: 0,
        attacks: 0,
        ticketsUsed: 0,
        joinedAt: 0,
        lastAttackAt: 0,
      };

      players[userId] = {
        ...player,
        events,
      };

      resetPlayers += 1;
    }

    players[GLOBAL_STORE_ID] = {
      eventId: EVENT_ID,
      totalDamage: 0,
      defeatedAt: 0,
      defeatedBy: null,
      finalRewardsDistributed: false,
      finalRewardsDistributedAt: 0,
      finalRanking: [],
      manualRewards: [],
      resetAt: Date.now(),
      resetBy: String(
        message.author.id
      ),
    };

    writePlayers(players);

    await flushPlayerStoreNow(
      60000
    );

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle(
            "☀️ Solstice Battle Data Reset"
          )
          .setDescription(
            [
              `**Player Records Reset:** ${resetPlayers.toLocaleString(
                "en-US"
              )}`,
              "**Nika HP:** 200,000,000/200,000,000",
              "**Leaderboard:** Cleared",
              "",
              "Golden Foil Coins, Radiant Tickets, and inventories were not changed.",
            ].join("\n")
          )
          .setFooter({
            text:
              "One Piece Bot • Solstice Admin",
          }),
      ],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};