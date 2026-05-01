const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { sacrificeFragment, getFragmentStorageInfo } = require("../utils/autoSac");

module.exports = {
  name: "sac",
  aliases: ["sacrifice"],
  async execute(message, args) {
    if (args.length < 2) {
      return message.reply("Usage: `op sac <card name> <amount/all>`");
    }

    const amountText = args[args.length - 1];
    const query = args.slice(0, -1).join(" ");

    const player = getPlayer(message.author.id, message.author.username);
    const result = sacrificeFragment(player, query, amountText);

    if (!result.ok) {
      return message.reply(result.message);
    }

    const newBerries = Number(player.berries || 0) + result.berries;

    updatePlayer(message.author.id, {
      fragments: result.fragments,
      berries: newBerries,
    });

    const storage = getFragmentStorageInfo({ ...player, fragments: result.fragments }, result.fragments);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("Fragment Sacrificed")
      .setDescription(
        [
          `Sacrificed **${result.amount}x ${result.name}** fragment.`,
          `**Rarity:** ${result.rarity}`,
          `**Berries Gained:** ${result.berries.toLocaleString("en-US")}`,
          `**Current Berries:** ${newBerries.toLocaleString("en-US")}`,
          `**Fragment Storage:** ${storage.total}/${storage.max}`,
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Sacrifice" });

    return message.reply({ embeds: [embed] });
  },
};