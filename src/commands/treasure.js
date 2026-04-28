const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
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
  const tickets = [];

  if (Math.random() < 0.5) {
    tickets.push(cloneItem(ITEMS.pullResetTicket, 1));
  }

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
      return message.reply(
        `Only ${PREMIUM_ROLE_NAME} users can claim \`op treasure\`.`
      );
    }

    const player = getPlayer(message.author.id, message.author.username);
    const cooldowns = player.cooldowns || {};
    const now = Date.now();
    const nextTreasureAt = Number(cooldowns.treasure || 0);

    if (nextTreasureAt > now) {
      return message.reply(
        `You already claimed your treasure.\nNext treasure: ${formatRemaining(
          nextTreasureAt - now
        )}`
      );
    }

    const reward = rollTreasureRewards();

    let updatedBoxes = [...(player.boxes || [])];
    let updatedMaterials = [...(player.materials || [])];
    let updatedTickets = [...(player.tickets || [])];

    reward.boxes.forEach((item) => {
      updatedBoxes = addOrIncrease(updatedBoxes, item);
    });

    reward.materials.forEach((item) => {
      updatedMaterials = addOrIncrease(updatedMaterials, item);
    });

    reward.tickets.forEach((item) => {
      updatedTickets = addOrIncrease(updatedTickets, item);
    });

    updatePlayer(message.author.id, {
      berries: Number(player.berries || 0) + reward.berries,
      gems: Number(player.gems || 0) + reward.gems,
      boxes: updatedBoxes,
      materials: updatedMaterials,
      tickets: updatedTickets,
      cooldowns: {
        ...cooldowns,
        treasure: now + TREASURE_COOLDOWN_MS,
      },
    });

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
    });
  },
};