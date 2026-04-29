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

function getOwnedBattleCards(player) {
  return (Array.isArray(player.cards) ? player.cards : [])
    .map((rawCard) => hydrateCard(rawCard))
    .filter((card) => card && card.cardRole !== "boost");
}

function findMatchingCard(player, query) {
  const cards = getOwnedBattleCards(player);

  const scored = cards
    .map((card) => ({
      card,
      score: scoreQuery(query, [
        card.name,
        card.displayName,
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].card : null;
}

module.exports = {
  name: "add",

  async execute(message, args) {
    if (!args.length) {
      return message.reply("Usage: `op add <card name>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const team = player.team || {
      slots: [null, null, null],
    };

    const slots = Array.isArray(team.slots)
      ? team.slots.slice(0, 3)
      : [null, null, null];

    while (slots.length < 3) {
      slots.push(null);
    }

    const query = args.join(" ");
    const card = findMatchingCard(player, query);

    if (!card) {
      return message.reply(`No battle card found matching \`${query}\`.`);
    }

    if (!card.instanceId) {
      return message.reply("That card is missing an instance ID. Please repull or resave your data.");
    }

    if (slots.includes(card.instanceId)) {
      return message.reply(`${card.displayName || card.name} is already in your team.`);
    }

    const emptyIndex = slots.findIndex((slot) => !slot);

    if (emptyIndex === -1) {
      return message.reply("Your team is full. Use `op remove <card>` or `op swap <from> <to>` first.");
    }

    const newSlots = [...slots];
    newSlots[emptyIndex] = card.instanceId;

    updatePlayer(message.author.id, {
      team: {
        slots: newSlots,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("✅ Card Added To Team")
      .setDescription(
        [
          `**Card:** ${card.displayName || card.name}`,
          `**Position:** ${emptyIndex + 1}`,
          "",
          "Use `op team` to view your full team.",
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