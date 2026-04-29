const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function scoreQuery(query, candidates) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;

  for (const raw of candidates) {
    const candidate = normalize(raw);
    if (!candidate) continue;

    if (candidate === q) best = Math.max(best, 1000 + candidate.length);
    else if (candidate.startsWith(q)) best = Math.max(best, 700 + q.length);
    else if (candidate.includes(q)) best = Math.max(best, 400 + q.length);
  }

  return best;
}

function getOwnedCards(player) {
  return (Array.isArray(player.cards) ? player.cards : [])
    .map((rawCard) => hydrateCard(rawCard))
    .filter(Boolean);
}

function findCardByInstanceId(cards, instanceId) {
  return cards.find((card) => card.instanceId === instanceId) || null;
}

module.exports = {
  name: "remove",
  aliases: ["unequip"],

  async execute(message, args) {
    if (!args.length) {
      return message.reply("Usage: `op remove <card name>` or `op remove all`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const cards = getOwnedCards(player);
    const team = player.team || {
      slots: [null, null, null],
    };

    const slots = Array.isArray(team.slots)
      ? team.slots.slice(0, 3)
      : [null, null, null];

    while (slots.length < 3) {
      slots.push(null);
    }

    const query = normalize(args.join(" "));

    if (query === "all") {
      const removedCards = slots
        .map((instanceId, index) => {
          if (!instanceId) return null;

          const card = findCardByInstanceId(cards, instanceId);

          return {
            position: index + 1,
            name: card?.displayName || card?.name || "Unknown Card",
          };
        })
        .filter(Boolean);

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
            ...removedCards.map((entry) => `**${entry.position}.** ${entry.name}`),
          ].join("\n")
        )
        .setFooter({
          text: "One Piece Bot • Team Setup",
        });

      return message.reply({
        embeds: [embed],
      });
    }

    const scoredSlots = slots
      .map((instanceId, index) => {
        if (!instanceId) return null;

        const card = findCardByInstanceId(cards, instanceId);
        if (!card) return null;

        return {
          slotIndex: index,
          card,
          score: scoreQuery(query, [
            card.name,
            card.displayName,
          ]),
        };
      })
      .filter((entry) => entry && entry.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!scoredSlots.length) {
      return message.reply(`No team card found matching \`${args.join(" ")}\`.`);
    }

    const selected = scoredSlots[0];
    const newSlots = [...slots];

    newSlots[selected.slotIndex] = null;

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
          `**Card:** ${selected.card.displayName || selected.card.name || "Unknown Card"}`,
          `**Position:** ${selected.slotIndex + 1}`,
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Team Setup",
      });

    return message.reply({
      embeds: [embed],
    });
  },
};