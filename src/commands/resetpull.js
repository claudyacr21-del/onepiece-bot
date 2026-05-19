const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const { incrementQuestCounter } = require("../utils/questProgress");
const {
  applyGlobalPullReset,
  applyManualPullReset,
} = require("../utils/pullReset");

const RESETTABLE_PULL_SLOTS = [
  "base",
  "supportMember",
  "booster",
  "owner",
  "patreon",
  "vivreCard",
  "baccaratCard",
  "baccaratFruit",
];

function findTicket(tickets, code) {
  return (Array.isArray(tickets) ? tickets : []).findIndex(
    (item) => String(item.code || "").toLowerCase() === String(code || "").toLowerCase()
  );
}

function consumeTicket(tickets, index) {
  const updated = [...(Array.isArray(tickets) ? tickets : [])];
  const current = Number(updated[index]?.amount || 0);

  if (index < 0 || current <= 0) {
    return null;
  }

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

function getSlotUsed(slot) {
  return Math.max(0, Number(slot?.used || 0));
}

function getSlotMax(slot) {
  return Math.max(0, Number(slot?.max || 0));
}

function getPullSlotStatusLines(pulls = {}) {
  return RESETTABLE_PULL_SLOTS.map((key) => {
    const slot = pulls?.[key] || {};
    const used = getSlotUsed(slot);
    const max = getSlotMax(slot);

    return {
      key,
      used,
      max,
      left: Math.max(0, max - used),
    };
  }).filter((slot) => slot.max > 0);
}

function getAvailablePullSlots(pulls = {}) {
  return getPullSlotStatusLines(pulls).filter((slot) => slot.left > 0);
}

function formatSlotName(key) {
  const names = {
    base: "Base Pulls",
    supportMember: "Support Member Slot",
    booster: "Booster Slot",
    owner: "Owner Slot",
    patreon: "Mother Flame Slots",
    vivreCard: "Vivre Card Slot",
    baccaratCard: "Baccarat Card Slots",
    baccaratFruit: "Baccarat Fruit Slots",
  };

  return names[key] || key;
}

function buildAvailableSlotText(pulls = {}) {
  const available = getAvailablePullSlots(pulls);

  if (!available.length) return "No pull slots available.";

  return available
    .map((slot) => {
      return `↪ ${formatSlotName(slot.key)}: ${slot.left}/${slot.max} left`;
    })
    .join("\n");
}

module.exports = {
  name: "resetpull",
  aliases: ["reset"],

  async execute(message) {
    const previewPlayer = getPlayer(message.author.id, message.author.username);
    const globalReset = applyGlobalPullReset(previewPlayer);
    const previewPulls = globalReset.pulls || previewPlayer.pulls || {};
    const availableSlots = getAvailablePullSlots(previewPulls);

    if (availableSlots.length > 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("Pull Reset Blocked")
            .setDescription(
              [
                "You still have available pull slots.",
                "Use your remaining pulls first before using a Pull Reset Ticket.",
                "",
                "**Available Slots**",
                buildAvailableSlotText(previewPulls),
                "",
                `↪ Next Global Reset: ${formatRemaining(globalReset.nextResetAt - Date.now())}`,
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

    let resetResult = null;
    let remainingTickets = 0;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const freshGlobalReset = applyGlobalPullReset(fresh);
          const freshPulls = freshGlobalReset.pulls || fresh.pulls || {};
          const freshAvailableSlots = getAvailablePullSlots(freshPulls);

          if (freshAvailableSlots.length > 0) {
            throw new Error(
              [
                "RESET_BLOCKED_AVAILABLE_SLOTS",
                buildAvailableSlotText(freshPulls),
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

          resetResult = applyManualPullReset(freshPulls);
          const updatedDailyState = incrementQuestCounter(fresh, "resetTicketsUsed", 1);

          const ticketLeft = updatedTickets.find(
            (item) => String(item.code || "").toLowerCase() === "pull_reset_ticket"
          );

          remainingTickets = Number(ticketLeft?.amount || 0);

          return {
            ...fresh,
            tickets: updatedTickets,
            pulls: resetResult.pulls,
            quests: {
              ...(fresh.quests || {}),
              dailyState: updatedDailyState,
            },
          };
        },
        message.author.username
      );
    } catch (error) {
      const messageText = String(error.message || "");

      if (messageText.startsWith("RESET_BLOCKED_AVAILABLE_SLOTS|||")) {
        const [, slotText, nextResetAtRaw] = messageText.split("|||");
        const nextResetAt = Number(nextResetAtRaw || 0);

        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("Pull Reset Blocked")
              .setDescription(
                [
                  "You still have available pull slots.",
                  "Use your remaining pulls first before using a Pull Reset Ticket.",
                  "",
                  "**Available Slots**",
                  slotText || "Some pull slots are still available.",
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
              "↪ Base Pulls reset",
              "↪ Bonus pull slots reset",
              "↪ Baccarat slots reset",
              "↪ Global 8-hour reset timer is unchanged",
              `↪ Next Global Reset: ${formatRemaining(resetResult.nextResetAt - now)}`,
              "↪ 1 Pull Reset Ticket consumed",
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