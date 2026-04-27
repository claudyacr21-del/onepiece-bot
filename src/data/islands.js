const { getIslandImage } = require("../config/assetLinks");

const ISLANDS = [
  { id: 0, code: "foosha_village", name: "Foosha Village", sea: "East Blue", saga: "Starter", order: 0, requiredShipTier: 1, nextIslandCode: "shells_town", boss: "Dadan", bossCode: null, image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201583861895198/dadan-one-piece.gif?ex=69f04c74&is=69eefaf4&hm=368e688f529da524c75d7b70ccc0396dae6c15427c7d288789f28c7cfe991d79&", description: "Starter island and first harbor before real story progression begins." },
  { id: 1, code: "shells_town", name: "Shells Town", sea: "East Blue", saga: "East Blue", order: 1, requiredShipTier: 1, nextIslandCode: "orange_town", boss: "Morgan", bossCode: "morgan_axe_hand", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201583563964529/one-piece-morgan.gif?ex=69f04c74&is=69eefaf4&hm=7a058028e830cd7a3a1d46bacbcee49ff25422c3b35ab82c26b059ff43ba0d52&", description: "First real story island. Defeat Morgan to begin your true journey." },
  { id: 2, code: "orange_town", name: "Orange Town", sea: "East Blue", saga: "East Blue", order: 2, requiredShipTier: 1, nextIslandCode: "syrup_village", boss: "Buggy", bossCode: "buggy_the_clown", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201552446292039/buggy-buggy-one-piece.gif?ex=69f04c6d&is=69eefaed&hm=387ac16825e3399746897b3546b50bc10856313613818c13a8ca986cc007253f&", description: "A town once terrorized by Buggy the Clown." },
  { id: 3, code: "syrup_village", name: "Syrup Village", sea: "East Blue", saga: "East Blue", order: 3, requiredShipTier: 1, nextIslandCode: "baratie", boss: "Kuro", bossCode: "kuro_hundred_plans", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201552106557510/one-piece-kuro-one-piece.gif?ex=69f04c6d&is=69eefaed&hm=79b4472bf9b9c9951ce92845b5ccc7ca00d689f727e9ea5a6f8a658e3765dae4&", description: "Usopp's home village and the stage of Captain Kuro's betrayal." },
  { id: 4, code: "baratie", name: "Baratie", sea: "East Blue", saga: "East Blue", order: 4, requiredShipTier: 1, nextIslandCode: "arlong_park", boss: "Don Krieg", bossCode: "don_krieg_admiral", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201551808888862/krieg-one-piece-one-piece.gif?ex=69f04c6d&is=69eefaed&hm=d817fee102c3743e0a34ca08304394d56a0afd653ac6ce8fdb11e0c00da789f2&", description: "Floating restaurant where the crew meets Sanji." },
  { id: 5, code: "arlong_park", name: "Arlong Park", sea: "East Blue", saga: "East Blue", order: 5, requiredShipTier: 1, nextIslandCode: "loguetown", boss: "Arlong", bossCode: "arlong_saw", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498233873539137576/arlong-fishman.gif?ex=69f06a87&is=69ef1907&hm=063b0313390db4716eb254ac3a6cae95461772eb7cec45da7c21d0d125fa1c93&", description: "Nami's tragedy and the battle against Arlong." },
  { id: 6, code: "loguetown", name: "Loguetown", sea: "East Blue", saga: "East Blue", order: 6, requiredShipTier: 1, nextIslandCode: "reverse_mountain", boss: "Smoker", bossCode: "smoker_white_hunter", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201550986805379/one-piece-smoker.gif?ex=69f04c6c&is=69eefaec&hm=b42a3db298121f4dfeedc3f245acaf8a094c2a390a971134845193e5d656a5d3&", description: "The town of the beginning and the end." },
  { id: 7, code: "reverse_mountain", name: "Reverse Mountain", sea: "Grand Line Entrance", saga: "Alabasta Saga", order: 7, requiredShipTier: 2, nextIslandCode: "whiskey_peak", boss: "Grand Line Gate", bossCode: null, image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201550474973194/one-piece-whale.gif?ex=69f04c6c&is=69eefaec&hm=713f8d366e7ed800c69c6edee6899b22493a865978577bfbf4b5aabc302bf850&", description: "The dangerous entry point into the Grand Line." },
  { id: 8, code: "whiskey_peak", name: "Whiskey Peak", sea: "Grand Line", saga: "Alabasta Saga", order: 8, requiredShipTier: 2, nextIslandCode: "little_garden", boss: "Baroque Works Agents", bossCode: null, image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201549984370781/mr-9-mr-9-one-piece.gif?ex=69f04c6c&is=69eefaec&hm=038e6425e7c230b0cd290e4c5dee54753aea7d8ca7c6f2c3445e00bceb48b439&", description: "A suspicious welcome town filled with hidden enemies." },
  { id: 9, code: "little_garden", name: "Little Garden", sea: "Grand Line", saga: "Alabasta Saga", order: 9, requiredShipTier: 2, nextIslandCode: "drum_island", boss: "Mr. 3", bossCode: "mr3", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201549409620038/mr-3-one-piece-mr-3.gif?ex=69f04c6c&is=69eefaec&hm=5d47e3b5efb916a4411548f843c3e0859823526d7d725141c64f85403b15ecda&", description: "Island of giants and prehistoric creatures." },
  { id: 10, code: "drum_island", name: "Drum Island", sea: "Grand Line", saga: "Alabasta Saga", order: 10, requiredShipTier: 2, nextIslandCode: "alabasta", boss: "Wapol", bossCode: "wapol", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201549027934291/one-piece-wapol.gif?ex=69f04c6c&is=69eefaec&hm=4e89522423d8296c7fef6b67aa0db187278c6fb89332760331d81f56256ae635&", description: "Snowy kingdom and Chopper's homeland." },
  { id: 11, code: "alabasta", name: "Alabasta", sea: "Grand Line", saga: "Alabasta Saga", order: 11, requiredShipTier: 2, nextIslandCode: "jaya", boss: "Crocodile", bossCode: "crocodile_desert_king", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498233864282439811/suna-suna-no-mi-one-piece.gif?ex=69f06a85&is=69ef1905&hm=243fc0b5afa0355c4812015d05811ff3d7465ecc901955e4bcf060d2444d65ff&", description: "Desert kingdom torn by civil war and Crocodile's scheme." },
  { id: 12, code: "jaya", name: "Jaya", sea: "Grand Line", saga: "Skypiea Saga", order: 12, requiredShipTier: 2, nextIslandCode: "skypiea", boss: "Bellamy", bossCode: "bellamy_hyena", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201524093063279/bellamy-one-piece.gif?ex=69f04c66&is=69eefae6&hm=4b1baeae09be0d056d94cfd799d1db8fbd1129e20510b40a417a9e96b7b20d58&", description: "A rough pirate haven and the prelude to the sky island adventure." },
  { id: 13, code: "skypiea", name: "Skypiea", sea: "Sky Sea", saga: "Skypiea Saga", order: 13, requiredShipTier: 2, nextIslandCode: "long_ring_long_land", boss: "Enel", bossCode: "enel_god", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201523719503922/eneru-enel.gif?ex=69f04c66&is=69eefae6&hm=c0f75485f7154822ff476163ddade04127b95f4a79e79b16487e530b9c656d51&", description: "Island in the sky ruled by the god Enel." },
  { id: 14, code: "long_ring_long_land", name: "Long Ring Long Land", sea: "Grand Line", saga: "Water 7 Saga", order: 14, requiredShipTier: 2, nextIslandCode: "water_7", boss: "Foxy", bossCode: null, image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201523409387642/one-piece-foxy.gif?ex=69f04c66&is=69eefae6&hm=0fcd2750884dee8064dc565a14980191994bbbd13e9fd7f0cd8ee5ddf246ad88&", description: "A bizarre island where the Davy Back Fight unfolds." },
  { id: 15, code: "water_7", name: "Water 7", sea: "Grand Line", saga: "Water 7 Saga", order: 15, requiredShipTier: 3, nextIslandCode: "enies_lobby", boss: "CP9 Lead Fight", bossCode: null, image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201523094687815/kaku-one-piece.gif?ex=69f04c66&is=69eefae6&hm=f7fa11860e976c8aa26d42b3f656095e1ae66d6128b0b3c17747d3ba6c488693&", description: "City of water and shipwrights where the crew faces betrayal and pursuit." },
  { id: 16, code: "enies_lobby", name: "Enies Lobby", sea: "Grand Line", saga: "Water 7 Saga", order: 16, requiredShipTier: 3, nextIslandCode: "thriller_bark", boss: "Rob Lucci", bossCode: "lucci_cp9", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201522776047616/rob-lucci-anime.gif?ex=69f04c66&is=69eefae6&hm=2cce2c79684398ce4635bffe65269afc3c153e7881caf6a73cc8034b62fbc85a&", description: "Government stronghold where the Straw Hats declare war to save Robin." },
  { id: 17, code: "thriller_bark", name: "Thriller Bark", sea: "Grand Line", saga: "Thriller Bark Saga", order: 17, requiredShipTier: 3, nextIslandCode: "sabaody", boss: "Gecko Moria", bossCode: "gecko_moria", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201522343907358/one-piece-gecko-moria.gif?ex=69f04c66&is=69eefae6&hm=883cbabef318531837a3d35d0d894951818470e7b4802917f5cfb2112d0ad3c1&", description: "Ghost island of shadows and zombies." },
  { id: 18, code: "sabaody", name: "Sabaody Archipelago", sea: "Grand Line", saga: "Summit War Saga", order: 18, requiredShipTier: 3, nextIslandCode: "amazon_lily", boss: "Pacifista Survival", bossCode: null, image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201522029330523/kuma-pawpaw.gif?ex=69f04c66&is=69eefae6&hm=026069c5c851ecdeadaf22c1c227fb82150629c97ba294b62c58cddeefd8bc5b&", description: "Archipelago of bubbles where the crew meets overwhelming power." },
  { id: 19, code: "amazon_lily", name: "Amazon Lily", sea: "Calm Belt", saga: "Summit War Saga", order: 19, requiredShipTier: 3, nextIslandCode: "impel_down", boss: "Trial Event", bossCode: "boa_hancock", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201521735733428/boa-hancock.gif?ex=69f04c66&is=69eefae6&hm=c6d0062a0a9337cd390d35a99e76c29dba1972b45e7c2a0381269bed3566e350&", description: "Island of women and the homeland of Boa Hancock." },
  { id: 20, code: "impel_down", name: "Impel Down", sea: "Grand Line", saga: "Summit War Saga", order: 20, requiredShipTier: 3, nextIslandCode: "marineford", boss: "Magellan", bossCode: null, image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201521354047609/magellan.gif?ex=69f04c65&is=69eefae5&hm=87908757046e680a2a46546da6fa79971e28982c154463a268ce7f0519909ddc&", description: "The underwater prison break toward the greatest war." },
  { id: 21, code: "marineford", name: "Marineford", sea: "Grand Line", saga: "Summit War Saga", order: 21, requiredShipTier: 3, nextIslandCode: "fishman_island", boss: "War Event Stage", bossCode: "akainu", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201520951398530/one-piece-admiral.gif?ex=69f04c65&is=69eefae5&hm=ca6d8b1e99e9dc28adde37398aaf7d44dbd8b02daedfcfdd93e3846fb102dfbe&", description: "The Summit War that changes the era." },
  { id: 22, code: "fishman_island", name: "Fish-Man Island", sea: "New World Entrance", saga: "Fish-Man Island Saga", order: 22, requiredShipTier: 4, nextIslandCode: "punk_hazard", boss: "Hody Jones", bossCode: "hody_jones", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201492929122304/one-piece-fishman-island.gif?ex=69f04c5f&is=69eefadf&hm=302c71f4c4d276f4931707d3b1a0a70dd6535c9ef1a114478f153e9b46f7708d&", description: "Undersea kingdom and the crew's return after the timeskip." },
  { id: 23, code: "punk_hazard", name: "Punk Hazard", sea: "New World", saga: "Dressrosa Saga", order: 23, requiredShipTier: 4, nextIslandCode: "dressrosa", boss: "Caesar Clown", bossCode: "caesar_clown", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201492409286706/one-piece.gif?ex=69f04c5f&is=69eefadf&hm=739b5a73d8252dac659c913d966a5e965d5351d63e0608d8beea05b62896a0e5&", description: "Burning and frozen island of chemical horrors." },
  { id: 24, code: "dressrosa", name: "Dressrosa", sea: "New World", saga: "Dressrosa Saga", order: 24, requiredShipTier: 4, nextIslandCode: "zou", boss: "Doflamingo", bossCode: "doflamingo_heavenly_demon", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498233774410956831/one-piece-doflamingo.gif?ex=69f06a6f&is=69ef18ef&hm=fb9594b09abe122295f8c3e040b9329c6b7ebda78086e2f3c001ef77befe0679&", description: "The kingdom ruled from the shadows by Doflamingo." },
  { id: 25, code: "zou", name: "Zou", sea: "New World", saga: "Whole Cake Island Saga", order: 25, requiredShipTier: 4, nextIslandCode: "whole_cake_island", boss: "Jack", bossCode: "jack_the_drought", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201491557580890/nekomamushi-inuarashi.gif?ex=69f04c5e&is=69eefade&hm=615e3b9d764cb6e9ab77bf1734a7efdb8e3ba46e90404ce33e7994bcc99f5e08&", description: "The moving island on the back of Zunesha." },
  { id: 26, code: "whole_cake_island", name: "Whole Cake Island", sea: "New World", saga: "Whole Cake Island Saga", order: 26, requiredShipTier: 4, nextIslandCode: "wano", boss: "Katakuri", bossCode: "katakuri_strongest_sweet_commander", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201491083759617/katakuri-luffy.gif?ex=69f04c5e&is=69eefade&hm=812d87c8dfac4cda2e177e760f85ba17c6c046db54a0db3b8b1e940226d60a96&", description: "Big Mom's territory filled with sweets and deadly family politics." },
  { id: 27, code: "wano", name: "Wano", sea: "New World", saga: "Wano Country Saga", order: 27, requiredShipTier: 5, nextIslandCode: "egghead", boss: "Kaido", bossCode: "kaido_strongest_creature", image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498233774713077890/one-piece-kaido.gif?ex=69f06a6f&is=69ef18ef&hm=bb6fd3543727a0e9f0ab1b8f9329eefaae8a69a661d08332a0d175d797f43ccb&", description: "Closed nation where the raid against Kaido decides a new era." },
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
      image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201490202955776/st-saturn-transformation-st-saturn-anime.gif?ex=69f04c5e&is=69eefade&hm=973bf0b1903d37f84db6f626bdd4996c6e89c62621a5337891b1562e8352e628&",
    },
    {
      phase: 2,
      name: "Five Elders",
      bossCode: "five_elders_combined",
      requiresParty: true,
      image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201489502371850/one-piece-the-five-elders-kaiju-roaring.gif?ex=69f04c5e&is=69eefade&hm=15c532988709db329babe7a79789373fd4b58d3ea245a13bf139c87fd7ce2ecd&",
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
      image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201488823160905/elbaph-elbaf.gif?ex=69f04c5e&is=69eefade&hm=094b39af7881feba5bf13629d6e06e12d0eb43ad81de360471612d71bed87fd3&",
    },
    {
      phase: 2,
      name: "Imu",
      bossCode: "imu",
      requiresParty: true,
      image: "https://cdn.discordapp.com/attachments/1493204525975076944/1498201487925575690/imu-imu-one-piece.gif?ex=69f04c5d&is=69eefadd&hm=fc754c6d7a71ca47e3e3ed25f59324bcd808273cfe43998c5a38ff5134eec463&",
    },
  ],
},
].map((island) => ({
  ...island,

  // image asli dari list island kamu adalah boss GIF / boss image
  bossImage: island.bossImage || island.image || "",

  // image ini khusus island/background route dari assetLinks
  image: getIslandImage(island.code, ""),

  bossPhases: Array.isArray(island.bossPhases)
    ? island.bossPhases.map((phase) => ({
        ...phase,
        bossImage: phase.bossImage || phase.image || "",
      }))
    : island.bossPhases,
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