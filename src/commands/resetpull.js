const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");

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

module.exports = {
  name: "resetpull",
  aliases: ["rpull", "pr"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const tickets = [...(player.tickets || [])];

    const ticketIndex = findTicket(tickets, "pull_reset_ticket");

    if (ticketIndex === -1) {
      return message.reply("You do not have any Pull Reset Ticket.");
    }

    const updatedTickets = consumeTicket(tickets, ticketIndex);

    updatePlayer(message.author.id, {
      tickets: updatedTickets,
      pulls: {
        ...(player.pulls || {}),
        base: { used: 0, max: 6 },
        supportMember: { used: 0, max: 1 },
        booster: { used: 0, max: 1 },
        owner: { used: 0, max: 1 },
        patreon: { used: 0, max: 3 },
        lastResetBucket: player?.pulls?.lastResetBucket ?? null
      }
    });

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("🎟️ Pull Reset Used")
      .setDescription(
        [
          "Your pull usage has been reset.",
          "",
          "↪ Base Pulls reset to `0/6`",
          "↪ Bonus pull slots also reset",
          "↪ 1 Pull Reset Ticket consumed"
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Pull Reset" });

    return message.reply({ embeds: [embed] });
  }
};