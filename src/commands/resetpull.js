const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const { incrementQuestCounter } = require("../utils/questProgress");
const {
  applyGlobalPullReset,
  applyManualPullReset,
} = require("../utils/pullReset");
const {
  getPullSlotStatus,
  buildPullAccessSnapshot,
} = require("../utils/pullSlots");
const { getPremiumTier } = require("../utils/premiumAccess");

function findTicket(tickets, code) {
  return (Array.isArray(tickets) ? tickets : []).findIndex(
    (item) =>
      String(item.code || "").toLowerCase() === String(code || "").toLowerCase()
  );
}

function consumeTicket(tickets, index) {
  const updated = [...(Array.isArray(tickets) ? tickets : [])];
  const current = Number(updated[index]?.amount || 0);

  if (index < 0 || current <= 0) return null;

  if (current <= 1) {
    updated.splice(index, 1);
  } else {
    updated[index] = {
      ...updated[index],
      amount: current - 1,
    };
  }

  return updated;
}

function formatRemaining(ms) {
  if (ms <= 0) return "Now";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;

  return "Now";
}

function syncPremiumSnapshot(snapshot, premiumTier) {
  if (premiumTier === "motherFlame") {
    return {
      ...snapshot,
      patreon: true,
      vivreCard: false,
      litePremium: false,
    };
  }

  if (premiumTier === "vivreCard") {
    return {
      ...snapshot,
      patreon: false,
      vivreCard: true,
      litePremium: true,
    };
  }

  return {
    ...snapshot,
    patreon: false,
    vivreCard: false,
    litePremium: false,
  };
}

function formatSlotName(key) {
  const names = {
    base: "Base Pulls",
    supportMember: "Main Server Member",
    booster: "Main Server Booster",
    owner: "Server Owner",
    patreon: "Mother Flame",
    vivreCard: "Vivre Card",
    baccaratCard: "Baccarat Card",
    baccaratFruit: "Baccarat Devil Fruit",
  };

  return names[key] || key;
}

function getActivePullSlots(player, message) {
  const slots = getPullSlotStatus(player, message);

  return Object.entries(slots)
    .filter(([, slot]) => Boolean(slot?.enabled) && Number(slot?.max || 0) > 0)
    .map(([key, slot]) => {
      const max = Math.max(0, Number(slot.max || 0));
      const used = Math.max(0, Number(slot.used || 0));
      const left = Math.max(0, max - Math.min(used, max));

      return {
        key,
        used: Math.min(used, max),
        max,
        left,
      };
    });
}

function getAvailableActivePullSlots(player, message) {
  return getActivePullSlots(player, message).filter((slot) => slot.left > 0);
}

function buildActiveSlotText(player, message) {
  const active = getActivePullSlots(player, message);

  if (!active.length) return "No active pull slots found.";

  return active
    .map((slot) => {
      return `↪ ${formatSlotName(slot.key)}: ${slot.used}/${slot.max}`;
    })
    .join("\n");
}

function buildAvailableSlotText(player, message) {
  const available = getAvailableActivePullSlots(player, message);

  if (!available.length) return "No available active pull slots.";

  return available
    .map((slot) => {
      return `↪ ${formatSlotName(slot.key)}: ${slot.left}/${slot.max} left`;
    })
    .join("\n");
}

function buildBlockedEmbed(player, message, nextResetAt) {
  return new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle("Pull Reset Blocked")
    .setDescription(
      [
        "You still have available pulls from your active pull slots.",
        "Use your remaining pulls first before using a Pull Reset Ticket.",
        "",
        "**Available Active Slots**",
        buildAvailableSlotText(player, message),
        "",
        "**Your Active Pull Slots**",
        buildActiveSlotText(player, message),
        "",
        `↪ Next Global Reset: ${formatRemaining(Number(nextResetAt || 0) - Date.now())}`,
        "↪ Pull Reset Ticket was not consumed.",
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Pull Reset",
    });
}

function buildPlayerForSlotCheck(player, pulls, snapshot) {
  return {
    ...player,
    pulls,
    pullAccessSnapshot: snapshot,
  };
}

module.exports = {
  name: "resetpull",
  aliases: ["reset", "rpull", "pr", "pullreset"],

  async execute(message) {
    const premiumTier = await getPremiumTier(message);

    const previewPlayer = getPlayer(message.author.id, message.author.username);
    const previewSnapshot = syncPremiumSnapshot(
      buildPullAccessSnapshot(previewPlayer, message),
      premiumTier
    );

    const previewGlobalReset = applyGlobalPullReset({
      ...previewPlayer,
      pullAccessSnapshot: previewSnapshot,
    });

    const previewCheckPlayer = buildPlayerForSlotCheck(
      previewPlayer,
      previewGlobalReset.pulls || previewPlayer.pulls || {},
      previewSnapshot
    );

    const previewAvailable = getAvailableActivePullSlots(previewCheckPlayer, message);

    if (previewAvailable.length > 0) {
      return message.reply({
        embeds: [buildBlockedEmbed(previewCheckPlayer, message, previewGlobalReset.nextResetAt)],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    let resetResult = null;
    let remainingTickets = 0;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const freshSnapshot = syncPremiumSnapshot(
            buildPullAccessSnapshot(fresh, message),
            premiumTier
          );

          const freshGlobalReset = applyGlobalPullReset({
            ...fresh,
            pullAccessSnapshot: freshSnapshot,
          });

          const freshCheckPlayer = buildPlayerForSlotCheck(
            fresh,
            freshGlobalReset.pulls || fresh.pulls || {},
            freshSnapshot
          );

          const freshAvailable = getAvailableActivePullSlots(freshCheckPlayer, message);

          if (freshAvailable.length > 0) {
            throw new Error(
              [
                "RESET_BLOCKED_AVAILABLE_SLOTS",
                buildAvailableSlotText(freshCheckPlayer, message),
                buildActiveSlotText(freshCheckPlayer, message),
                String(freshGlobalReset.nextResetAt || 0),
              ].join("|||")
            );
          }

          const tickets = [...(Array.isArray(fresh.tickets) ? fresh.tickets : [])];
          const ticketIndex = findTicket(tickets, "pull_reset_ticket");

          if (ticketIndex === -1 || Number(tickets[ticketIndex]?.amount || 0) <= 0) {
            throw new Error("You do not have any Pull Reset Ticket.");
          }

          const updatedTickets = consumeTicket(tickets, ticketIndex);

          if (!updatedTickets) {
            throw new Error("Failed to consume Pull Reset Ticket.");
          }

          resetResult = applyManualPullReset(freshGlobalReset.pulls || fresh.pulls || {});

          const updatedDailyState = incrementQuestCounter(
            {
              ...fresh,
              username: fresh.username || previewPlayer.username || message.author.username,
            },
            "resetTicketsUsed",
            1
          );

          const ticketLeft = updatedTickets.find(
            (item) =>
              String(item.code || "").toLowerCase() === "pull_reset_ticket"
          );

          remainingTickets = Number(ticketLeft?.amount || 0);

          return {
            ...fresh,
            tickets: updatedTickets,
            pulls: resetResult.pulls,
            pullAccessSnapshot: freshSnapshot,
            quests: {
              ...(fresh.quests || {}),
              dailyState: updatedDailyState,
            },
          };
        },
        message.author.username
      );
    } catch (error) {
      const text = String(error.message || "");

      if (text.startsWith("RESET_BLOCKED_AVAILABLE_SLOTS|||")) {
        const [, availableText, activeText, nextResetAtRaw] = text.split("|||");
        const nextResetAt = Number(nextResetAtRaw || 0);

        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("Pull Reset Blocked")
              .setDescription(
                [
                  "You still have available pulls from your active pull slots.",
                  "Use your remaining pulls first before using a Pull Reset Ticket.",
                  "",
                  "**Available Active Slots**",
                  availableText || "Some active pull slots are still available.",
                  "",
                  "**Your Active Pull Slots**",
                  activeText || "Active pull slot data was not found.",
                  "",
                  `↪ Next Global Reset: ${formatRemaining(nextResetAt - Date.now())}`,
                  "↪ Pull Reset Ticket was not consumed.",
                ].join("\n")
              )
              .setFooter({
                text: "One Piece Bot • Pull Reset",
              }),
          ],
          allowedMentions: {
            repliedUser: false,
          },
        });
      }

      return message.reply({
        content: error.message || "Failed to use Pull Reset Ticket.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const now = Date.now();

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle("↩️ Pull Reset Used")
          .setDescription(
            [
              "Your pull usage has been reset manually.",
              "",
              "↪ Reset checked only your active pull slots.",
              "↪ Inactive premium/event slots do not block reset.",
              "↪ Global 8-hour reset timer is unchanged.",
              `↪ Next Global Reset: ${formatRemaining(
                Number(resetResult?.nextResetAt || now) - now
              )}`,
              "↪ 1 Pull Reset Ticket consumed.",
              `↪ Remaining Pull Reset Ticket: ${remainingTickets}`,
            ].join("\n")
          )
          .setFooter({
            text: "One Piece Bot • Pull Reset",
          }),
      ],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};