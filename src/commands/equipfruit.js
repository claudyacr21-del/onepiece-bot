const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const devilFruits = require("../data/devilFruits");
const { findOwnedCard, hydrateCard } = require("../utils/evolution");
const { getEffectiveBoostValue, findBoostFruitByCode } = require("../utils/passiveBoosts");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getCardSearchStrings(card) {
  return [
    card.displayName,
    card.name,
    card.title,
    card.code,
    `${card.name} ${card.title || ""}`.trim(),
  ]
    .filter(Boolean)
    .map(normalize);
}

function getFruitSearchStrings(fruit) {
  return [fruit.name, fruit.code, fruit.type]
    .filter(Boolean)
    .map(normalize);
}

function scoreMatch(query, candidates) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (candidate === q) {
      best = Math.max(best, 1000 + candidate.length);
      continue;
    }

    if (candidate.startsWith(q)) {
      best = Math.max(best, 700 + q.length);
      continue;
    }

    if (candidate.includes(q)) {
      best = Math.max(best, 400 + q.length);
      continue;
    }

    const qWords = q.split(" ").filter(Boolean);
    if (qWords.length && qWords.every((w) => candidate.includes(w))) {
      best = Math.max(best, 250 + qWords.join("").length);
    }
  }

  return best;
}

function findCardCandidates(cards, query) {
  return cards
    .map((card) => ({
      card,
      score: scoreMatch(query, getCardSearchStrings(card)),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

function findFruitCandidates(fruits, query) {
  return fruits
    .map((fruit) => ({
      fruit,
      score: scoreMatch(query, getFruitSearchStrings(fruit)),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

function splitIntoAllPairs(rawArgs) {
  const parts = rawArgs.map((x) => String(x).trim()).filter(Boolean);
  const pairs = [];

  for (let i = 1; i < parts.length; i++) {
    pairs.push({
      cardQuery: parts.slice(0, i).join(" "),
      fruitQuery: parts.slice(i).join(" "),
    });
  }

  return pairs;
}

function parseCardAndFruit(cards, fruits, rawArgs) {
  const joined = normalize(rawArgs.join(" "));
  if (!joined) {
    return {
      card: null,
      fruit: null,
      ambiguous: false,
      cardOptions: [],
      fruitOptions: [],
    };
  }

  const pairs = splitIntoAllPairs(rawArgs);
  let bestPair = null;

  for (const pair of pairs) {
    const cardCandidates = findCardCandidates(cards, pair.cardQuery);
    const fruitCandidates = findFruitCandidates(fruits, pair.fruitQuery);

    if (!cardCandidates.length || !fruitCandidates.length) continue;

    const cardTop = cardCandidates[0];
    const fruitTop = fruitCandidates[0];
    const pairScore = cardTop.score + fruitTop.score;

    if (!bestPair || pairScore > bestPair.score) {
      bestPair = {
        score: pairScore,
        card: cardTop.card,
        fruit: fruitTop.fruit,
      };
    }
  }

  if (bestPair) {
    return {
      card: bestPair.card,
      fruit: bestPair.fruit,
      ambiguous: false,
      cardOptions: [],
      fruitOptions: [],
    };
  }

  const cardCandidates = findCardCandidates(cards, joined).slice(0, 10);
  const fruitCandidates = findFruitCandidates(fruits, joined).slice(0, 10);

  return {
    card: cardCandidates.length === 1 ? cardCandidates[0].card : null,
    fruit: fruitCandidates.length === 1 ? fruitCandidates[0].fruit : null,
    ambiguous: cardCandidates.length > 1 || fruitCandidates.length > 1,
    cardOptions: cardCandidates.map((x) => x.card),
    fruitOptions: fruitCandidates.map((x) => x.fruit),
  };
}

function buildChoiceEmbed(type, options) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(type === "card" ? "Choose a Card" : "Choose a Devil Fruit")
    .setDescription(
      options.length
        ? options
            .map((item, i) =>
              type === "card"
                ? `${i + 1}. ${item.displayName || item.name}`
                : `${i + 1}. ${item.name}`
            )
            .join("\n")
        : "No options found."
    );
}

function buildChoiceMenu(type, roomId, options) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`equipfruit_pick_${type}_${roomId}`)
      .setPlaceholder(type === "card" ? "Select a card" : "Select a devil fruit")
      .addOptions(
        options.slice(0, 25).map((item, i) => ({
          label:
            type === "card"
              ? String(item.displayName || item.name || `Card ${i + 1}`).slice(0, 100)
              : String(item.name || `Fruit ${i + 1}`).slice(0, 100),
          value: type === "card" ? String(item.instanceId) : String(item.code),
          description: `Code: ${String(item.code || "-").slice(0, 100)}`,
        }))
      )
  );
}

async function equipFruitToCard(message, player, card, fruit) {
  const cards = [...(player.cards || [])];
  const ownedFruits = [...(player.devilFruits || [])];

  const cardIndex = cards.findIndex((x) => x.instanceId === card.instanceId);
  if (cardIndex === -1) {
    return message.reply("You do not own that card.");
  }

  if (cards[cardIndex].equippedDevilFruit) {
    return message.reply("This card already has a devil fruit equipped, and it cannot be removed.");
  }

  const fruitIndex = ownedFruits.findIndex((x) => x.code === fruit.code);
  if (fruitIndex === -1) {
    return message.reply("You do not own that devil fruit.");
  }

  if (
    !Array.isArray(ownedFruits[fruitIndex].owners) ||
    !ownedFruits[fruitIndex].owners.includes(cards[cardIndex].code)
  ) {
    return message.reply("That devil fruit cannot be used by this card.");
  }

  cards[cardIndex] = hydrateCard({
    ...cards[cardIndex],
    equippedDevilFruit: fruit.code,
    equippedDevilFruitName: fruit.name,
  });

  const syncedCard = hydrateCard(cards[cardIndex]);
  cards[cardIndex] = syncedCard;

  const currentAmount = Number(ownedFruits[fruitIndex].amount || 1);

  if (currentAmount <= 1) {
    ownedFruits.splice(fruitIndex, 1);
  } else {
    ownedFruits[fruitIndex] = {
      ...ownedFruits[fruitIndex],
      amount: currentAmount - 1,
    };
  }

  updatePlayer(message.author.id, {
    cards,
    devilFruits: ownedFruits,
  });

  const boostFruitData = findBoostFruitByCode(fruit.code);

  const resolvedFruitData =
    syncedCard.equippedDevilFruitData ||
    devilFruits.find((entry) => entry.code === fruit.code) ||
    fruit;

  const isBoost = syncedCard.cardRole === "boost";
  const effectiveValue = isBoost ? getEffectiveBoostValue(syncedCard) : null;

  const suffix =
    isBoost && ["atk", "hp", "spd", "exp", "dmg"].includes(syncedCard.boostType)
      ? "%"
      : "";

  const percent = resolvedFruitData?.statPercent || {
    atk: 0,
    hp: 0,
    speed: 0,
  };

  const embed = new EmbedBuilder()
    .setColor(isBoost ? 0x9b59b6 : 0x2ecc71)
    .setTitle("🍈 Devil Fruit Equipped")
    .setDescription(
      [
        `**Card:** ${syncedCard.displayName || syncedCard.name}`,
        `**Fruit:** ${resolvedFruitData?.name || fruit.name}`,
        !isBoost
          ? `**ATK:** ${Math.floor(Number(syncedCard.atk || 0) * 0.85)}-${Math.floor(Number(syncedCard.atk || 0) * 1.15)}`
          : null,
        !isBoost ? `**HP:** ${Number(syncedCard.hp || 0)}` : null,
        !isBoost ? `**SPD:** ${Number(syncedCard.speed || 0)}` : null,
        !isBoost
          ? `**Fruit Bonus:** +${Number(percent.atk || 0)}% ATK / +${Number(percent.hp || 0)}% HP / +${Number(percent.speed || 0)}% SPD`
          : null,
        isBoost ? `**Boost Type:** \`${syncedCard.boostType}\`` : null,
        isBoost ? `**Final Boost Value:** \`${effectiveValue}${suffix}\`` : null,
        isBoost && boostFruitData?.boostBonus
          ? `**Fruit Bonus Applied:** \`${Number(boostFruitData.boostBonus[syncedCard.boostType] || 0)}${suffix}\``
          : null,
        "",
        "This equip is permanent and cannot be removed.",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .setFooter({ text: "One Piece Bot • Devil Fruit Equip" });

  return message.reply({ embeds: [embed] });
}

module.exports = {
  name: "equipfruit",
  aliases: ["fruit", "df", "eatfruit"],

  async execute(message, args) {
    if (!args.length) {
      return message.reply("Usage: `op df <card> <fruit>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const cards = [...(player.cards || [])];
    const ownedFruits = [...(player.devilFruits || [])];

    if (!cards.length) {
      return message.reply("You do not own any cards.");
    }

    if (!ownedFruits.length) {
      return message.reply("You do not own any devil fruits.");
    }

    const parsed = parseCardAndFruit(cards, ownedFruits, args);

    if (parsed.card && parsed.fruit) {
      return equipFruitToCard(message, player, parsed.card, parsed.fruit);
    }

    if (parsed.ambiguous && parsed.cardOptions.length > 1 && !parsed.fruit) {
      const roomId = `${Date.now()}_${message.author.id}`;

      const sent = await message.reply({
        embeds: [buildChoiceEmbed("card", parsed.cardOptions)],
        components: [buildChoiceMenu("card", roomId, parsed.cardOptions)],
      });

      try {
        const interaction = await sent.awaitMessageComponent({
          time: 60_000,
          filter: (i) =>
            i.user.id === message.author.id &&
            i.customId === `equipfruit_pick_card_${roomId}`,
        });

        const pickedCard = cards.find(
          (c) => String(c.instanceId) === String(interaction.values[0])
        );
        if (!pickedCard) {
          return interaction.update({
            content: "Selected card not found.",
            embeds: [],
            components: [],
          });
        }

        return interaction.update({
          content: `Now run: \`op df ${pickedCard.displayName || pickedCard.name} <fruit>\``,
          embeds: [],
          components: [],
        });
      } catch {
        return;
      }
    }

    if (parsed.ambiguous && parsed.fruitOptions.length > 1 && !parsed.card) {
      const roomId = `${Date.now()}_${message.author.id}`;

      const sent = await message.reply({
        embeds: [buildChoiceEmbed("fruit", parsed.fruitOptions)],
        components: [buildChoiceMenu("fruit", roomId, parsed.fruitOptions)],
      });

      try {
        const interaction = await sent.awaitMessageComponent({
          time: 60_000,
          filter: (i) =>
            i.user.id === message.author.id &&
            i.customId === `equipfruit_pick_fruit_${roomId}`,
        });

        const pickedFruit = ownedFruits.find(
          (f) => String(f.code) === String(interaction.values[0])
        );
        if (!pickedFruit) {
          return interaction.update({
            content: "Selected fruit not found.",
            embeds: [],
            components: [],
          });
        }

        return interaction.update({
          content: `Now run: \`op df <card> ${pickedFruit.name}\``,
          embeds: [],
          components: [],
        });
      } catch {
        return;
      }
    }

    return message.reply(
      "Could not match that card and fruit.\nUse: `op df <card> <fruit>`\nYou can also use partial names, for example: `op df luffy nika`."
    );
  },
};