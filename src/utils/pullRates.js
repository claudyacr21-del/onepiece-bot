function getLuckyMultiplier(multiplier = 1) {
  const value = Number(multiplier || 1);
  if (!Number.isFinite(value) || value <= 1) return 1;
  return Math.min(3, value);
}

function normalizeRates(entries) {
  const safeEntries = entries
    .map((entry) => ({
      tier: entry.tier,
      rate: Math.max(0, Number(entry.rate || 0)),
    }))
    .filter((entry) => entry.tier && entry.rate > 0);

  const total = safeEntries.reduce((sum, entry) => sum + entry.rate, 0);
  if (total <= 0) return [];

  return safeEntries.map((entry) => ({
    ...entry,
    rate: (entry.rate / total) * 100,
  }));
}

function rollFromRates(rates, fallback = "C") {
  const validRates = normalizeRates(rates);
  if (!validRates.length) return fallback;

  let roll = Math.random() * 100;

  for (const entry of validRates) {
    roll -= entry.rate;
    if (roll <= 0) return entry.tier;
  }

  return validRates[validRates.length - 1]?.tier || fallback;
}

function applyLuckyCardRates({ c, b, a, s }, multiplier = 1) {
  const multi = getLuckyMultiplier(multiplier);

  const cRate = Math.max(0, Number(c || 0));
  const bRate = Math.max(0, Number(b || 0));
  const aRate = Math.max(0, Number(a || 0));
  const sRate = Math.max(0, Number(s || 0));

  if (multi <= 1) {
    return {
      c: cRate,
      b: bRate,
      a: aRate,
      s: sRate,
    };
  }

  const boostedSRate = sRate * multi;
  const additionalSRate = boostedSRate - sRate;

  return {
    c: Math.max(0, cRate - additionalSRate),
    b: bRate,
    a: aRate,
    s: boostedSRate,
  };
}

function applyLuckyRareRates({ c, b, a, s, ur }, multiplier = 1) {
  const multi = getLuckyMultiplier(multiplier);

  const cRate = Math.max(0, Number(c || 0));
  const bRate = Math.max(0, Number(b || 0));
  const aRate = Math.max(0, Number(a || 0));
  const sRate = Math.max(0, Number(s || 0));
  const urRate = Math.max(0, Number(ur || 0));

  if (multi <= 1) {
    return {
      c: cRate,
      b: bRate,
      a: aRate,
      s: sRate,
      ur: urRate,
    };
  }

  const boostedSRate = sRate * multi;
  const boostedUrRate = urRate * multi;

  const additionalRareRate =
    boostedSRate -
    sRate +
    boostedUrRate -
    urRate;

  return {
    c: Math.max(0, cRate - additionalRareRate),
    b: bRate,
    a: aRate,
    s: boostedSRate,
    ur: boostedUrRate,
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
      { tier: "C", rate: rates.c },
      { tier: "B", rate: rates.b },
      { tier: "A", rate: rates.a },
      { tier: "S", rate: rates.s },
      { tier: "UR", rate: rates.ur },
    ],
    "C"
  );
}

function rollStandardBaseTier(pullChanceBonus = 0, luckyMultiplier = 1) {
  const bonus = Math.max(0, Number(pullChanceBonus || 0));
  const sBonus = Math.min(5, bonus);
  const sRate = 1 + sBonus;
  const aRate = 10;
  const bRate = 34;
  const cRate = Math.max(0, 100 - sRate - aRate - bRate);

  return rollCardRates(
    applyLuckyCardRates(
      { c: cRate, b: bRate, a: aRate, s: sRate },
      luckyMultiplier
    )
  );
}

function rollVivreBaseTier(pullChanceBonus = 0, luckyMultiplier = 1) {
  const bonus = Math.max(0, Number(pullChanceBonus || 0));
  const sBonus = Math.min(5, bonus);
  const sRate = 1.6 + sBonus;
  const aRate = 14;
  const bRate = 33;
  const cRate = Math.max(0, 100 - sRate - aRate - bRate);

  return rollCardRates(
    applyLuckyCardRates(
      { c: cRate, b: bRate, a: aRate, s: sRate },
      luckyMultiplier
    )
  );
}

function rollPremiumBaseTier(pullChanceBonus = 0, luckyMultiplier = 1) {
  const bonus = Math.max(0, Number(pullChanceBonus || 0));
  const sBonus = Math.min(5, bonus);
  const sRate = 2.2 + sBonus;
  const aRate = 16;
  const bRate = 33;
  const cRate = Math.max(0, 100 - sRate - aRate - bRate);

  return rollCardRates(
    applyLuckyCardRates(
      { c: cRate, b: bRate, a: aRate, s: sRate },
      luckyMultiplier
    )
  );
}

function rollPremiumGuaranteedTier() {
  return "S";
}

function rollStandardContentType() {
  const roll = Math.random() * 100;
  if (roll < 43.5) return "battleCard";
  if (roll < 87) return "boostCard";
  if (roll < 95) return "weapon";
  if (roll < 97) return "devilFruit";
  return "ticket";
}

function rollVivreContentType() {
  const roll = Math.random() * 100;
  if (roll < 41.5) return "battleCard";
  if (roll < 83) return "boostCard";
  if (roll < 93) return "weapon";
  if (roll < 96) return "devilFruit";
  return "ticket";
}

function rollPremiumContentType() {
  const roll = Math.random() * 100;
  if (roll < 39.5) return "battleCard";
  if (roll < 79) return "boostCard";
  if (roll < 91) return "weapon";
  if (roll < 95) return "devilFruit";
  return "ticket";
}

function rollStandardDevilFruitTier(luckyMultiplier = 1) {
  return rollRareRates(
    applyLuckyRareRates(
      { c: 34, b: 34, a: 27, s: 4.5, ur: 0.5 },
      luckyMultiplier
    )
  );
}

function rollVivreDevilFruitTier(luckyMultiplier = 1) {
  return rollRareRates(
    applyLuckyRareRates(
      { c: 32, b: 32, a: 29, s: 6, ur: 1 },
      luckyMultiplier
    )
  );
}

function rollPremiumDevilFruitTier(luckyMultiplier = 1) {
  return rollRareRates(
    applyLuckyRareRates(
      { c: 29.5, b: 29.5, a: 31, s: 8, ur: 2 },
      luckyMultiplier
    )
  );
}

function rollStandardWeaponTier(luckyMultiplier = 1) {
  return rollRareRates(
    applyLuckyRareRates(
      { c: 34, b: 34, a: 27, s: 4.5, ur: 0.5 },
      luckyMultiplier
    )
  );
}

function rollVivreWeaponTier(luckyMultiplier = 1) {
  return rollRareRates(
    applyLuckyRareRates(
      { c: 32, b: 32, a: 29, s: 6, ur: 1 },
      luckyMultiplier
    )
  );
}

function rollPremiumWeaponTier(luckyMultiplier = 1) {
  return rollRareRates(
    applyLuckyRareRates(
      { c: 29.5, b: 29.5, a: 31, s: 8, ur: 2 },
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
