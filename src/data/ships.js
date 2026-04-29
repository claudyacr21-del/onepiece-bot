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
      berries: 50000,
      materials: [
        { code: "hardwood", name: "Hardwood", amount: 10 },
        { code: "sail_cloth", name: "Sail Cloth", amount: 5 },
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
      berries: 150000,
      materials: [
        { code: "hardwood", name: "Hardwood", amount: 20 },
        { code: "iron_plating", name: "Iron Plating", amount: 10 },
        { code: "sail_cloth", name: "Sail Cloth", amount: 10 },
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
      berries: 400000,
      materials: [
        { code: "hardwood", name: "Hardwood", amount: 35 },
        { code: "iron_plating", name: "Iron Plating", amount: 20 },
        { code: "cola_engine_part", name: "Cola Engine Part", amount: 4 },
        { code: "sail_cloth", name: "Sail Cloth", amount: 15 },
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
      berries: 1000000,
      materials: [
        { code: "hardwood", name: "Hardwood", amount: 50 },
        { code: "iron_plating", name: "Iron Plating", amount: 35 },
        { code: "cola_engine_part", name: "Cola Engine Part", amount: 10 },
        { code: "sail_cloth", name: "Sail Cloth", amount: 25 },
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
  return SHIPS.find((ship) => ship.code === code) || SHIPS[0];
}

function getNextShip(shipCode) {
  const current = getShipByCode(shipCode);
  if (!current?.nextShipCode) return null;
  return getShipByCode(current.nextShipCode);
}

module.exports = { SHIPS, getShipByCode, getNextShip };