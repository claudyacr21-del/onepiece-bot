const { EmbedBuilder } = require("discord.js");
const { readPlayers, writePlayers, getPlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const { incrementQuestPayload } = require("../utils/questProgress");

const RUM_BEER_CODE = "rum_beer";
const EXP_PER_RUM_BEER = 100;
const EXP_PER_LEVEL = 1000;

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function scoreQuery(query, names) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;
  const qWords = q.split(" ").filter(Boolean);

  for (const raw of names.filter(Boolean)) {
    const name = normalize(raw);
    if (!name) continue;

    if (name === q) best = Math.max(best, 1000 + name.length);
    else if (name.startsWith(q)) best = Math.max(best, 800 + q.length);
    else if (name.includes(q)) best = Math.max(best, 600 + q.length);
    else if (qWords.length && qWords.every((word) => name.includes(word))) {
      best = Math.max(best, 400 + qWords.join("").length);
    }
  }

  return best;
}

function getStageLevelCap(card) {
  const stage = Number(card.evolutionStage || 1);

  if (stage <= 1) return 50;
  if (stage === 2) return 85;

  return 100;
}

function getCurrentExp(card) {
  const xp = Number(card?.xp);
  const exp = Number(card?.exp);

  if (Number.isFinite(xp) && xp >= 0) return xp;
  if (Number.isFinite(exp) && exp >= 0) return exp;

  return 0;
}

function getExpNeededForNextLevel(card) {
  const current = getCurrentExp(card);
  const needed = Number(
    card?.xpToNext ||
      card?.expToNext ||
      card?.nextLevelExp ||
      EXP_PER_LEVEL
  );

  return Math.max(1, needed - current);
}

function findOwnedCard(player, query) {
  const cards = Array.isArray(player.cards) ? player.cards : [];

  const scored = cards
    .map((rawCard, index) => {
      const hydrated = hydrateCard(rawCard);

      if (String(hydrated.cardRole || "").toLowerCase() === "boost") {
        return null;
      }

      return {
        index,
        rawCard,
        card: hydrated,
        score: scoreQuery(query, [
          hydrated.displayName,
          hydrated.name,
          rawCard.displayName,
          rawCard.name,
        ]),
      };
    })
    .filter((entry) => entry && entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0] : null;
}

function getRumBeerAmount(player) {
  const found = (Array.isArray(player.items) ? player.items : []).find(
    (item) =>
      String(item.code || "").toLowerCase() === RUM_BEER_CODE ||
      normalize(item.name) === "rum beer"
  );

  return Math.max(0, Number(found?.amount || 0));
}

function removeRumBeer(items, amount) {
  const arr = Array.isArray(items) ? [...items] : [];

  const index = arr.findIndex(
    (item) =>
      String(item.code || "").toLowerCase() === RUM_BEER_CODE ||
      normalize(item.name) === "rum beer"
  );

  if (index === -1) return null;

  const current = Number(arr[index].amount || 0);

  if (current < amount) return null;

  if (current === amount) {
    arr.splice(index, 1);
  } else {
    arr[index] = {
      ...arr[index],
      amount: current - amount,
    };
  }

  return arr;
}

function applyExpToCard(card, expAmount) {
  const next = {
    ...card,
    level: Number(card.level || 1),
    exp: getCurrentExp(card),
    xp: getCurrentExp(card),
  };

  let remainingExp = Number(expAmount || 0);
  let levelsGained = 0;

  while (remainingExp > 0) {
    const level = Number(next.level || 1);
    const levelCap = getStageLevelCap(next);

    if (level >= levelCap) {
      break;
    }

    const needed = getExpNeededForNextLevel(next);

    if (remainingExp < needed) {
      const newExp = getCurrentExp(next) + remainingExp;

      next.exp = newExp;
      next.xp = newExp;

      remainingExp = 0;
      break;
    }

    remainingExp -= needed;
    levelsGained += 1;

    next.level = level + 1;
    next.exp = 0;
    next.xp = 0;
  }

  return {
    card: next,
    usedExp: Number(expAmount || 0) - remainingExp,
    levelsGained,
    blockedByCap: remainingExp > 0,
  };
}

function getUsageText() {
  return [
    "Usage: `op rum <amount/all> <card name>`",
    "Example: `op rum 5 luffy`",
    "Example: `op rum all luffy`",
  ].join("\n");
}

module.exports = {
  name: "rum",

  async execute(message, args) {
    const amountArg = String(args[0] || "").toLowerCase();
    const useAll = amountArg === "all";
    const requestedAmount = useAll ? Infinity : Math.floor(Number(amountArg || 0));
    const query = args.slice(1).join(" ").trim();

    if ((!useAll && (!requestedAmount || requestedAmount <= 0)) || !query) {
      return message.reply({
        content: getUsageText(),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    getPlayer(message.author.id, message.author.username);

    const players = readPlayers();
    const userId = String(message.author.id);
    const player = players[userId];

    if (!player) {
      return message.reply({
        content: "Player data was not found. Please try again.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const ownedRum = getRumBeerAmount(player);

    if (ownedRum <= 0) {
      return message.reply({
        content: "You do not own any **Rum Beer**.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const found = findOwnedCard(player, query);

    if (!found) {
      return message.reply({
        content: `Battle card matching \`${query}\` was not found.`,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const card = found.card;
    const beforeLevel = Number(card.level || 1);
    const beforeExp = getCurrentExp(card);
    const levelCap = getStageLevelCap(card);

    if (beforeLevel >= levelCap) {
      return message.reply({
        content: `**${card.displayName || card.name}** is already at the current form level cap (${levelCap}).\nPlease awaken it first.`,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const amountToUse = useAll ? ownedRum : requestedAmount;

    if (!useAll && amountToUse > ownedRum) {
      return message.reply({
        content: `You only own **${ownedRum}x Rum Beer**.`,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (useAll) {
      const preview = applyExpToCard(card, ownedRum * EXP_PER_RUM_BEER);

      if (preview.blockedByCap) {
        return message.reply({
          content: [
            `Using all Rum Beer would reach the current form level cap for **${card.displayName || card.name}**.`,
            `Current level cap: **${levelCap}**`,
            "",
            "Please use a manual amount instead.",
            "Example: `op rum 5 luffy`",
          ].join("\n"),
          allowedMentions: {
            repliedUser: false,
          },
        });
      }
    }

    const totalExp = amountToUse * EXP_PER_RUM_BEER;
    const result = applyExpToCard(card, totalExp);

    if (result.blockedByCap) {
      return message.reply({
        content: [
          `That amount would reach the current form level cap for **${card.displayName || card.name}**.`,
          `Current level cap: **${levelCap}**`,
          "",
          "Please use a smaller manual amount.",
        ].join("\n"),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const updatedItems = removeRumBeer(player.items || [], amountToUse);

    if (!updatedItems) {
      return message.reply({
        content: "Failed to consume Rum Beer.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const updatedCards = [...(player.cards || [])];

    updatedCards[found.index] = {
      ...found.rawCard,
      ...result.card,
      level: Number(result.card.level || beforeLevel),
      exp: getCurrentExp(result.card),
      xp: getCurrentExp(result.card),
    };

    const freshPlayerForQuest = {
      ...player,
      cards: updatedCards,
      items: updatedItems,
    };

    const questPayload = incrementQuestPayload(
      freshPlayerForQuest,
      "rumBeerUsed",
      amountToUse
    );

    players[userId] = {
      ...player,
      cards: updatedCards,
      items: updatedItems,
      quests: questPayload,
    };

    writePlayers(players);

    const afterLevel = Number(result.card.level || beforeLevel);
    const afterExp = getCurrentExp(result.card);
    const expText =
      afterLevel > beforeLevel
        ? `${beforeExp}/${EXP_PER_LEVEL} → ${afterExp}/${EXP_PER_LEVEL}`
        : `${beforeExp}/${EXP_PER_LEVEL} → ${afterExp}/${EXP_PER_LEVEL}`;

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle("🍺 Rum Beer Used")
          .setDescription(
            [
              `**Card:** ${result.card.displayName || result.card.name}`,
              `**Used:** Rum Beer x${amountToUse}`,
              `**EXP Added:** +${result.usedExp}`,
              `**EXP:** ${expText}`,
              `**Level:** ${beforeLevel} → ${afterLevel}`,
              `**Level Up:** +${result.levelsGained}`,
              `**Remaining Rum Beer:** ${ownedRum - amountToUse}`,
            ].join("\n")
          )
          .setFooter({
            text: "One Piece Bot • Rum Beer",
          }),
      ],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};