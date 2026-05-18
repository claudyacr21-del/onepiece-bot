const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("../playerStore");
const { sacrificeFragment, getFragmentStorageInfo } = require("../utils/autoSac");

module.exports = {
  name: "sac",
  aliases: ["sacrifice"],

  async execute(message, args) {
    if (args.length < 2) {
      return message.reply({
        content: "Usage: `op sac <card name> <amount/all>`",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const amountText = args[args.length - 1];
    const query = args.slice(0, -1).join(" ");

    let result = null;
    let newBerries = 0;
    let storage = null;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          result = sacrificeFragment(fresh, query, amountText);

          if (!result.ok) {
            throw new Error(result.message);
          }

          newBerries = Number(fresh.berries || 0) + result.berries;

          storage = getFragmentStorageInfo(
            {
              ...fresh,
              fragments: result.fragments,
            },
            result.fragments
          );

          return {
            ...fresh,
            fragments: result.fragments,
            berries: newBerries,
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to sacrifice fragment.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

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

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};