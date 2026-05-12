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

  // Mother Flame:
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

function rollVivreCardBaseTier(pullChanceBonus = 0) {
  const bonus = Math.max(0, Number(pullChanceBonus || 0));
  const sBonus = Math.min(0.75, bonus * 0.05);
  const roll = Math.random() * 100;

  // Vivre Card = 50% bonus from Mother Flame above normal.
  // Normal: C 47 / B 32 / A 18 / S 3
  // Mother Flame: C 36.5 / B 30 / A 28 / S 5.5
  // Vivre Card: C 41.75 / B 31 / A 23 / S 4.25
  const sRate = 4.25 + sBonus;
  const aRate = 23;
  const bRate = 31;
  const cRate = Math.max(35, 100 - sRate - aRate - bRate);

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

  // Mother Flame:
  // Battle 45% / Boost 36% / Weapon 7% / Devil Fruit 5% / Ticket 7%
  if (roll < 45) return "battleCard";
  if (roll < 81) return "boostCard";
  if (roll < 88) return "weapon";
  if (roll < 93) return "devilFruit";
  return "ticket";
}

function rollVivreCardContentType() {
  const roll = Math.random() * 100;

  // Vivre Card = halfway between normal and Mother Flame content rates.
  // Normal: Battle 50 / Boost 37 / Weapon 5 / Devil Fruit 3 / Ticket 5
  // Mother Flame: Battle 45 / Boost 36 / Weapon 7 / Devil Fruit 5 / Ticket 7
  // Vivre Card: Battle 47.5 / Boost 36.5 / Weapon 6 / Devil Fruit 4 / Ticket 6
  if (roll < 47.5) return "battleCard";
  if (roll < 84) return "boostCard";
  if (roll < 90) return "weapon";
  if (roll < 94) return "devilFruit";
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

  // Mother Flame Devil Fruit:
  // B 45% / A 35% / S 15% / UR 5%
  if (roll < 45) return "B";
  if (roll < 80) return "A";
  if (roll < 95) return "S";
  return "UR";
}

function rollVivreCardDevilFruitTier() {
  const roll = Math.random() * 100;

  // Vivre Card = halfway between normal and Mother Flame devil fruit rates.
  // Normal: B 55 / A 30 / S 12 / UR 3
  // Mother Flame: B 45 / A 35 / S 15 / UR 5
  // Vivre Card: B 50 / A 32.5 / S 13.5 / UR 4
  if (roll < 50) return "B";
  if (roll < 82.5) return "A";
  if (roll < 96) return "S";
  return "UR";
}

function rollBaseTierByPremiumTier(tier, pullChanceBonus = 0) {
  if (tier === "mother_flame") return rollPremiumBaseTier(pullChanceBonus);
  if (tier === "vivre_card") return rollVivreCardBaseTier(pullChanceBonus);
  return rollStandardBaseTier();
}

function rollContentTypeByPremiumTier(tier) {
  if (tier === "mother_flame") return rollPremiumContentType();
  if (tier === "vivre_card") return rollVivreCardContentType();
  return rollStandardContentType();
}

function rollDevilFruitTierByPremiumTier(tier) {
  if (tier === "mother_flame") return rollPremiumDevilFruitTier();
  if (tier === "vivre_card") return rollVivreCardDevilFruitTier();
  return rollStandardDevilFruitTier();
}

module.exports = {
  rollStandardBaseTier,
  rollPremiumBaseTier,
  rollVivreCardBaseTier,
  rollPremiumGuaranteedTier,
  rollStandardContentType,
  rollPremiumContentType,
  rollVivreCardContentType,
  rollStandardDevilFruitTier,
  rollPremiumDevilFruitTier,
  rollVivreCardDevilFruitTier,
  rollBaseTierByPremiumTier,
  rollContentTypeByPremiumTier,
  rollDevilFruitTierByPremiumTier,
};