const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("../playerStore");

module.exports = {
  name: "swap",

  async execute(message, args) {
    if (args.length < 2) {
      return message.reply("Usage: `op swap <from> <to>`");
    }

    const from = Number(args[0]);
    const to = Number(args[1]);

    if (![1, 2, 3].includes(from) || ![1, 2, 3].includes(to)) {
      return message.reply("Team positions must be between 1 and 3.");
    }

    if (from === to) {
      return message.reply("Choose two different positions.");
    }

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const team = fresh.team || {
            slots: [null, null, null],
          };

          const newSlots = Array.isArray(team.slots)
            ? team.slots.slice(0, 3)
            : [null, null, null];

          while (newSlots.length < 3) newSlots.push(null);

          const fromIndex = from - 1;
          const toIndex = to - 1;

          const temp = newSlots[fromIndex];
          newSlots[fromIndex] = newSlots[toIndex];
          newSlots[toIndex] = temp;

          return {
            ...fresh,
            team: {
              ...(fresh.team || {}),
              slots: newSlots,
            },
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply(error.message || "Failed to swap team positions.");
    }

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(" Team Positions Swapped")
      .setDescription(`Swapped position **${from}** with position **${to}**.`)
      .setFooter({
        text: "One Piece Bot • Team Setup",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};