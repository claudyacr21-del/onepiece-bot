const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { ITEMS } = require("../data/items");
const weapons = require("../data/weapons");
const devilFruits = require("../data/devilFruits");

function normalize(text) {
  return String(text || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function removeOneBox(list, code) {
  const arr = Array.isArray(list) ? [...list] : [];
  const index = arr.findIndex((entry) => entry.code === code);

  if (index === -1) return null;
  if (Number(arr[index].amount || 0) <= 0) return null;

  if (Number(arr[index].amount || 0) === 1) arr.splice(index, 1);
  else arr[index] = { ...arr[index], amount: Number(arr[index].amount || 0) - 1 };

  return arr;
}

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

function rollFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function getBoxByQuery(query) {
  const all = Object.values(ITEMS).filter((item) => item.type === "Box");
  const q = normalize(query);

  return (
    all.find((item) => normalize(item.name) === q) ||
    all.find((item) => normalize(item.code) === q) ||
    all.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

module.exports = {
  name: "open",
  aliases: ["obox", "openbox"],
  async execute(message, args) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("Usage: `op open <box name>`");

    const player = getPlayer(message.author.id, message.author.username);
    const box = getBoxByQuery(query);

    if (!box) {
      return message.reply("That box was not found.");
    }

    const updatedBoxes = removeOneBox(player.boxes || [], box.code);
    if (!updatedBoxes) {
      return message.reply(`You do not own **${box.name}**.`);
    }

    let resultLines = [];
    let nextWeapons = [...(player.weapons || [])];
    let nextFruits = [...(player.devilFruits || [])];
    let nextMaterials = [...(player.materials || [])];
    let nextBerries = Number(player.berries || 0);
    let nextGems = Number(player.gems || 0);
    let nextTickets = [...(player.tickets || [])];

    if (box.code === "wooden_material_box") {
      const rewards = [
        { ...ITEMS.hardwood, amount: 3 },
        { ...ITEMS.sailCloth, amount: 2 },
        { ...ITEMS.enhancementStone, amount: 8 },
      ];
      rewards.forEach((item) => {
        nextMaterials = addOrIncrease(nextMaterials, item);
        resultLines.push(`📦 ${item.name} x${item.amount}`);
      });
    } else if (box.code === "iron_material_box") {
      const rewards = [
        { ...ITEMS.hardwood, amount: 4 },
        { ...ITEMS.ironPlating, amount: 2 },
        { ...ITEMS.sailCloth, amount: 2 },
        { ...ITEMS.enhancementStone, amount: 15 },
      ];
      rewards.forEach((item) => {
        nextMaterials = addOrIncrease(nextMaterials, item);
        resultLines.push(`📦 ${item.name} x${item.amount}`);
      });
    } else if (box.code === "royal_material_box") {
      const rewards = [
        { ...ITEMS.hardwood, amount: 5 },
        { ...ITEMS.ironPlating, amount: 3 },
        { ...ITEMS.sailCloth, amount: 3 },
        { ...ITEMS.colaEnginePart, amount: 1 },
        { ...ITEMS.enhancementStone, amount: 25 },
      ];
      rewards.forEach((item) => {
        nextMaterials = addOrIncrease(nextMaterials, item);
        resultLines.push(`📦 ${item.name} x${item.amount}`);
      });
    } else if (box.code === "random_weapon_box") {
      const pool = weapons.filter((item) => ["C", "B", "A"].includes(String(item.rarity || "").toUpperCase()));
      const reward = rollFrom(pool);
      nextWeapons = addOrIncrease(nextWeapons, {
        code: reward.code,
        name: reward.name,
        rarity: reward.rarity,
        type: reward.type,
        image: reward.image || "",
        description: reward.description || "",
        amount: 1,
      });
      resultLines.push(`🗡️ ${reward.name} [${reward.rarity}] x1`);
    } else if (box.code === "random_devilfruit_box") {
      const pool = devilFruits.filter((item) => ["C", "B", "A"].includes(String(item.rarity || "").toUpperCase()));
      const reward = rollFrom(pool);
      nextFruits = addOrIncrease(nextFruits, {
        code: reward.code,
        name: reward.name,
        rarity: reward.rarity,
        type: reward.type,
        image: reward.image || "",
        description: reward.description || "",
        amount: 1,
      });
      resultLines.push(`🍎 ${reward.name} [${reward.rarity}] x1`);
    } else if (box.code === "basic_resource_box") {
      nextBerries += 2000;
      nextGems += 10;
      nextMaterials = addOrIncrease(nextMaterials, { ...ITEMS.enhancementStone, amount: 3 });
      resultLines.push("💰 Berries +2000");
      resultLines.push("💎 Gems +10");
      resultLines.push("🧱 Enhancement Stone x3");
    } else if (box.code === "rare_resource_box") {
      nextBerries += 5000;
      nextGems += 20;
      nextMaterials = addOrIncrease(nextMaterials, { ...ITEMS.ironPlating, amount: 2 });
      nextMaterials = addOrIncrease(nextMaterials, { ...ITEMS.enhancementStone, amount: 10 });
      resultLines.push("💰 Berries +5000");
      resultLines.push("💎 Gems +20");
      resultLines.push("📦 Iron Plating x2");
      resultLines.push("🧱 Enhancement Stone x10");
    } else if (box.code === "mother_flame_treasure_box") {
      nextBerries += 15000;
      nextGems += 50;
      nextMaterials = addOrIncrease(nextMaterials, { ...ITEMS.colaEnginePart, amount: 2 });
      nextMaterials = addOrIncrease(nextMaterials, { ...ITEMS.enhancementStone, amount: 30 });
      resultLines.push("💰 Berries +15000");
      resultLines.push("💎 Gems +50");
      resultLines.push("📦 Cola Engine Part x2");
      resultLines.push("🧱 Enhancement Stone x30");
    } else if (box.code === "pull_reset_ticket_box") {
      nextTickets = addOrIncrease(nextTickets, { ...ITEMS.pullResetTicket, amount: 1 });
      resultLines.push("🎟️ Pull Reset Ticket x1");
    } else {
      return message.reply("This box is not configured yet.");
    }

    updatePlayer(message.author.id, {
      boxes: updatedBoxes,
      weapons: nextWeapons,
      devilFruits: nextFruits,
      materials: nextMaterials,
      tickets: nextTickets,
      berries: nextBerries,
      gems: nextGems,
    });

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`🎁 Opened ${box.name}`)
          .setDescription(resultLines.join("\n"))
          .setFooter({ text: "One Piece Bot • Open Box" }),
      ],
    });
  },
};