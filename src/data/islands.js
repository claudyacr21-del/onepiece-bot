const ISLANDS = [
  {
    id: 0,
    code: "foosha_village",
    name: "Foosha Village",
    sea: "East Blue",
    saga: "Starter",
    order: 0,
    requiredShipTier: 1,
    nextIslandCode: "shells_town",
    boss: null,
    bossCode: null,
    image: "https://your-image-url.com/foosha_village.png",
    description: "Starter island and first harbor before real story progression begins."
  },
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
    image: "https://your-image-url.com/shells_town.png",
    description: "First real story island. Defeat Morgan to begin your true journey."
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
    image: "https://your-image-url.com/orange_town.png",
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
    image: "https://your-image-url.com/syrup_village.png",
    description: "Usopp's home village and the stage of Captain Kuro's betrayal."
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
    image: "https://your-image-url.com/baratie.png",
    description: "Floating restaurant where the crew meets Sanji."
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
    image: "https://your-image-url.com/arlong_park.png",
    description: "Nami's tragedy and the battle against Arlong."
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
    image: "https://your-image-url.com/loguetown.png",
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
    image: "https://your-image-url.com/reverse_mountain.png",
    description: "The dangerous entry point into the Grand Line."
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
    boss: "Baroque Works Agents",
    bossCode: null,
    image: "https://your-image-url.com/whiskey_peak.png",
    description: "A suspicious welcome town filled with hidden enemies."
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
    image: "https://your-image-url.com/little_garden.png",
    description: "Island of giants and prehistoric creatures."
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
    image: "https://your-image-url.com/drum_island.png",
    description: "Snowy kingdom and Chopper's homeland."
  },
  {
    id: 11,
    code: "alabasta",
    name: "Alabasta",
    sea: "Grand Line",
    saga: "Alabasta Saga",
    order: 11,
    requiredShipTier: 2,
    nextIslandCode: "jaya",
    boss: "Crocodile",
    bossCode: "crocodile_desert_king",
    image: "https://your-image-url.com/alabasta.png",
    description: "Desert kingdom torn by civil war and Crocodile's scheme."
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
  const currentName = player?.currentIsland || "Foosha Village";
  return getIslandByName(currentName) || ISLANDS[0];
}

function getNextIsland(currentIsland) {
  if (!currentIsland?.nextIslandCode) return null;
  return getIslandByCode(currentIsland.nextIslandCode);
}

function getUnlockedIslandObjects(player) {
  const codes = Array.isArray(player?.ship?.unlockedIslands) && player.ship.unlockedIslands.length
    ? player.ship.unlockedIslands
    : ["foosha_village"];

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
  getUnlockedIslandObjects
};