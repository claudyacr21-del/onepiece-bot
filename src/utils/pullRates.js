function rollStandardBaseTier() {
  const roll = Math.random() * 100;

  // Normal:
  // C 47% / B 32% / A 18% / S 3%
  if (roll < 47) return "C";
  if (roll < 79) return "B";
  if (roll < 97) return "A";
  return "S";
}

function rollPremiumBaseTier(pullChanceBonus = 0) {
  const bonus = Math.max(0, Number(pullChanceBonus || 0));
  const sBonus = Math.min(1.5, bonus * 0.1);
  const roll = Math.random() * 100;

  // Premium:
  // C 36.5% / B 30% / A 28% / S 5.5%
  // S can gently rise up to 7% with pull chance bonus.
  const sRate = 5.5 + sBonus;
  const aRate = 28;
  const bRate = 30;
  const cRate = Math.max(30, 100 - sRate - aRate - bRate);

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
  // Battle 66% / Boost 18% / Weapon 5% / Devil Fruit 3% / Ticket 8%
  if (roll < 66) return "battleCard";
  if (roll < 84) return "boostCard";
  if (roll < 89) return "weapon";
  if (roll < 92) return "devilFruit";
  return "ticket";
}

function rollPremiumContentType() {
  const roll = Math.random() * 100;

  // Premium:
  // Battle 57% / Boost 20% / Weapon 7% / Devil Fruit 5% / Ticket 11%
  if (roll < 57) return "battleCard";
  if (roll < 77) return "boostCard";
  if (roll < 84) return "weapon";
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