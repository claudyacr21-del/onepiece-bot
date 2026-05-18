const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");

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
      card.arc,
      card.instanceId,
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

    const query = args.join(" ");
    const previewPlayer = getPlayer(message.author.id, message.author.username);
    const previewCards = Array.isArray(previewPlayer.cards) ? previewPlayer.cards : [];
    const previewMatches = findMatchingCards(previewCards, query);

    if (!previewMatches.length) {
      return message.reply(`No battle card found matching \`${query}\`.`);
    }

    let selectedCard = null;
    let position = 0;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const cards = Array.isArray(fresh.cards) ? fresh.cards : [];
          const team = fresh.team || { slots: [null, null, null] };
          const slots = Array.isArray(team.slots)
            ? team.slots.slice(0, 3)
            : [null, null, null];

          while (slots.length < 3) slots.push(null);

          const matches = findMatchingCards(cards, query);

          if (!matches.length) {
            throw new Error(`No battle card found matching \`${query}\`.`);
          }

          const card = matches[0];

          if (!card.instanceId) {
            throw new Error("That card is missing an instance ID. Please repull or resave your data.");
          }

          if (slots.includes(card.instanceId)) {
            throw new Error(`${card.displayName || card.name} is already in your team.`);
          }

          const emptyIndex = slots.findIndex((slot) => !slot);

          if (emptyIndex === -1) {
            throw new Error("Your team is full. Use `op remove <card name>` or `op swap <from> <to>` first.");
          }

          const newSlots = [...slots];
          newSlots[emptyIndex] = card.instanceId;

          selectedCard = card;
          position = emptyIndex + 1;

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
      return message.reply(error.message || "Failed to add card to team.");
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("✅ Card Added To Team")
      .setDescription(
        [
          `**Card:** ${selectedCard.displayName || selectedCard.name}`,
          `**Position:** ${position}`,
          "",
          "Use `op team` to view your full team.",
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Team Setup" });

    return message.reply({ embeds: [embed] });
  },
};