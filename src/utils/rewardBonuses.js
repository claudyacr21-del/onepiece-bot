const { findPirateByUser } = require("./pirateStore");
const { PIRATE_PERKS } = require("../data/piratePerks");

function getPerkLevel(userId, perkKey) {
  const pirate = findPirateByUser(userId);
  return Math.max(0, Math.floor(Number(pirate?.perks?.[perkKey] || 0)));
}

function getPerkPercent(userId, perkKey) {
  const perk = PIRATE_PERKS[perkKey];
  if (!perk) return 0;

  const level = getPerkLevel(userId, perkKey);
  const perLevel = Number(perk.bonusPerLevel || 0);

  return Math.max(0, level * perLevel);
}

function applyPercentBonus(baseAmount, percent, options = {}) {
  const base = Math.max(0, Math.floor(Number(baseAmount || 0)));
  const safePercent = Math.max(0, Number(percent || 0));

  if (base <= 0 || safePercent <= 0) {
    return base;
  }

  const rawBonus = base * (safePercent / 100);
  const roundedBonus =
    options.round === "floor" ? Math.floor(rawBonus) : Math.ceil(rawBonus);

  const minimumBonus = Math.max(0, Math.floor(Number(options.minimumBonus || 0)));
  const bonus = Math.max(minimumBonus, roundedBonus);

  return base + bonus;
}

function applyPirateRewardBonuses(userId, rewards = {}) {
  const berryPercent = getPerkPercent(userId, "berryBoost");
  const gemsPercent = getPerkPercent(userId, "gemsBoost");
  const expPercent = getPerkPercent(userId, "expBoost");

  return {
    ...rewards,
    berries: applyPercentBonus(rewards.berries, berryPercent, {
      round: "ceil",
      minimumBonus: berryPercent > 0 ? 1 : 0,
    }),
    gems: applyPercentBonus(rewards.gems, gemsPercent, {
      round: "ceil",
      minimumBonus: gemsPercent > 0 ? 1 : 0,
    }),
    exp: applyPercentBonus(rewards.exp, expPercent, {
      round: "ceil",
      minimumBonus: expPercent > 0 ? 1 : 0,
    }),
  };
}

function applyRaidGloryPoints(userId, basePoints) {
  const raidPointPercent = getPerkPercent(userId, "raidPointBoost");

  return applyPercentBonus(basePoints, raidPointPercent, {
    round: "ceil",
    minimumBonus: raidPointPercent > 0 ? 1 : 0,
  });
}

module.exports = {
  getPerkLevel,
  getPerkPercent,
  applyPercentBonus,
  applyPirateRewardBonuses,
  applyRaidGloryPoints,
};