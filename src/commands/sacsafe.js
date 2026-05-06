const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getAutoSacSettings, normalize } = require("../utils/autoSac");

function findOwnedFragment(player, query) {
  const q = normalize(query);
  const fragments = Array.isArray(player.fragments) ? player.fragments : [];

  return (
    fragments.find((item) => normalize(item.code) === q) ||
    fragments.find((item) => normalize(item.name) === q) ||
    fragments.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

module.exports = {
  name: "sacsafe",
  aliases: ["safesac", "safelist"],

  async execute(message, args) {
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply("Usage: `op sacsafe <card name>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const fragment = findOwnedFragment(player, query);

    if (!fragment) {
      return message.reply(
        "Fragment card tidak ditemukan.\nCard harus ada dulu di `op finv`."
      );
    }

    const settings = getAutoSacSettings(player);
    settings.safeCards = Array.isArray(settings.safeCards) ? settings.safeCards : [];
    settings.cards = Array.isArray(settings.cards) ? settings.cards : [];

    const targetCode = normalize(fragment.code);
    const targetName = normalize(fragment.name);

    const existingIndex = settings.safeCards.findIndex((entry) => {
      const code = normalize(entry.code);
      const name = normalize(entry.name);
      return (targetCode && code && targetCode === code) || (targetName && name && targetName === name);
    });

    let action = "added to";
    let color = 0x2ecc71;

    if (existingIndex !== -1) {
      settings.safeCards.splice(existingIndex, 1);
      action = "removed from";
      color = 0xe74c3c;
    } else {
      settings.safeCards.push({
        code: fragment.code || null,
        name: fragment.name || query,
        rarity: fragment.rarity || "C",
      });

      settings.cards = settings.cards.filter((entry) => {
        const code = normalize(entry.code);
        const name = normalize(entry.name);
        return !((targetCode && code && targetCode === code) || (targetName && name && targetName === name));
      });
    }

    updatePlayer(message.author.id, {
      autoSac: settings,
    });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle("Safe-Sacrifice Updated")
      .setDescription(
        [
          `**${fragment.name}** has been ${action} your safelist.`,
          "",
          "**Safelisted Cards**",
          settings.safeCards.length
            ? settings.safeCards.map((card) => card.name || card.code || "Unknown Card").join(", ")
            : "No safelisted cards yet.",
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Safe Sacrifice" });

    return message.reply({ embeds: [embed] });
  },
};