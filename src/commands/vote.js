const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getPlayer } = require("../playerStore");

const TOPGG_URL = "https://top.gg/bot/1492759342972407869/vote";
const VOTE_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const RAID_TICKET_STREAK_TARGET = 25;

function getVoteCooldownAt(player) {
  const cooldownVote = Number(player?.cooldowns?.vote || 0);
  const lastVoteAt = Number(player?.vote?.lastVoteAt || 0);
  const fallbackCooldown = lastVoteAt > 0 ? lastVoteAt + VOTE_COOLDOWN_MS : 0;

  return Math.max(cooldownVote, fallbackCooldown);
}

function formatCooldown(timestamp) {
  const diff = Number(timestamp || 0) - Date.now();

  if (diff <= 0) return "Ready now";

  const totalMinutes = Math.ceil(diff / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes} minutes`;
  return `${hours} hours ${minutes} minutes`;
}

function getNextRaidTicketIn(streak) {
  const current = Number(streak || 0);
  const mod = current % RAID_TICKET_STREAK_TARGET;

  if (mod === 0 && current > 0) return RAID_TICKET_STREAK_TARGET;

  return RAID_TICKET_STREAK_TARGET - mod;
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
    const cooldownAt = getVoteCooldownAt(player);
    const nextRaidTicketIn = getNextRaidTicketIn(streak);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle("Vote For One Piece Bot!")
      .setDescription(
        [
          "Vote for us at Top.gg to gain 🎟️ Pull Reset Ticket + 5,000 Berries!",
          "",
          "**Can Vote Again In**",
          formatCooldown(cooldownAt),
          "",
          "**Vote Streak Bonus**",
          `Current Streak: **${streak}**`,
          `Next Raid Ticket In: **${nextRaidTicketIn} vote(s)**`,
          "",
          "Every **25 Vote Streak** gives **Raid Ticket x1**.",
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