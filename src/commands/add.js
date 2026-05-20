const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s.]/gu, " ")
    .replace(/\s+/g, " ");
}

function getDisplayName(card) {
  return String(card?.displayName || card?.name || "").trim();
}

function scoreDisplayName(query, displayName) {
  const q = normalize(query);
  const name = normalize(displayName);

  if (!q || !name) return 0;

  const words = name.split(" ").filter(Boolean);
  const qWords = q.split(" ").filter(Boolean);

  if (name === q) return 100000;
  if (name.endsWith(` ${q}`)) return 90000 - Math.max(0, name.length - q.length);
  if (name.startsWith(`${q} `)) return 80000 - Math.max(0, name.length - q.length);

  if (words.includes(q)) {
    const wordIndex = words.indexOf(q);
    const isLastWord = wordIndex === words.length - 1;
    return (isLastWord ? 75000 : 65000) - Math.max(0, name.length - q.length);
  }

  if (qWords.length > 1 && qWords.every((word) => words.includes(word))) {
    return 60000 + qWords.length * 100 - Math.max(0, name.length - q.length);
  }

  if (name.includes(q)) return 30000 - Math.max(0, name.length - q.length);

  return 0;
}

function getOwnedBattleCards(player) {
  return (Array.isArray(player.cards) ? player.cards : [])
    .map((rawCard) => hydrateCard(rawCard))
    .filter((card) => card && String(card.cardRole || "").toLowerCase() !== "boost");
}

function findMatchingCard(player, query) {
  const cards = getOwnedBattleCards(player);

  const scored = cards
    .map((card, index) => {
      const displayName = getDisplayName(card);

      return {
        card,
        index,
        displayName,
        score: scoreDisplayName(query, displayName),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const aName = normalize(a.displayName);
      const bName = normalize(b.displayName);

      if (aName.length !== bName.length) return aName.length - bName.length;

      return a.index - b.index;
    });

  return scored.length ? scored[0].card : null;
}

module.exports = {
  name: "add",

  async execute(message, args) {
    if (!args.length) {
      return message.reply("Usage: `op add <card display name>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const team = player.team || {
      slots: [null, null, null],
    };

    const slots = Array.isArray(team.slots) ? team.slots.slice(0, 3) : [null, null, null];

    while (slots.length < 3) {
      slots.push(null);
    }

    const query = args.join(" ");
    const card = findMatchingCard(player, query);

    if (!card) {
      return message.reply(`No battle card found matching display name \`${query}\`.`);
    }

    if (!card.instanceId) {
      return message.reply("That card is missing an instance ID.\nPlease repull or resave your data.");
    }

    if (slots.includes(card.instanceId)) {
      return message.reply(`${getDisplayName(card)} is already in your team.`);
    }

    const emptyIndex = slots.findIndex((slot) => !slot);

    if (emptyIndex === -1) {
      return message.reply("Your team is full.\nUse `op remove <position>` or `op swap <from> <to>` first.");
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
          `**Card:** ${getDisplayName(card)}`,
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