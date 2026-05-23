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

function normalizeResetTicketText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function isPullResetTicket(item) {
  const values = [
    normalizeResetTicketText(item?.code),
    normalizeResetTicketText(item?.name),
    normalizeResetTicketText(item?.type),
  ].filter(Boolean);

  return values.some((value) => {
    return (
      value === "pull reset ticket" ||
      value === "ticket reset" ||
      value === "reset ticket" ||
      value === "pull reset" ||
      value === "reset token" ||
      value.includes("pull reset ticket") ||
      value.includes("ticket reset") ||
      value.includes("reset ticket") ||
      value.includes("reset token")
    );
  });
}

function findTicket(tickets, code) {
  if (String(code || "").toLowerCase() === "pull_reset_ticket") {
    return (Array.isArray(tickets) ? tickets : []).findIndex(isPullResetTicket);
  }

  return (Array.isArray(tickets) ? tickets : []).findIndex(
    (item) =>
      String(item.code || "").toLowerCase() ===
      String(code || "").toLowerCase()
  );
}

function countPullResetTickets(player) {
  const tickets = Array.isArray(player?.tickets) ? player.tickets : [];
  const items = Array.isArray(player?.items) ? player.items : [];

  return [...tickets, ...items]
    .filter(isPullResetTicket)
    .reduce((sum, item) => sum + Number(item?.amount || 0), 0);
}

function consumeTicket(list, index) {
  const updated = [...(Array.isArray(list) ? list : [])];
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
      const safeUsed = Math.min(used, max);
      const left = Math.max(0, max - safeUsed);

      return {
        key,
        used: safeUsed,
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
    .map((slot) => `↪ ${formatSlotName(slot.key)}: ${slot.used}/${slot.max}`)
    .join("\n");
}

function buildAvailableSlotText(player, message) {
  const available = getAvailableActivePullSlots(player, message);

  if (!available.length) return "No available active pull slots.";

  return available
    .map((slot) => `↪ ${formatSlotName(slot.key)}: ${slot.left}/${slot.max} left`)
    .join("\n");
}

function buildPlayerForSlotCheck(player, pulls, snapshot) {
  return {
    ...player,
    pulls,
    pullAccessSnapshot: snapshot,
  };
}

function buildBlockedEmbed({ availableText, activeText, nextResetAt }) {
  return new EmbedBuilder()
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
        `↪ Next Global Reset: ${formatRemaining(Number(nextResetAt || 0) - Date.now())}`,
        "↪ Pull Reset Ticket was not consumed.",
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Pull Reset",
    });
}

function buildGlobalResetSyncedEmbed({ activeText, nextResetAt }) {
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("Pull Slots Refreshed")
    .setDescription(
      [
        "Your global pull reset was already available.",
        "Pull slots have been synced first, so no Pull Reset Ticket was consumed.",
        "",
        "**Your Active Pull Slots**",
        activeText || "Active pull slot data was not found.",
        "",
        `↪ Next Global Reset: ${formatRemaining(Number(nextResetAt || 0) - Date.now())}`,
        "↪ Pull Reset Ticket was not consumed.",
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Pull Reset",
    });
}

function buildResetUsedEmbed({ resetResult, remainingTickets }) {
  const now = Date.now();

  return new EmbedBuilder()
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
    });
}

module.exports = {
  name: "resetpull",
  aliases: ["reset", "rpull", "pr", "pullreset"],

  async execute(message) {
    const premiumTier = await getPremiumTier(message);

    let action = null;
    let payload = null;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const basePlayer = {
            ...fresh,
            username: fresh.username || message.author.username,
          };

          const freshSnapshot = syncPremiumSnapshot(
            buildPullAccessSnapshot(basePlayer, message),
            premiumTier
          );

          const freshWithSnapshot = {
            ...basePlayer,
            pullAccessSnapshot: freshSnapshot,
          };

          const freshGlobalReset = applyGlobalPullReset(freshWithSnapshot);
          const pullsAfterGlobal =
            freshGlobalReset.pulls || freshWithSnapshot.pulls || {};

          const checkPlayer = buildPlayerForSlotCheck(
            freshWithSnapshot,
            pullsAfterGlobal,
            freshSnapshot
          );

          const activeText = buildActiveSlotText(checkPlayer, message);
          const availableText = buildAvailableSlotText(checkPlayer, message);
          const availableSlots = getAvailableActivePullSlots(checkPlayer, message);

          if (freshGlobalReset.wasReset) {
            action = "GLOBAL_SYNCED";
            payload = {
              activeText,
              nextResetAt: freshGlobalReset.nextResetAt,
            };

            return {
              ...freshWithSnapshot,
              pulls: pullsAfterGlobal,
              pullAccessSnapshot: freshSnapshot,
            };
          }

          if (availableSlots.length > 0) {
            action = "BLOCKED";
            payload = {
              availableText,
              activeText,
              nextResetAt: freshGlobalReset.nextResetAt,
            };

            return freshWithSnapshot;
          }

          const tickets = [...(Array.isArray(freshWithSnapshot.tickets) ? freshWithSnapshot.tickets : [])];
          const items = [...(Array.isArray(freshWithSnapshot.items) ? freshWithSnapshot.items : [])];

          let updatedTickets = tickets;
          let updatedItems = items;

          const ticketIndex = findTicket(tickets, "pull_reset_ticket");

          if (ticketIndex !== -1 && Number(tickets[ticketIndex]?.amount || 0) > 0) {
            const consumed = consumeTicket(tickets, ticketIndex);
            if (!consumed) throw new Error("Failed to consume Pull Reset Ticket.");
            updatedTickets = consumed;
          } else {
            const itemIndex = items.findIndex(isPullResetTicket);

            if (itemIndex === -1 || Number(items[itemIndex]?.amount || 0) <= 0) {
              throw new Error("You do not have any Pull Reset Ticket.");
            }

            const consumed = consumeTicket(items, itemIndex);
            if (!consumed) throw new Error("Failed to consume Pull Reset Ticket.");
            updatedItems = consumed;
          }

          const resetResult = applyManualPullReset(pullsAfterGlobal);

          const updatedDailyState = incrementQuestCounter(
            {
              ...freshWithSnapshot,
              tickets: updatedTickets,
              items: updatedItems,
              pulls: resetResult.pulls,
              username:
                freshWithSnapshot.username ||
                message.author.username,
            },
            "resetTicketsUsed",
            1
          );

          const remainingTickets = countPullResetTickets({
            ...freshWithSnapshot,
            tickets: updatedTickets,
            items: updatedItems,
            pulls: resetResult.pulls,
          });

          action = "RESET_USED";
          payload = {
            resetResult,
            remainingTickets,
          };

          return {
            ...freshWithSnapshot,
            tickets: updatedTickets,
            items: updatedItems,
            pulls: resetResult.pulls,
            pullAccessSnapshot: freshSnapshot,
            quests: {
              ...(freshWithSnapshot.quests || {}),
              dailyState: updatedDailyState,
            },
          };
        },
        message.author.username
      );
    } catch (error) {
      console.error("[PULL RESET ERROR]", error);

      return message.reply({
        content: error.message || "Failed to use Pull Reset Ticket.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (action === "GLOBAL_SYNCED") {
      return message.reply({
        embeds: [buildGlobalResetSyncedEmbed(payload)],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (action === "BLOCKED") {
      return message.reply({
        embeds: [buildBlockedEmbed(payload)],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (action === "RESET_USED") {
      return message.reply({
        embeds: [buildResetUsedEmbed(payload)],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    return message.reply({
      content: "Pull Reset failed: no reset action was completed.",
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};