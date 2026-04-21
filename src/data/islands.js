const { getIslandImage } = require("../config/assetLinks");

const ISLANDS = [
  { id: 0, code: "foosha_village", name: "Foosha Village", sea: "East Blue", saga: "Starter", order: 0, requiredShipTier: 1, nextIslandCode: "shells_town", boss: "Dadan", bossCode: null, image: "https://tenor.com/view/dadan-one-piece-curly-dadan-anime-punch-gif-11179705851373718063", description: "Starter island and first harbor before real story progression begins." },
  { id: 1, code: "shells_town", name: "Shells Town", sea: "East Blue", saga: "East Blue", order: 1, requiredShipTier: 1, nextIslandCode: "orange_town", boss: "Morgan", bossCode: "morgan_axe_hand", image: "https://tenor.com/en-GB/view/one-piece-morgan-morgan-one-piece-marine-marines-gif-8958618513757802438", description: "First real story island. Defeat Morgan to begin your true journey." },
  { id: 2, code: "orange_town", name: "Orange Town", sea: "East Blue", saga: "East Blue", order: 2, requiredShipTier: 1, nextIslandCode: "syrup_village", boss: "Buggy", bossCode: "buggy_the_clown", image: "https://tenor.com/en-GB/view/buggy-buggy-one-piece-clown-one-piece-stampede-gif-8492731719816866936", description: "A town once terrorized by Buggy the Clown." },
  { id: 3, code: "syrup_village", name: "Syrup Village", sea: "East Blue", saga: "East Blue", order: 3, requiredShipTier: 1, nextIslandCode: "baratie", boss: "Kuro", bossCode: "kuro_hundred_plans", image: "https://tenor.com/en-GB/view/one-piece-kuro-one-piece-klahadore-gif-24828899", description: "Usopp's home village and the stage of Captain Kuro's betrayal." },
  { id: 4, code: "baratie", name: "Baratie", sea: "East Blue", saga: "East Blue", order: 4, requiredShipTier: 1, nextIslandCode: "arlong_park", boss: "Don Krieg", bossCode: "don_krieg_admiral", image: "https://tenor.com/en-GB/view/krieg-one-piece-one-piece-krieg-don-krieg-angry-gif-26181486", description: "Floating restaurant where the crew meets Sanji." },
  { id: 5, code: "arlong_park", name: "Arlong Park", sea: "East Blue", saga: "East Blue", order: 5, requiredShipTier: 1, nextIslandCode: "loguetown", boss: "Arlong", bossCode: "arlong_saw", image: "https://tenor.com/en-GB/view/arlong-fishman-one-piece-shark-sawshark-gif-14527136481627449363", description: "Nami's tragedy and the battle against Arlong." },
  { id: 6, code: "loguetown", name: "Loguetown", sea: "East Blue", saga: "East Blue", order: 6, requiredShipTier: 1, nextIslandCode: "reverse_mountain", boss: "Smoker", bossCode: "smoker_white_hunter", image: "https://tenor.com/view/one-piece-smoker-smoker-one-piece-smoke-smoking-gif-12841553295964358522", description: "The town of the beginning and the end." },
  { id: 7, code: "reverse_mountain", name: "Reverse Mountain", sea: "Grand Line Entrance", saga: "Alabasta Saga", order: 7, requiredShipTier: 2, nextIslandCode: "whiskey_peak", boss: "Grand Line Gate", bossCode: null, image: "https://tenor.com/en-GB/view/one-piece-whale-laboon-laboon-one-piece-sea-gif-8959162293132456128", description: "The dangerous entry point into the Grand Line." },
  { id: 8, code: "whiskey_peak", name: "Whiskey Peak", sea: "Grand Line", saga: "Alabasta Saga", order: 8, requiredShipTier: 2, nextIslandCode: "little_garden", boss: "Baroque Works Agents", bossCode: null, image: "https://tenor.com/en-GB/view/mr-9-mr-9-one-piece-one-piece-whiskey-peak-baroque-works-gif-13017819710538696834", description: "A suspicious welcome town filled with hidden enemies." },
  { id: 9, code: "little_garden", name: "Little Garden", sea: "Grand Line", saga: "Alabasta Saga", order: 9, requiredShipTier: 2, nextIslandCode: "drum_island", boss: "Mr. 3", bossCode: "mr3", image: "https://tenor.com/en-GB/view/mr-3-one-piece-mr-3-one-piece-galdino-galdino-one-piece-gif-9579835412582261586", description: "Island of giants and prehistoric creatures." },
  { id: 10, code: "drum_island", name: "Drum Island", sea: "Grand Line", saga: "Alabasta Saga", order: 10, requiredShipTier: 2, nextIslandCode: "alabasta", boss: "Wapol", bossCode: "wapol", image: "https://tenor.com/en-GB/view/one-piece-wapol-wapol-one-piece-snow-drum-island-gif-16798118892947900665", description: "Snowy kingdom and Chopper's homeland." },
  { id: 11, code: "alabasta", name: "Alabasta", sea: "Grand Line", saga: "Alabasta Saga", order: 11, requiredShipTier: 2, nextIslandCode: "jaya", boss: "Crocodile", bossCode: "crocodile_desert_king", image: "https://tenor.com/en-GB/view/sir-crocodile-laugh-crocodile-one-piece-gif-6289781576802030791", description: "Desert kingdom torn by civil war and Crocodile's scheme." },
  { id: 12, code: "jaya", name: "Jaya", sea: "Grand Line", saga: "Skypiea Saga", order: 12, requiredShipTier: 2, nextIslandCode: "skypiea", boss: "Bellamy", bossCode: "bellamy_hyena", image: "https://tenor.com/en-GB/view/bellamy-one-piece-jaya-gif-24157168", description: "A rough pirate haven and the prelude to the sky island adventure." },
  { id: 13, code: "skypiea", name: "Skypiea", sea: "Sky Sea", saga: "Skypiea Saga", order: 13, requiredShipTier: 2, nextIslandCode: "long_ring_long_land", boss: "Enel", bossCode: "enel_god", image: "https://tenor.com/en-GB/view/eneru-enel-enel-one-piece-eneru-one-piece-skypiea-gif-25395821", description: "Island in the sky ruled by the god Enel." },
  { id: 14, code: "long_ring_long_land", name: "Long Ring Long Land", sea: "Grand Line", saga: "Water 7 Saga", order: 14, requiredShipTier: 2, nextIslandCode: "water_7", boss: "Foxy", bossCode: null, image: "https://tenor.com/view/one-piece-foxy-foxy-one-piece-foxy-pirates-porche-gif-2272816394415354434", description: "A bizarre island where the Davy Back Fight unfolds." },
  { id: 15, code: "water_7", name: "Water 7", sea: "Grand Line", saga: "Water 7 Saga", order: 15, requiredShipTier: 3, nextIslandCode: "enies_lobby", boss: "CP9 Lead Fight", bossCode: null, image: "https://tenor.com/view/kaku-one-piece-kaku-one-piece-cp9-enies-lobby-gif-27117348", description: "City of water and shipwrights where the crew faces betrayal and pursuit." },
  { id: 16, code: "enies_lobby", name: "Enies Lobby", sea: "Grand Line", saga: "Water 7 Saga", order: 16, requiredShipTier: 3, nextIslandCode: "thriller_bark", boss: "Rob Lucci", bossCode: "lucci_cp9", image: "https://tenor.com/view/rob-lucci-anime-one-piece-about-to-get-serious-hes-rob-lucci-of-cp9-gif-17114809", description: "Government stronghold where the Straw Hats declare war to save Robin." },
  { id: 17, code: "thriller_bark", name: "Thriller Bark", sea: "Grand Line", saga: "Thriller Bark Saga", order: 17, requiredShipTier: 3, nextIslandCode: "sabaody", boss: "Gecko Moria", bossCode: "gecko_moria", image: "https://tenor.com/en-GB/view/one-piece-gecko-moria-smile-gif-8508707643928083051", description: "Ghost island of shadows and zombies." },
  { id: 18, code: "sabaody", name: "Sabaody Archipelago", sea: "Grand Line", saga: "Summit War Saga", order: 18, requiredShipTier: 3, nextIslandCode: "amazon_lily", boss: "Pacifista Survival", bossCode: null, image: "https://tenor.com/view/kuma-pawpaw-onepiece-anime-skelly-gif-22090725", description: "Archipelago of bubbles where the crew meets overwhelming power." },
  { id: 19, code: "amazon_lily", name: "Amazon Lily", sea: "Calm Belt", saga: "Summit War Saga", order: 19, requiredShipTier: 3, nextIslandCode: "impel_down", boss: "Trial Event", bossCode: "boa_hancock", image: "https://tenor.com/view/boa-hancock-gif-24066975", description: "Island of women and the homeland of Boa Hancock." },
  { id: 20, code: "impel_down", name: "Impel Down", sea: "Grand Line", saga: "Summit War Saga", order: 20, requiredShipTier: 3, nextIslandCode: "marineford", boss: "Magellan", bossCode: null, image: "https://tenor.com/en-GB/view/magellan-gif-18096264", description: "The underwater prison break toward the greatest war." },
  { id: 21, code: "marineford", name: "Marineford", sea: "Grand Line", saga: "Summit War Saga", order: 21, requiredShipTier: 3, nextIslandCode: "fishman_island", boss: "War Event Stage", bossCode: "akainu", image: "https://tenor.com/en-GB/view/one-piece-admiral-sakazuki-akainu-gif-9948236018905714025", description: "The Summit War that changes the era." },
  { id: 22, code: "fishman_island", name: "Fish-Man Island", sea: "New World Entrance", saga: "Fish-Man Island Saga", order: 22, requiredShipTier: 4, nextIslandCode: "punk_hazard", boss: "Hody Jones", bossCode: "hody_jones", image: "https://tenor.com/view/one-piece-fishman-island-remake-fishman-island-remaster-hody-gif-6169992424580081830", description: "Undersea kingdom and the crew's return after the timeskip." },
  { id: 23, code: "punk_hazard", name: "Punk Hazard", sea: "New World", saga: "Dressrosa Saga", order: 23, requiredShipTier: 4, nextIslandCode: "dressrosa", boss: "Caesar Clown", bossCode: "caesar_clown", image: "https://tenor.com/en-GB/view/one-piece-gif-8968849", description: "Burning and frozen island of chemical horrors." },
  { id: 24, code: "dressrosa", name: "Dressrosa", sea: "New World", saga: "Dressrosa Saga", order: 24, requiredShipTier: 4, nextIslandCode: "zou", boss: "Doflamingo", bossCode: "doflamingo_heavenly_demon", image: "https://tenor.com/en-GB/view/doflamingo-gif-1495283936009055853", description: "The kingdom ruled from the shadows by Doflamingo." },
  { id: 25, code: "zou", name: "Zou", sea: "New World", saga: "Whole Cake Island Saga", order: 25, requiredShipTier: 4, nextIslandCode: "whole_cake_island", boss: "Jack", bossCode: "jack_the_drought", image: "https://tenor.com/view/nekomamushi-inuarashi-jack-jack-the-drought-wano-gif-25821052", description: "The moving island on the back of Zunesha." },
  { id: 26, code: "whole_cake_island", name: "Whole Cake Island", sea: "New World", saga: "Whole Cake Island Saga", order: 26, requiredShipTier: 4, nextIslandCode: "wano", boss: "Katakuri", bossCode: "katakuri_strongest_sweet_commander", image: "https://tenor.com/en-GB/view/katakuri-luffy-vs-gif-20642055", description: "Big Mom's territory filled with sweets and deadly family politics." },
  { id: 27, code: "wano", name: "Wano", sea: "New World", saga: "Wano Country Saga", order: 27, requiredShipTier: 5, nextIslandCode: "egghead", boss: "Kaido", bossCode: "kaido_strongest_creature", image: "https://tenor.com/en-GB/view/kaido-hybrid-gif-26843532", description: "Closed nation where the raid against Kaido decides a new era." },
  {
    id: 28,
    code: "egghead",
    name: "Egghead",
    sea: "New World",
    saga: "Final Saga",
    order: 28,
    requiredShipTier: 5,
    nextIslandCode: "elbaf",
    boss: "Egghead Boss Route",
    bossCode: null,
    image: "",
    description: "Island of the future and a major Final Saga expansion route.",
    bossPhases: [
    {
      phase: 1,
      name: "Saint Saturn",
      bossCode: "saturn",
      requiresParty: false,
      image: "https://tenor.com/view/st-saturn-transformation-st-saturn-anime-st-saturn-one-piece-gif-16258868980469065713",
    },
    {
      phase: 2,
      name: "Five Elders",
      bossCode: "five_elders_combined",
      requiresParty: true,
      image: "https://tenor.com/view/one-piece-the-five-elders-kaiju-roaring-the-gorosei-kaiju-roaring-roar-rawr-gif-15627103690308988162",
    },
  ],
},
{
  id: 29,
  code: "elbaf",
  name: "Elbaf",
  sea: "New World",
  saga: "Final Saga",
  order: 29,
  requiredShipTier: 5,
  nextIslandCode: null,
  boss: "Elbaf Boss Route",
  bossCode: null,
  image: "",
  description: "Land of the giants and future endgame story expansion.",
  bossPhases: [
    {
      phase: 1,
      name: "Manmayer Gunko",
      bossCode: "gunko_holy_knight",
      requiresParty: false,
      image: "https://tenor.com/view/elbaph-elbaf-one-piece-luffy-snow-gif-2933769649081611231",
    },
    {
      phase: 2,
      name: "Imu",
      bossCode: "imu",
      requiresParty: true,
      image: "https://tenor.com/en-GB/view/imu-imu-one-piece-imu-angry-one-piece-imu-face-reveal-gif-10314177810931110974",
    },
  ],
},
].map((island) => ({
  ...island,
  image: getIslandImage(island.code, island.image || ""),
}));

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
  const codes =
    Array.isArray(player?.ship?.unlockedIslands) && player.ship.unlockedIslands.length
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
  getUnlockedIslandObjects,
};