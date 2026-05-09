const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { ITEMS, cloneItem } = require("../data/items");

const MARKET_ITEMS = [
  {
    code: "wooden_material_box",
    aliases: ["wooden", "wood", "wooden box", "wooden material"],
    name: "Wooden Material Box",
    price: 100,
    item: ITEMS.woodenMaterialBox,
    description: "Cheap random material box.",
  },
  {
    code: "iron_material_box",
    aliases: ["iron", "iron box", "iron material"],
    name: "Iron Material Box",
    price: 200,
    item: ITEMS.ironMaterialBox,
    description: "Balanced random material box.",
  },
  {
    code: "royal_material_box",
    aliases: ["royal", "royal box", "royal material"],
    name: "Royal Material Box",
    price: 300,
    item: ITEMS.royalMaterialBox,
    description: "Premium random material box.",
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
  return new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle("📦 Material Market")
    .setDescription(
      [
        `**Your Gems:** ${Number(player.gems || 0).toLocaleString("en-US")}`,
        "",
        "**Available Boxes**",
        ...MARKET_ITEMS.map(
          (entry, index) =>
            `${index + 1}. **${entry.name}** • ${entry.price} gems\n↪ ${entry.description}\n↪ Buy: \`op buy ${entry.aliases[0]}\``
        ),
        "",
        "**Usage**",
        "`op buy wooden`",
        "`op buy iron 3`",
        "`op buy royal 10`",
        "",
      ].join("\n")
    )
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
          .setTitle("✅ Market Purchase Success")
          .setDescription(
            [
              `Bought: **${found.name} x${amount}**`,
              `Cost: **${totalPrice.toLocaleString("en-US")} gems**`,
              `Remaining Gems: **${(gems - totalPrice).toLocaleString("en-US")}**`,
              "",
              "Use `op open <box>` to open your new box.",
            ].join("\n")
          )
          .setFooter({ text: "One Piece Bot • Market" }),
      ],
    });
  },
};