const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { incrementQuestCounter } = require("../utils/questProgress");
const { ITEMS, cloneItem } = require("../data/items");

function normalize(text) {
  return String(text || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function findBox(boxes, query) {
  const q = normalize(query);

  return (boxes || []).findIndex((box) => {
    const name = normalize(box.name);
    const code = normalize(box.code);
    return name.includes(q) || code.includes(q);
  });
}

function consumeBox(boxes, index) {
  const updated = [...(boxes || [])];
  const current = Number(updated[index]?.amount || 0);

  if (current <= 1) {
    updated.splice(index, 1);
  } else {
    updated[index] = {
      ...updated[index],
      amount: current - 1
    };
  }

  return updated;
}

function addOrIncrease(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const index = arr.findIndex((entry) => entry.code === item.code);

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 1) + Number(item.amount || 1)
    };
    return arr;
  }

  arr.push({
    ...item,
    amount: Number(item.amount || 1)
  });

  return arr;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function openBasicResourceBox() {
  return {
    berries: randomBetween(1500, 3000),
    gems: randomBetween(5, 12),
    materials: [
      cloneItem(ITEMS.enhancementStone, randomBetween(1, 2))
    ],
    tickets: [],
    boxes: []
  };
}

function openRareResourceBox() {
  const rewards = {
    berries: randomBetween(4000, 7000),
    gems: randomBetween(12, 25),
    materials: [
      cloneItem(ITEMS.treasureMaterialPack, randomBetween(2, 4))
    ],
    tickets: [],
    boxes: []
  };

  if (Math.random() < 0.35) {
    rewards.tickets.push(cloneItem(ITEMS.pullResetTicket, 1));
  }

  return rewards;
}

function openMotherFlameTreasureBox() {
  const rewards = {
    berries: randomBetween(12000, 18000),
    gems: randomBetween(35, 60),
    materials: [
      cloneItem(ITEMS.treasureMaterialPack, randomBetween(4, 7)),
      cloneItem(ITEMS.enhancementStone, randomBetween(2, 5))
    ],
    tickets: [],
    boxes: []
  };

  if (Math.random() < 0.7) {
    rewards.tickets.push(cloneItem(ITEMS.pullResetTicket, 1));
  }

  if (Math.random() < 0.35) {
    rewards.boxes.push(cloneItem(ITEMS.rareResourceBox, 1));
  }

  return rewards;
}

function getBoxRewards(box) {
  const code = String(box.code || "").toLowerCase();

  if (code === "basic_resource_box") return openBasicResourceBox();
  if (code === "rare_resource_box") return openRareResourceBox();
  if (code === "mother_flame_treasure_box") return openMotherFlameTreasureBox();

  return {
    berries: randomBetween(1000, 2000),
    gems: randomBetween(3, 8),
    materials: [],
    tickets: [],
    boxes: []
  };
}

module.exports = {
  name: "open",
  async execute(message, args) {
    if (!args.length) {
      return message.reply("Usage: `op open <box name>`");
    }

    const query = args.join(" ");
    const player = getPlayer(message.author.id, message.author.username);
    const boxes = [...(player.boxes || [])];

    const boxIndex = findBox(boxes, query);

    if (boxIndex === -1) {
      return message.reply(`You do not have a box matching \`${query}\`.`);
    }

    const box = boxes[boxIndex];
    const rewards = getBoxRewards(box);

    let updatedBoxes = consumeBox(boxes, boxIndex);
    let updatedMaterials = [...(player.materials || [])];
    let updatedTickets = [...(player.tickets || [])];

    rewards.materials.forEach((item) => {
      updatedMaterials = addOrIncrease(updatedMaterials, item);
    });

    rewards.tickets.forEach((item) => {
      updatedTickets = addOrIncrease(updatedTickets, item);
    });

    rewards.boxes.forEach((item) => {
      updatedBoxes = addOrIncrease(updatedBoxes, item);
    });

    const updatedDailyState = incrementQuestCounter(player, "boxesOpened", 1);

    updatePlayer(message.author.id, {
      berries: Number(player.berries || 0) + Number(rewards.berries || 0),
      gems: Number(player.gems || 0) + Number(rewards.gems || 0),
      boxes: updatedBoxes,
      materials: updatedMaterials,
      tickets: updatedTickets,
      quests: {
        ...(player.quests || {}),
        dailyState: updatedDailyState
      }
    });

    const lines = [
      `Opened: **${box.name}**`,
      "",
      `↪ Berries: +${Number(rewards.berries || 0).toLocaleString("en-US")}`,
      `↪ Gems: +${Number(rewards.gems || 0).toLocaleString("en-US")}`
    ];

    rewards.materials.forEach((item) => lines.push(`↪ ${item.name} x${item.amount}`));
    rewards.tickets.forEach((item) => lines.push(`↪ ${item.name} x${item.amount}`));
    rewards.boxes.forEach((item) => lines.push(`↪ ${item.name} x${item.amount}`));

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("📦 Box Opened")
      .setDescription(lines.join("\n"))
      .setFooter({ text: "One Piece Bot • Open Box" });

    return message.reply({ embeds: [embed] });
  }
};