const RARITY_BADGES = {
  C: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237259963301898/badge_C.png?ex=69e1e064&is=69e08ee4&hm=a2b237507f8524f0edffb83bd19708e4775a48049e2e37445c231bb2abd56665&",
  B: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237259631693994/badge_B.png?ex=69e1e064&is=69e08ee4&hm=40df7e7b3dc2f96f6792015bbc60f8d54461ead429df60a7552140f5f5fd3131&",
  A: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237259346477067/badge_A.png?ex=69e1e064&is=69e08ee4&hm=019224c7ebd6fe08c9f67f2fe4e5261d2c0502f1389cb80a000943a587a48aa6&",
  S: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237260273418410/badge_S.png?ex=69e1e064&is=69e08ee4&hm=99c0019d884c4bcb6eee4defdac9b851f130ca487c95680f8c70afb85db36f58&",
  SS: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237260596383755/badge_SS.png?ex=69e1e064&is=69e08ee4&hm=4b1d718f4cc3bd3cca43ae5f5a1a41b18320d5a814662313778b859b5a71b7dd&",
  UR: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237258910531736/badge_UR.png?ex=69e1e064&is=69e08ee4&hm=ff41f72431bcb6c2ea3acc190a98f536a491a11adbc11d9f6764ff79a0640a83&",
};

const CARD_IMAGES = {
  // contoh:
  // luffy_straw_hat: "https://...",
  // zoro_pirate_hunter: "https://...",
};

const WEAPON_IMAGES = {
  // enma: "https://...",
  // yoru: "https://...",
};

const SHIP_IMAGES = {
  // going_merry: "https://...",
  // thousand_sunny: "https://...",
};

const ISLAND_IMAGES = {
  foosha_village: "https://cdn.discordapp.com/attachments/1493204525975076944/1494254701108265001/Foosha_Village.png?ex=69e1f0a2&is=69e09f22&hm=5ff1892c30ce669dd8439dc50545a6fdd7a9b7fb0fd5d764e330e88ffe6281d1&",
  shells_town: "https://cdn.discordapp.com/attachments/1493204525975076944/1494254701775032430/shells_town.png?ex=69e1f0a2&is=69e09f22&hm=73084533e2af02dbfd7663b6731c0c77e704017819545450fdf88f3df80db00c&",
  orange_town: "https://cdn.discordapp.com/attachments/1493204525975076944/1494254702198784060/orange_town.png?ex=69e1f0a2&is=69e09f22&hm=408e89b6b802e1b68b89ae863713ced64cc71952d57e618f58cee054178a5284&",
  syrup_village: "https://cdn.discordapp.com/attachments/1493204525975076944/1494254703154827344/Syrup_Village.png?ex=69e1f0a3&is=69e09f23&hm=fe505f584915605fb82d5c16fde05b6e2449b04e814c6cef75ab9e755d726382&",
  baratie: "https://cdn.discordapp.com/attachments/1493204525975076944/1494254703658401812/Baratie.png?ex=69e1f0a3&is=69e09f23&hm=b1cf9fe8634c9a3e6ec5e30d43029e0b5030b77b1f2451877be7215a1028e95a&",
  arlong_park: "https://cdn.discordapp.com/attachments/1493204525975076944/1494254704102871181/Arlong_Park.png?ex=69e1f0a3&is=69e09f23&hm=47fb2a1f10201cd080ae85a7a16b2396df7835cb8f7343d5a0fdc11348d38d29&",
  loguetown: "https://cdn.discordapp.com/attachments/1493204525975076944/1494254704421765140/Loguetown.png?ex=69e1f0a3&is=69e09f23&hm=a0b66e834351d8733aff6fcc63f4d7429fa8795a455e3348392206e4a4fc3363&",
  reverse_mountain: "https://cdn.discordapp.com/attachments/1493204525975076944/1494254704849457193/Reverse_Mountain.png?ex=69e1f0a3&is=69e09f23&hm=067d5ec497e2a2aee456a4450255060d0caf4c224e34fd8d061ece6445335dc3&",
  whiskey_peak: "https://cdn.discordapp.com/attachments/1493204525975076944/1494254705285529731/Whiskey_Peak.png?ex=69e1f0a3&is=69e09f23&hm=6a7293441c20d0bc33bf6812706373a22f210f63ea149f369c982889c023a233&",
  little_garden: "https://cdn.discordapp.com/attachments/1493204525975076944/1494254705839312958/Little_Garden.png?ex=69e1f0a3&is=69e09f23&hm=738d3791f5057c780bfeba659403e2f191df818f63e7e1c8b54694577f44353a&",
  drum_island: "https://cdn.discordapp.com/attachments/1493204525975076944/1494256990497542184/Drum_Island.png?ex=69e1f2c4&is=69e0a144&hm=0022bf3bf2102caa263ab5699ad932ac197c29e8296c2379517887a48172e333&",
  alabasta: "https://cdn.discordapp.com/attachments/1493204525975076944/1494256991206641664/Alabasta.png?ex=69e1f2c4&is=69e0a144&hm=4e1f0463afb7ad06524811fd3b382d5fe433fe76b81aacc33552f4a81e5b1597&",
  jaya: "https://cdn.discordapp.com/attachments/1493204525975076944/1494256991919407317/Jaya.png?ex=69e1f2c4&is=69e0a144&hm=f33612d7524f1a9048cbd27acb9da2bfbcfc7d70b280050f23fc3efc175ccbfd&",
  skypiea: "https://cdn.discordapp.com/attachments/1493204525975076944/1494256992481706044/Skypiea.png?ex=69e1f2c4&is=69e0a144&hm=b7d8e3bb7a5ed8a5e973ae04dcea664ee0a8f0ebd461dd109b75365aa8daaba4&",
  long_ring_long_land: "https://cdn.discordapp.com/attachments/1493204525975076944/1494256993009926174/Long_Ring_Long_Land.png?ex=69e1f2c5&is=69e0a145&hm=4741738740ebe132f7626ee209b0225b1f48151b074a3991cfdf3f1dcaff5261&",
  water_7: "https://cdn.discordapp.com/attachments/1493204525975076944/1494256993387544707/Water_7.png?ex=69e1f2c5&is=69e0a145&hm=14a59f8a89621a5549c93410a0fd986f13d2ca907ac3557af40c51ae54c1408b&",
  enies_lobby: "https://cdn.discordapp.com/attachments/1493204525975076944/1494256993895190609/Enies_Lobby.png?ex=69e1f2c5&is=69e0a145&hm=6bf5afcbb6cd32b356d2794b6f3f4480804ead43e2f353b26bf8e54c05b88ea6&",
  thriller_bark: "https://cdn.discordapp.com/attachments/1493204525975076944/1494256994482126938/Thriller_Bark.png?ex=69e1f2c5&is=69e0a145&hm=381786782184c0fdc9abef7d63d81c3f7c5a843dc4d5d544d1188d296a8ac24a&",
  sabaody: "https://cdn.discordapp.com/attachments/1493204525975076944/1494256994947698748/Sabaody_Archipelago.png?ex=69e1f2c5&is=69e0a145&hm=1f2e978e41f9d6aeae56628c1a7828e867888a2f3f07f082fc6f7b1a70180483&",
  amazon_lily: "https://cdn.discordapp.com/attachments/1493204525975076944/1494256995572777081/Amazon_Lily.png?ex=69e1f2c5&is=69e0a145&hm=6ea37ce42d811d8a34f9682879be8d7cd0ea995a59b69ae3b7eee9246eb38469&",
  impel_down: "https://cdn.discordapp.com/attachments/1493204525975076944/1494258775891382352/Impel_Down.png?ex=69e1f46e&is=69e0a2ee&hm=df74aa24019d483a0151d40af8888687bd10f50817bfe1b0a0303d1823133556&",
  marineford: "https://cdn.discordapp.com/attachments/1493204525975076944/1494258776210018375/Marineford.png?ex=69e1f46e&is=69e0a2ee&hm=e2a7c03e90c83be943cc802c0acb6c30504ddca7ed63851231b589d726a8e515&",
  fishman_island: "https://cdn.discordapp.com/attachments/1493204525975076944/1494258776512004209/Fish-Man_Island.png?ex=69e1f46e&is=69e0a2ee&hm=a98544d299a666892da22d1bdcbd08d035874aeee3eb88708dddd650e7c695e9&",
  punk_hazard: "https://cdn.discordapp.com/attachments/1493204525975076944/1494258776801546272/Punk_Hazard.png?ex=69e1f46e&is=69e0a2ee&hm=4f7639b06481971da4412563b7edae5291ea06347aea606263b3cbe214a05a8e&",
  dressrosa: "https://cdn.discordapp.com/attachments/1493204525975076944/1494258777136959599/Dressrosa.png?ex=69e1f46e&is=69e0a2ee&hm=0fd2fe230077ab352f4cec22b1c066ae5be4548bc01dacfd506210e13b571e9a&",
  zou: "https://cdn.discordapp.com/attachments/1493204525975076944/1494258777514442862/zou.png?ex=69e1f46e&is=69e0a2ee&hm=df83066a7856d1565a3435af31906fd990e6a381d1e278259a36c5936e08904a&",
  whole_cake_island: "https://cdn.discordapp.com/attachments/1493204525975076944/1494258777904382042/Whole_Cake_Island.png?ex=69e1f46e&is=69e0a2ee&hm=2edf5b64620f12380826db9b75010b0b2bc8308f6b7e428a83faf64f71486a50&",
  wano: "https://cdn.discordapp.com/attachments/1493204525975076944/1494258778609156256/Wano.png?ex=69e1f46e&is=69e0a2ee&hm=ae59434568890f63a75caf13519f4672eaaacaf7649d601f40f8e7b0fbe5f13a&",
  egghead: "https://cdn.discordapp.com/attachments/1493204525975076944/1494258779024396439/Egghead.png?ex=69e1f46e&is=69e0a2ee&hm=b3e5cb92a6762cc0642e3a884cd7ed6edc129ccb1cbd277bd815df79b7b7cd44&",
  elbaf: "https://cdn.discordapp.com/attachments/1493204525975076944/1494258779473055904/Elbaf.png?ex=69e1f46f&is=69e0a2ef&hm=9db91589de83402921f4cf786362b69a346aa82a6f7eaf1074bb79d8573131cc&",
};

function getRarityBadge(rarity) {
  return RARITY_BADGES[String(rarity || "").toUpperCase()] || "";
}

function getCardImage(code, fallback = "") {
  return CARD_IMAGES[code] || fallback || "";
}

function getWeaponImage(code, fallback = "") {
  return WEAPON_IMAGES[code] || fallback || "";
}

function getShipImage(code, fallback = "") {
  return SHIP_IMAGES[code] || fallback || "";
}

function getIslandImage(code, fallback = "") {
  return ISLAND_IMAGES[code] || fallback || "";
}

module.exports = {
  RARITY_BADGES,
  CARD_IMAGES,
  WEAPON_IMAGES,
  SHIP_IMAGES,
  ISLAND_IMAGES,
  getRarityBadge,
  getCardImage,
  getWeaponImage,
  getShipImage,
  getIslandImage,
};