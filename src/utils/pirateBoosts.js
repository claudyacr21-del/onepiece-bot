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
  return Math.max(0, Math.floor(Number(value || 0) * (1 + Number(percent || 0) / 100)));
}

module.exports = {
  getPlayerPirate,
  getPiratePerkLevel,
  getPirateExpBoostPercent,
  getPirateBerryBoostPercent,
  getPirateGemsBoostPercent,
  applyPiratePercentBoost,
};