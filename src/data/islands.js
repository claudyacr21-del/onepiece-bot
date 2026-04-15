const ISLANDS = [
  {
    id: 1,
    code: "shells_town",
    name: "Shells Town",
    sea: "East Blue",
    saga: "East Blue",
    order: 1,
    nextIslandCode: "orange_town",
    boss: "Morgan",
    description: "A Marine-controlled town where many journeys begin."
  },
  {
    id: 2,
    code: "orange_town",
    name: "Orange Town",
    sea: "East Blue",
    saga: "East Blue",
    order: 2,
    nextIslandCode: "syrup_village",
    boss: "Buggy",
    description: "A town once terrorized by Buggy the Clown."
  },
  {
    id: 3,
    code: "syrup_village",
    name: "Syrup Village",
    sea: "East Blue",
    saga: "East Blue",
    order: 3,
    nextIslandCode: "baratie",
    boss: "Kuro",
    description: "A peaceful village tied to Usopp's story."
  },
  {
    id: 4,
    code: "baratie",
    name: "Baratie",
    sea: "East Blue",
    saga: "East Blue",
    order: 4,
    nextIslandCode: "arlong_park",
    boss: "Don Krieg",
    description: "The famous floating restaurant in East Blue."
  },
  {
    id: 5,
    code: "arlong_park",
    name: "Arlong Park",
    sea: "East Blue",
    saga: "East Blue",
    order: 5,
    nextIslandCode: "loguetown",
    boss: "Arlong",
    description: "A key island in Nami's past and East Blue's climax."
  },
  {
    id: 6,
    code: "loguetown",
    name: "Loguetown",
    sea: "East Blue",
    saga: "East Blue",
    order: 6,
    nextIslandCode: "reverse_mountain",
    boss: "Smoker",
    description: "The town of the beginning and the end."
  },
  {
    id: 7,
    code: "reverse_mountain",
    name: "Reverse Mountain",
    sea: "Grand Line Entrance",
    saga: "Alabasta Saga",
    order: 7,
    nextIslandCode: "whiskey_peak",
    boss: "Laboon Route",
    description: "The gateway into the Grand Line."
  },
  {
    id: 8,
    code: "whiskey_peak",
    name: "Whiskey Peak",
    sea: "Grand Line",
    saga: "Alabasta Saga",
    order: 8,
    nextIslandCode: "little_garden",
    boss: "Baroque Works",
    description: "A town that hides danger behind hospitality."
  },
  {
    id: 9,
    code: "little_garden",
    name: "Little Garden",
    sea: "Grand Line",
    saga: "Alabasta Saga",
    order: 9,
    nextIslandCode: "drum_island",
    boss: "Mr. 3",
    description: "A prehistoric island of giants and ancient beasts."
  },
  {
    id: 10,
    code: "drum_island",
    name: "Drum Island",
    sea: "Grand Line",
    saga: "Alabasta Saga",
    order: 10,
    nextIslandCode: "alabasta",
    boss: "Wapol",
    description: "A winter island tied to Chopper's story."
  },
  {
    id: 11,
    code: "alabasta",
    name: "Alabasta",
    sea: "Grand Line",
    saga: "Alabasta Saga",
    order: 11,
    nextIslandCode: null,
    boss: "Crocodile",
    description: "A desert kingdom in the middle of civil war."
  }
];

function getIslandByCode(code) {
  return ISLANDS.find((island) => island.code === code) || null;
}

function getIslandByName(name) {
  const q = String(name || "").toLowerCase().trim();
  return (
    ISLANDS.find((island) => island.name.toLowerCase() === q) ||
    ISLANDS.find((island) => island.name.toLowerCase().includes(q)) ||
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

module.exports = {
  ISLANDS,
  getIslandByCode,
  getIslandByName,
  getCurrentIsland,
  getNextIsland
};