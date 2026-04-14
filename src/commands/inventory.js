const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");

function formatCategory(list) {
  if (!list || list.length === 0) {
    return "None";
  }

  return list
    .map((entry) => `• ${entry.name} (${entry.amount})`)
    .join("\n")
    .slice(0, 1024);
}

module.exports = {
  name: "inventory",
  aliases: ["inv"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const embed = new EmbedBuilder()
      .setTitle(`${message.author.username}'s Inventory`)
      .addFields(
        {
          name: "<:box:1493143416425549824> Boxes",
          value: formatCategory(player.boxes),
          inline: false
        },
        {
          name: "<:item:1493155207838826526> Items",
          value: formatCategory(player.items),
          inline: false
        },
        {
          name: "<:material:1493157840783675395> Materials",
          value: formatCategory(player.materials),
          inline: false
        },
        {
          name: "<:weapon:1493157793782304809> Weapons",
          value: formatCategory(player.weapons),
          inline: false
        },
        {
          name: "<:fruit:1493157817367007363> Devil Fruits",
          value: formatCategory(player.devilFruits),
          inline: false
        },
        {
          name: "<:ticket:1493157873427939430> Tickets",
          value: formatCategory(player.tickets),
          inline: false
        }
      )
      .setThumbnail(message.author.displayAvatarURL())
      .setFooter({ text: "One Piece Bot • Resource Inventory" });

    return message.reply({ embeds: [embed] });
  }
};