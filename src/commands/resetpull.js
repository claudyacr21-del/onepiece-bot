const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const { incrementQuestCounter } = require("../utils/questProgress");
const {
  applyGlobalPullReset,
  applyManualPullReset,
} = require("../utils/pullReset");

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

function isPullSlotObject(slot) {
  if (!slot || typeof slot !== "object") return false;

  const max = Number(slot.max || 0);
  const used = Number(slot.used || 0);

  return Number.isFinite(max) && max > 0 && Number.isFinite(used);
}

function getOwnedPullSlots(pulls = {}) {
  return Object.entries(pulls)
    .filter(([key, slot]) => {
      if (["lastResetBucket", "slotSchemaVersion"].includes(key)) return false;
      return isPullSlotObject(slot);
    })
    .map(([key, slot]) => {
      const max = Math.max(0, Number(slot.max || 0));
      const used = Math.max(0, Number(slot.used || 0));
      const left = Math.max(0, max - used);

      return {
        key,
        used,
        max,
        left,
      };
    });
}

function getAvailableOwnedPullSlots(pulls = {}) {
  return getOwnedPullSlots(pulls).filter((slot) => slot.left > 0);
}

function buildAvailableSlotText(pulls = {}) {
  const available = getAvailableOwnedPullSlots(pulls);

  if (!available.length) return "No pull slots available.";

  return available
    .map((slot) => `↪ ${formatSlotName(slot.key)}: ${slot.left}/${slot.max} left`)
    .join("\n");
}

function buildBlockedEmbed(pulls, nextResetAt) {
  return new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle("Pull Reset Blocked")
    .setDescription(
      [
        "You still have available pull slots.",
        "Use your remaining pulls first before using a Pull Reset Ticket.",
        "",
        "**Available Slots**",
        buildAvailableSlotText(pulls),
        "",
        `↪ Next Global Reset: ${formatRemaining(Number(nextResetAt || 0) - Date.now())}`,
        "↪ Pull Reset Ticket was not consumed.",
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
    const previewPlayer = getPlayer(message.author.id, message.author.username);
    const previewGlobalReset = applyGlobalPullReset(previewPlayer);
    const previewPulls = previewGlobalReset.pulls || previewPlayer.pulls || {};
    const previewAvailable = getAvailableOwnedPullSlots(previewPulls);

    if (previewAvailable.length > 0) {
      return message.reply({
        embeds: [buildBlockedEmbed(previewPulls, previewGlobalReset.nextResetAt)],
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
          const freshAvailable = getAvailableOwnedPullSlots(freshPulls);

          if (freshAvailable.length > 0) {
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
        const [, slotText, nextResetAtRaw] = text.split("|||");
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
              "↪ Only your owned pull slots were checked before reset.",
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