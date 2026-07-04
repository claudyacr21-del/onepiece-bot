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
          rarity: "S",
          type: "Ticket",
        },
      ],
    },
  },
  {
    key: "legendresourcebox",
    emoji: "🎁",
    label: "Legend Resource Box",
    target: 750,
    reward: {
      boxes: [
        {
          code: "legend_resource_box",
          name: "Legend Resource Box",
          amount: 3,
          rarity: "B",
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
          amount: 10,
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
          amount: 5,
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

  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean).length;
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

function normalizeMilestoneState(player) {
  const state = player?.messageMilestones || {};
  const oldProgress = state.progress || {};
  const oldClaims = state.claims || {};

  const totalMessages = Number(state.totalMessages || state.messages || 0);

  const progress = {};
  const claims = {};

  for (const reward of MESSAGE_MILESTONE_REWARDS) {
    const target = Math.max(1, Number(reward.target || 1));

    if (Object.prototype.hasOwnProperty.call(oldProgress, reward.key)) {
      progress[reward.key] = Math.max(
        0,
        Math.min(Number(oldProgress[reward.key] || 0), target)
      );
    } else {
      progress[reward.key] = Math.max(0, totalMessages % target);
    }

    claims[reward.key] = Math.max(0, Number(oldClaims[reward.key] || 0));
  }

  return {
    messages: totalMessages,
    totalMessages,
    progress,
    claims,
    completed: Array.isArray(state.completed) ? state.completed : [],
    lastCompleted: Array.isArray(state.lastCompleted) ? state.lastCompleted : [],
    lastRewardAt: Number(state.lastRewardAt || 0),
    updatedAt: Number(state.updatedAt || 0),
  };
}

function getMessageMilestoneCount(player) {
  return Number(player?.messageMilestones?.totalMessages || player?.messageMilestones?.messages || 0);
}

function getTotalMessageMilestoneCount(player) {
  return getMessageMilestoneCount(player);
}

function getMilestoneProgress(player, reward) {
  const state = normalizeMilestoneState(player);
  const target = Math.max(1, Number(reward.target || 1));

  return Math.max(
    0,
    Math.min(Number(state.progress?.[reward.key] || 0), target)
  );
}

function getMilestoneClaimCount(player, key) {
  const state = normalizeMilestoneState(player);
  return Number(state.claims?.[key] || 0);
}

function incrementMessageMilestone(player) {
  const state = normalizeMilestoneState(player);
  const progress = {};
  const claims = {};
  const completed = [];

  for (const reward of MESSAGE_MILESTONE_REWARDS) {
    const target = Math.max(1, Number(reward.target || 1));
    const previous = Number(state.progress?.[reward.key] || 0);
    const next = previous + 1;

    if (next >= target) {
      progress[reward.key] = 0;
      claims[reward.key] = Number(state.claims?.[reward.key] || 0) + 1;
      completed.push(reward.key);
    } else {
      progress[reward.key] = next;
      claims[reward.key] = Number(state.claims?.[reward.key] || 0);
    }
  }

  const totalMessages = Number(state.totalMessages || state.messages || 0) + 1;

  return {
    ...state,
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
  const code = String(item?.code || item?.name || "").toLowerCase();

  const index = arr.findIndex((entry) => {
    return String(entry?.code || entry?.name || "").toLowerCase() === code;
  });

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
      rewards.push(`${milestone.emoji} ${milestone.label}: +${amount.toLocaleString("en-US")} berries`);
    }

    if (Array.isArray(reward.tickets)) {
      let tickets = Array.isArray(nextPlayer.tickets) ? [...nextPlayer.tickets] : [];

      for (const ticket of reward.tickets) {
        tickets = addStack(tickets, ticket);
        rewards.push(`${milestone.emoji} ${ticket.name || milestone.label} x${Number(ticket.amount || 1)}`);
      }

      nextPlayer.tickets = tickets;
    }

    if (Array.isArray(reward.boxes)) {
      let boxes = Array.isArray(nextPlayer.boxes) ? [...nextPlayer.boxes] : [];

      for (const box of reward.boxes) {
        boxes = addStack(boxes, box);
        rewards.push(`${milestone.emoji} ${box.name || milestone.label} x${Number(box.amount || 1)}`);
      }

      nextPlayer.boxes = boxes;
    }

    if (Array.isArray(reward.items)) {
      let items = Array.isArray(nextPlayer.items) ? [...nextPlayer.items] : [];

      for (const item of reward.items) {
        items = addStack(items, item);
        rewards.push(`${milestone.emoji} ${item.name || milestone.label} x${Number(item.amount || 1)}`);
      }

      nextPlayer.items = items;
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
    return `${reward.emoji} **${reward.label}**\n${current}/${reward.target}`;
  });
}

module.exports = {
  MESSAGE_MILESTONE_REWARDS,
  isEligibleMilestoneChat,
  incrementMessageMilestone,
  applyMessageMilestoneRewards,
  getMessageMilestoneCount,
  getTotalMessageMilestoneCount,
  getMilestoneProgress,
  getMilestoneClaimCount,
  formatMessageMilestoneLines,
};