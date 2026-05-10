const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");

const RUM_BEER_CODE = "rum_beer";
const EXP_PER_RUM_BEER = 100;

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getStageLevelCap(card) {
  const stage = Number(card.evolutionStage || 1);
  if (stage <= 1) return 50;
  if (stage === 2) return 85;
  return 100;
}

function getExpNeededForNextLevel(card) {
  const current = Number(card.xp || card.exp || 0);
  const needed = Number(card.xpToNext || card.expToNext || card.nextLevelExp || 1000);
  return Math.max(1, needed - current);
}

function findOwnedCard(player, query) {
  const q = normalize(query);
  const cards = Array.isArray(player.cards) ? player.cards : [];

  let best = null;

  for (let i = 0; i < cards.length; i++) {
    const hydrated = hydrateCard(cards[i]);
    if (String(hydrated.cardRole || "").toLowerCase() === "boost") continue;

    const names = [
      hydrated.code,
      hydrated.name,
      hydrated.displayName,
      hydrated.title,
    ].map(normalize);

    const score =
      names.some((name) => name === q) ? 100 :
      names.some((name) => name.startsWith(q)) ? 75 :
      names.some((name) => name.includes(q)) ? 50 :
      0;

    if (score && (!best || score > best.score)) {
      best = {
        index: i,
        card: hydrated,
        rawCard: cards[i],
        score,
      };
    }
  }

  return best;
}

function getRumBeerAmount(player) {
  const found = (Array.isArray(player.items) ? player.items : []).find(
    (item) => item.code === RUM_BEER_CODE || normalize(item.name) === "rum beer"
  );

  return Math.max(0, Number(found?.amount || 0));
}

function removeRumBeer(items, amount) {
  const arr = Array.isArray(items) ? [...items] : [];
  const index = arr.findIndex(
    (item) => item.code === RUM_BEER_CODE || normalize(item.name) === "rum beer"
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
  const next = { ...card };
  let remainingExp = Number(expAmount || 0);

  while (remainingExp > 0) {
    const level = Number(next.level || 1);
    const levelCap = getStageLevelCap(next);

    if (level >= levelCap) {
      break;
    }

    const needed = getExpNeededForNextLevel(next);

    if (remainingExp < needed) {
      next.xp = Number(next.xp || next.exp || 0) + remainingExp;
      remainingExp = 0;
      break;
    }

    remainingExp -= needed;
    next.level = level + 1;
    next.xp = 0;
    next.exp = 0;
  }

  return {
    card: next,
    usedExp: Number(expAmount || 0) - remainingExp,
    blockedByCap: remainingExp > 0,
  };
}

module.exports = {
  name: "rum",

  async execute(message, args) {
    const amountArg = String(args[0] || "").toLowerCase();
    const useAll = amountArg === "all";
    const requestedAmount = useAll ? Infinity : Math.floor(Number(amountArg || 0));
    const query = args.slice(1).join(" ").trim();

    if ((!useAll && (!requestedAmount || requestedAmount <= 0)) || !query) {
      return message.reply(
        [
          "Usage: `op rum <amount/all> <card name>`",
          "Example: `op rum 5 luffy`",
          "Example: `op rum all luffy`",
        ].join("\n")
      );
    }

    const player = getPlayer(message.author.id, message.author.username);
    const ownedRum = getRumBeerAmount(player);

    if (ownedRum <= 0) {
      return message.reply("You do not own any **Rum Beer**.");
    }

    const found = findOwnedCard(player, query);

    if (!found) {
      return message.reply(`Battle card matching \`${query}\` was not found.`);
    }

    const card = found.card;
    const level = Number(card.level || 1);
    const levelCap = getStageLevelCap(card);

    if (level >= levelCap) {
      return message.reply(
        `**${card.displayName || card.name}** is already at the current form level cap (${levelCap}). Please awaken it first.`
      );
    }

    let amountToUse = useAll ? ownedRum : requestedAmount;

    if (!useAll && amountToUse > ownedRum) {
      return message.reply(`You only own **${ownedRum}x Rum Beer**.`);
    }

    if (useAll) {
      const preview = applyExpToCard(card, ownedRum * EXP_PER_RUM_BEER);

      if (preview.blockedByCap) {
        return message.reply(
          [
            `Using all Rum Beer would touch the current form level cap for **${card.displayName || card.name}**.`,
            `Current level cap: **${levelCap}**`,
            "",
            "Please use a manual amount instead.",
            "Example: `op rum 5 luffy`",
          ].join("\n")
        );
      }
    }

    const totalExp = amountToUse * EXP_PER_RUM_BEER;
    const result = applyExpToCard(card, totalExp);

    if (result.blockedByCap) {
      return message.reply(
        [
          `That amount would touch the current form level cap for **${card.displayName || card.name}**.`,
          `Current level cap: **${levelCap}**`,
          "",
          "Please use a smaller manual amount.",
        ].join("\n")
      );
    }

    const updatedItems = removeRumBeer(player.items || [], amountToUse);

    if (!updatedItems) {
      return message.reply("Failed to consume Rum Beer.");
    }

    const updatedCards = [...(player.cards || [])];
    updatedCards[found.index] = {
      ...found.rawCard,
      ...result.card,
    };

    updatePlayer(message.author.id, {
      cards: updatedCards,
      items: updatedItems,
    });

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
              `**Level:** ${level} → ${Number(result.card.level || level)}`,
              `**Remaining Rum Beer:** ${ownedRum - amountToUse}`,
            ].join("\n")
          )
          .setFooter({ text: "One Piece Bot • Rum Beer" }),
      ],
    });
  },
};