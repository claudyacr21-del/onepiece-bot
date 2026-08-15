function normalizeCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^model:\s*/i, "")
    .replace(/[^a-z0-9\s_-]+/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getCanonicalCardCodes(card) {
  return new Set(
    [
      card?.code,
      card?.baseCode,
      card?.cardCode,
      card?.characterCode,
      card?.templateCode,
    ]
      .map(normalizeCode)
      .filter(Boolean)
  );
}

function getFruitOwnerCodes(fruit) {
  return new Set(
    (Array.isArray(fruit?.owners) ? fruit.owners : [])
      .map(normalizeCode)
      .filter(Boolean)
  );
}

function canCardUseDevilFruit(card, fruit) {
  const ownerCodes = getFruitOwnerCodes(fruit);

  if (ownerCodes.size === 0) return true;

  const cardCodes = getCanonicalCardCodes(card);

  for (const ownerCode of ownerCodes) {
    if (cardCodes.has(ownerCode)) return true;
  }

  return false;
}

module.exports = {
  normalizeCode,
  getCanonicalCardCodes,
  getFruitOwnerCodes,
  canCardUseDevilFruit,
};