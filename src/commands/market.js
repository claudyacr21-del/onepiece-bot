const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
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
    usageText: "Use `op inv` to check your inventory.",
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
    usageText: "Use `op open wooden` to open your new box.",
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
    usageText: "Use `op open iron` to open your new box.",
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
    usageText: "Use `op open royal` to open your new box.",
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
    usageText: "Use `op rum <amount> <card name>` to use Rum Beer.",
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

  if (!item) return arr;

  const code = item.code || normalize(item.name).replace(/\s+/g, "_");

  const index = arr.findIndex((entry) => {
    return (
      String(entry.code || "").toLowerCase() === String(code || "").toLowerCase() ||
      normalize(entry.name) === normalize(item.name)
    );
  });

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      ...item,
      code,
      amount: Number(arr[index].amount || 0) + Number(item.amount || 1),
    };

    return arr;
  }

  arr.push({
    ...item,
    code,
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
    MARKET_ITEMS.find(
      (entry) =>
        Array.isArray(entry.aliases) &&
        entry.aliases.some((alias) => normalize(alias) === q)
    ) ||
    MARKET_ITEMS.find((entry) => normalize(entry.code).includes(q)) ||
    MARKET_ITEMS.find((entry) => normalize(entry.name).includes(q)) ||
    MARKET_ITEMS.find(
      (entry) =>
        Array.isArray(entry.aliases) &&
        entry.aliases.some((alias) => normalize(alias).includes(q))
    ) ||
    null
  );
}

function buildMarketEmbed(player) {
  const marketLines = MARKET_ITEMS.map((entry, index) =>
    [
      `**${index + 1}. ${entry.name}** • ${Number(entry.price).toLocaleString(
        "en-US"
      )} ${entry.currency || "gems"}`,
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
    .setTitle("Material Market")
    .setDescription(lines.join("\n"))
    .setFooter({
      text: "One Piece Bot • Market",
    });
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

  if (lastArg === "all") {
    return {
      query: parts.join(" ").trim(),
      amount: 1,
    };
  }

  const amount = Math.floor(Number(lastArg));

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

function getPurchaseUsageText(found, inventoryKey) {
  if (found?.usageText) return found.usageText;

  if (inventoryKey === "boxes") {
    return "Use `op open <box>` to open your new box.";
  }

  if (found?.item?.code === ITEMS.rumBeer?.code || found?.code === "rum_beer") {
    return "Use `op rum <amount> <card name>` to use Rum Beer.";
  }

  return "Use `op inv` to check your inventory.";
}

function trackObtained(obtainedMap, item, qty = 1) {
  if (!item) return;

  const key = item.code || item.name || "unknown_item";
  const current = obtainedMap.get(key) || {
    name: item.name || "Unknown Item",
    amount: 0,
  };

  current.amount += Number(qty || 1);
  obtainedMap.set(key, current);
}

function formatObtainedItems(obtainedMap) {
  const items = [...obtainedMap.values()];

  if (!items.length) return null;

  return `Obtained: **${items
    .map((item) => {
      return `${item.name} x${Number(item.amount || 0).toLocaleString("en-US")}`;
    })
    .join(", ")}**`;
}

module.exports = {
  name: "market",
  aliases: ["shop", "buy"],

  async execute(message, args) {
    const player = getPlayer(message.author.id, message.author.username);

    if (!args.length) {
      return message.reply({
        embeds: [buildMarketEmbed(player)],
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const firstArg = String(args[0] || "").toLowerCase();
    const buyArgs = firstArg === "buy" ? args.slice(1) : args;
    const { query, amount } = parseBuyArgs(buyArgs);

    if (!query) {
      return message.reply({
        content: "Usage: `op buy wooden` or `op market buy wooden`",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const found = findMarketItem(query);

    if (!found) {
      return message.reply({
        content: "That market item was not found.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      return message.reply({
        content: "Buy amount must be a positive number.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const totalPrice = Number(found.price || 0) * amount;
    const currency = found.currency || "gems";
    const inventoryKey = found.inventory || "boxes";
    const obtainedMap = new Map();

    let currentCurrency = 0;
    let remainingCurrency = 0;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          currentCurrency = Number(fresh[currency] || 0);

          if (currentCurrency < totalPrice) {
            throw new Error(
              `You need **${totalPrice.toLocaleString(
                "en-US"
              )} ${currency}** to buy **${found.name} x${amount}**.`
            );
          }

          let updatedInventory = Array.isArray(fresh[inventoryKey])
            ? [...fresh[inventoryKey]]
            : [];

          if (typeof found.randomItem === "function") {
            for (let i = 0; i < amount; i++) {
              const randomItem = found.randomItem();

              if (!randomItem) continue;

              const cloned = cloneItem(randomItem, 1);
              updatedInventory = addOrIncrease(updatedInventory, cloned);
              trackObtained(obtainedMap, cloned, 1);
            }
          } else {
            if (!found.item) {
              throw new Error("This market item is not configured correctly.");
            }

            const cloned = cloneItem(found.item, amount);
            updatedInventory = addOrIncrease(updatedInventory, cloned);
            trackObtained(obtainedMap, cloned, amount);
          }

          remainingCurrency = currentCurrency - totalPrice;

          return {
            ...fresh,
            [currency]: remainingCurrency,
            [inventoryKey]: updatedInventory,
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Market purchase failed.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("✅ Market Purchase Success")
          .setDescription(
            [
              `Bought: **${found.name} x${amount}**`,
              formatObtainedItems(obtainedMap),
              `Cost: **${totalPrice.toLocaleString("en-US")} ${currency}**`,
              `Remaining ${
                currency === "berries" ? "Berries" : "Gems"
              }: **${remainingCurrency.toLocaleString("en-US")}**`,
              "",
              getPurchaseUsageText(found, inventoryKey),
            ]
              .filter(Boolean)
              .join("\n")
          )
          .setFooter({
            text: "One Piece Bot • Market",
          }),
      ],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};