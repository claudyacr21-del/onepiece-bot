const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { ITEMS, cloneItem } = require("../data/items");

const SHOP_ITEMS = {
  basic: {
    key: "basic",
    label: "Basic Resource Box x3",
    cost: 25,
    boxes: [{ item: ITEMS.basicResourceBox, amount: 3 }],
  },
  rare: {
    key: "rare",
    label: "Rare Resource Box x1",
    cost: 40,
    boxes: [{ item: ITEMS.rareResourceBox, amount: 1 }],
  },
  elite: {
    key: "elite",
    label: "Elite Resource Box x1",
    cost: 75,
    boxes: [{ item: ITEMS.eliteResourceBox, amount: 1 }],
  },
  legend: {
    key: "legend",
    label: "Legend Resource Box x1",
    cost: 100,
    boxes: [{ item: ITEMS.legendResourceBox, amount: 1 }],
  },
  reset: {
    key: "reset",
    label: "Pull Reset Ticket x1",
    cost: 150,
    tickets: [{ item: ITEMS.pullResetTicket, amount: 1 }],
  },
};

const ALIASES = {
  basic: "basic",
  basics: "basic",
  rare: "rare",
  elite: "elite",
  reset: "reset",
  ticket: "reset",
  pullreset: "reset",
  pull_reset: "reset",
  legend: "legend",
  legendary: "legend",
};

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-\s]+/g, "");
}

function resolveShopItem(query) {
  const key = ALIASES[normalize(query)];
  return key ? SHOP_ITEMS[key] : null;
}

function getFruitEssenceIndex(materials) {
  return (Array.isArray(materials) ? materials : []).findIndex(
    (item) => String(item.code || "").toLowerCase() === "fruit_essence"
  );
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

function parseAmount(value) {
  const amount = Math.floor(Number(value || 1));
  return Number.isFinite(amount) && amount > 0 ? amount : 1;
}

module.exports = {
  name: "fbuy",

  async execute(message, args = []) {
    const itemQuery = args[0];

    if (!itemQuery) {
      return message.reply({
        content: "Usage: `op fbuy <item> [amount]`\nExample: `op fbuy rare 2`",
        allowedMentions: { repliedUser: false },
      });
    }

    const shopItem = resolveShopItem(itemQuery);

    if (!shopItem) {
      return message.reply({
        content: "Shop item was not found. Use `op fshop` to see available items.",
        allowedMentions: { repliedUser: false },
      });
    }

    const amount = parseAmount(args[1]);
    const totalCost = shopItem.cost * amount;

    const player = getPlayer(message.author.id, message.author.username);
    const materials = Array.isArray(player.materials) ? [...player.materials] : [];
    const essenceIndex = getFruitEssenceIndex(materials);
    const ownedEssence =
      essenceIndex >= 0 ? Number(materials[essenceIndex].amount || 0) : 0;

    if (ownedEssence < totalCost) {
      return message.reply({
        content: `You need **${totalCost} Fruit Essence**, but you only have **${ownedEssence}**.`,
        allowedMentions: { repliedUser: false },
      });
    }

    materials[essenceIndex] = {
      ...materials[essenceIndex],
      amount: ownedEssence - totalCost,
    };

    if (Number(materials[essenceIndex].amount || 0) <= 0) {
      materials.splice(essenceIndex, 1);
    }

    let boxes = Array.isArray(player.boxes) ? [...player.boxes] : [];
    let tickets = Array.isArray(player.tickets) ? [...player.tickets] : [];

    const rewardLines = [];

    if (Array.isArray(shopItem.boxes)) {
      for (const reward of shopItem.boxes) {
        const rewardAmount = Number(reward.amount || 1) * amount;
        boxes = addStack(boxes, cloneItem(reward.item, rewardAmount));
        rewardLines.push(`${reward.item.name} x${rewardAmount}`);
      }
    }

    if (Array.isArray(shopItem.tickets)) {
      for (const reward of shopItem.tickets) {
        const rewardAmount = Number(reward.amount || 1) * amount;
        tickets = addStack(tickets, cloneItem(reward.item, rewardAmount));
        rewardLines.push(`${reward.item.name} x${rewardAmount}`);
      }
    }

    updatePlayer(message.author.id, {
      materials,
      boxes,
      tickets,
    });

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("🍈 Fruit Essence Purchase Complete")
      .setDescription(
        [
          `**Purchased:** ${shopItem.label}`,
          `**Amount:** x${amount}`,
          `**Cost:** ${totalCost} Fruit Essence`,
          `**Remaining Fruit Essence:** ${ownedEssence - totalCost}`,
          "",
          "**Rewards**",
          ...rewardLines.map((line) => `↪ ${line}`),
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Fruit Essence Shop",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  },
};