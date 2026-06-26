const MESSAGE_MILESTONE_REWARDS = [
  {
    key: "gems",
    emoji: "💎",
    label: "Gems",
    target: 75,
    reward: {
      gems: 500,
    },
  },
  {
    key: "resetToken",
    emoji: "🎟️",
    label: "Pull Reset Ticket",
    target: 350,
    reward: {
      tickets: [
        {
          code: "pull_reset_ticket",
          name: "Pull Reset Ticket",
          amount: 1,
          rarity: "A",
          type: "Ticket",
        },
      ],
    },
  },
  {
    key: "legendResourceBox",
    emoji: "🎁",
    label: "Legend Resource Box",
    target: 750,
    reward: {
      boxes: [
        {
          code: "legend_resource_box",
          name: "Legend Resource Box",
          amount: 1,
          rarity: "S",
          type: "Box",
        },
      ],
    },
  },
  {
    key: "raidTicket",
    emoji: "🎫",
    label: "Raid Ticket",
    target: 3500,
    reward: {
      tickets: [
        {
          code: "raid_ticket",
          name: "Raid Ticket",
          amount: 1,
          rarity: "A",
          type: "Ticket",
        },
      ],
    },
  },
  {
    key: "goldRaidTicket",
    emoji: "🎫",
    label: "Gold Raid Ticket",
    target: 10000,
    reward: {
      tickets: [
        {
          code: "gold_raid_ticket",
          name: "Gold Raid Ticket",
          amount: 1,
          rarity: "S",
          type: "Ticket",
        },
      ],
    },
  },
];

function getMainChatChannelIds() {
  return [process.env.MAIN_CHAT_CHANNEL_ID, process.env.MAIN_CHAT_CHANNEL_IDS]
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
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
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
  return Number(player?.messageMilestones?.totalMessages || 0);
}

function getTotalMessageMilestoneCount(player) {
  return Number(player?.messageMilestones?.totalMessages || 0);
}

function getMilestoneProgress(player, reward) {
  const state = player?.messageMilestones || {};
  const progressMap = state.progress || {};
  const target = Math.max(1, Number(reward.target || 1));

  if (Object.prototype.hasOwnProperty.call(progressMap, reward.key)) {
    return Math.max(0, Math.min(Number(progressMap[reward.key] || 0), target));
  }

  const legacyTotal = Number(state.totalMessages || state.messages || 0);
  return Math.max(0, legacyTotal % target);
}

function getMilestoneClaimCount(player, key) {
  const claimMap = player?.messageMilestones?.claims || {};
  return Number(claimMap?.[key] || 0);
}

function incrementMessageMilestone(player) {
  const currentState = player?.messageMilestones || {};
  const oldProgress = currentState.progress || {};
  const oldClaims = currentState.claims || {};

  const progress = {};
  const claims = {};
  const completed = [];

  for (const reward of MESSAGE_MILESTONE_REWARDS) {
    const target = Math.max(1, Number(reward.target || 1));
    const hasProgress = Object.prototype.hasOwnProperty.call(oldProgress, reward.key);
    const legacyTotal = Number(currentState.totalMessages || currentState.messages || 0);
    const previous = hasProgress
      ? Number(oldProgress[reward.key] || 0)
      : legacyTotal % target;
    const next = previous + 1;

    if (next >= target) {
      progress[reward.key] = 0;
      claims[reward.key] = Number(oldClaims[reward.key] || 0) + 1;
      completed.push(reward.key);
    } else {
      progress[reward.key] = next;
      claims[reward.key] = Number(oldClaims[reward.key] || 0);
    }
  }

  const totalMessages = Number(currentState.totalMessages || currentState.messages || 0) + 1;

  return {
    ...currentState,
    messages: totalMessages,
    totalMessages,
    progress,
    claims,
    completed,
    updatedAt: Date.now(),
  };
}

function addStack(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = String(item?.code || "").toLowerCase();

  const index = arr.findIndex(
    (entry) => String(entry?.code || "").toLowerCase() === code
  );

  if (index >= 0) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 0) + Number(item.amount || 1),
    };
    return arr;
  }

  arr.push({
    ...item,
    amount: Number(item.amount || 1),
  });

  return arr;
}

function applyMessageMilestoneRewards(player, milestoneState) {
  const completed = Array.isArray(milestoneState?.completed)
    ? milestoneState.completed
    : [];

  if (!completed.length) {
    return {
      player: {
        ...player,
        messageMilestones: milestoneState,
      },
      rewards: [],
    };
  }

  let nextPlayer = {
    ...player,
    messageMilestones: {
      ...milestoneState,
      completed: [],
      lastCompleted: completed,
      lastRewardAt: Date.now(),
    },
  };

  const rewards = [];

  for (const key of completed) {
    const milestone = MESSAGE_MILESTONE_REWARDS.find((entry) => entry.key === key);
    if (!milestone) continue;

    const reward = milestone.reward || {};

    if (Number(reward.gems || 0) > 0) {
      const amount = Number(reward.gems || 0);
      nextPlayer.gems = Number(nextPlayer.gems || 0) + amount;
      rewards.push(`${milestone.emoji} ${milestone.label}: +${amount}`);
    }

    if (Number(reward.berries || 0) > 0) {
      const amount = Number(reward.berries || 0);
      nextPlayer.berries = Number(nextPlayer.berries || 0) + amount;
      rewards.push(
        `${milestone.emoji} ${milestone.label}: +${amount.toLocaleString("en-US")} berries`
      );
    }

    if (Array.isArray(reward.tickets)) {
      let tickets = Array.isArray(nextPlayer.tickets) ? [...nextPlayer.tickets] : [];

      for (const ticket of reward.tickets) {
        tickets = addStack(tickets, ticket);
        rewards.push(
          `${milestone.emoji} ${ticket.name || milestone.label} x${Number(ticket.amount || 1)}`
        );
      }

      nextPlayer.tickets = tickets;
    }

    if (Array.isArray(reward.boxes)) {
      let boxes = Array.isArray(nextPlayer.boxes) ? [...nextPlayer.boxes] : [];

      for (const box of reward.boxes) {
        boxes = addStack(boxes, box);
        rewards.push(
          `${milestone.emoji} ${box.name || milestone.label} x${Number(box.amount || 1)}`
        );
      }

      nextPlayer.boxes = boxes;
    }
  }

  return {
    player: nextPlayer,
    rewards,
  };
}

function formatMessageMilestoneLines(player) {
  return MESSAGE_MILESTONE_REWARDS.map((reward) => {
    const current = getMilestoneProgress(player, reward);
    const claims = getMilestoneClaimCount(player, reward.key);

    return `${reward.emoji} **${reward.label}**\n${current}/${reward.target}${
      claims > 0 ? ` • Claimed ${claims}x` : ""
    }`;
  });
}

module.exports = {
  MESSAGE_MILESTONE_REWARDS,
  isEligibleMilestoneChat,
  incrementMessageMilestone,
  applyMessageMilestoneRewards,
  getMessageMilestoneCount,
  getTotalMessageMilestoneCount,
  formatMessageMilestoneLines,
};