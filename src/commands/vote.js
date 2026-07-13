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

function getVoteCooldownAt(player) {
  const cooldownVote = Number(player?.cooldowns?.vote || 0);
  const lastVoteAt = Number(player?.vote?.lastVoteAt || 0);
  const fallbackCooldown = lastVoteAt > 0 ? lastVoteAt + VOTE_COOLDOWN_MS : 0;

  return Math.max(cooldownVote, fallbackCooldown);
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
  const voteData = player.vote || {
    streak: 0,
    totalVotes: 0,
    lastVoteAt: null,
  };

  const streak = Number(voteData.streak || 0);

  const cooldownAt = getVoteCooldownAt(player);

  const nextRaidTicketIn =
    getNextRaidTicketIn(streak);

  return new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle("🗳️ Vote For One Piece Bot")
    .setDescription(
      [
        "Support One Piece Bot by voting on the platforms below and receive exclusive rewards!",
        "",

        "## 🔵 Top.gg",
        "> Reward:",
        "> 🎟️ Pull Reset Ticket x1",
        "> 💰 5,000 Berries",
        "",
        `Cooldown: **${formatCooldown(cooldownAt)}**`,
        "",

        "## 🟣 DiscordList.gg",
        "> Reward:",
        "> 📦 Legend Resource Box x2",
        "> Cooldown: 12 Hours",
        "",

        "## 🟢 Botlist.me",
        "> 🚧 Coming Soon...",
        "> Our listing is currently under review.",
        "> Reward:",
        "> 📦 Legend Resource Box x2",
        "",

        "---",
        "",
        "**Vote Streak**",
        `Current Streak: **${streak}**`,
        `Next Raid Ticket: **${nextRaidTicketIn} vote(s)**`,
        "",
        "Every **25 Vote Streak** rewards **Raid Ticket x1**.",
        "",
        "💜 You'll automatically receive a DM reminder when your vote cooldown becomes available.",
      ].join("\n")
    )
    .setThumbnail(
      message.client.user.displayAvatarURL()
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