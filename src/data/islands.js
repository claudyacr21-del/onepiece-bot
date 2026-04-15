function getPlaceholderIslandImage(name = "Island") {
  const text = encodeURIComponent(name);
  return `https://dummyimage.com/1280x720/0f172a/ffffff.png&text=${text}`;
}

const ISLANDS = [
  {
    id: 1,
    code: "shells_town",
    name: "Shells Town",
    sea: "East Blue",
    saga: "East Blue",
    order: 1,
    requiredShipTier: 1,
    nextIslandCode: "orange_town",
    boss: "Morgan",
    bossCode: "morgan_axe_hand",
    image: getPlaceholderIslandImage("Shells Town"),
    description: "A Marine-controlled town where many journeys begin."
  },
  {
    id: 2,
    code: "orange_town",
    name: "Orange Town",
    sea: "East Blue",
    saga: "East Blue",
    order: 2,
    requiredShipTier: 1,
    nextIslandCode: "syrup_village",
    boss: "Buggy",
    bossCode: "buggy_clown",
    image: getPlaceholderIslandImage("Orange Town"),
    description: "A town once terrorized by Buggy the Clown."
  },
  {
    id: 3,
    code: "syrup_village",
    name: "Syrup Village",
    sea: "East Blue",
    saga: "East Blue",
    order: 3,
    requiredShipTier: 1,
    nextIslandCode: "baratie",
    boss: "Kuro",
    bossCode: "kuro_hundred_plans",
    image: getPlaceholderIslandImage("Syrup Village"),
    description: "A peaceful village tied to Usopp's story."
  },
  {
    id: 4,
    code: "baratie",
    name: "Baratie",
    sea: "East Blue",
    saga: "East Blue",
    order: 4,
    requiredShipTier: 1,
    nextIslandCode: "arlong_park",
    boss: "Don Krieg",
    bossCode: "don_krieg",
    image: getPlaceholderIslandImage("Baratie"),
    description: "The famous floating restaurant in East Blue."
  },
  {
    id: 5,
    code: "arlong_park",
    name: "Arlong Park",
    sea: "East Blue",
    saga: "East Blue",
    order: 5,
    requiredShipTier: 1,
    nextIslandCode: "loguetown",
    boss: "Arlong",
    bossCode: "arlong",
    image: getPlaceholderIslandImage("Arlong Park"),
    description: "A key island in Nami's past and East Blue's climax."
  },
  {
    id: 6,
    code: "loguetown",
    name: "Loguetown",
    sea: "East Blue",
    saga: "East Blue",
    order: 6,
    requiredShipTier: 1,
    nextIslandCode: "reverse_mountain",
    boss: "Smoker",
    bossCode: "smoker_white_hunter",
    image: getPlaceholderIslandImage("Loguetown"),
    description: "The town of the beginning and the end."
  },
  {
    id: 7,
    code: "reverse_mountain",
    name: "Reverse Mountain",
    sea: "Grand Line Entrance",
    saga: "Alabasta Saga",
    order: 7,
    requiredShipTier: 2,
    nextIslandCode: "whiskey_peak",
    boss: "Grand Line Gate",
    bossCode: null,
    image: getPlaceholderIslandImage("Reverse Mountain"),
    description: "The gateway into the Grand Line."
  },
  {
    id: 8,
    code: "whiskey_peak",
    name: "Whiskey Peak",
    sea: "Grand Line",
    saga: "Alabasta Saga",
    order: 8,
    requiredShipTier: 2,
    nextIslandCode: "little_garden",
    boss: "Baroque Works",
    bossCode: null,
    image: getPlaceholderIslandImage("Whiskey Peak"),
    description: "A town that hides danger behind hospitality."
  },
  {
    id: 9,
    code: "little_garden",
    name: "Little Garden",
    sea: "Grand Line",
    saga: "Alabasta Saga",
    order: 9,
    requiredShipTier: 2,
    nextIslandCode: "drum_island",
    boss: "Mr. 3",
    bossCode: null,
    image: getPlaceholderIslandImage("Little Garden"),
    description: "A prehistoric island of giants and ancient beasts."
  },
  {
    id: 10,
    code: "drum_island",
    name: "Drum Island",
    sea: "Grand Line",
    saga: "Alabasta Saga",
    order: 10,
    requiredShipTier: 2,
    nextIslandCode: "alabasta",
    boss: "Wapol",
    bossCode: "wapol",
    image: getPlaceholderIslandImage("Drum Island"),
    description: "A winter island tied to Chopper's story."
  },
  {
    id: 11,
    code: "alabasta",
    name: "Alabasta",
    sea: "Grand Line",
    saga: "Alabasta Saga",
    order: 11,
    requiredShipTier: 2,
    nextIslandCode: null,
    boss: "Crocodile",
    bossCode: "crocodile_desert_king",
    image: getPlaceholderIslandImage("Alabasta"),
    description: "A desert kingdom in the middle of civil war."
  }
];

function normalize(text) {
  return String(text || "").toLowerCase().trim();
}

function getIslandByCode(code) {
  return ISLANDS.find((island) => island.code === code) || null;
}

function getIslandByName(name) {
  const q = normalize(name);
  return (
    ISLANDS.find((island) => normalize(island.name) === q) ||
    ISLANDS.find((island) => normalize(island.name).includes(q)) ||
    null
  );
}

function getCurrentIsland(player) {
  const currentName = player?.currentIsland || "Shells Town";
  return getIslandByName(currentName) || ISLANDS[0];
}

function getNextIsland(currentIsland) {
  if (!currentIsland?.nextIslandCode) return null;
  return getIslandByCode(currentIsland.nextIslandCode);
}

function getUnlockedIslandObjects(player) {
  const codes = Array.isArray(player?.ship?.unlockedIslands) && player.ship.unlockedIslands.length
    ? player.ship.unlockedIslands
    : ["shells_town"];

  return codes
    .map((code) => getIslandByCode(code))
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}

module.exports = {
  ISLANDS,
  getIslandByCode,
  getIslandByName,
  getCurrentIsland,
  getNextIsland,
  getUnlockedIslandObjects,
  getPlaceholderIslandImage
};