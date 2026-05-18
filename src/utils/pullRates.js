function rollStandardBaseTier() {
  const roll = Math.random() * 100;

  // Normal Card / Boost Card:
  // C 55% / B 34% / A 10% / S 1%
  if (roll < 55) return "C";
  if (roll < 89) return "B";
  if (roll < 99) return "A";
  return "S";
}

function rollVivreBaseTier(pullChanceBonus = 0) {
  const bonus = Math.max(0, Number(pullChanceBonus || 0));
  const sBonus = Math.min(0.4, bonus * 0.03);
  const roll = Math.random() * 100;

  // Vivre Card Card / Boost Card:
  // C 51.4% / B 33% / A 14% / S 1.6%
  // S can gently rise up to 2% with pull chance bonus.
  const sRate = 1.6 + sBonus;
  const aRate = 14;
  const bRate = 33;
  const cRate = Math.max(48, 100 - sRate - aRate - bRate);

  if (roll < cRate) return "C";
  if (roll < cRate + bRate) return "B";
  if (roll < cRate + bRate + aRate) return "A";
  return "S";
}

function rollPremiumBaseTier(pullChanceBonus = 0) {
  const bonus = Math.max(0, Number(pullChanceBonus || 0));
  const sBonus = Math.min(0.8, bonus * 0.05);
  const roll = Math.random() * 100;

  // Mother Flame Card / Boost Card:
  // C 48.8% / B 33% / A 16% / S 2.2%
  // S can gently rise up to 3% with pull chance bonus.
  const sRate = 2.2 + sBonus;
  const aRate = 16;
  const bRate = 33;
  const cRate = Math.max(45, 100 - sRate - aRate - bRate);

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
  // Battle 44% / Boost 44% / Weapon 8% / Devil Fruit 2% / Ticket 2%
  if (roll < 44) return "battleCard";
  if (roll < 88) return "boostCard";
  if (roll < 96) return "weapon";
  if (roll < 98) return "devilFruit";
  return "ticket";
}

function rollVivreContentType() {
  const roll = Math.random() * 100;

  // Vivre Card:
  // Battle 42% / Boost 42% / Weapon 10% / Devil Fruit 3% / Ticket 3%
  if (roll < 42) return "battleCard";
  if (roll < 84) return "boostCard";
  if (roll < 94) return "weapon";
  if (roll < 97) return "devilFruit";
  return "ticket";
}

function rollPremiumContentType() {
  const roll = Math.random() * 100;

  // Mother Flame:
  // Battle 40% / Boost 40% / Weapon 12% / Devil Fruit 4% / Ticket 4%
  if (roll < 40) return "battleCard";
  if (roll < 80) return "boostCard";
  if (roll < 92) return "weapon";
  if (roll < 96) return "devilFruit";
  return "ticket";
}

function rollStandardDevilFruitTier() {
  const roll = Math.random() * 100;

  // Normal Devil Fruit:
  // B 68% / A 27% / S 4.5% / UR 0.5%
  if (roll < 68) return "B";
  if (roll < 95) return "A";
  if (roll < 99.5) return "S";
  return "UR";
}

function rollVivreDevilFruitTier() {
  const roll = Math.random() * 100;

  // Vivre Card Devil Fruit:
  // B 64% / A 29% / S 6% / UR 1%
  if (roll < 64) return "B";
  if (roll < 93) return "A";
  if (roll < 99) return "S";
  return "UR";
}

function rollPremiumDevilFruitTier() {
  const roll = Math.random() * 100;

  // Mother Flame Devil Fruit:
  // B 59% / A 31% / S 8% / UR 2%
  if (roll < 59) return "B";
  if (roll < 90) return "A";
  if (roll < 98) return "S";
  return "UR";
}

function rollStandardWeaponTier() {
  const roll = Math.random() * 100;

  // Normal Weapon:
  // Same as Normal Devil Fruit
  // B 68% / A 27% / S 4.5% / UR 0.5%
  if (roll < 68) return "B";
  if (roll < 95) return "A";
  if (roll < 99.5) return "S";
  return "UR";
}

function rollVivreWeaponTier() {
  const roll = Math.random() * 100;

  // Vivre Card Weapon:
  // Same as Vivre Card Devil Fruit
  // B 64% / A 29% / S 6% / UR 1%
  if (roll < 64) return "B";
  if (roll < 93) return "A";
  if (roll < 99) return "S";
  return "UR";
}

function rollPremiumWeaponTier() {
  const roll = Math.random() * 100;

  // Mother Flame Weapon:
  // Same as Mother Flame Devil Fruit
  // B 59% / A 31% / S 8% / UR 2%
  if (roll < 59) return "B";
  if (roll < 90) return "A";
  if (roll < 98) return "S";
  return "UR";
}

module.exports = {
  rollStandardBaseTier,
  rollVivreBaseTier,
  rollPremiumBaseTier,
  rollPremiumGuaranteedTier,

  rollStandardContentType,
  rollVivreContentType,
  rollPremiumContentType,

  rollStandardDevilFruitTier,
  rollVivreDevilFruitTier,
  rollPremiumDevilFruitTier,

  rollStandardWeaponTier,
  rollVivreWeaponTier,
  rollPremiumWeaponTier,
};