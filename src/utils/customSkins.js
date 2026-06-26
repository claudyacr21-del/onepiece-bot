const { hydrateCard } = require("./evolution");

function normalizeCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function getCardDisplayName(card) {
  return card?.displayName || card?.name || card?.code || "Unknown Card";
}

function getSkinKey(card) {
  return normalizeCode(card?.code || card?.cardCode || card?.name || "");
}

function getCustomSkins(player) {
  return player?.customSkins && typeof player.customSkins === "object"
    ? player.customSkins
    : {};
}

function getSkinSet(player, cardOrCode) {
  const key =
    typeof cardOrCode === "string"
      ? normalizeCode(cardOrCode)
      : getSkinKey(cardOrCode);

  return getCustomSkins(player)[key] || null;
}

function getActiveSkin(player, cardOrCode) {
  const skinSet = getSkinSet(player, cardOrCode);
  if (!skinSet || !Array.isArray(skinSet.variants)) return null;

  const index = Math.max(
    0,
    Math.min(Number(skinSet.activeIndex || 0), skinSet.variants.length - 1)
  );

  return skinSet.variants[index] || null;
}

function applyCustomSkinToCard(player, card) {
  const hydrated = hydrateCard(card) || card || {};
  const skinSet = getSkinSet(player, hydrated);
  if (!skinSet || !Array.isArray(skinSet.variants) || !skinSet.variants.length) {
    return hydrated;
  }

  const activeSkin = getActiveSkin(player, hydrated);
  if (!activeSkin) return hydrated;

  const originalName =
    skinSet.originalName ||
    hydrated.originalDisplayName ||
    hydrated.displayName ||
    hydrated.name ||
    hydrated.code ||
    "Unknown Card";

  return {
    ...hydrated,

    displayName: activeSkin.name || hydrated.displayName || hydrated.name,
    skinTitle: activeSkin.title || "Exclusive Skin",
    skinImage: activeSkin.image || "",

    image: activeSkin.image || hydrated.image || "",

    originalDisplayName: originalName,
    skinnedCharacter: originalName,
    hasCustomSkin: true,
  };
}

function findOwnedCardByQuery(player, query) {
  const qName = normalizeName(query);
  const qCode = normalizeCode(query);

  const cards = Array.isArray(player?.cards) ? player.cards : [];

  return (
    cards.find((raw) => {
      const card = hydrateCard(raw) || raw || {};
      const names = [
        card.code,
        card.name,
        card.displayName,
        card.originalDisplayName,
      ];

      return names.some((value) => {
        return normalizeCode(value) === qCode || normalizeName(value) === qName;
      });
    }) || null
  );
}

function findSkinSetByQuery(player, query) {
  const qName = normalizeName(query);
  const qCode = normalizeCode(query);
  const skins = getCustomSkins(player);

  for (const [key, skinSet] of Object.entries(skins)) {
    const names = [
      key,
      skinSet.cardCode,
      skinSet.originalName,
      ...(Array.isArray(skinSet.variants)
        ? skinSet.variants.map((skin) => skin.name)
        : []),
    ];

    const matched = names.some((value) => {
      return normalizeCode(value) === qCode || normalizeName(value) === qName;
    });

    if (matched) {
      return {
        key,
        skinSet,
      };
    }
  }

  return null;
}

function getSkinVariantLabel(skin, index) {
  return `${index + 1}. ${skin?.name || "Unnamed Skin"}`;
}

module.exports = {
  normalizeCode,
  normalizeName,
  isUrl,

  getCardDisplayName,
  getSkinKey,
  getCustomSkins,
  getSkinSet,
  getActiveSkin,
  applyCustomSkinToCard,
  findOwnedCardByQuery,
  findSkinSetByQuery,
  getSkinVariantLabel,
};