const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { getEffectiveBoostValue, findBoostFruitByCode } = require("../utils/passiveBoosts");

function normalize(text) {
  return String(text || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function getCardSearchStrings(card) {
  return [
    card.displayName,
    card.name,
    card.title,
    card.code
  ]
    .filter(Boolean)
    .map((v) => normalize(v));
}

function getFruitSearchStrings(fruit) {
  return [
    fruit.name,
    fruit.code
  ]
    .filter(Boolean)
    .map((v) => normalize(v));
}

function parseCardAndFruit(cards, fruits, rawArgs) {
  const joined = normalize(rawArgs.join(" "));
  if (!joined) return { card: null, fruit: null };

  let bestMatch = null;

  for (const card of cards) {
    const cardNames = getCardSearchStrings(card);

    for (const cardName of cardNames) {
      if (!cardName) continue;

      if (joined === cardName || joined.startsWith(cardName + " ")) {
        const remainder = normalize(joined.slice(cardName.length));
        if (!remainder) continue;

        const matchingFruit = fruits.find((fruit) =>
          getFruitSearchStrings(fruit).some((fruitName) => fruitName === remainder)
        );

        if (matchingFruit) {
          const score = cardName.length;
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = {
              score,
              card,
              fruit: matchingFruit
            };
          }
        }
      }
    }
  }

  return {
    card: bestMatch?.card || null,
    fruit: bestMatch?.fruit || null
  };
}

module.exports = {
  name: "equipfruit",
  aliases: ["fruit", "df", "eatfruit"],
  async execute(message, args) {
    if (!args.length) {
      return message.reply("Usage: `op df <card name> <fruit name>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const cards = [...(player.cards || [])];
    const ownedFruits = [...(player.devilFruits || [])];

    const parsed = parseCardAndFruit(cards, ownedFruits, args);

    if (!parsed.card || !parsed.fruit) {
      return message.reply("Could not match that card and fruit. Use: `op df <card name> <fruit name>`");
    }

    const cardIndex = cards.findIndex((card) => card.instanceId === parsed.card.instanceId);
    if (cardIndex === -1) {
      return message.reply("You do not own that card.");
    }

    const card = cards[cardIndex];

    if (card.equippedDevilFruit) {
      return message.reply("This card already has a devil fruit equipped, and it cannot be removed.");
    }

    const fruitIndex = ownedFruits.findIndex((fruit) => fruit.code === parsed.fruit.code);
    if (fruitIndex === -1) {
      return message.reply("You do not own that devil fruit.");
    }

    const fruit = ownedFruits[fruitIndex];

    if (!Array.isArray(fruit.owners) || !fruit.owners.includes(card.code)) {
      return message.reply("That devil fruit cannot be used by this card.");
    }

    cards[cardIndex] = {
      ...card,
      equippedDevilFruit: fruit.code
    };

    const currentAmount = Number(ownedFruits[fruitIndex].amount || 1);
    if (currentAmount <= 1) {
      ownedFruits.splice(fruitIndex, 1);
    } else {
      ownedFruits[fruitIndex] = {
        ...ownedFruits[fruitIndex],
        amount: currentAmount - 1
      };
    }

    updatePlayer(message.author.id, {
      cards,
      devilFruits: ownedFruits
    });

    const equippedFruitData = findBoostFruitByCode(fruit.code);
    const isBoost = card.cardRole === "boost";
    const effectiveValue = isBoost ? getEffectiveBoostValue(cards[cardIndex]) : null;
    const suffix = isBoost && ["atk", "hp", "spd", "exp", "dmg"].includes(card.boostType) ? "%" : "";

    const embed = new EmbedBuilder()
      .setColor(isBoost ? 0x9b59b6 : 0x2ecc71)
      .setTitle("🍎 Devil Fruit Equipped")
      .setDescription(
        [
          `**Card:** ${card.displayName || card.name}`,
          `**Fruit:** ${fruit.name}`,
          isBoost ? `**Boost Type:** \`${card.boostType}\`` : null,
          isBoost ? `**Final Boost Value:** \`${effectiveValue}${suffix}\`` : null,
          isBoost && equippedFruitData?.boostBonus
            ? `**Fruit Bonus Applied:** \`${Number(equippedFruitData.boostBonus[card.boostType] || 0)}${suffix}\``
            : null,
          "",
          "This equip is permanent and cannot be removed."
        ].filter(Boolean).join("\n")
      )
      .setFooter({ text: "One Piece Bot • Devil Fruit Equip" });

    return message.reply({ embeds: [embed] });
  }
};