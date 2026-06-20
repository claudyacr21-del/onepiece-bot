const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const { isMergeCard, buildMergedCard } = require("../utils/mergeCards");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s.]/gu, " ")
    .replace(/\s+/g, " ");
}

function normalizeCode(text) {
  return normalize(text).replace(/\s+/g, "_");
}

function getDisplayName(card) {
  return String(card?.displayName || card?.name || card?.title || "").trim();
}

function scoreCardQuery(card, query) {
  const q = normalize(query);
  const qCode = normalizeCode(query);

  if (!q) return 0;

  const cardCode = normalizeCode(card?.code);
  const cardName = normalize(card?.displayName || card?.name || card?.title);

  if (cardCode && cardCode === qCode) return 999999;
  if (cardName && cardName === q) return 999998;

  const fields = [
    card.displayName,
    card.name,
    card.title,
    card.code,
    String(card.code || "").replace(/_/g, " "),
    card.instanceId,
    card.ownedId,
    card.uid,
    card.id,
  ]
    .filter(Boolean)
    .map((value) => normalize(value));

  let best = 0;

  for (const field of fields) {
    if (field === q) {
      best = Math.max(best, 3000 + field.length);
    } else if (field.startsWith(q)) {
      best = Math.max(best, 1600 + q.length);
    } else if (field.includes(q)) {
      best = Math.max(best, 900 + q.length);
    } else {
      const words = q.split(" ").filter(Boolean);

      if (words.length && words.every((word) => field.includes(word))) {
        best = Math.max(best, 500 + words.join("").length);
      }
    }
  }

  return best;
}

function getCardInstanceId(card) {
  return (
    card?.instanceId ||
    card?.ownedId ||
    card?.uid ||
    card?.id ||
    null
  );
}

function hydrateOwnedBattleCard(player, rawCard, sourceIndex) {
  const rawInstanceId = getCardInstanceId(rawCard);

  const hydrated = isMergeCard(rawCard)
    ? buildMergedCard(player, rawCard)
    : hydrateCard(rawCard);

  if (!hydrated) return null;

  const card = {
    ...hydrated,

    // Important:
    // hydrateCard/template merge can drop instanceId.
    // Team slots must use the real owned card id from raw player data.
    instanceId: rawInstanceId,
    ownedId: rawCard?.ownedId,
    uid: rawCard?.uid,
    id: rawCard?.id,
    sourceIndex,
  };

  if (!card.instanceId) {
    card.instanceId = `source_index:${sourceIndex}`;
  }

  return card;
}

function getOwnedBattleCards(player) {
  const cards = Array.isArray(player?.cards) ? player.cards : [];

  return cards
    .map((rawCard, sourceIndex) => hydrateOwnedBattleCard(player, rawCard, sourceIndex))
    .filter((card) => {
      if (!card) return false;
      if (String(card.cardRole || "").toLowerCase() === "boost") return false;
      return true;
    });
}

function findMatchingCard(player, query) {
  const cards = getOwnedBattleCards(player);

  const scored = cards
    .map((card) => ({
      card,
      score: scoreCardQuery(card, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(getDisplayName(a.card)).localeCompare(
        String(getDisplayName(b.card))
      );
    });

  return scored.length ? scored[0].card : null;
}

function getExistingSlotId(slot) {
  if (!slot) return "";

  if (typeof slot === "string") return slot;

  return String(
    slot.instanceId ||
      slot.ownedId ||
      slot.uid ||
      slot.id ||
      ""
  );
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

    const instanceId = getCardInstanceId(card);

    if (!instanceId) {
      return message.reply(
        [
          `**${getDisplayName(card) || query}** could not be added.`,
          "",
          "This owned card does not have a valid team slot ID.",
          "Try repulling/resaving this card data first.",
        ].join("\n")
      );
    }

    if (slots.map(getExistingSlotId).includes(instanceId)) {
      return message.reply(`${getDisplayName(card)} is already in your team.`);
    }

    const emptyIndex = slots.findIndex((slot) => !slot);

    if (emptyIndex === -1) {
      return message.reply(
        "Your team is full.\nUse `op remove <position>` or `op swap <from> <to>` first."
      );
    }

    const newSlots = [...slots];
    newSlots[emptyIndex] = instanceId;

    updatePlayer(message.author.id, {
      team: {
        ...team,
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
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};