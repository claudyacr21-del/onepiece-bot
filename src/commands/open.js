const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { ITEMS } = require("../data/items");
const { incrementQuestPayload } = require("../utils/questProgress");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
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

function addRewardLine(rewardMap, label, amount) {
  const current = Number(rewardMap.get(label) || 0);
  rewardMap.set(label, current + Number(amount || 0));
}

function getBoxByQuery(query) {
  const all = Object.values(ITEMS).filter((item) => item.type === "Box");
  const q = normalize(query);

  return (
    all.find((item) => normalize(item.name) === q) ||
    all.find((item) => normalize(item.code) === q) ||
    all.find((item) => normalize(item.name).includes(q)) ||
    all.find((item) => normalize(item.code).includes(q)) ||
    null
  );
}

function parseOpenArgs(args) {
  const rawArgs = [...args];

  if (!rawArgs.length) {
    return {
      query: "",
      requestedAmount: 1,
      all: false,
    };
  }

  const lastArg = String(rawArgs[rawArgs.length - 1] || "").toLowerCase();

  if (lastArg === "all") {
    rawArgs.pop();

    return {
      query: rawArgs.join(" ").trim(),
      requestedAmount: null,
      all: true,
    };
  }

  const numericAmount = Number(lastArg);

  if (Number.isInteger(numericAmount) && numericAmount > 0) {
    rawArgs.pop();

    return {
      query: rawArgs.join(" ").trim(),
      requestedAmount: numericAmount,
      all: false,
    };
  }

  return {
    query: rawArgs.join(" ").trim(),
    requestedAmount: 1,
    all: false,
  };
}

function getOwnedBoxAmount(boxes, code) {
  const found = (Array.isArray(boxes) ? boxes : []).find((entry) => entry.code === code);
  return Math.max(0, Number(found?.amount || 0));
}

function removeBoxes(list, code, amount) {
  const arr = Array.isArray(list) ? [...list] : [];
  const index = arr.findIndex((entry) => entry.code === code);

  if (index === -1) return null;

  const current = Number(arr[index].amount || 0);

  if (current < amount) return null;

  if (current === amount) {
    arr.splice(index, 1);
  } else {
    arr[index] = {
      ...arr[index],
      amount: current - amount,
    };
  }

  return arr;
}

function grantBoxRewards(box, amount, state, rewardMap) {
  let nextMaterials = state.materials;
  let nextBerries = state.berries;
  let nextGems = state.gems;
  let nextTickets = state.tickets;

  function addMaterial(item, qty) {
    const totalAmount = Number(qty || 0) * amount;

    nextMaterials = addOrIncrease(nextMaterials, {
      ...item,
      amount: totalAmount,
    });

    addRewardLine(rewardMap, item.name, totalAmount);
  }

  function addBerries(qty) {
    const totalAmount = Number(qty || 0) * amount;
    nextBerries += totalAmount;
    addRewardLine(rewardMap, "Berries", totalAmount);
  }

  function addGems(qty) {
    const totalAmount = Number(qty || 0) * amount;
    nextGems += totalAmount;
    addRewardLine(rewardMap, "Gems", totalAmount);
  }

  if (box.code === "wooden_material_box") {
    addMaterial(ITEMS.hardwood, 3);
    addMaterial(ITEMS.sailCloth, 2);
    addMaterial(ITEMS.enhancementStone, 8);
  } else if (box.code === "iron_material_box") {
    addMaterial(ITEMS.hardwood, 4);
    addMaterial(ITEMS.ironPlating, 2);
    addMaterial(ITEMS.sailCloth, 2);
    addMaterial(ITEMS.enhancementStone, 15);
  } else if (box.code === "royal_material_box") {
    addMaterial(ITEMS.hardwood, 5);
    addMaterial(ITEMS.ironPlating, 3);
    addMaterial(ITEMS.sailCloth, 3);
    addMaterial(ITEMS.colaEnginePart, 1);
    addMaterial(ITEMS.enhancementStone, 25);
  } else if (box.code === "basic_resource_box") {
    addBerries(2000);
    addGems(10);
    addMaterial(ITEMS.enhancementStone, 3);
  } else if (box.code === "rare_resource_box") {
    addBerries(5000);
    addGems(20);
    addMaterial(ITEMS.ironPlating, 2);
    addMaterial(ITEMS.enhancementStone, 10);
  } else if (box.code === "mother_flame_treasure_box") {
    addBerries(15000);
    addGems(50);
    addMaterial(ITEMS.colaEnginePart, 2);
    addMaterial(ITEMS.enhancementStone, 30);
  } else {
    return null;
  }

  return {
    materials: nextMaterials,
    berries: nextBerries,
    gems: nextGems,
    tickets: nextTickets,
  };
}

function formatRewardLines(rewardMap) {
  const lines = [];

  for (const [name, amount] of rewardMap.entries()) {
    if (name === "Berries") {
      lines.push(`💰 Berries +${Number(amount || 0).toLocaleString("en-US")}`);
    } else if (name === "Gems") {
      lines.push(`💎 Gems +${Number(amount || 0).toLocaleString("en-US")}`);
    } else {
      lines.push(`📦 ${name} x${Number(amount || 0).toLocaleString("en-US")}`);
    }
  }

  return lines;
}

module.exports = {
  name: "open",
  aliases: ["obox", "openbox"],

  async execute(message, args) {
    const parsed = parseOpenArgs(args);

    if (!parsed.query) {
      return message.reply(
        [
          "Usage:",
          "`op open <box>`",
          "`op open <box> <amount>`",
          "`op open <box> all`",
          "",
          "Example:",
          "`op open rare`",
          "`op open rare 2`",
          "`op open rare all`",
        ].join("\n")
      );
    }

    const player = getPlayer(message.author.id, message.author.username);
    const box = getBoxByQuery(parsed.query);

    if (!box) {
      return message.reply("That box was not found.");
    }

    const ownedAmount = getOwnedBoxAmount(player.boxes || [], box.code);

    if (ownedAmount <= 0) {
      return message.reply(`You do not own **${box.name}**.`);
    }

    const openAmount = parsed.all ? ownedAmount : Number(parsed.requestedAmount || 1);

    if (!Number.isInteger(openAmount) || openAmount <= 0) {
      return message.reply("Open amount must be a positive number.");
    }

    if (openAmount > ownedAmount) {
      return message.reply(
        `You only own **${ownedAmount}x ${box.name}**.\nUse \`op open ${parsed.query} all\` to open all owned boxes.`
      );
    }

    const updatedBoxes = removeBoxes(player.boxes || [], box.code, openAmount);

    if (!updatedBoxes) {
      return message.reply(`You do not own enough **${box.name}**.`);
    }

    const rewardMap = new Map();

    const rewardState = grantBoxRewards(
      box,
      openAmount,
      {
        materials: [...(player.materials || [])],
        berries: Number(player.berries || 0),
        gems: Number(player.gems || 0),
        tickets: [...(player.tickets || [])],
      },
      rewardMap
    );

    if (!rewardState) {
      return message.reply("This box is not configured yet.");
    }

    const updatedQuests = incrementQuestPayload(player, "boxesOpened", openAmount);
    const rewardLines = formatRewardLines(rewardMap);

    updatePlayer(message.author.id, {
      boxes: updatedBoxes,
      materials: rewardState.materials,
      tickets: rewardState.tickets,
      berries: rewardState.berries,
      gems: rewardState.gems,
      quests: updatedQuests,
    });

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`📦 Opened ${box.name} x${openAmount}`)
          .setDescription(
            rewardLines.length
              ? rewardLines.join("\n")
              : "No rewards were generated."
          )
          .setFooter({
            text: "One Piece Bot • Open Box",
          }),
      ],
    });
  },
};