const fs = require("fs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
  console.log(`[patched] ${file}`);
}

function findFunctionRange(content, functionName) {
  const marker = `function ${functionName}`;
  const start = content.indexOf(marker);
  if (start === -1) throw new Error(`Function not found: ${functionName}`);

  const firstBrace = content.indexOf("{", start);
  if (firstBrace === -1) throw new Error(`Opening brace not found: ${functionName}`);

  let depth = 0;
  for (let i = firstBrace; i < content.length; i++) {
    const char = content[i];
    if (char === "{") depth++;
    if (char === "}") depth--;
    if (depth === 0) {
      return { start, end: i + 1 };
    }
  }

  throw new Error(`Closing brace not found: ${functionName}`);
}

function replaceFunction(content, functionName, replacement) {
  const range = findFunctionRange(content, functionName);
  return content.slice(0, range.start) + replacement + content.slice(range.end);
}

const pullRatesPath = "src/utils/pullRates.js";
write(
  pullRatesPath,
`function getLuckyMultiplier(multiplier = 1) {
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

  return {
    c: Number(c || 0),
    b: Number(b || 0) * multi,
    a: Number(a || 0) * multi,
    s: Number(s || 0) * multi,
  };
}

function applyLuckyRareRates({ b, a, s, ur }, multiplier = 1) {
  const multi = getLuckyMultiplier(multiplier);

  return {
    b: Number(b || 0),
    a: Number(a || 0) * multi,
    s: Number(s || 0) * multi,
    ur: Number(ur || 0) * multi,
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
    applyLuckyRareRates({ b: 68, a: 27, s: 4.5, ur: 0.5 }, luckyMultiplier)
  );
}

function rollVivreDevilFruitTier(luckyMultiplier = 1) {
  return rollRareRates(
    applyLuckyRareRates({ b: 64, a: 29, s: 6, ur: 1 }, luckyMultiplier)
  );
}

function rollPremiumDevilFruitTier(luckyMultiplier = 1) {
  return rollRareRates(
    applyLuckyRareRates({ b: 59, a: 31, s: 8, ur: 2 }, luckyMultiplier)
  );
}

function rollStandardWeaponTier(luckyMultiplier = 1) {
  return rollRareRates(
    applyLuckyRareRates({ b: 68, a: 27, s: 4.5, ur: 0.5 }, luckyMultiplier)
  );
}

function rollVivreWeaponTier(luckyMultiplier = 1) {
  return rollRareRates(
    applyLuckyRareRates({ b: 64, a: 29, s: 6, ur: 1 }, luckyMultiplier)
  );
}

function rollPremiumWeaponTier(luckyMultiplier = 1) {
  return rollRareRates(
    applyLuckyRareRates({ b: 59, a: 31, s: 8, ur: 2 }, luckyMultiplier)
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
`
);

const pullPath = "src/commands/pull.js";
let pull = read(pullPath);

pull = replaceFunction(
  pull,
  "getTicketPool",
`function getTicketPool(pullTier = "normal") {
  const tier = String(pullTier || "normal");

  const baseTickets = {
    common: {
      code: "common_raid_ticket",
      name: "Common Raid Ticket",
      rarity: "B",
      type: "Ticket",
      image: "https://cdn.discordapp.com/attachments/1493204525975076944/1503019862086254712/content.png?ex=6a01d3d3&is=6a008253&hm=3adddcd707caa59db48cd9489b6eed6f5012b7a1725d7458a1c51ff1406b6621&",
    },
    raid: {
      code: "raid_ticket",
      name: "Raid Ticket",
      rarity: "A",
      type: "Ticket",
      image: "https://cdn.discordapp.com/attachments/1493204525975076944/1503019862694301907/content.png?ex=6a01d3d4&is=6a008254&hm=c46ef6d8f72ef586dc9817d629edbe23f8895613eeef5216ab80d026820e9ce2&",
    },
    gold: {
      code: "gold_raid_ticket",
      name: "Gold Raid Ticket",
      rarity: "S",
      type: "Ticket",
      image: "https://cdn.discordapp.com/attachments/1493204525975076944/1503019863172448387/content.png?ex=6a01d3d4&is=6a008254&hm=cc387565f21d590a67bd120924c42e5b296f2acc7b12c1aa24f1d5713232f72e&",
    },
    throne: {
      code: "empty_throne_raid_writ",
      name: "Empty Throne Raid Writ",
      rarity: "S",
      type: "Ticket",
      image: "https://cdn.discordapp.com/attachments/1493204525975076944/1503039261551624302/content.png?ex=6a01e5e5&is=6a009465&hm=d1c5a4e761f84b982572f211b9d5cbb202129e75226665b278ff6608fe94ea41",
    },
    mythic: {
      code: "mythic_raid_ticket",
      name: "Mythic Raid Ticket",
      rarity: "UR",
      type: "Ticket",
      image: "https://cdn.discordapp.com/attachments/1493204525975076944/1513072518498353162/content.png?ex=6a266617&is=6a251497&hm=e3a300a1a63dae89865fb29e0dc7742baacabd739e1534cc519a19114d3d660f",
    },
  };

  const weights =
    tier === "motherFlame"
      ? { common: 35, raid: 35, gold: 16, throne: 9, mythic: 5 }
      : tier === "vivreCard"
        ? { common: 44, raid: 34, gold: 13, throne: 6, mythic: 3 }
        : { common: 52, raid: 35, gold: 8, throne: 4, mythic: 1 };

  return [
    { ...baseTickets.common, weight: weights.common },
    { ...baseTickets.raid, weight: weights.raid },
    { ...baseTickets.gold, weight: weights.gold },
    { ...baseTickets.throne, weight: weights.throne },
    { ...baseTickets.mythic, weight: weights.mythic },
  ];
}`
);

pull = replaceFunction(
  pull,
  "pickWeightedTicket",
`function pickWeightedTicket(pullTier = "normal") {
  const pool = getTicketPool(pullTier);
  const total = pool.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  let roll = Math.random() * total;

  for (const item of pool) {
    roll -= Number(item.weight || 0);
    if (roll <= 0) return item;
  }

  return pool[0];
}`
);

pull = pull.replace(
  "function getRewardPool(contentType) {",
  "function getRewardPool(contentType, pullTier = \"normal\") {"
);

pull = pull.replace(
  'if (contentType === "ticket") return getTicketPool();',
  'if (contentType === "ticket") return getTicketPool(pullTier);'
);

pull = pull.replace(
  "const pool = getRewardPool(contentType);",
  "const pool = getRewardPool(contentType, premiumTier);"
);

pull = pull.replace(
  'const picked = contentType === "ticket" ? pickWeightedTicket() : pickRandomByRarity(pool, baseTier);',
  'const picked = contentType === "ticket" ? pickWeightedTicket(premiumTier) : pickRandomByRarity(pool, baseTier);'
);

write(pullPath, pull);

console.log("Patch pull + luckyweek complete.");
