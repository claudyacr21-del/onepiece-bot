const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { sacrificeFragment, getFragmentStorageInfo } = require("../utils/autoSac");

function parseMultiSacInput(text) {
  return String(text || "")
    .replace(/[()]/g, "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const split = part.split("_");
      const amount = split.pop();
      const name = split.join(" ").trim();
      return { name, amount };
    })
    .filter((entry) => entry.name && entry.amount);
}

module.exports = {
  name: "msac",
  aliases: ["multisac", "multisacrifice"],
  async execute(message, args) {
    const entries = parseMultiSacInput(args.join(" "));

    if (!entries.length) {
      return message.reply("Usage: `op msac (luffy_5, zoro_2, nami_6)`");
    }

    let player = getPlayer(message.author.id, message.author.username);
    let fragments = Array.isArray(player.fragments) ? [...player.fragments] : [];
    let totalBerries = 0;
    const successLines = [];
    const failLines = [];

    for (const entry of entries) {
      const tempPlayer = { ...player, fragments };
      const result = sacrificeFragment(tempPlayer, entry.name, entry.amount);

      if (!result.ok) {
        failLines.push(`❌ **${entry.name}** x${entry.amount}: ${result.message}`);
        continue;
      }

      fragments = result.fragments;
      totalBerries += result.berries;
      successLines.push(
        `✅ **${result.name}** x${result.amount} (${result.rarity}) → +${result.berries.toLocaleString("en-US")} berries`
      );
    }

    if (!successLines.length) {
      return message.reply(failLines.join("\n").slice(0, 1900));
    }

    const newBerries = Number(player.berries || 0) + totalBerries;

    updatePlayer(message.author.id, {
      fragments,
      berries: newBerries,
    });

    const storage = getFragmentStorageInfo({ ...player, fragments }, fragments);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("Multi Sacrifice Result")
      .setDescription(
        [
          successLines.join("\n"),
          failLines.length ? "\n**Failed**\n" + failLines.join("\n") : "",
          "",
          `**Total Berries Gained:** ${totalBerries.toLocaleString("en-US")}`,
          `**Current Berries:** ${newBerries.toLocaleString("en-US")}`,
          `**Fragment Storage:** ${storage.total}/${storage.max}`,
        ]
          .filter(Boolean)
          .join("\n")
          .slice(0, 4000)
      )
      .setFooter({ text: "One Piece Bot • Multi Sacrifice" });

    return message.reply({ embeds: [embed] });
  },
};