function rollStandardBaseTier() {
  const roll = Math.random() * 100;
  if (roll < 47) return "C";
  if (roll < 79) return "B";
  if (roll < 97) return "A";
  return "S";
}

function rollPremiumBaseTier(pullChanceBonus = 0) {
  const bonus = Math.max(0, Number(pullChanceBonus || 0));
  const sBonus = Math.min(1.5, bonus * 0.1);
  const roll = Math.random() * 100;

  const sRate = 5.5 + sBonus;
  const aRate = 28;
  const bRate = 30;
  const cRate = Math.max(30, 100 - sRate - aRate - bRate);

  if (roll < cRate) return "C";
  if (roll < cRate + bRate) return "B";
  if (roll < cRate + bRate + aRate) return "A";
  return "S";
}

function rollVivreBaseTier(pullChanceBonus = 0) {
  const bonus = Math.max(0, Number(pullChanceBonus || 0));
  const sBonus = Math.min(0.75, bonus * 0.05);
  const roll = Math.random() * 100;

  const sRate = 4.25 + sBonus;
  const aRate = 23;
  const bRate = 31;
  const cRate = Math.max(34, 100 - sRate - aRate - bRate);

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
  if (roll < 50) return "battleCard";
  if (roll < 87) return "boostCard";
  if (roll < 92) return "weapon";
  if (roll < 95) return "devilFruit";
  return "ticket";
}

function rollPremiumContentType() {
  const roll = Math.random() * 100;
  if (roll < 45) return "battleCard";
  if (roll < 81) return "boostCard";
  if (roll < 88) return "weapon";
  if (roll < 93) return "devilFruit";
  return "ticket";
}

function rollVivreContentType() {
  const roll = Math.random() * 100;
  if (roll < 47.5) return "battleCard";
  if (roll < 84) return "boostCard";
  if (roll < 90) return "weapon";
  if (roll < 94) return "devilFruit";
  return "ticket";
}

function rollStandardDevilFruitTier() {
  const roll = Math.random() * 100;
  if (roll < 55) return "B";
  if (roll < 85) return "A";
  if (roll < 97) return "S";
  return "UR";
}

function rollPremiumDevilFruitTier() {
  const roll = Math.random() * 100;
  if (roll < 45) return "B";
  if (roll < 80) return "A";
  if (roll < 95) return "S";
  return "UR";
}

function rollVivreDevilFruitTier() {
  const roll = Math.random() * 100;
  if (roll < 50) return "B";
  if (roll < 82.5) return "A";
  if (roll < 96) return "S";
  return "UR";
}

module.exports = {
  rollStandardBaseTier,
  rollPremiumBaseTier,
  rollVivreBaseTier,
  rollPremiumGuaranteedTier,
  rollStandardContentType,
  rollPremiumContentType,
  rollVivreContentType,
  rollStandardDevilFruitTier,
  rollPremiumDevilFruitTier,
  rollVivreDevilFruitTier,
};