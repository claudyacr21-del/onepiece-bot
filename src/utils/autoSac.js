const SAC_BERRY_BY_RARITY = {
  C: 500,
  B: 1000,
  A: 2500,
  S: 5000,
  SS: 10000,
  UR: 20000,
};

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function normalizeCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function getCardName(card) {
  return String(card?.displayName || card?.name || card?.cardName || "Unknown Card");
}

function getCardCode(card) {
  return String(card?.code || card?.cardCode || "").trim();
}

function getCardRarity(card) {
  return String(card?.baseTier || card?.currentTier || card?.rarity || "C").toUpperCase();
}

function getSacBerryValue(card) {
  return SAC_BERRY_BY_RARITY[getCardRarity(card)] || SAC_BERRY_BY_RARITY.C;
}

function getAutoSacSettings(player) {
  const raw = player?.autoSac || {};
  const rawRarities = raw.rarities || {};

  return {
    rarities: {
      C: Boolean(rawRarities.C),
      B: Boolean(rawRarities.B),
      A: Boolean(rawRarities.A),
      S: Boolean(rawRarities.S),
      SS: Boolean(rawRarities.SS),
      UR: Boolean(rawRarities.UR),
    },
    cards: Array.isArray(raw.cards) ? raw.cards : [],
    safeCards: Array.isArray(raw.safeCards) ? raw.safeCards : [],
  };
}

function isSameCardEntry(entry, card) {
  const entryCode = normalizeCode(entry?.code || entry?.cardCode || "");
  const entryName = normalize(entry?.name || entry?.displayName || entry?.cardName || "");

  const cardCode = normalizeCode(getCardCode(card));
  const cardName = normalize(getCardName(card));

  return (
    (entryCode && cardCode && entryCode === cardCode) ||
    (entryName && cardName && entryName === cardName)
  );
}

function isSafeCard(player, card) {
  const settings = getAutoSacSettings(player);

  return settings.safeCards.some((entry) => isSameCardEntry(entry, card));
}

function getSpecificSacEntry(player, card) {
  const settings = getAutoSacSettings(player);

  return settings.cards.find((entry) => isSameCardEntry(entry, card)) || null;
}

function shouldAutoSacCard(player, card) {
  if (isSafeCard(player, card)) {
    return {
      shouldSac: false,
      reason: "Safe-sac protected",
    };
  }

  const specificEntry = getSpecificSacEntry(player, card);

  if (specificEntry) {
    return {
      shouldSac: true,
      reason: "Auto-Sac card rule",
      mode: specificEntry.mode || "all",
    };
  }

  const settings = getAutoSacSettings(player);
  const rarity = getCardRarity(card);

  if (settings.rarities?.[rarity]) {
    return {
      shouldSac: true,
      reason: `Auto-Sac ${rarity} rarity rule`,
      mode: "all",
    };
  }

  return {
    shouldSac: false,
    reason: "Auto-Sac disabled",
  };
}

function findFragmentIndex(fragments, card) {
  const cardCode = normalizeCode(getCardCode(card));
  const cardName = normalize(getCardName(card));

  return (Array.isArray(fragments) ? fragments : []).findIndex((entry) => {
    const entryCode = normalizeCode(entry?.code || entry?.cardCode || "");
    const entryName = normalize(entry?.name || entry?.displayName || "");

    return (
      (entryCode && cardCode && entryCode === cardCode) ||
      (entryName && cardName && entryName === cardName)
    );
  });
}

function addFragmentAmount(fragments, card, amount = 1) {
  const arr = Array.isArray(fragments) ? [...fragments] : [];
  const addAmount = Math.max(1, Number(amount || 1));
  const index = findFragmentIndex(arr, card);

  if (index >= 0) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 0) + addAmount,
    };

    return arr;
  }

  arr.push({
    name: getCardName(card),
    amount: addAmount,
    rarity: getCardRarity(card),
    category: String(card?.cardRole || "").toLowerCase() === "boost" ? "boost" : "battle",
    code: getCardCode(card),
    image: card?.image || "",
  });

  return arr;
}

function removeFragmentAmount(fragments, cardOrCode, amount = 1) {
  const arr = Array.isArray(fragments) ? [...fragments] : [];
  const removeAmount = Math.max(1, Number(amount || 1));

  const card =
    typeof cardOrCode === "object"
      ? cardOrCode
      : {
          code: cardOrCode,
          name: cardOrCode,
        };

  const index = findFragmentIndex(arr, card);

  if (index < 0) return arr;

  const current = Number(arr[index].amount || 0);
  const left = current - removeAmount;

  if (left <= 0) {
    arr.splice(index, 1);
  } else {
    arr[index] = {
      ...arr[index],
      amount: left,
    };
  }

  return arr;
}

function addFragmentWithAutoSac(player, fragments, card, amount = 1) {
  const addAmount = Math.max(1, Number(amount || 1));
  const sacCheck = shouldAutoSacCard(player, card);

  if (!sacCheck.shouldSac) {
    return {
      fragments: addFragmentAmount(fragments, card, addAmount),
      berries: 0,
      sacrificed: 0,
      reason: "Converted into fragment",
    };
  }

  const berryValue = getSacBerryValue(card);
  const berries = berryValue * addAmount;

  // Important:
  // Auto-sac means the new duplicate fragment is converted directly into berries.
  // Do not add the new fragment to finv.
  return {
    fragments: Array.isArray(fragments) ? [...fragments] : [],
    berries,
    sacrificed: addAmount,
    reason: sacCheck.reason,
  };
}

module.exports = {
  normalize,
  getAutoSacSettings,
  shouldAutoSacCard,
  isSafeCard,
  addFragmentAmount,
  removeFragmentAmount,
  addFragmentWithAutoSac,
};