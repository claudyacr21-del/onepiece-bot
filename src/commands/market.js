const { EmbedBuilder } = require("discord.js");

const MARKET_ITEMS = [
  {
    code: "wooden",
    aliases: ["wooden_material_box", "wooden material box", "wooden box"],
    name: "Wooden Material Box",
    price: 100,
    description: "Cheap random material box.",
  },
  {
    code: "iron",
    aliases: ["iron_material_box", "iron material box", "iron box"],
    name: "Iron Material Box",
    price: 200,
    description: "Balanced random material box.",
  },
  {
    code: "royal",
    aliases: ["royal_material_box", "royal material box", "royal box"],
    name: "Royal Material Box",
    price: 300,
    description: "Premium random material box.",
  },
];

function buildMarketEmbed() {
  return new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle("🛒 Material Market")
    .setDescription(
      [
        "Available items:",
        "",
        ...MARKET_ITEMS.map(
          (entry, index) =>
            `**${index + 1}. ${entry.name}** • ${entry.price} gems\n↪ ${entry.description}\n↪ Buy: \`op buy ${entry.code}\``
        ),
        "",
        "**Usage:**",
        "`op buy wooden`",
        "`op buy iron 3`",
        "`op buy royal 10`",
      ].join("\n")
    )
    .setFooter({ text: "One Piece Bot • Market" });
}

module.exports = {
  name: "market",
  aliases: ["shop"],
  async execute(message) {
    return message.reply({ embeds: [buildMarketEmbed()] });
  },
};