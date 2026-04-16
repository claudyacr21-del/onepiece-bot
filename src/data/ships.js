const { getShipImage } = require("../config/assetLinks");

const SHIPS = [
  {
    code: "small_boat",
    name: "Small Boat",
    tier: 1,
    sea: "East Blue",
    hpBonus: 0,
    rewardBonus: 0,
    travelCooldownReduction: 0,
    image: "",
    upgradeCost: {
      berries: 5000,
      materials: [
        { name: "Wood", amount: 10 },
        { name: "Sail Cloth", amount: 5 },
      ],
    },
    nextShipCode: "going_merry",
  },
  {
    code: "going_merry",
    name: "Going Merry",
    tier: 2,
    sea: "East Blue",
    hpBonus: 150,
    rewardBonus: 5,
    travelCooldownReduction: 0,
    image: "",
    upgradeCost: {
      berries: 15000,
      materials: [
        { name: "Wood", amount: 20 },
        { name: "Steel", amount: 10 },
        { name: "Sail Cloth", amount: 10 },
      ],
    },
    nextShipCode: "improved_merry",
  },
  {
    code: "improved_merry",
    name: "Improved Merry",
    tier: 3,
    sea: "Grand Line",
    hpBonus: 300,
    rewardBonus: 10,
    travelCooldownReduction: 1,
    image: "",
    upgradeCost: {
      berries: 40000,
      materials: [
        { name: "Wood", amount: 35 },
        { name: "Steel", amount: 20 },
        { name: "Cola", amount: 10 },
        { name: "Island Blueprint", amount: 1 },
      ],
    },
    nextShipCode: "thousand_sunny",
  },
  {
    code: "thousand_sunny",
    name: "Thousand Sunny",
    tier: 4,
    sea: "New World",
    hpBonus: 600,
    rewardBonus: 15,
    travelCooldownReduction: 2,
    image: "",
    upgradeCost: {
      berries: 90000,
      materials: [
        { name: "Wood", amount: 50 },
        { name: "Steel", amount: 35 },
        { name: "Cola", amount: 20 },
        { name: "Island Blueprint", amount: 2 },
      ],
    },
    nextShipCode: "sunny_final",
  },
  {
    code: "sunny_final",
    name: "Thousand Sunny Final",
    tier: 5,
    sea: "Final Sea",
    hpBonus: 1000,
    rewardBonus: 25,
    travelCooldownReduction: 3,
    image: "",
    upgradeCost: null,
    nextShipCode: null,
  },
].map((ship) => ({
  ...ship,
  image: getShipImage(ship.code, ship.image || ""),
}));

function getShipByCode(code) {
  return SHIPS.find((ship) => ship.code === code) || SHIPS[1];
}

function getNextShip(shipCode) {
  const current = getShipByCode(shipCode);
  if (!current?.nextShipCode) return null;
  return getShipByCode(current.nextShipCode);
}

module.exports = {
  SHIPS,
  getShipByCode,
  getNextShip,
};