const MESSAGE_MILESTONE_REWARDS = [
  {
    key: "gems",
    emoji: "💎",
    label: "Gems",
    target: 75,
  },
  {
    key: "resetToken",
    emoji: "🔁",
    label: "Reset Token",
    target: 350,
  },
  {
    key: "weaponScroll",
    emoji: "🗡️",
    label: "Weapon Scroll",
    target: 750,
  },
  {
    key: "raidTicket",
    emoji: "🎟️",
    label: "Raid Ticket",
    target: 3500,
  },
  {
    key: "goldRaidTicket",
    emoji: "🏷️",
    label: "Gold Raid Ticket",
    target: 10000,
  },
];

function getMainChatChannelIds() {
  return [
    process.env.MAIN_CHAT_CHANNEL_ID,
    process.env.MAIN_CHAT_CHANNEL_IDS,
  ]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function isMainChatMessage(message) {
  if (!message?.guild || !message.channel?.id) return false;

  const ids = getMainChatChannelIds();

  if (!ids.length) {
    return true;
  }

  return ids.includes(String(message.channel.id));
}

function countSentenceLikeParts(content) {
  const text = String(content || "")
    .replace(/<a?:\w+:\d+>/g, "")
    .replace(/<@!?\d+>/g, "")
    .replace(/<#\d+>/g, "")
    .replace(/https?:\/\/\S+/gi, "")
    .trim();

  if (!text) return 0;

  const words = text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  return words.length;
}

function isEligibleMilestoneChat(message, prefix = "op") {
  const content = String(message?.content || "").trim();
  if (!content) return false;
  if (message.author?.bot) return false;
  if (!isMainChatMessage(message)) return false;

  const normalizedPrefix = String(prefix || "op").toLowerCase();
  const lower = content.toLowerCase();

  if (lower === normalizedPrefix || lower.startsWith(`${normalizedPrefix} `)) {
    return false;
  }

  return countSentenceLikeParts(content) >= 2;
}

function getMessageMilestoneCount(player) {
  return Number(player?.messageMilestones?.messages || 0);
}

function incrementMessageMilestone(player) {
  const current = getMessageMilestoneCount(player);

  return {
    ...(player.messageMilestones || {}),
    messages: current + 1,
    updatedAt: Date.now(),
  };
}

function formatMessageMilestoneLines(player) {
  const count = getMessageMilestoneCount(player);

  return MESSAGE_MILESTONE_REWARDS.map((reward) => {
    const current = Math.min(count, reward.target);
    return `${reward.emoji} **${reward.label}**\n${current}/${reward.target}`;
  });
}

module.exports = {
  MESSAGE_MILESTONE_REWARDS,
  isEligibleMilestoneChat,
  incrementMessageMilestone,
  getMessageMilestoneCount,
  formatMessageMilestoneLines,
};