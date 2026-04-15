const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");

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

    const player = getPlayer(message.author.id, message.author.username);
    const team = player.team || { slots: [null, null, null] };
    const newSlots = [...team.slots];

    const fromIndex = from - 1;
    const toIndex = to - 1;

    const temp = newSlots[fromIndex];
    newSlots[fromIndex] = newSlots[toIndex];
    newSlots[toIndex] = temp;

    updatePlayer(message.author.id, {
      team: {
        slots: newSlots
      }
    });

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("🔄 Team Positions Swapped")
      .setDescription(`Swapped position **${from}** with position **${to}**.`)
      .setFooter({ text: "One Piece Bot • Team Setup" });

    return message.reply({ embeds: [embed] });
  }
};