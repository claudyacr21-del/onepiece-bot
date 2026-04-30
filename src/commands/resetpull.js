const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { incrementQuestCounter } = require("../utils/questProgress");
const { applyManualPullReset } = require("../utils/pullReset");

function findTicket(tickets, code) {
  return (tickets || []).findIndex((item) => item.code === code);
}

function consumeTicket(tickets, index) {
  const updated = [...(tickets || [])];
  const current = Number(updated[index]?.amount || 0);

  if (current <= 1) {
    updated.splice(index, 1);
  } else {
    updated[index] = {
      ...updated[index],
      amount: current - 1
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
  aliases: ["reset"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const tickets = [...(player.tickets || [])];

    const ticketIndex = findTicket(tickets, "pull_reset_ticket");

    if (ticketIndex === -1) {
      return message.reply("You do not have any Pull Reset Ticket.");
    }

    const updatedTickets = consumeTicket(tickets, ticketIndex);
    const resetResult = applyManualPullReset(player.pulls || {});
    const updatedDailyState = incrementQuestCounter(player, "resetTicketsUsed", 1);
    const now = Date.now();

    updatePlayer(message.author.id, {
      tickets: updatedTickets,
      pulls: resetResult.pulls,
      quests: {
        ...(player.quests || {}),
        dailyState: updatedDailyState
      }
    });

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
          "↪ 1 Pull Reset Ticket consumed"
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Pull Reset" });

    return message.reply({ embeds: [embed] });
  }
};