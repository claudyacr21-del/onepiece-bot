const { findPirateByUser } = require("./pirateStore");

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

  return {
    ...(reward || {}),
    berries: boostedBerries,
    gems: boostedGems,
    pirateBoosts: {
      berryBoost,
      gemsBoost,
      bonusBerries: Math.max(0, boostedBerries - baseBerries),
      bonusGems: Math.max(0, boostedGems - baseGems),
    },
  };
}

module.exports = {
  getPlayerPirate,
  getPiratePerkLevel,
  getPirateExpBoostPercent,
  getPirateBerryBoostPercent,
  getPirateGemsBoostPercent,
  applyPiratePercentBoost,
  applyPirateCurrencyBoosts,
};