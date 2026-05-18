const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("../playerStore");
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

      return {
        name,
        amount,
      };
    })
    .filter((entry) => entry.name && entry.amount);
}

module.exports = {
  name: "msac",
  aliases: ["multisac", "multisacrifice"],

  async execute(message, args) {
    const entries = parseMultiSacInput(args.join(" "));

    if (!entries.length) {
      return message.reply({
        content: "Usage: `op msac (luffy_5, zoro_2, nami_6)`",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    let fragments = [];
    let totalBerries = 0;
    let newBerries = 0;
    let storage = null;

    const successLines = [];
    const failLines = [];

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          fragments = Array.isArray(fresh.fragments)
            ? fresh.fragments.map((fragment) => ({ ...fragment }))
            : [];

          totalBerries = 0;
          successLines.length = 0;
          failLines.length = 0;

          for (const entry of entries) {
            const tempPlayer = {
              ...fresh,
              fragments,
            };

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
            throw new Error(failLines.join("\n").slice(0, 1900));
          }

          newBerries = Number(fresh.berries || 0) + totalBerries;
          storage = getFragmentStorageInfo({ ...fresh, fragments }, fragments);

          return {
            ...fresh,
            fragments,
            berries: newBerries,
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to sacrifice fragments.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

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

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};