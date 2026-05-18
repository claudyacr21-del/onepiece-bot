const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");

const SHOP_ITEMS = [
  {
    key: "basic",
    name: "Basic Resource Box x3",
    cost: 25,
    description: "Good for early materials and basic resources.",
  },
  {
    key: "rare",
    name: "Rare Resource Box x1",
    cost: 40,
    description: "Better resource box for mid progression.",
  },
  {
    key: "elite",
    name: "Elite Resource Box x1",
    cost: 75,
    description: "High-grade resource box.",
  },
  {
    key: "legend",
    name: "Legend Resource Box x1",
    cost: 100,
    description: "Premium resource box for late progression.",
  },
  {
    key: "reset",
    name: "Pull Reset Ticket x1",
    cost: 160,
    description: "Reset your pull slots manually.",
  },
];

function getFruitEssenceAmount(player) {
  return (Array.isArray(player.materials) ? player.materials : []).reduce(
    (sum, item) =>
      String(item.code || "").toLowerCase() === "fruit_essence"
        ? sum + Number(item.amount || 0)
        : sum,
    0
  );
}

function buildFruitShopEmbed(player) {
  const essence = getFruitEssenceAmount(player);

  const shopLines = SHOP_ITEMS.map((item, index) =>
    [
      `**${index + 1}. ${item.name}**`,
      `↪ Cost: **${item.cost} Fruit Essence**`,
      `↪ ${item.description}`,
      `↪ Buy: \`op fbuy ${item.key}\``,
    ].join("\n")
  ).join("\n\n");

  const lines = [
    `**Your Fruit Essence:** ${Number(essence || 0).toLocaleString("en-US")}`,
    "",
    "**Available Items**",
    shopLines,
    "",
    "**Usage**",
    "`op fbuy basic`",
    "`op fbuy rare 2`",
    "`op fbuy elite`",
    "`op fbuy reset`",
    "`op fbuy legend`",
  ];

  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("🟢 Fruit Essence Shop")
    .setDescription(lines.join("\n"))
    .setFooter({ text: "One Piece Bot • Fruit Essence Shop" });
}

module.exports = {
  name: "fshop",
  aliases: ["fruitshop", "essenceshop"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    return message.reply({
      embeds: [buildFruitShopEmbed(player)],
      allowedMentions: { repliedUser: false },
    });
  },
};