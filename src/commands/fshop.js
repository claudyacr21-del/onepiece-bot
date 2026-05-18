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
    key: "reset",
    name: "Pull Reset Ticket x1",
    cost: 100,
    description: "Reset your pull slots manually.",
  },
  {
    key: "legend",
    name: "Legend Resource Box x1",
    cost: 160,
    description: "Premium resource box for late progression.",
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

function buildShopLines() {
  const lines = [];

  SHOP_ITEMS.forEach((item, index) => {
    lines.push(`**${index + 1}. ${item.name}**`);
    lines.push(`- ${item.cost} Fruit Essence`);
    lines.push(`↪ ${item.description}`);
    lines.push(`↪ Buy: \`op fbuy ${item.key}\``);

    if (index < SHOP_ITEMS.length - 1) {
      lines.push("");
    }
  });

  return lines;
}

module.exports = {
  name: "fshop",
  aliases: ["fruitshop", "essenceshop"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const essence = getFruitEssenceAmount(player);

    const description = [
      `**Your Fruit Essence:** ${Number(essence || 0).toLocaleString("en-US")}`,
      "",
      "**Available Items**",
      ...buildShopLines(),
      "",
      "**Usage**",
      "`op fbuy basic`",
      "`op fbuy rare 2`",
      "`op fbuy elite`",
      "`op fbuy reset`",
      "`op fbuy legend`",
    ].join("\n");

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle("🍈 Fruit Essence Shop")
      .setDescription(description)
      .setFooter({
        text: "One Piece Bot • Fruit Essence Shop",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};