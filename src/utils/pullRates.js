function rollStandardBaseTier() {
  const roll = Math.random() * 100;
  if (roll < 56) return "C";
  if (roll < 84) return "B";
  if (roll < 96.5) return "A";
  return "S";
}

function rollPremiumBaseTier() {
  const roll = Math.random() * 100;
  if (roll < 40) return "C";
  if (roll < 68) return "B";
  if (roll < 90) return "A";
  return "S";
}

module.exports = {
  rollStandardBaseTier,
  rollPremiumBaseTier,
};