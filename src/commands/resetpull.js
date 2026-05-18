const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const { incrementQuestCounter } = require("../utils/questProgress");
const { applyManualPullReset } = require("../utils/pullReset");

function findTicket(tickets, code) {
  return (tickets || []).findIndex(
    (item) => String(item.code || "").toLowerCase() === String(code || "").toLowerCase()
  );
}

function consumeTicket(tickets, index) {
  const updated = [...(tickets || [])];
  const current = Number(updated[index]?.amount || 0);

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

module.exports = {
  name: "resetpull",
  aliases: ["rpull", "pr"],

  async execute(message) {
    const previewPlayer = getPlayer(message.author.id, message.author.username);
    const now = Date.now();

    let resetResult = null;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const tickets = [...(fresh.tickets || [])];
          const ticketIndex = findTicket(tickets, "pull_reset_ticket");

          if (ticketIndex === -1) {
            throw new Error("You do not have any Pull Reset Ticket.");
          }

          const updatedTickets = consumeTicket(tickets, ticketIndex);
          resetResult = applyManualPullReset(fresh.pulls || {});
          const updatedDailyState = incrementQuestCounter(
            {
              ...fresh,
              username: fresh.username || previewPlayer.username || message.author.username,
            },
            "resetTicketsUsed",
            1
          );

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
      return message.reply({
        content: error.message || "Failed to use Pull Reset Ticket.",
        allowedMentions: { repliedUser: false },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("🎟️ Pull Reset Used")
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
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Pull Reset",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  },
};