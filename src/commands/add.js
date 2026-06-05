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

function isLzsQuery(query) {
 const q = normalize(query).replace(/\s+/g, "_");
 return q === "lzs" || q === "monster_trio";
}

function isLzsCard(card) {
 const code = String(card?.code || "").toLowerCase().trim();
 const name = normalize(card?.displayName || card?.name || card?.title);
 return code === "lzs" || name === "monster trio";
}

function scoreCardQuery(card, query) {
 const q = normalize(query);
 if (!q) return 0;

 if (isLzsQuery(query) && isLzsCard(card)) {
  return 999999;
 }

 const fields = [
  card.displayName,
  card.name,
  card.title,
  card.code,
  String(card.code || "").replace(/_/g, " "),
  card.variant,
  card.arc,
  card.instanceId,
 ]
  .filter(Boolean)
  .map((value) => normalize(value));

 let best = 0;

 for (const field of fields) {
  if (field === q) best = Math.max(best, 3000 + field.length);
  else if (field.startsWith(q)) best = Math.max(best, 1600 + q.length);
  else if (field.includes(q)) best = Math.max(best, 900 + q.length);
  else {
   const words = q.split(" ").filter(Boolean);
   if (words.length && words.every((word) => field.includes(word))) {
    best = Math.max(best, 500 + words.join("").length);
   }
  }
 }

 return best;
}

function findMatchingCard(cards, query) {
 return (Array.isArray(cards) ? cards : [])
  .filter((card) => card.cardRole !== "boost")
  .map((card) => ({
   card,
   score: scoreCardQuery(card, query),
  }))
  .filter((entry) => entry.score > 0)
  .sort((a, b) => b.score - a.score)
  .map((entry) => entry.card);
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