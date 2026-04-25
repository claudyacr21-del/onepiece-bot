const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getPlayer } = require("../playerStore");

const TOPGG_URL = "https://top.gg/bot/1492759342972407869/vote";

function formatSince(timestamp) {
  if (!timestamp) return "No vote recorded yet";
  return new Date(timestamp).toLocaleString("en-GB");
}

module.exports = {
  name: "vote",
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const voteData = player.vote || {
      streak: 0,
      totalVotes: 0,
      lastVoteAt: null
    };

    const streak = Number(voteData.streak || 0);
    const milestoneLeft = 20 - (streak % 20 || 20);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("🗳️ Vote Information")
      .setDescription(
        [
          `↪ Vote Streak: ${streak}`,
          `↪ Total Votes: ${Number(voteData.totalVotes || 0)}`,
          `↪ Last Vote: ${formatSince(voteData.lastVoteAt)}`,
          `↪ Milestone Bonus In: ${milestoneLeft} vote(s)`,
          "",
          "**Vote Reward**",
          "↪ 5,000 Berries",
          "↪ Pull Reset Ticket x1",
          "",
          "**20 Streak Bonus**",
          "↪ Random Box Reward",
          "",
          "**How it works**",
          "↪ Vote using the button below.",
          "↪ Rewards are claimed automatically after top.gg webhook is received.",
          "↪ Reward notification will be sent by DM from the bot."
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Vote System" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Vote")
        .setStyle(ButtonStyle.Link)
        .setURL(TOPGG_URL)
    );

    return message.reply({
      embeds: [embed],
      components: [row]
    });
  }
};