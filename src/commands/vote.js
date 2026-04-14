const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getPlayer } = require("../playerStore");

const TOPGG_URL = "https://top.gg/";

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
          "**How it works**",
          "↪ Vote using the button below.",
          "↪ Rewards are claimed automatically after top.gg webhook is received.",
          "↪ Reward notification will be sent by DM from the bot.",
          "↪ Every 20 streak votes gives an extra reward bonus."
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