function rollStandardBaseTier() {
  const roll = Math.random() * 100;

  // Non-premium:
  // C 60% / B 25% / A 13% / S 2%
  if (roll < 60) return "C";
  if (roll < 85) return "B";
  if (roll < 98) return "A";
  return "S";
}

function rollPremiumBaseTier(pullChanceBonus = 0) {
  const bonus = Math.max(0, Number(pullChanceBonus || 0));
  const roll = Math.random() * 100;

  // Premium base:
  // C 45% / B 30% / A 20% / S 5%
  // Pull chance bonus only adds gently to S rate.
  const sRate = Math.min(8, 5 + bonus * 0.1);
  const aRate = 20;
  const bRate = 30;

  if (roll < 45) return "C";
  if (roll < 45 + bRate) return "B";
  if (roll < 45 + bRate + aRate) return "A";
  return "S";
}

function rollPremiumGuaranteedTier() {
  // Premium pity = guaranteed S only.
  return "S";
}

module.exports = {
  rollStandardBaseTier,
  rollPremiumBaseTier,
  rollPremiumGuaranteedTier,
};