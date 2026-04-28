const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");

function normalize(text) {
  return String(text || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function findMatchingCards(cards, query) {
  const q = normalize(query);

  return cards.filter((card) => {
    if (card.cardRole === "boost") return false;

    const fields = [
      card.displayName,
      card.name,
      card.title,
      card.code,
      card.variant,
      card.arc
    ]
      .filter(Boolean)
      .map((value) => normalize(value));

    return fields.some((value) => value.includes(q));
  });
}

module.exports = {
  name: "add",
  
  async execute(message, args) {
    if (!args.length) {
      return message.reply("Usage: `op add <card name>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const cards = Array.isArray(player.cards) ? player.cards : [];
    const team = player.team || { slots: [null, null, null] };
    const query = args.join(" ");

    const matches = findMatchingCards(cards, query);

    if (!matches.length) {
      return message.reply(`No battle card found matching \`${query}\`.`);
    }

    const card = matches[0];

    if (!card.instanceId) {
      return message.reply("That card is missing an instance ID. Please repull or resave your data.");
    }

    if (team.slots.includes(card.instanceId)) {
      return message.reply(`${card.displayName || card.name} is already in your team.`);
    }

    const emptyIndex = team.slots.findIndex((slot) => !slot);

    if (emptyIndex === -1) {
      return message.reply("Your team is full. Use `op remove <card name>` or `op swap <from> <to>` first.");
    }

    const newSlots = [...team.slots];
    newSlots[emptyIndex] = card.instanceId;

    updatePlayer(message.author.id, {
      team: {
        slots: newSlots
      }
    });

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("✅ Card Added To Team")
      .setDescription(
        [
          `**Card:** ${card.displayName || card.name}`,
          `**Position:** ${emptyIndex + 1}`,
          "",
          "Use `op team` to view your full team."
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Team Setup" });

    return message.reply({ embeds: [embed] });
  }
};