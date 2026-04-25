const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getPlayer } = require("../playerStore");

const TOPGG_URL = "https://top.gg/bot/1492759342972407869/vote";

function formatCooldown(timestamp) {
  const diff = Number(timestamp || 0) - Date.now();
  if (diff <= 0) return "Ready now";

  const hours = Math.floor(diff / 1000 / 60 / 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);

  if (hours <= 0) return `${minutes} minutes`;
  return `${hours} hours ${minutes} minutes`;
}

module.exports = {
  name: "vote",

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const voteData = player.vote || {
      streak: 0,
      totalVotes: 0,
      lastVoteAt: null,
    };

    const streak = Number(voteData.streak || 0);
    const nextRaidTicketIn = 25 - (streak % 25 || 25);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("Vote For One Piece Bot!")
      .setDescription(
        [
          "Vote for us at Top.gg to gain 🎟️ Pull Reset Ticket + 5,000 Berries!",
          "",
          "**Can Vote Again In**",
          formatCooldown(player?.cooldowns?.vote),
          "",
          "**Vote Streak Bonus**",
          `Current Streak: **${streak}**`,
          "",
          "Every **25 Vote Streak** gives **Raid Ticket x1**.",
          "Daily claim rewards can also give a random box.",
        ].join("\n")
      )
      .setThumbnail(message.client.user.displayAvatarURL())
      .setFooter({ text: "One Piece Bot • Vote System" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Vote")
        .setStyle(ButtonStyle.Link)
        .setURL(TOPGG_URL)
    );

    return message.reply({
      embeds: [embed],
      components: [row],
    });
  },
};