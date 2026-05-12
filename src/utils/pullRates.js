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
  // Battle 50% / Boost 37% / Weapon 5% / Devil Fruit 3% / Ticket 5%
  if (roll < 50) return "battleCard";
  if (roll < 87) return "boostCard";
  if (roll < 92) return "weapon";
  if (roll < 95) return "devilFruit";
  return "ticket";
}

function rollPremiumContentType() {
  const roll = Math.random() * 100;

  // Premium:
  // Battle 45% / Boost 36% / Weapon 7% / Devil Fruit 5% / Ticket 7%
  if (roll < 45) return "battleCard";
  if (roll < 81) return "boostCard";
  if (roll < 88) return "weapon";
  if (roll < 93) return "devilFruit";
  return "ticket";
}

function rollStandardDevilFruitTier() {
  const roll = Math.random() * 100;

  // Normal Devil Fruit:
  // B 55% / A 30% / S 12% / UR 3%
  if (roll < 55) return "B";
  if (roll < 85) return "A";
  if (roll < 97) return "S";
  return "UR";
}

function rollPremiumDevilFruitTier() {
  const roll = Math.random() * 100;

  // Premium Devil Fruit:
  // B 45% / A 35% / S 15% / UR 5%
  if (roll < 45) return "B";
  if (roll < 80) return "A";
  if (roll < 95) return "S";
  return "UR";
}

module.exports = {
  rollStandardBaseTier,
  rollPremiumBaseTier,
  rollPremiumGuaranteedTier,
  rollStandardContentType,
  rollPremiumContentType,
  rollStandardDevilFruitTier,
  rollPremiumDevilFruitTier,
};