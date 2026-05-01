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
  name: "sacadd",
  async execute(message, args) {
    if (!args.length) {
      return message.reply("Usage: `op sacadd <card name> <amount/all>`");
    }

    const last = String(args[args.length - 1] || "").toLowerCase();
    const hasAmount = last === "all" || Number.isFinite(Number(last));
    const query = hasAmount ? args.slice(0, -1).join(" ") : args.join(" ");

    if (!query) {
      return message.reply("Usage: `op sacadd <card name> <amount/all>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const fragment = findOwnedFragment(player, query);

    if (!fragment) {
      return message.reply("Fragment card tidak ditemukan. Card harus ada dulu di `op finv`.");
    }

    const settings = getAutoSacSettings(player);
    const targetCode = normalize(fragment.code);
    const targetName = normalize(fragment.name);

    const existingIndex = settings.cards.findIndex((entry) => {
      const code = normalize(entry.code);
      const name = normalize(entry.name);
      return (targetCode && code && targetCode === code) || (targetName && name && targetName === name);
    });

    let action = "added to";
    let color = 0x2ecc71;

    if (existingIndex !== -1) {
      settings.cards.splice(existingIndex, 1);
      action = "removed from";
      color = 0xe74c3c;
    } else {
      settings.cards.push({
        code: fragment.code || null,
        name: fragment.name || query,
        rarity: fragment.rarity || "C",
        mode: hasAmount ? last : "all",
      });
    }

    updatePlayer(message.author.id, {
      autoSac: settings,
    });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle("Auto-Sacrifice Updated")
      .setDescription(
        [
          `**${fragment.name}** has been ${action} your auto-sacrifice list.`,
          "",
          "**Current Cards**",
          settings.cards.length
            ? settings.cards.map((card) => card.name || card.code || "Unknown Card").join(", ")
            : "No cards registered yet.",
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Auto Sacrifice" });

    return message.reply({ embeds: [embed] });
  },
};