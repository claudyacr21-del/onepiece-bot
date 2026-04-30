const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { ITEMS, cloneItem } = require("../data/items");

const MARKET_ITEMS = [
  {
    code: "wooden",
    aliases: ["wooden_material_box", "wooden material box", "wooden box"],
    name: "Wooden Material Box",
    price: 100,
    item: ITEMS.woodenMaterialBox,
  },
  {
    code: "iron",
    aliases: ["iron_material_box", "iron material box", "iron box"],
    name: "Iron Material Box",
    price: 200,
    item: ITEMS.ironMaterialBox,
  },
  {
    code: "royal",
    aliases: ["royal_material_box", "royal material box", "royal box"],
    name: "Royal Material Box",
    price: 300,
    item: ITEMS.royalMaterialBox,
  },
];

function normalize(text) {
  return String(text || "").toLowerCase().trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
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

  arr.push({ ...item, amount: Number(item.amount || 1) });
  return arr;
}

function findMarketItem(query) {
  const q = normalize(query);

  return (
    MARKET_ITEMS.find((entry) => normalize(entry.code) === q) ||
    MARKET_ITEMS.find((entry) => entry.aliases.some((alias) => normalize(alias) === q)) ||
    MARKET_ITEMS.find((entry) => normalize(entry.name).includes(q)) ||
    null
  );
}

function parseBuyArgs(args) {
  const last = args[args.length - 1];
  const amount = Math.max(1, Math.floor(Number(last)));

  if (Number.isFinite(amount) && String(last).trim() !== "" && amount > 0) {
    return {
      itemQuery: args.slice(0, -1).join(" ").trim(),
      amount,
    };
  }

  return {
    itemQuery: args.join(" ").trim(),
    amount: 1,
  };
}

module.exports = {
  name: "buy",
  aliases: [],
  async execute(message, args) {
    const player = getPlayer(message.author.id, message.author.username);

    if (!args.length) {
      return message.reply("Usage: `op buy <itemname> <amount>`\nExample: `op buy wooden` or `op buy iron 3`");
    }

    const { itemQuery, amount } = parseBuyArgs(args);

    if (!itemQuery) {
      return message.reply("Usage: `op buy <itemname> <amount>`\nExample: `op buy wooden`");
    }

    const found = findMarketItem(itemQuery);

    if (!found) {
      return message.reply("That market item was not found. Use `op market` to see available items.");
    }

    const totalPrice = found.price * amount;
    const gems = Number(player.gems || 0);

    if (gems < totalPrice) {
      return message.reply(
        `You need **${totalPrice.toLocaleString("en-US")} gems** to buy **${found.name} x${amount}**.`
      );
    }

    const updatedBoxes = addOrIncrease(player.boxes || [], cloneItem(found.item, amount));

    updatePlayer(message.author.id, {
      gems: gems - totalPrice,
      boxes: updatedBoxes,
    });

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("✅ Purchase Success")
          .setDescription(
            [
              `Bought: **${found.name} x${amount}**`,
              `Cost: **${totalPrice.toLocaleString("en-US")} gems**`,
              `Remaining Gems: **${(gems - totalPrice).toLocaleString("en-US")}**`,
              "",
              "Use `op open <box name>` to open your new box.",
            ].join("\n")
          )
          .setFooter({ text: "One Piece Bot • Buy" }),
      ],
    });
  },
};