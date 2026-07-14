const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { getPlayer } = require("../playerStore");

const TOPGG_URL =
  "https://top.gg/bot/1492759342972407869/vote";

const DISCORDLIST_URL =
  "https://discordlist.gg/bot/1492759342972407869/vote";
const VOTE_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const RAID_TICKET_STREAK_TARGET = 25;

function getTopggCooldownAt(player) {
  const cooldownVote = Number(
    player?.cooldowns?.vote || 0
  );

  const lastVoteAt = Number(
    player?.vote?.lastVoteAt || 0
  );

  const fallbackCooldown =
    lastVoteAt > 0
      ? lastVoteAt + VOTE_COOLDOWN_MS
      : 0;

  return Math.max(
    cooldownVote,
    fallbackCooldown
  );
}

function getDiscordListCooldownAt(player) {
  const voteData =
    player?.discordListVote &&
    typeof player.discordListVote === "object"
      ? player.discordListVote
      : {};

  const storedCooldown = Number(
    voteData.cooldownUntil || 0
  );

  const lastVoteAt = Number(
    voteData.lastVoteAt || 0
  );

  const fallbackCooldown =
    lastVoteAt > 0
      ? lastVoteAt + VOTE_COOLDOWN_MS
      : 0;

  return Math.max(
    storedCooldown,
    fallbackCooldown
  );
}

function formatCooldown(timestamp) {
  const diff = Number(timestamp || 0) - Date.now();

  if (diff <= 0) return "Ready now";

  const totalSeconds = Math.ceil(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;

  return `${seconds}s`;
}

function getNextRaidTicketIn(streak) {
  const current = Number(streak || 0);
  const mod = current % RAID_TICKET_STREAK_TARGET;

  if (mod === 0 && current > 0) return RAID_TICKET_STREAK_TARGET;

  return RAID_TICKET_STREAK_TARGET - mod;
}

function buildVoteEmbed(message, player) {
  const topggVote =
    player?.vote &&
    typeof player.vote === "object"
      ? player.vote
      : {};

  const discordListVote =
    player?.discordListVote &&
    typeof player.discordListVote === "object"
      ? player.discordListVote
      : {};

  const topggStreak = Math.max(
    0,
    Math.floor(Number(topggVote.streak || 0))
  );

  const topggTotalVotes = Math.max(
    0,
    Math.floor(Number(topggVote.totalVotes || 0))
  );

  const discordListTotalVotes = Math.max(
    0,
    Math.floor(
      Number(discordListVote.totalVotes || 0)
    )
  );

  const topggCooldownAt =
    getTopggCooldownAt(player);

  const discordListCooldownAt =
    getDiscordListCooldownAt(player);

  const nextRaidTicketIn =
    getNextRaidTicketIn(topggStreak);

  return new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle("🗳️ Vote for One Piece Bot")
    .setDescription(
      [
        "Support the bot by voting on the platforms below. Each platform has its own reward and cooldown.",
        "",

        "## 🔵 Top.gg",
        "🎁 **Reward**",
        "• Pull Reset Ticket x1",
        "• 5,000 Berries",
        "",
        `⏳ **Cooldown:** ${formatCooldown(
          topggCooldownAt
        )}`,
        `🗳️ **Total Votes:** ${topggTotalVotes}`,
        `🔥 **Current Streak:** ${topggStreak}`,
        `🎫 **Next Raid Ticket:** ${nextRaidTicketIn} vote(s)`,
        "",
        "Every **25 Top.gg vote streak** rewards **Raid Ticket x1**.",

        "",
        "## 🟣 DiscordList.gg",
        "🎁 **Reward**",
        "• Legend Resource Box x2",
        "",
        `⏳ **Cooldown:** ${formatCooldown(
          discordListCooldownAt
        )}`,
        `🗳️ **Total Votes:** ${discordListTotalVotes}`,

        "",
        "## 🟢 Botlist.me",
        "🚧 **Coming Soon**",
        "• Legend Resource Box x2",
        "",
        "The Botlist.me listing is currently under review.",

        "",
        "💜 The bot will send a DM after a vote reward is successfully granted.",
      ].join("\n")
    )
    .setThumbnail(
      message.client.user.displayAvatarURL({
        extension: "png",
        size: 512,
      })
    )
    .setFooter({
      text: "One Piece Bot • Vote System",
    });
}

function buildVoteRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Top.gg")
        .setStyle(ButtonStyle.Link)
        .setURL(TOPGG_URL),

      new ButtonBuilder()
        .setLabel("DiscordList.gg")
        .setStyle(ButtonStyle.Link)
        .setURL(DISCORDLIST_URL),

      new ButtonBuilder()
        .setLabel("Botlist.me (Soon)")
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("vote_botlist_soon")
        .setDisabled(true)

      //new ButtonBuilder()
      //  .setLabel("Botlist.me")
      //  .setStyle(ButtonStyle.Link)
      //  .setURL("LINK_BOTLIST")
    ),
  ];
}

module.exports = {
  name: "vote",
  aliases: ["v"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    return message.reply({
      embeds: [buildVoteEmbed(message, player)],
      components: buildVoteRows(),
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};