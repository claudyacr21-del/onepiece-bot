const RARITY_BADGES = {
  C: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237259963301898/badge_C.png?ex=69e1e064&is=69e08ee4&hm=a2b237507f8524f0edffb83bd19708e4775a48049e2e37445c231bb2abd56665&",
  B: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237259631693994/badge_B.png?ex=69e1e064&is=69e08ee4&hm=40df7e7b3dc2f96f6792015bbc60f8d54461ead429df60a7552140f5f5fd3131&",
  A: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237259346477067/badge_A.png?ex=69e1e064&is=69e08ee4&hm=019224c7ebd6fe08c9f67f2fe4e5261d2c0502f1389cb80a000943a587a48aa6&",
  S: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237260273418410/badge_S.png?ex=69e1e064&is=69e08ee4&hm=99c0019d884c4bcb6eee4defdac9b851f130ca487c95680f8c70afb85db36f58&",
  SS: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237260596383755/badge_SS.png?ex=69e1e064&is=69e08ee4&hm=4b1d718f4cc3bd3cca43ae5f5a1a41b18320d5a814662313778b859b5a71b7dd&",
  UR: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237258910531736/badge_UR.png?ex=69e1e064&is=69e08ee4&hm=ff41f72431bcb6c2ea3acc190a98f536a491a11adbc11d9f6764ff79a0640a83&",
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