const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { createOwnedCard } = require("../utils/evolution");
const rawCards = require("../data/cards");

const SUMMON_FRAGMENT_COST = 25;
const SUMMONABLE_CARD_ROLES = new Set(["battle", "boost"]);

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

function getCardRole(card) {
  return String(card?.cardRole || "battle").toLowerCase();
}

function isSummonableCard(card) {
  return SUMMONABLE_CARD_ROLES.has(getCardRole(card));
}

function getSummonableCards() {
  return rawCards.filter(isSummonableCard);
}

function findSummonableCard(query) {
  const q = normalize(query);
  if (!q) return null;

  const cards = getSummonableCards();

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
    const fragName = normalize(frag.name || frag.displayName);

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

function getRoleLabel(card) {
  const role = getCardRole(card);
  if (role === "boost") return "Boost Card";
  return "Battle Card";
}

function getSummonImage(ownedCard, card) {
  return (
    ownedCard?.evolutionForms?.[0]?.image ||
    ownedCard?.stageImages?.M1 ||
    ownedCard?.image ||
    card?.evolutionForms?.[0]?.image ||
    card?.stageImages?.M1 ||
    card?.image ||
    null
  );
}

module.exports = {
  name: "summon",

  async execute(message, args) {
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply(
        [
          "Usage: `op summon <card>`",
          "Example: `op summon luffy`",
          "Example: `op summon baccarat`",
          "",
          `Cost: **${SUMMON_FRAGMENT_COST}x self fragments**`,
          "Summonable: **Battle Cards** and **Boost Cards**",
        ].join("\n")
      );
    }

    const player = getPlayer(message.author.id, message.author.username);
    const card = findSummonableCard(query);

    if (!card) {
      return message.reply(
        `Battle/Boost card matching \`${query}\` was not found.`
      );
    }

    if (!isSummonableCard(card)) {
      return message.reply("Only battle cards and boost cards can be summoned.");
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

    const remainingFragments = ownedFragments - SUMMON_FRAGMENT_COST;

    if (remainingFragments <= 0) {
      fragments.splice(fragmentIndex, 1);
    } else {
      fragments[fragmentIndex] = {
        ...fragments[fragmentIndex],
        amount: remainingFragments,
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
          .setColor(getCardRole(card) === "boost" ? 0x9b59b6 : 0xf1c40f)
          .setTitle("✨ Card Summoned")
          .setDescription(
            [
              `**Card:** ${getCardName(card)}`,
              `**Type:** ${getRoleLabel(card)}`,
              `**Rarity:** ${rarity}`,
              `**Cost:** ${SUMMON_FRAGMENT_COST}x ${getCardName(card)} Fragment`,
              `**Remaining Fragments:** ${remainingFragments}`,
              "",
              "The card has been added to your collection.",
            ].join("\n")
          )
          .setImage(getSummonImage(ownedCard, card))
          .setFooter({ text: "One Piece Bot • Summon" }),
      ],
    });
  },
};