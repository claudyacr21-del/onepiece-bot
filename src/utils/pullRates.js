function rollStandardBaseTier() {
  const roll = Math.random() * 100;

  // Normal:
  // C 45% / B 32% / A 18% / S 5%
  if (roll < 45) return "C";
  if (roll < 77) return "B";
  if (roll < 95) return "A";
  return "S";
}

function rollPremiumBaseTier(pullChanceBonus = 0) {
  const bonus = Math.max(0, Number(pullChanceBonus || 0));
  const sBonus = Math.min(2, bonus * 0.1);
  const roll = Math.random() * 100;

  // Premium:
  // C 34% / B 30% / A 28% / S 8%
  // S can gently rise up to 10% with pull chance bonus.
  const sRate = 8 + sBonus;
  const aRate = 28;
  const bRate = 30;
  const cRate = Math.max(25, 100 - sRate - aRate - bRate);

  if (roll < cRate) return "C";
  if (roll < cRate + bRate) return "B";
  if (roll < cRate + bRate + aRate) return "A";
  return "S";
}

function rollPremiumGuaranteedTier() {
  return "S";
}

function rollStandardContentType() {
  const roll = Math.random() * 100;

  // Normal:
  // Battle 64% / Boost 18% / Weapon 5% / Devil Fruit 5% / Ticket 8%
  if (roll < 64) return "battleCard";
  if (roll < 82) return "boostCard";
  if (roll < 87) return "weapon";
  if (roll < 92) return "devilFruit";
  return "ticket";
}

function rollPremiumContentType() {
  const roll = Math.random() * 100;

  // Premium:
  // Battle 55% / Boost 20% / Weapon 7% / Devil Fruit 7% / Ticket 11%
  if (roll < 55) return "battleCard";
  if (roll < 75) return "boostCard";
  if (roll < 82) return "weapon";
  if (roll < 89) return "devilFruit";
  return "ticket";
}

module.exports = {
  rollStandardBaseTier,
  rollPremiumBaseTier,
  rollPremiumGuaranteedTier,
  rollStandardContentType,
  rollPremiumContentType,
};