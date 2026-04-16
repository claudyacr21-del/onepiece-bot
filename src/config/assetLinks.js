const RARITY_BADGES = {
  C: "",
  B: "",
  A: "",
  S: "",
  SS: "",
  UR: "",
};

const CARD_IMAGES = {
  // contoh:
  // luffy_straw_hat: "https://...",
  // zoro_pirate_hunter: "https://...",
};

const WEAPON_IMAGES = {
  // enma: "https://...",
  // yoru: "https://...",
};

const SHIP_IMAGES = {
  // going_merry: "https://...",
  // thousand_sunny: "https://...",
};

const ISLAND_IMAGES = {
  // foosha_village: "https://...",
  // wano: "https://...",
};

function getRarityBadge(rarity) {
  return RARITY_BADGES[String(rarity || "").toUpperCase()] || "";
}

function getCardImage(code, fallback = "") {
  return CARD_IMAGES[code] || fallback || "";
}

function getWeaponImage(code, fallback = "") {
  return WEAPON_IMAGES[code] || fallback || "";
}

function getShipImage(code, fallback = "") {
  return SHIP_IMAGES[code] || fallback || "";
}

function getIslandImage(code, fallback = "") {
  return ISLAND_IMAGES[code] || fallback || "";
}

module.exports = {
  RARITY_BADGES,
  CARD_IMAGES,
  WEAPON_IMAGES,
  SHIP_IMAGES,
  ISLAND_IMAGES,
  getRarityBadge,
  getCardImage,
  getWeaponImage,
  getShipImage,
  getIslandImage,
};