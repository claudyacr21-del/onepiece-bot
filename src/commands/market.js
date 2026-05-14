const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { ITEMS, cloneItem } = require("../data/items");

function pickRandomUniversalFragment() {
  const pool = [
    ITEMS.universalCFragment,
    ITEMS.universalBFragment,
    ITEMS.universalAFragment,
    ITEMS.universalSFragment,
  ].filter(Boolean);

  return pool[Math.floor(Math.random() * pool.length)];
}

const MARKET_ITEMS = [
  {
    code: "random_universal_fragment",
    aliases: ["fragment", "frag", "universal fragment", "random fragment"],
    name: "Random Universal Fragment",
    price: 100,
    currency: "gems",
    inventory: "items",
    randomItem: pickRandomUniversalFragment,
    description: "Random Universal C/B/A/S Fragment.",
  },
  {
    code: "wooden_material_box",
    aliases: ["wooden", "wood", "wooden box", "wooden material"],
    name: "Wooden Material Box",
    price: 250,
    currency: "gems",
    inventory: "boxes",
    item: ITEMS.woodenMaterialBox,
    description: "Cheap random material box.",
  },
  {
    code: "iron_material_box",
    aliases: ["iron", "iron box", "iron material"],
    name: "Iron Material Box",
    price: 650,
    currency: "gems",
    inventory: "boxes",
    item: ITEMS.ironMaterialBox,
    description: "Balanced random material box.",
  },
  {
    code: "royal_material_box",
    aliases: ["royal", "royal box", "royal material"],
    name: "Royal Material Box",
    price: 850,
    currency: "gems",
    inventory: "boxes",
    item: ITEMS.royalMaterialBox,
    description: "Premium random material box.",
  },
  {
    code: "rum_beer",
    aliases: ["rum", "rum beer"],
    name: "Rum Beer",
    price: 2500,
    currency: "berries",
    inventory: "items",
    item: ITEMS.rumBeer,
    description: "Adds 100 EXP to a battle card.",
  },
];

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

function findMarketItem(query) {
  const q = normalize(query);

  if (!q) return null;

  return (
    MARKET_ITEMS.find((entry) => normalize(entry.code) === q) ||
    MARKET_ITEMS.find((entry) => normalize(entry.name) === q) ||
    MARKET_ITEMS.find((entry) =>
      Array.isArray(entry.aliases) && entry.aliases.some((alias) => normalize(alias) === q)
    ) ||
    MARKET_ITEMS.find((entry) => normalize(entry.code).includes(q)) ||
    MARKET_ITEMS.find((entry) => normalize(entry.name).includes(q)) ||
    MARKET_ITEMS.find((entry) =>
      Array.isArray(entry.aliases) && entry.aliases.some((alias) => normalize(alias).includes(q))
    ) ||
    null
  );
}

function buildMarketEmbed(player) {
  const marketLines = MARKET_ITEMS.map((entry, index) =>
    [
      `**${index + 1}. ${entry.name}** • ${Number(entry.price).toLocaleString("en-US")} ${entry.currency || "gems"}`,
      `↪ ${entry.description}`,
      `↪ Buy: \`op buy ${entry.aliases[0]}\``,
    ].join("\n")
  ).join("\n\n");

  const lines = [
    `**Your Berries:** ${Number(player.berries || 0).toLocaleString("en-US")}`,
    `**Your Gems:** ${Number(player.gems || 0).toLocaleString("en-US")}`,
    "",
    "**Available Items**",
    marketLines,
    "",
    "**Usage**",
    "`op buy wooden`",
    "`op buy iron 3`",
    "`op buy royal 10`",
    "`op buy rum 5`",
    "`op buy fragment 2`",
  ];

  return new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle("📦 Material Market")
    .setDescription(lines.join("\n"))
    .setFooter({ text: "One Piece Bot • Market" });
}

function parseBuyArgs(args) {
  const parts = Array.isArray(args) ? [...args] : [];

  if (!parts.length) {
    return {
      query: "",
      amount: 1,
    };
  }

  const lastArg = String(parts[parts.length - 1] || "").toLowerCase();
  const amount = lastArg === "all" ? 1 : Math.floor(Number(lastArg));

  if (Number.isFinite(amount) && amount > 0) {
    parts.pop();
    return {
      query: parts.join(" ").trim(),
      amount,
    };
  }

  return {
    query: parts.join(" ").trim(),
    amount: 1,
  };
}

module.exports = {
  name: "market",
  aliases: ["shop", "buy"],

  async execute(message, args) {
    const player = getPlayer(message.author.id, message.author.username);

    if (!args.length) {
      return message.reply({ embeds: [buildMarketEmbed(player)] });
    }

    const firstArg = String(args[0] || "").toLowerCase();
    const buyArgs = firstArg === "buy" ? args.slice(1) : args;
    const { query, amount } = parseBuyArgs(buyArgs);

    if (!query) {
      return message.reply("Usage: `op buy wooden` or `op market buy wooden`");
    }

    const found = findMarketItem(query);

    if (!found) {
      return message.reply("That market item was not found.");
    }

    const totalPrice = found.price * amount;
    const currency = found.currency || "gems";
    const currentCurrency = Number(player[currency] || 0);

    if (currentCurrency < totalPrice) {
      return message.reply(
        `You need **${totalPrice.toLocaleString("en-US")} ${currency}** to buy **${found.name} x${amount}**.`
      );
    }

    const inventoryKey = found.inventory || "boxes";

    let updatedInventory = [...(player[inventoryKey] || [])];

    if (typeof found.randomItem === "function") {
      for (let i = 0; i < amount; i++) {
        const randomItem = found.randomItem();
        if (randomItem) {
          updatedInventory = addOrIncrease(updatedInventory, cloneItem(randomItem, 1));
        }
      }
    } else {
      updatedInventory = addOrIncrease(updatedInventory, cloneItem(found.item, amount));
    }

    updatePlayer(message.author.id, {
      [currency]: currentCurrency - totalPrice,
      [inventoryKey]: updatedInventory,
    });

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("✅ Market Purchase Success")
          .setDescription(
            [
              `Bought: **${found.name} x${amount}**`,
              `Cost: **${totalPrice.toLocaleString("en-US")} ${currency}**`,
              `Remaining ${currency === "berries" ? "Berries" : "Gems"}: **${(currentCurrency - totalPrice).toLocaleString("en-US")}**`,
              "",
              inventoryKey === "boxes"
                ? "Use `op open <box>` to open your new box."
                : "Use `op rum <amount/all> <card>` to use Rum Beer.",
            ].join("\n")
          )
          .setFooter({ text: "One Piece Bot • Market" }),
      ],
    });
  },
};