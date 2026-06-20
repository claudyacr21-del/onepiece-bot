const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const { isMergeCard, buildMergedCard } = require("../utils/mergeCards");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeCode(text) {
  return normalize(text).replace(/\s+/g, "_");
}

function scoreQuery(query, candidates) {
  const q = normalize(query);
  const qCode = normalizeCode(query);

  if (!q) return 0;

  let best = 0;

  for (const raw of candidates) {
    const candidate = normalize(raw);
    const candidateCode = normalizeCode(raw);

    if (!candidate) continue;

    if (candidateCode && candidateCode === qCode) {
      best = Math.max(best, 999999);
    } else if (candidate === q) {
      best = Math.max(best, 1000 + candidate.length);
    } else if (candidate.startsWith(q)) {
      best = Math.max(best, 700 + q.length);
    } else if (candidate.includes(q)) {
      best = Math.max(best, 400 + q.length);
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

function getOwnedCards(player) {
  return (Array.isArray(player?.cards) ? player.cards : [])
    .map((card, sourceIndex) => hydrateOwnedBattleCard(player, card, sourceIndex))
    .filter((card) => {
      if (!card) return false;
      return String(card.cardRole || "").toLowerCase() !== "boost";
    });
}

function getSlotId(slot) {
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

function findCardByInstanceId(cards, instanceId) {
  const target = getSlotId(instanceId);
  return cards.find((card) => String(card.instanceId) === String(target)) || null;
}

function getDisplayName(card) {
  return card?.displayName || card?.name || card?.title || "Unknown Card";
}

module.exports = {
  name: "remove",
  aliases: ["unequip"],

  async execute(message, args) {
    if (!args.length) {
      return message.reply("Usage: `op remove <card name | position>` or `op remove all`");
    }

    const rawQuery = args.join(" ");
    const query = normalize(rawQuery);
    const positionNumber = Number(rawQuery);

    const previewPlayer = getPlayer(message.author.id, message.author.username);
    const previewCards = getOwnedCards(previewPlayer);
    const previewTeam = previewPlayer.team || { slots: [null, null, null] };
    const previewSlots = Array.isArray(previewTeam.slots)
      ? previewTeam.slots.slice(0, 3)
      : [null, null, null];

    while (previewSlots.length < 3) previewSlots.push(null);

    if (query === "all") {
      const hasAny = previewSlots.some(Boolean);
      if (!hasAny) return message.reply("Your team is already empty.");
    } else if (
      Number.isInteger(positionNumber) &&
      positionNumber >= 1 &&
      positionNumber <= 3
    ) {
      if (!previewSlots[positionNumber - 1]) {
        return message.reply(`There is no card in position ${positionNumber}.`);
      }
    } else {
      const previewMatches = previewSlots
        .map((slot, index) => {
          const instanceId = getSlotId(slot);
          if (!instanceId) return null;

          const card = findCardByInstanceId(previewCards, instanceId);
          if (!card) return null;

          return {
            slotIndex: index,
            card,
            score: scoreQuery(rawQuery, [
              card.name,
              card.displayName,
              card.title,
              card.code,
              String(card.code || "").replace(/_/g, " "),
              card.instanceId,
            ]),
          };
        })
        .filter((entry) => entry && entry.score > 0);

      if (!previewMatches.length) {
        return message.reply(`No team card found matching \`${rawQuery}\`.`);
      }
    }

    let removedCards = [];
    let selected = null;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const cards = getOwnedCards(fresh);
          const team = fresh.team || { slots: [null, null, null] };
          const slots = Array.isArray(team.slots)
            ? team.slots.slice(0, 3)
            : [null, null, null];

          while (slots.length < 3) slots.push(null);

          if (query === "all") {
            removedCards = slots
              .map((slot, index) => {
                const instanceId = getSlotId(slot);
                if (!instanceId) return null;

                const card = findCardByInstanceId(cards, instanceId);

                return {
                  position: index + 1,
                  name: getDisplayName(card),
                };
              })
              .filter(Boolean);

            if (!removedCards.length) {
              throw new Error("Your team is already empty.");
            }

            return {
              ...fresh,
              team: {
                ...(fresh.team || {}),
                slots: [null, null, null],
              },
            };
          }

          if (
            Number.isInteger(positionNumber) &&
            positionNumber >= 1 &&
            positionNumber <= 3
          ) {
            const slotIndex = positionNumber - 1;
            const instanceId = getSlotId(slots[slotIndex]);

            if (!instanceId) {
              throw new Error(`There is no card in position ${positionNumber}.`);
            }

            const card = findCardByInstanceId(cards, instanceId);

            selected = {
              slotIndex,
              card: card || { displayName: "Unknown Card" },
              score: 999999,
            };

            const newSlots = [...slots];
            newSlots[slotIndex] = null;

            return {
              ...fresh,
              team: {
                ...(fresh.team || {}),
                slots: newSlots,
              },
            };
          }

          const scoredSlots = slots
            .map((slot, index) => {
              const instanceId = getSlotId(slot);
              if (!instanceId) return null;

              const card = findCardByInstanceId(cards, instanceId);
              if (!card) return null;

              return {
                slotIndex: index,
                card,
                score: scoreQuery(rawQuery, [
                  card.name,
                  card.displayName,
                  card.title,
                  card.code,
                  String(card.code || "").replace(/_/g, " "),
                  card.instanceId,
                ]),
              };
            })
            .filter((entry) => entry && entry.score > 0)
            .sort((a, b) => b.score - a.score);

          if (!scoredSlots.length) {
            throw new Error(`No team card found matching \`${rawQuery}\`.`);
          }

          selected = scoredSlots[0];

          const newSlots = [...slots];
          newSlots[selected.slotIndex] = null;

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
      return message.reply(error.message || "Failed to remove card from team.");
    }

    if (query === "all") {
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
        .setFooter({ text: "One Piece Bot • Team Setup" });

      return message.reply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("❌ Card Removed From Team")
      .setDescription(
        [
          `**Card:** ${getDisplayName(selected.card)}`,
          `**Position:** ${selected.slotIndex + 1}`,
        ].join("\n")
      )
      .setFooter({ text: "One Piece Bot • Team Setup" });

    return message.reply({ embeds: [embed] });
  },
};