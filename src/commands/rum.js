const { EmbedBuilder } = require("discord.js");
const {
  getPlayer,
  updatePlayerAtomic,
  flushPlayerNow,
} = require("../playerStore");
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
  const exp = Number(card?.exp);
  const xp = Number(card?.xp);

  if (Number.isFinite(exp) && exp >= 0) return Math.floor(exp);
  if (Number.isFinite(xp) && xp >= 0) return Math.floor(xp);

  return 0;
}

function getExpNeededForNextLevel(card) {
  return EXP_PER_LEVEL;
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
  const levelCap = getStageLevelCap(card);
  const next = {
    ...card,
    level: Math.max(1, Math.floor(Number(card.level || card.currentLevel || card.lvl || 1))),
    currentLevel: Math.max(1, Math.floor(Number(card.level || card.currentLevel || card.lvl || 1))),
    lvl: Math.max(1, Math.floor(Number(card.level || card.currentLevel || card.lvl || 1))),
    exp: getCurrentExp(card),
    xp: getCurrentExp(card),
  };

  let remainingExp = Math.max(0, Math.floor(Number(expAmount || 0)));
  let levelsGained = 0;

  while (remainingExp > 0) {
    const level = Math.max(1, Math.floor(Number(next.level || 1)));

    if (level >= levelCap) {
      break;
    }

    const currentExp = getCurrentExp(next);
    const needed = Math.max(1, EXP_PER_LEVEL - currentExp);

    if (remainingExp < needed) {
      const newExp = currentExp + remainingExp;
      next.exp = newExp;
      next.xp = newExp;
      remainingExp = 0;
      break;
    }

    remainingExp -= needed;
    levelsGained += 1;

    const newLevel = level + 1;
    next.level = newLevel;
    next.currentLevel = newLevel;
    next.lvl = newLevel;
    next.exp = 0;
    next.xp = 0;
  }

  return {
    card: next,
    usedExp: Math.max(0, Math.floor(Number(expAmount || 0))) - remainingExp,
    unusedExp: remainingExp,
    levelsGained,
    blockedByCap: remainingExp > 0 && Number(next.level || 1) >= levelCap,
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

    const previewPlayer = getPlayer(message.author.id, message.author.username);
    const previewOwnedRum = getRumBeerAmount(previewPlayer);

    if (previewOwnedRum <= 0) {
      return message.reply({
        content: "You do not own any **Rum Beer**.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const previewFound = findOwnedCard(previewPlayer, query);

    if (!previewFound) {
      return message.reply({
        content: `Battle card name matching \`${query}\` was not found.`,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const previewCard = previewFound.card;
    const previewLevel = Number(previewCard.level || 1);
    const previewLevelCap = getStageLevelCap(previewCard);

    if (previewLevel >= previewLevelCap) {
      return message.reply({
        content: `**${previewCard.displayName || previewCard.name}** is already at the current form level cap (${previewLevelCap}).\nPlease awaken it first.`,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const previewAmountToUse = useAll ? previewOwnedRum : requestedAmount;

    if (!useAll && previewAmountToUse > previewOwnedRum) {
      return message.reply({
        content: `You only own **${previewOwnedRum}x Rum Beer**.`,
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (useAll) {
      const preview = applyExpToCard(previewCard, previewOwnedRum * EXP_PER_RUM_BEER);

      if (preview.blockedByCap) {
        return message.reply({
          content: [
            `Using all Rum Beer would reach the current form level cap for **${previewCard.displayName || previewCard.name}**.`,
            `Current level cap: **${previewLevelCap}**`,
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

    let result = null;
    let finalCardName = previewCard.displayName || previewCard.name;
    let finalBeforeLevel = previewLevel;
    let finalBeforeExp = getCurrentExp(previewCard);
    let finalAfterLevel = previewLevel;
    let finalAfterExp = getCurrentExp(previewCard);
    let finalAmountToUse = previewAmountToUse;
    let finalRemainingRum = Math.max(0, previewOwnedRum - previewAmountToUse);

    try {
      await updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const ownedRum = getRumBeerAmount(fresh);

          if (ownedRum <= 0) {
            throw new Error("You do not own any **Rum Beer**.");
          }

          const found = findOwnedCard(fresh, query);

          if (!found) {
            throw new Error(`Battle card name matching \`${query}\` was not found.`);
          }

          const card = found.card;
          const beforeLevel = Number(card.level || 1);
          const beforeExp = getCurrentExp(card);
          const levelCap = getStageLevelCap(card);

          if (beforeLevel >= levelCap) {
            throw new Error(
              `**${card.displayName || card.name}** is already at the current form level cap (${levelCap}).\nPlease awaken it first.`
            );
          }

          const amountToUse = useAll ? ownedRum : requestedAmount;

          if (!useAll && amountToUse > ownedRum) {
            throw new Error(`You only own **${ownedRum}x Rum Beer**.`);
          }

          if (useAll) {
            const preview = applyExpToCard(card, ownedRum * EXP_PER_RUM_BEER);

            if (preview.blockedByCap) {
              throw new Error(
                [
                  `Using all Rum Beer would reach the current form level cap for **${card.displayName || card.name}**.`,
                  `Current level cap: **${levelCap}**`,
                  "",
                  "Please use a manual amount instead.",
                  "Example: `op rum 5 luffy`",
                ].join("\n")
              );
            }
          }

          const totalExp = amountToUse * EXP_PER_RUM_BEER;
          result = applyExpToCard(card, totalExp);

          if (result.blockedByCap) {
            throw new Error(
              [
                `That amount would reach the current form level cap for **${card.displayName || card.name}**.`,
                `Current level cap: **${levelCap}**`,
                "",
                "Please use a smaller manual amount.",
              ].join("\n")
            );
          }

          const updatedItems = removeRumBeer(fresh.items || [], amountToUse);

          if (!updatedItems) {
            throw new Error("Failed to consume Rum Beer.");
          }

          const updatedCards = [...(fresh.cards || [])];

          updatedCards[found.index] = {
            ...found.rawCard,
            ...result.card,
            level: Number(result.card.level || beforeLevel),
            exp: getCurrentExp(result.card),
            xp: getCurrentExp(result.card),
          };

          const questPayload = incrementQuestPayload(
            {
              ...fresh,
              cards: updatedCards,
              items: updatedItems,
            },
            "rumBeerUsed",
            amountToUse
          );

          finalCardName = result.card.displayName || result.card.name;
          finalBeforeLevel = beforeLevel;
          finalBeforeExp = beforeExp;
          finalAfterLevel = Number(result.card.level || beforeLevel);
          finalAfterExp = getCurrentExp(result.card);
          finalAmountToUse = amountToUse;
          finalRemainingRum = ownedRum - amountToUse;

          return {
            ...fresh,
            cards: updatedCards,
            items: updatedItems,
            quests: questPayload,
          };
        },
        message.author.username
      );
      await flushPlayerNow(
        message.author.id,
        Number(process.env.PLAYER_DB_COMMAND_FLUSH_MS || 8000)
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to use Rum Beer.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const expText = `${finalBeforeExp}/${EXP_PER_LEVEL} → ${finalAfterExp}/${EXP_PER_LEVEL}`;

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle("🍺 Rum Beer Used")
          .setDescription(
            [
              `**Card:** ${finalCardName}`,
              `**Used:** Rum Beer x${finalAmountToUse}`,
              `**EXP Added:** +${result.usedExp}`,
              `**EXP:** ${expText}`,
              `**Level:** ${finalBeforeLevel} → ${finalAfterLevel}`,
              `**Level Up:** +${result.levelsGained}`,
              `**Remaining Rum Beer:** ${finalRemainingRum}`,
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