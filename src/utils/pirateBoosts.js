const { findPirateByUser } = require("./pirateStore");
const PIRATE_PULL_AMOUNT_MAX_LEVEL = 3;
const PIRATE_FRAGMENT_STORAGE_MAX_LEVEL = 4;
const PIRATE_FRAGMENT_STORAGE_PER_LEVEL = 26;

function getClampedPiratePerkLevel(userId, perkKey, maxLevel) {
  return Math.max(
    0,
    Math.min(maxLevel, Math.floor(Number(getPiratePerkLevel(userId, perkKey) || 0)))
  );
}

function getPirateFragmentStorageBonus(userId) {
  const level = getClampedPiratePerkLevel(
    userId,
    "fragmentStorageBoost",
    PIRATE_FRAGMENT_STORAGE_MAX_LEVEL
  );

  return level * PIRATE_FRAGMENT_STORAGE_PER_LEVEL;
}
function getPlayerPirate(userId) {
  try {
    return findPirateByUser(userId) || null;
  } catch (error) {
    console.error("[PIRATE BOOST LOOKUP ERROR]", error);
    return null;
  }
}

function getPiratePerkLevel(userId, perkKey) {
  const pirate = getPlayerPirate(userId);
  return Math.max(0, Math.floor(Number(pirate?.perks?.[perkKey] || 0)));
}

function getPirateExpBoostPercent(userId) {
  return getPiratePerkLevel(userId, "expBoost");
}

function getPirateBerryBoostPercent(userId) {
  return getPiratePerkLevel(userId, "berryBoost");
}

function getPirateGemsBoostPercent(userId) {
  return getPiratePerkLevel(userId, "gemsBoost");
}

function applyPiratePercentBoost(value, percent) {
  return Math.max(
    0,
    Math.floor(Number(value || 0) * (1 + Number(percent || 0) / 100))
  );
}

function applyPirateCurrencyBoosts(reward, userId) {
  const berryBoost = getPirateBerryBoostPercent(userId);
  const gemsBoost = getPirateGemsBoostPercent(userId);

  const baseBerries = Math.max(0, Math.floor(Number(reward?.berries || 0)));
  const baseGems = Math.max(0, Math.floor(Number(reward?.gems || 0)));

  const boostedBerries = applyPiratePercentBoost(baseBerries, berryBoost);
  const boostedGems = applyPiratePercentBoost(baseGems, gemsBoost);

  const bonusBerries = Math.max(0, boostedBerries - baseBerries);
  const bonusGems = Math.max(0, boostedGems - baseGems);

  return {
    ...(reward || {}),

    // Keep base reward unchanged.
    berries: baseBerries,
    gems: baseGems,

    // Explicit final totals for commands that want direct total values.
    totalBerries: boostedBerries,
    totalGems: boostedGems,

    pirateBoosts: {
      berryBoost,
      gemsBoost,
      baseBerries,
      baseGems,
      bonusBerries,
      bonusGems,
      totalBerries: boostedBerries,
      totalGems: boostedGems,
    },
  };
}

module.exports = {
  getPlayerPirate,
  getPiratePerkLevel,
  getPirateExpBoostPercent,
  getPirateBerryBoostPercent,
  getPirateGemsBoostPercent,
  getPirateFragmentStorageBonus,
  applyPiratePercentBoost,
  applyPirateCurrencyBoosts,
};