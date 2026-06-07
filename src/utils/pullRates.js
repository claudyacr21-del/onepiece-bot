function getLuckyMultiplier(multiplier = 1) {
  const value = Number(multiplier || 1);

  if (!Number.isFinite(value) || value <= 1) return 1;

  return Math.min(3, value);
}

function rollFromRates(rates, fallback = "C") {
  const validRates = rates
    .map((entry) => ({
      tier: entry.tier,
      rate: Math.max(0, Number(entry.rate || 0)),
    }))
    .filter((entry) => entry.tier && entry.rate > 0);

  if (!validRates.length) return fallback;

  const total = validRates.reduce((sum, entry) => sum + entry.rate, 0);
  let roll = Math.random() * total;

  for (const entry of validRates) {
    roll -= entry.rate;
    if (roll <= 0) return entry.tier;
  }

  return validRates[validRates.length - 1]?.tier || fallback;
}

function applyLuckyCardRates({ c, b, a, s }, multiplier = 1) {
  const multi = getLuckyMultiplier(multiplier);

  if (multi <= 1) {
    return { c, b, a, s };
  }

  const nextB = Number(b || 0) * multi;
  const nextA = Number(a || 0) * multi;
  const nextS = Number(s || 0) * multi;
  const nextC = Math.max(1, 100 - nextB - nextA - nextS);

  return {
    c: nextC,
    b: nextB,
    a: nextA,
    s: nextS,
  };
}

function applyLuckyRareRates({ b, a, s, ur }, multiplier = 1) {
  const multi = getLuckyMultiplier(multiplier);

  if (multi <= 1) {
    return { b, a, s, ur };
  }

  const nextA = Number(a || 0) * multi;
  const nextS = Number(s || 0) * multi;
  const nextUR = Number(ur || 0) * multi;
  const nextB = Math.max(1, 100 - nextA - nextS - nextUR);

  return {
    b: nextB,
    a: nextA,
    s: nextS,
    ur: nextUR,
  };
}

function rollCardRates(rates) {
  return rollFromRates(
    [
      { tier: "C", rate: rates.c },
      { tier: "B", rate: rates.b },
      { tier: "A", rate: rates.a },
      { tier: "S", rate: rates.s },
    ],
    "C"
  );
}

function rollRareRates(rates) {
  return rollFromRates(
    [
      { tier: "B", rate: rates.b },
      { tier: "A", rate: rates.a },
      { tier: "S", rate: rates.s },
      { tier: "UR", rate: rates.ur },
    ],
    "B"
  );
}

function rollStandardBaseTier(pullChanceBonus = 0, luckyMultiplier = 1) {
  const bonus = Math.max(0, Number(pullChanceBonus || 0));
  const sBonus = Math.min(5, bonus);

  // Normal Card / Boost Card:
  // Base: C 55% / B 34% / A 10% / S 1%
  // Pirate Luck Boost adds directly to S rate.
  // Lucky Week multiplies B/A/S rates after Pirate Luck is applied.
  const sRate = 1 + sBonus;
  const aRate = 10;
  const bRate = 34;
  const cRate = Math.max(40, 100 - sRate - aRate - bRate);

  return rollCardRates(
    applyLuckyCardRates(
      {
        c: cRate,
        b: bRate,
        a: aRate,
        s: sRate,
      },
      luckyMultiplier
    )
  );
}

function rollVivreBaseTier(pullChanceBonus = 0, luckyMultiplier = 1) {
  const bonus = Math.max(0, Number(pullChanceBonus || 0));
  const sBonus = Math.min(5, bonus);

  // Vivre Card Card / Boost Card:
  // C 51.4% / B 33% / A 14% / S 1.6%
  // Pirate Luck Boost adds directly to S rate.
  // Lucky Week multiplies B/A/S rates after Pirate Luck is applied.
  const sRate = 1.6 + sBonus;
  const aRate = 14;
  const bRate = 33;
  const cRate = Math.max(48, 100 - sRate - aRate - bRate);

  return rollCardRates(
    applyLuckyCardRates(
      {
        c: cRate,
        b: bRate,
        a: aRate,
        s: sRate,
      },
      luckyMultiplier
    )
  );
}

function rollPremiumBaseTier(pullChanceBonus = 0, luckyMultiplier = 1) {
  const bonus = Math.max(0, Number(pullChanceBonus || 0));
  const sBonus = Math.min(5, bonus);

  // Mother Flame Card / Boost Card:
  // C 48.8% / B 33% / A 16% / S 2.2%
  // Pirate Luck Boost adds directly to S rate.
  // Lucky Week multiplies B/A/S rates after Pirate Luck is applied.
  const sRate = 2.2 + sBonus;
  const aRate = 16;
  const bRate = 33;
  const cRate = Math.max(45, 100 - sRate - aRate - bRate);

  return rollCardRates(
    applyLuckyCardRates(
      {
        c: cRate,
        b: bRate,
        a: aRate,
        s: sRate,
      },
      luckyMultiplier
    )
  );
}

function rollPremiumGuaranteedTier() {
  return "S";
}

function rollStandardContentType() {
  const roll = Math.random() * 100;

  // Normal:
  // Battle 43.5% / Boost 43.5% / Weapon 8% / Devil Fruit 2% / Ticket 3%
  if (roll < 43.5) return "battleCard";
  if (roll < 87) return "boostCard";
  if (roll < 95) return "weapon";
  if (roll < 97) return "devilFruit";
  return "ticket";
}

function rollVivreContentType() {
  const roll = Math.random() * 100;

  // Vivre Card:
  // Battle 41.5% / Boost 41.5% / Weapon 10% / Devil Fruit 3% / Ticket 4%
  if (roll < 41.5) return "battleCard";
  if (roll < 83) return "boostCard";
  if (roll < 93) return "weapon";
  if (roll < 96) return "devilFruit";
  return "ticket";
}

function rollPremiumContentType() {
  const roll = Math.random() * 100;

  // Mother Flame:
  // Battle 39.5% / Boost 39.5% / Weapon 12% / Devil Fruit 4% / Ticket 5%
  if (roll < 39.5) return "battleCard";
  if (roll < 79) return "boostCard";
  if (roll < 91) return "weapon";
  if (roll < 95) return "devilFruit";
  return "ticket";
}

function rollStandardDevilFruitTier(luckyMultiplier = 1) {
  // Normal Devil Fruit:
  // Base: B 68% / A 27% / S 4.5% / UR 0.5%
  // Lucky Week multiplies A/S/UR rates.
  return rollRareRates(
    applyLuckyRareRates(
      {
        b: 68,
        a: 27,
        s: 4.5,
        ur: 0.5,
      },
      luckyMultiplier
    )
  );
}

function rollVivreDevilFruitTier(luckyMultiplier = 1) {
  // Vivre Card Devil Fruit:
  // Base: B 64% / A 29% / S 6% / UR 1%
  // Lucky Week multiplies A/S/UR rates.
  return rollRareRates(
    applyLuckyRareRates(
      {
        b: 64,
        a: 29,
        s: 6,
        ur: 1,
      },
      luckyMultiplier
    )
  );
}

function rollPremiumDevilFruitTier(luckyMultiplier = 1) {
  // Mother Flame Devil Fruit:
  // Base: B 59% / A 31% / S 8% / UR 2%
  // Lucky Week multiplies A/S/UR rates.
  return rollRareRates(
    applyLuckyRareRates(
      {
        b: 59,
        a: 31,
        s: 8,
        ur: 2,
      },
      luckyMultiplier
    )
  );
}

function rollStandardWeaponTier(luckyMultiplier = 1) {
  // Normal Weapon:
  // Same as Normal Devil Fruit
  // Base: B 68% / A 27% / S 4.5% / UR 0.5%
  // Lucky Week multiplies A/S/UR rates.
  return rollRareRates(
    applyLuckyRareRates(
      {
        b: 68,
        a: 27,
        s: 4.5,
        ur: 0.5,
      },
      luckyMultiplier
    )
  );
}

function rollVivreWeaponTier(luckyMultiplier = 1) {
  // Vivre Card Weapon:
  // Same as Vivre Card Devil Fruit
  // Base: B 64% / A 29% / S 6% / UR 1%
  // Lucky Week multiplies A/S/UR rates.
  return rollRareRates(
    applyLuckyRareRates(
      {
        b: 64,
        a: 29,
        s: 6,
        ur: 1,
      },
      luckyMultiplier
    )
  );
}

function rollPremiumWeaponTier(luckyMultiplier = 1) {
  // Mother Flame Weapon:
  // Same as Mother Flame Devil Fruit
  // Base: B 59% / A 31% / S 8% / UR 2%
  // Lucky Week multiplies A/S/UR rates.
  return rollRareRates(
    applyLuckyRareRates(
      {
        b: 59,
        a: 31,
        s: 8,
        ur: 2,
      },
      luckyMultiplier
    )
  );
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