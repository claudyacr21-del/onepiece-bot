const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");

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
    name: item.name,
    amount: Number(item.amount || 1),
    rarity: item.rarity || "C",
    code: item.code,
    image: item.image || "",
    type: item.type || "Item",
    description: item.description || ""
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
      {
        name: "Enhancement Stone",
        amount: randomBetween(1, 2),
        rarity: "C",
        code: "enhancement_stone",
        type: "Material",
        description: "A stone used to strengthen growth systems."
      }
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
      {
        name: "Treasure Material Pack",
        amount: randomBetween(2, 4),
        rarity: "B",
        code: "treasure_material_pack",
        type: "Material",
        description: "A set of useful treasure materials."
      }
    ],
    tickets: [],
    boxes: []
  };

  if (Math.random() < 0.35) {
    rewards.tickets.push({
      name: "Pull Reset Ticket",
      amount: 1,
      rarity: "A",
      code: "pull_reset_ticket",
      type: "Ticket",
      description: "Resets your pull usage manually."
    });
  }

  return rewards;
}

function getBoxRewards(box) {
  const code = String(box.code || "").toLowerCase();

  if (code === "basic_resource_box") return openBasicResourceBox();
  if (code === "rare_resource_box") return openRareResourceBox();

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

    updatePlayer(message.author.id, {
      berries: Number(player.berries || 0) + Number(rewards.berries || 0),
      gems: Number(player.gems || 0) + Number(rewards.gems || 0),
      boxes: updatedBoxes,
      materials: updatedMaterials,
      tickets: updatedTickets
    });

    const lines = [
      `Opened: **${box.name}**`,
      "",
      `↪ Berries: +${Number(rewards.berries || 0).toLocaleString("en-US")}`,
      `↪ Gems: +${Number(rewards.gems || 0).toLocaleString("en-US")}`
    ];

    rewards.materials.forEach((item) => {
      lines.push(`↪ ${item.name} x${item.amount}`);
    });

    rewards.tickets.forEach((item) => {
      lines.push(`↪ ${item.name} x${item.amount}`);
    });

    rewards.boxes.forEach((item) => {
      lines.push(`↪ ${item.name} x${item.amount}`);
    });

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("📦 Box Opened")
      .setDescription(lines.join("\n"))
      .setFooter({ text: "One Piece Bot • Open Box" });

    return message.reply({ embeds: [embed] });
  }
};