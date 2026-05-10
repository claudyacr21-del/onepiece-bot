const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { createOwnedCard } = require("../utils/evolution");
const rawCards = require("../data/cards");

const SUMMON_FRAGMENT_COST = 25;

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getCardName(card) {
  return card.displayName || card.name || "Unknown Card";
}

function getBattleCards() {
  return rawCards.filter(
    (card) => String(card.cardRole || "").toLowerCase() === "battle"
  );
}

function findBattleCard(query) {
  const q = normalize(query);
  if (!q) return null;

  const cards = getBattleCards();

  return (
    cards.find((card) => normalize(card.code) === q) ||
    cards.find((card) => normalize(getCardName(card)) === q) ||
    cards.find((card) => normalize(card.code).includes(q)) ||
    cards.find((card) => normalize(getCardName(card)).includes(q)) ||
    null
  );
}

function findFragmentIndex(fragments, card) {
  const cardCode = normalize(card.code);
  const cardName = normalize(getCardName(card));

  return fragments.findIndex((frag) => {
    const fragCode = normalize(frag.code);
    const fragName = normalize(frag.name);

    return (
      fragCode === cardCode ||
      fragName === cardName ||
      fragName.includes(cardName) ||
      cardName.includes(fragName)
    );
  });
}

function alreadyOwnsCard(player, card) {
  const code = normalize(card.code);

  return (Array.isArray(player.cards) ? player.cards : []).some(
    (owned) => normalize(owned.code) === code
  );
}

module.exports = {
  name: "summon",

  async execute(message, args) {
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply(
        [
          "Usage: `op summon <battle card name>`",
          "Example: `op summon luffy`",
          "",
          `Cost: **${SUMMON_FRAGMENT_COST}x self fragments**`,
        ].join("\n")
      );
    }

    const player = getPlayer(message.author.id, message.author.username);
    const card = findBattleCard(query);

    if (!card) {
      return message.reply(`Battle card matching \`${query}\` was not found.`);
    }

    if (String(card.cardRole || "").toLowerCase() !== "battle") {
      return message.reply("Only battle cards can be summoned.");
    }

    if (alreadyOwnsCard(player, card)) {
      return message.reply(`You already own **${getCardName(card)}**.`);
    }

    const fragments = Array.isArray(player.fragments) ? [...player.fragments] : [];
    const fragmentIndex = findFragmentIndex(fragments, card);

    if (fragmentIndex === -1) {
      return message.reply(
        `You need **${SUMMON_FRAGMENT_COST}x ${getCardName(card)} Fragment** to summon this card.`
      );
    }

    const ownedFragments = Number(fragments[fragmentIndex].amount || 0);

    if (ownedFragments < SUMMON_FRAGMENT_COST) {
      return message.reply(
        `You need **${SUMMON_FRAGMENT_COST}x ${getCardName(card)} Fragment**.\nYou currently have **${ownedFragments}x**.`
      );
    }

    if (ownedFragments === SUMMON_FRAGMENT_COST) {
      fragments.splice(fragmentIndex, 1);
    } else {
      fragments[fragmentIndex] = {
        ...fragments[fragmentIndex],
        amount: ownedFragments - SUMMON_FRAGMENT_COST,
      };
    }

    const ownedCard = createOwnedCard(card);
    const updatedCards = [...(player.cards || []), ownedCard];

    updatePlayer(message.author.id, {
      cards: updatedCards,
      fragments,
    });

    const rarity = String(card.baseTier || card.rarity || "C").toUpperCase();

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle("✨ Card Summoned")
          .setDescription(
            [
              `**Card:** ${getCardName(card)}`,
              `**Rarity:** ${rarity}`,
              `**Cost:** ${SUMMON_FRAGMENT_COST}x ${getCardName(card)} Fragment`,
              `**Remaining Fragments:** ${ownedFragments - SUMMON_FRAGMENT_COST}`,
              "",
              "The card has been added to your collection.",
            ].join("\n")
          )
          .setImage(
            ownedCard?.evolutionForms?.[0]?.image ||
              ownedCard?.stageImages?.M1 ||
              ownedCard?.image ||
              card?.evolutionForms?.[0]?.image ||
              card?.stageImages?.M1 ||
              card?.image ||
              null
          )
          .setFooter({ text: "One Piece Bot • Summon" }),
      ],
    });
  },
};