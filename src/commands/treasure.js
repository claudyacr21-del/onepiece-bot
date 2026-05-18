const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const { PREMIUM_ROLE_NAME, isPremiumUser } = require("../utils/premiumAccess");
const { ITEMS, cloneItem } = require("../data/items");

const TREASURE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function addOrIncrease(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const index = arr.findIndex((entry) => entry.code === item.code);

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 1) + Number(item.amount || 1),
    };
    return arr;
  }

  arr.push({
    ...item,
    amount: Number(item.amount || 1),
  });

  return arr;
}

function formatRemaining(ms) {
  if (ms <= 0) return "Now";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;

  return "Now";
}

function rollTreasureRewards() {
  const berries = 12000 + Math.floor(Math.random() * 4000);
  const gems = 35 + Math.floor(Math.random() * 16);
  const boxes = [cloneItem(ITEMS.motherFlameTreasureBox, 1)];
  const materials = [];
  const tickets = [cloneItem(ITEMS.pullResetTicket, 1)];

  if (Math.random() < 0.35) {
    materials.push(cloneItem(ITEMS.enhancementStone, 4));
  }

  return {
    berries,
    gems,
    boxes,
    materials,
    tickets,
  };
}

module.exports = {
  name: "treasure",

  async execute(message) {
    if (!(await isPremiumUser(message))) {
      return message.reply({
        content: `Only ${PREMIUM_ROLE_NAME} users can claim \`op treasure\`.`,
        allowedMentions: { repliedUser: false },
      });
    }

    const previewPlayer = getPlayer(message.author.id, message.author.username);
    const now = Date.now();
    const nextTreasureAt = Number(previewPlayer?.cooldowns?.treasure || 0);

    if (nextTreasureAt > now) {
      return message.reply({
        content: `You already claimed your treasure.\nNext treasure: ${formatRemaining(
          nextTreasureAt - now
        )}`,
        allowedMentions: { repliedUser: false },
      });
    }

    const reward = rollTreasureRewards();

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const freshNextTreasureAt = Number(fresh?.cooldowns?.treasure || 0);

          if (freshNextTreasureAt > now) {
            throw new Error(
              `You already claimed your treasure.\nNext treasure: ${formatRemaining(
                freshNextTreasureAt - now
              )}`
            );
          }

          let updatedBoxes = [...(fresh.boxes || [])];
          let updatedMaterials = [...(fresh.materials || [])];
          let updatedTickets = [...(fresh.tickets || [])];

          reward.boxes.forEach((item) => {
            updatedBoxes = addOrIncrease(updatedBoxes, item);
          });

          reward.materials.forEach((item) => {
            updatedMaterials = addOrIncrease(updatedMaterials, item);
          });

          reward.tickets.forEach((item) => {
            updatedTickets = addOrIncrease(updatedTickets, item);
          });

          return {
            ...fresh,
            berries: Number(fresh.berries || 0) + reward.berries,
            gems: Number(fresh.gems || 0) + reward.gems,
            boxes: updatedBoxes,
            materials: updatedMaterials,
            tickets: updatedTickets,
            cooldowns: {
              ...(fresh.cooldowns || {}),
              treasure: now + TREASURE_COOLDOWN_MS,
            },
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to claim treasure.",
        allowedMentions: { repliedUser: false },
      });
    }

    const lines = [
      `↪ Berries: +${Number(reward.berries).toLocaleString("en-US")}`,
      `↪ Gems: +${Number(reward.gems).toLocaleString("en-US")}`,
    ];

    reward.boxes.forEach((item) => {
      lines.push(`↪ ${item.name} x${item.amount}`);
    });

    reward.materials.forEach((item) => {
      lines.push(`↪ ${item.name} x${item.amount}`);
    });

    reward.tickets.forEach((item) => {
      lines.push(`↪ ${item.name} x${item.amount}`);
    });

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle("Mother Flame Treasure Claimed")
      .setDescription(
        [
          "Here are your premium treasure rewards:",
          "",
          ...lines,
          "",
          `↪ Next Treasure: ${formatRemaining(TREASURE_COOLDOWN_MS)}`,
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Mother Flame Treasure",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  },
};