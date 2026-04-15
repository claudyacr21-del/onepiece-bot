const SHIPS = [
  {
    code: "small_boat",
    name: "Small Boat",
    tier: 1,
    image: "https://your-image-url.com/small_boat.png",
    description: "A weak starter boat used before true voyage progression begins."
  },
  {
    code: "going_merry",
    name: "Going Merry",
    tier: 1,
    image: "https://your-image-url.com/going_merry.png",
    description: "The beloved first ship of the Straw Hat Pirates."
  },
  {
    code: "improved_merry",
    name: "Improved Merry",
    tier: 2,
    image: "https://your-image-url.com/improved_merry.png",
    description: "An upgraded route-ready version of the Merry."
  },
  {
    code: "thousand_sunny",
    name: "Thousand Sunny",
    tier: 3,
    image: "https://your-image-url.com/thousand_sunny.png",
    description: "A powerful ship built for the New World."
  }
];

function getShipByCode(code) {
  return SHIPS.find((ship) => ship.code === code) || SHIPS[0];
}

module.exports = {
  SHIPS,
  getShipByCode
};