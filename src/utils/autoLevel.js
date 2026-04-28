const { hydrateCard } = require("./evolution");

const LEVEL_CAPS_BY_STAGE = {
  1: 50,
  2: 85,
  3: 100,
};

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getCardStage(card) {
  return Math.max(1, Math.min(3, Number(card?.evolutionStage || 1)));
}

function getLevelCap(card) {
  return LEVEL_CAPS_BY_STAGE[getCardStage(card)] || 50;
}

function getCardName(card) {
  return card?.displayName || card?.name || "Unknown Card";
}

function getAutoLevelCards(autoLevel) {
  return Array.isArray(autoLevel?.cards) ? autoLevel.cards : [];
}

function isSameCard(a, b) {
  const aCode = normalize(a?.code);
  const bCode = normalize(b?.code);

  if (aCode && bCode && aCode === bCode) return true;

  const aName = normalize(a?.displayName || a?.name);
  const bName = normalize(b?.displayName || b?.name);

  return Boolean(aName && bName && aName === bName);
}

function isAutoLevelEnabled(autoLevel, card) {
  return getAutoLevelCards(autoLevel).some((entry) => isSameCard(entry, card));
}

function findOwnedCardByName(cardsOwned, query) {
  const q = normalize(query);
  if (!q) return null;

  const candidates = (Array.isArray(cardsOwned) ? cardsOwned : [])
    .map((card, index) => {
      const names = [card.name, card.displayName].filter(Boolean);
      let score = 0;

      for (const rawName of names) {
        const name = normalize(rawName);

        if (name === q) score = Math.max(score, 1000);
        else if (name.startsWith(q)) score = Math.max(score, 700);
        else if (name.includes(q)) score = Math.max(score, 400);
      }

      return {
        card,
        index,
        score,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates.length ? candidates[0] : null;
}

function addFragment(list, card, amount = 1) {
  const fragments = Array.isArray(list) ? [...list] : [];
  const code = String(card?.code || "").toLowerCase();

  const index = fragments.findIndex(
    (entry) => String(entry.code || "").toLowerCase() === code
  );

  if (index !== -1) {
    fragments[index] = {
      ...fragments[index],
      amount: Number(fragments[index].amount || 0) + Number(amount || 1),
    };

    return fragments;
  }

  fragments.push({
    name: card.displayName || card.name,
    amount: Number(amount || 1),
    rarity: card.baseTier || card.rarity || "C",
    category: card.cardRole === "boost" ? "boost" : "battle",
    code: card.code,
    image: card.image || "",
  });

  return fragments;
}

function applyAutoLevelForDuplicate({
  cards,
  fragments,
  autoLevel,
  pulledCard,
  amount = 1,
}) {
  let updatedCards = Array.isArray(cards) ? [...cards] : [];
  let updatedFragments = Array.isArray(fragments) ? [...fragments] : [];

  const ownedIndex = updatedCards.findIndex((card) => isSameCard(card, pulledCard));
  const safeAmount = Math.max(1, Number(amount || 1));

  if (ownedIndex === -1 || !isAutoLevelEnabled(autoLevel, pulledCard)) {
    return {
      cards: updatedCards,
      fragments: addFragment(updatedFragments, pulledCard, safeAmount),
      levelGained: 0,
      fragmentsStored: safeAmount,
      cardName: getCardName(pulledCard),
    };
  }

  const ownedCard = updatedCards[ownedIndex];
  const currentLevel = Math.max(1, Number(ownedCard.level || 1));
  const levelCap = getLevelCap(ownedCard);
  const availableLevels = Math.max(0, levelCap - currentLevel);
  const levelGained = Math.min(safeAmount, availableLevels);
  const fragmentsStored = safeAmount - levelGained;

  if (levelGained > 0) {
    const nextLevel = currentLevel + levelGained;
    const shouldClearExp = nextLevel >= levelCap;

    updatedCards[ownedIndex] = hydrateCard({
      ...ownedCard,
      level: nextLevel,
      exp: shouldClearExp ? 0 : Number(ownedCard.exp ?? ownedCard.xp ?? 0),
      xp: shouldClearExp ? 0 : Number(ownedCard.exp ?? ownedCard.xp ?? 0),
    });
  }

  if (fragmentsStored > 0) {
    updatedFragments = addFragment(updatedFragments, pulledCard, fragmentsStored);
  }

  return {
    cards: updatedCards,
    fragments: updatedFragments,
    levelGained,
    fragmentsStored,
    cardName: getCardName(ownedCard),
  };
}

module.exports = {
  normalize,
  getCardName,
  getAutoLevelCards,
  findOwnedCardByName,
  isAutoLevelEnabled,
  applyAutoLevelForDuplicate,
};