function getEquippedBoostFruitBonus(card, equippedFruit) {
  if (!card || card.cardRole !== "boost" || !equippedFruit) {
    return 0;
  }

  const boostType = card.boostType;
  const boostBonus = equippedFruit.boostBonus || {};

  return Number(boostBonus[boostType] || 0);
}

module.exports = {
  getEquippedBoostFruitBonus
};