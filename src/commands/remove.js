const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

module.exports = {
  name: "remove",
  aliases: ["unequip"],

  async execute(message, args) {
    if (!args.length) {
      return message.reply("Usage: `op remove <card name>` or `op remove all`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const cards = Array.isArray(player.cards) ? player.cards : [];
    const team = player.team || { slots: [null, null, null] };
    const slots = Array.isArray(team.slots) ? team.slots.slice(0, 3) : [null, null, null];

    while (slots.length < 3) {
      slots.push(null);
    }

    const query = normalize(args.join(" "));

    if (query === "all") {
      const removedCards = slots
        .filter(Boolean)
        .map((instanceId, index) => {
          const card = cards.find((entry) => entry.instanceId === instanceId);

          return {
            position: index + 1,
            name: card?.displayName || card?.name || "Unknown Card",
          };
        });

      if (!removedCards.length) {
        return message.reply("Your team is already empty.");
      }

      updatePlayer(message.author.id, {
        team: {
          slots: [null, null, null],
        },
      });

      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle("❌ All Cards Removed From Team")
        .setDescription(
          [
            "The following cards were removed from your team:",
            "",
            ...removedCards.map(
              (entry) => `**${entry.position}.** ${entry.name}`
            ),
          ].join("\n")
        )
        .setFooter({ text: "One Piece Bot • Team Setup" });

      return message.reply({ embeds: [embed] });
    }

    const slotIndex = slots.findIndex((instanceId) => {
      if (!instanceId) return false;

      const card = cards.find((entry) => entry.instanceId === instanceId);
      if (!card) return false;

      const fields = [
        card.displayName,
        card.name,
        card.title,
        card.code,
        card.variant,
        card.arc,
      ]
        .filter(Boolean)
        .map((value) => normalize(value));

      return fields.some((value) => value.includes(query));
    });

    if (slotIndex === -1) {
      return message.reply(`No team card found matching \`${args.join(" ")}\`.`);
    }

    const card = cards.find((entry) => entry.instanceId === slots[slotIndex]);
    const newSlots = [...slots];

    newSlots[slotIndex] = null;

    updatePlayer(message.author.id, {
      team: {
        slots: newSlots,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("❌ Card Removed From Team")
      .setDescription(
        [
          `**Card:** ${card?.displayName || card?.name || "Unknown Card"}`,
          `**Position:** ${slotIndex + 1}`,
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Team Setup" });

    return message.reply({ embeds: [embed] });
  },
};