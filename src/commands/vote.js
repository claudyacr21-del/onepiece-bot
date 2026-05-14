const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { getPlayer } = require("../playerStore");

const TOPGG_URL = "https://top.gg/bot/1492759342972407869/vote";
const VOTE_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const RAID_TICKET_STREAK_TARGET = 25;
const REMINDER_COLLECTOR_MS = 10 * 60 * 1000;

const activeVoteReminders = new Map();

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
  const nextRaidTicketIn = getNextRaidTicketIn(streak);

  return new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle("Vote For One Piece Bot!")
    .setDescription(
      [
        "Vote for us at Top.gg to gain **Pull Reset Ticket + 5,000 Berries**!",
        "",
        "**Can Vote Again In**",
        formatCooldown(cooldownAt),
        "",
        "**Vote Streak Bonus**",
        `Current Streak: **${streak}**`,
        `Next Raid Ticket In: **${nextRaidTicketIn} vote(s)**`,
        "",
        "Every **25 Vote Streak** gives **Raid Ticket x1**.",
        "",
        "Click **Remind Me** if you want the bot to DM you when your vote is ready.",
      ].join("\n")
    )
    .setThumbnail(message.client.user.displayAvatarURL())
    .setFooter({
      text: "One Piece Bot • Vote System",
    });
}

function buildVoteRows(userId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Vote")
        .setStyle(ButtonStyle.Link)
        .setURL(TOPGG_URL),
      new ButtonBuilder()
        .setCustomId(`vote_remind_${userId}`)
        .setLabel("Remind Me")
        .setStyle(ButtonStyle.Primary)
    ),
  ];
}

function clearVoteReminder(userId) {
  const key = String(userId);
  const existing = activeVoteReminders.get(key);

  if (existing) {
    clearTimeout(existing.timeout);
    activeVoteReminders.delete(key);
  }
}

function scheduleVoteReminder(user, readyAt) {
  const userId = String(user.id);
  const delay = Math.max(0, Number(readyAt || 0) - Date.now());

  clearVoteReminder(userId);

  const timeout = setTimeout(async () => {
    activeVoteReminders.delete(userId);

    const dmText = [
      "⏰ **Vote Reminder**",
      "",
      "Your Top.gg vote cooldown is ready!",
      `Vote here: ${TOPGG_URL}`,
      "",
      "Reward: **Pull Reset Ticket + 5,000 Berries**",
    ].join("\n");

    await user.send(dmText).catch(() => null);
  }, delay);

  activeVoteReminders.set(userId, {
    readyAt,
    timeout,
  });

  return delay;
}

module.exports = {
  name: "vote",
  aliases: ["v"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const cooldownAt = getVoteCooldownAt(player);

    const sent = await message.reply({
      embeds: [buildVoteEmbed(message, player)],
      components: buildVoteRows(message.author.id),
    });

    const collector = sent.createMessageComponentCollector({
      time: REMINDER_COLLECTOR_MS,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the command user can set this vote reminder.",
          ephemeral: true,
        });
      }

      if (interaction.customId !== `vote_remind_${message.author.id}`) {
        return;
      }

      const freshPlayer = getPlayer(message.author.id, message.author.username);
      const freshCooldownAt = getVoteCooldownAt(freshPlayer);
      const delay = scheduleVoteReminder(interaction.user, freshCooldownAt);

      if (delay <= 0) {
        return interaction.reply({
          content:
            "✅ Your vote is already ready now. I also sent you a DM reminder.",
          ephemeral: true,
        });
      }

      return interaction.reply({
        content: `✅ Vote reminder set. I will DM you in **${formatCooldown(
          freshCooldownAt
        )}**.`,
        ephemeral: true,
      });
    });

    collector.on("end", async () => {
      try {
        await sent.edit({
          components: buildVoteRows(message.author.id).map((row) => {
            row.components.forEach((component) => {
              if (component.data?.custom_id?.startsWith("vote_remind_")) {
                component.setDisabled(true);
              }
            });

            return row;
          }),
        });
      } catch {}
    });
  },
};