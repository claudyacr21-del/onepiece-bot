const RARITY_COLORS = Object.freeze({
  C: 0x7f8c8d,
  B: 0x2ecc71,
  A: 0x3498db,
  S: 0xf1c40f,
  SS: 0x9b59b6,
  UR: 0xe74c3c,
  M: 0x050505,
  EV: 0x62e8ff,
});

function getRarityColor(rarity) {
  const tier = String(rarity || "C")
    .toUpperCase()
    .trim();

  return RARITY_COLORS[tier] || RARITY_COLORS.C;
}

module.exports = {
  RARITY_COLORS,
  getRarityColor,
};