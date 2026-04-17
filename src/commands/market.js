const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { ITEMS, cloneItem } = require("../data/items");

const MARKET_ITEMS = [
  {
    code: "wooden_material_box",
    name: "Wooden Material Box",
    price: 25,
    item: ITEMS.woodenMaterialBox,
    description: "Cheap random material box."
  },
  {
    code: "iron_material_box",
    name: "Iron Material Box",
    price: 60,
    item: ITEMS.ironMaterialBox,
    description: "Balanced random material box."
  },
  {
    code: "royal_material_box",
    name: "Royal Material Box",
    price: 120,
    item: ITEMS.royalMaterialBox,
    description: "Premium random material box."
  }
];

function normalize(text) {
  return String(text || "").toLowerCase().trim().replace(/\s+/g, " ");
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
  return (
    MARKET_ITEMS.find((entry) => normalize(entry.code) === q) ||
    MARKET_ITEMS.find((entry) => normalize(entry.name) === q) ||
    MARKET_ITEMS.find((entry) => normalize(entry.name).includes(q)) ||
    null
  );
}

function buildMarketEmbed(player) {
  return new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle("🛒 Material Market")
    .setDescription(
      [
        `**Your Gems:** ${Number(player.gems || 0).toLocaleString("en-US")}`,
        "",
        "Available boxes:",
        ...MARKET_ITEMS.map(
          (entry, index) =>
            `${index + 1}. **${entry.name}** • ${entry.price} gems\n↪ ${entry.description}`
        ),
        "",
        "Use:",
        "`op market buy wooden material box`",
        "`op market buy iron material box`",
        "`op market buy royal material box`",
      ].join("\n")
    )
    .setFooter({ text: "One Piece Bot • Market" });
}

module.exports = {
  name: "market",
  aliases: ["shop"],
  async execute(message, args) {
    const player = getPlayer(message.author.id, message.author.username);

    if (!args.length) {
      return message.reply({ embeds: [buildMarketEmbed(player)] });
    }

    const action = String(args[0] || "").toLowerCase();

    if (action !== "buy") {
      return message.reply("Usage: `op market` or `op market buy <box name>`");
    }

    const query = args.slice(1).join(" ").trim();
    if (!query) {
      return message.reply("Usage: `op market buy <box name>`");
    }

    const found = findMarketItem(query);
    if (!found) {
      return message.reply("That market item was not found.");
    }

    const gems = Number(player.gems || 0);
    if (gems < found.price) {
      return message.reply(`You need **${found.price} gems** to buy **${found.name}**.`);
    }

    const updatedBoxes = addOrIncrease(player.boxes || [], cloneItem(found.item, 1));

    updatePlayer(message.author.id, {
      gems: gems - found.price,
      boxes: updatedBoxes,
    });

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("✅ Market Purchase Success")
          .setDescription(
            [
              `Bought: **${found.name}**`,
              `Cost: **${found.price} gems**`,
              `Remaining Gems: **${(gems - found.price).toLocaleString("en-US")}**`,
              "",
              "Use `op open <box name>` to open your new box."
            ].join("\n")
          )
          .setFooter({ text: "One Piece Bot • Market" }),
      ],
    });
  },
};