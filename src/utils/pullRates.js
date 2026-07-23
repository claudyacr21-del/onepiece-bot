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

function rollContentTypeWithLucky(
  rates,
  luckyMultiplier = 1
) {
  const multi = getLuckyMultiplier(
    luckyMultiplier
  );

  const battleRate = Math.max(
    0,
    Number(rates.battleCard || 0)
  );

  const boostRate = Math.max(
    0,
    Number(rates.boostCard || 0)
  );

  const weaponRate = Math.max(
    0,
    Number(rates.weapon || 0)
  );

  const devilFruitRate = Math.max(
    0,
    Number(rates.devilFruit || 0)
  );

  const ticketRate = Math.max(
    0,
    Number(rates.ticket || 0)
  );

  const boostedWeaponRate =
    weaponRate * multi;

  const boostedDevilFruitRate =
    devilFruitRate * multi;

  const boostedTicketRate =
    ticketRate * multi;

  const originalRareTotal =
    weaponRate +
    devilFruitRate +
    ticketRate;

  const boostedRareTotal =
    boostedWeaponRate +
    boostedDevilFruitRate +
    boostedTicketRate;

  const additionalRareRate =
    boostedRareTotal -
    originalRareTotal;

  const commonTotal =
    battleRate +
    boostRate;

  const remainingCommonTotal = Math.max(
    0,
    commonTotal - additionalRareRate
  );

  const commonScale =
    commonTotal > 0
      ? remainingCommonTotal / commonTotal
      : 0;

  return rollFromRates(
    [
      {
        tier: "battleCard",
        rate: battleRate * commonScale,
      },
      {
        tier: "boostCard",
        rate: boostRate * commonScale,
      },
      {
        tier: "weapon",
        rate: boostedWeaponRate,
      },
      {
        tier: "devilFruit",
        rate: boostedDevilFruitRate,
      },
      {
        tier: "ticket",
        rate: boostedTicketRate,
      },
    ],
    "battleCard"
  );
}

function rollStandardContentType(
  luckyMultiplier = 1
) {
  return rollContentTypeWithLucky(
    {
      battleCard: 43.5,
      boostCard: 43.5,
      weapon: 8,
      devilFruit: 2,
      ticket: 3,
    },
    luckyMultiplier
  );
}

function rollVivreContentType(
  luckyMultiplier = 1
) {
  return rollContentTypeWithLucky(
    {
      battleCard: 41.5,
      boostCard: 41.5,
      weapon: 10,
      devilFruit: 3,
      ticket: 4,
    },
    luckyMultiplier
  );
}

function rollPremiumContentType(
  luckyMultiplier = 1
) {
  return rollContentTypeWithLucky(
    {
      battleCard: 39.5,
      boostCard: 39.5,
      weapon: 12,
      devilFruit: 4,
      ticket: 5,
    },
    luckyMultiplier
  );
}

function applyPirateLuckToRareRates(
  rates,
  pullChanceBonus = 0
) {
  const bonus = Math.min(
    5,
    Math.max(
      0,
      Number(pullChanceBonus || 0)
    )
  );

  return {
    ...rates,
    c: Math.max(
      0,
      Number(rates.c || 0) - bonus
    ),
    s: Number(rates.s || 0) + bonus,
  };
}

function rollStandardDevilFruitTier(
  pullChanceBonus = 0,
  luckyMultiplier = 1
) {
  const rates = applyPirateLuckToRareRates(
    {
      c: 34,
      b: 34,
      a: 27,
      s: 4.5,
      ur: 0.5,
    },
    pullChanceBonus
  );

  return rollRareRates(
    applyLuckyRareRates(
      rates,
      luckyMultiplier
    )
  );
}

function rollVivreDevilFruitTier(
  pullChanceBonus = 0,
  luckyMultiplier = 1
) {
  const rates = applyPirateLuckToRareRates(
    {
      c: 32,
      b: 32,
      a: 29,
      s: 6,
      ur: 1,
    },
    pullChanceBonus
  );

  return rollRareRates(
    applyLuckyRareRates(
      rates,
      luckyMultiplier
    )
  );
}

function rollPremiumDevilFruitTier(
  pullChanceBonus = 0,
  luckyMultiplier = 1
) {
  const rates = applyPirateLuckToRareRates(
    {
      c: 29.5,
      b: 29.5,
      a: 31,
      s: 8,
      ur: 2,
    },
    pullChanceBonus
  );

  return rollRareRates(
    applyLuckyRareRates(
      rates,
      luckyMultiplier
    )
  );
}

function rollStandardWeaponTier(
  pullChanceBonus = 0,
  luckyMultiplier = 1
) {
  const rates = applyPirateLuckToRareRates(
    {
      c: 34,
      b: 34,
      a: 27,
      s: 4.5,
      ur: 0.5,
    },
    pullChanceBonus
  );

  return rollRareRates(
    applyLuckyRareRates(
      rates,
      luckyMultiplier
    )
  );
}

function rollVivreWeaponTier(
  pullChanceBonus = 0,
  luckyMultiplier = 1
) {
  const rates = applyPirateLuckToRareRates(
    {
      c: 32,
      b: 32,
      a: 29,
      s: 6,
      ur: 1,
    },
    pullChanceBonus
  );

  return rollRareRates(
    applyLuckyRareRates(
      rates,
      luckyMultiplier
    )
  );
}

function rollPremiumWeaponTier(
  pullChanceBonus = 0,
  luckyMultiplier = 1
) {
  const rates = applyPirateLuckToRareRates(
    {
      c: 29.5,
      b: 29.5,
      a: 31,
      s: 8,
      ur: 2,
    },
    pullChanceBonus
  );

  return rollRareRates(
    applyLuckyRareRates(
      rates,
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
