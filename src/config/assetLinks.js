const RARITY_EMOJI_IDS = Object.freeze({
  C: "1535167273034186822",
  B: "1535167270052176002",
  A: "1535167267019689994",
  S: "1535167264175685703",
  SS: "1535167261084753920",
  UR: "1535167257171329046",
  M: "1535167254122078220",
});

const RARITY_EMOJI_NAMES = Object.freeze({
  C: "rarity_c",
  B: "rarity_b",
  A: "rarity_a",
  S: "rarity_s",
  SS: "rarity_ss",
  UR: "rarity_ur",
  M: "rarity_m",
});

const RARITY_BADGES = Object.freeze(
  Object.fromEntries(
    Object.entries(RARITY_EMOJI_IDS).map(
      ([tier, emojiId]) => [
        tier,
        `https://cdn.discordapp.com/emojis/${emojiId}.png?size=256&quality=lossless`,
      ]
    )
  )
);

function normalizeRarity(value) {
  return String(value || "C")
    .toUpperCase()
    .trim();
}

const CARD_IMAGES = {
  luffy_straw_hat: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1526558059957194833/luffy_1.jpg?ex=6a57757b&is=6a5623fb&hm=90fd90f5629dc5dd7016b4b3e708171e426abfffe464b24d568f075701edef6f&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1526558060284477480/luffy_2.jpg?ex=6a57757b&is=6a5623fb&hm=f920310162a40e8508101401afc81814e775fdb758fec1b3ddd01ac355735102&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1526558061131464805/luffy_3.jpg?ex=6a57757b&is=6a5623fb&hm=2e0d4b10cf6b7bfdce3db43bed3001faf0129d35c046c3c9b76092c3f48faca5&",
  },
  zoro_pirate_hunter: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1526562981306044657/zoro_1.jpg?ex=6a577a10&is=6a562890&hm=232aaaa709d0f6e6ea5d2083873f5d67781e16a6e890065ce3dac7bb78fecd41&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1526562981721145344/zoro_2.jpg?ex=6a577a11&is=6a562891&hm=230e6fbff0239f921b96ca3e6d4b6e2638bd2ab587d19ae6432a3d7ef6942e2c&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539231126017679380/zoro_m3_new.jpg?ex=6a859031&is=6a843eb1&hm=5d7fd1b091ee5df3220283c9837f3abaf8907df6e90cd88fbd3fe9e1dd2bb502",
  },
  nami_cat_burglar: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1526601979827060827/nami_1.jpg?ex=6a579e62&is=6a564ce2&hm=1d7fe3c00739dc8aa8704764972065a06babc8e06c6e4cdaddde9060a3a7fed2&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1526601980624240660/nami_2.jpg?ex=6a579e63&is=6a564ce3&hm=2bfe7cbcff4c82cbefb878e5a6f2ea3529c44543d7c0da2d310be54abdf47ae9&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1526601981463105566/nami_3.jpg?ex=6a579e63&is=6a564ce3&hm=866f5bae1cda8f20a054126e821556161d9a3ab68dfa4ee060d87512829a3366&",
  },
  usopp_sniper: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1526600495043706997/usopp_1.jpeg?ex=6a579d00&is=6a564b80&hm=3522cc9a4c4c438cbd189e3d9ec3ddb21eb6281b4d76efd992b02aa299882d0c&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1526600495307690086/usopp_2.jpeg?ex=6a579d00&is=6a564b80&hm=125358423249eb42d53ade01bad4f41fc8593dfc4c1c42bb306a6b95cb2b9e2b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1526600495634972742/usopp_3.jpeg?ex=6a579d01&is=6a564b81&hm=39e552c4e0bb3392a3390e35820145b89181f9a562b60f83dc8a81f34ada508e&",
  },
  sanji_black_leg: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1526600423144951838/sanji_1.jpeg?ex=6a579cef&is=6a564b6f&hm=46bf8bb5d41f64d54875ac4fe92972a42a5925ed4cad6a2bf543c11f2e120590&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1526600423539212419/sanji_2.jpeg?ex=6a579cef&is=6a564b6f&hm=1cff2d235fe032015247cd7b2e2daed68e043fc02b5958507ee1d7b6fe477a38&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1526600423975157800/sanji_3.jpeg?ex=6a579cef&is=6a564b6f&hm=535e74fa530490af31506b825178110fdcbdbe9ef0e031911093a9de04128c07&",
  },
  koby_aspiring_marine: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530070758401773699/koby_1.jpg?ex=6a643cf0&is=6a62eb70&hm=6dba56e5f26620fecd372477c6e9a87edf6fad115f0e12c67e7631a87eb9c6ed&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530070758728925366/koby_2.jpg?ex=6a643cf0&is=6a62eb70&hm=c535ee6491e853997e3f5d755166e4c40fff3340400de48a6e6bd378b78ed99d&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530070759106416790/koby_3.jpg?ex=6a643cf0&is=6a62eb70&hm=43c4469b54d7cae4b47f129202e6fd82e1cf43c6c9f56963fea13e5cf5496ea5&",
  },
  alvida_iron_club: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530075578210844682/alvida_1.jpg?ex=6a64416d&is=6a62efed&hm=3fae273d96cf40ef1f0ae21f39ddd75b5d236c676c5e287ee0fe886c488fa372&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530075578957434921/alvida_3.jpg?ex=6a64416d&is=6a62efed&hm=a1d1d64019481c3769bd981ca9e6b7b88ea1a42685af7ad7689420b9af9d92d7&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530075578529742928/alvida_2.jpg?ex=6a64416d&is=6a62efed&hm=3e8ad63dab4fe981be14afc1c4f1b2198ef5353ee03d5c02cbb468edb0a18a25&",
  },
  morgan_axe_hand: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530077128446705775/morgan_1.jpg?ex=6a6442de&is=6a62f15e&hm=49fee70f657e3a406463fefc44d2e8e36e211c6e24dafcfe03fab0c0a36bb847&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530077128802959442/morgan_2.jpg?ex=6a6442de&is=6a62f15e&hm=b614bf26493ae3b728927aa2093a91fc83f619a4a8cba2cfd87e736ac7ed0a76&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530077129117798431/morgan_3.jpg?ex=6a6442df&is=6a62f15f&hm=bd3188848846e0103b27ba8593a417bcb02533875af901caf75fdc0273a6f6de&",
  },
  helmeppo_spoiled_brat: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530085622742778007/Helmeppo_1.jpg?ex=6a644ac8&is=6a62f948&hm=d6066fd12531bbca3bb3cdc6b73601bb1601aecea1588efe87a8d3447853474b&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530085623078060073/Helmeppo_2.jpg?ex=6a644ac8&is=6a62f948&hm=5ab3f3a0c508d28e3e2bc7c343475275209e7c37762ede2eef0291c1483ebc2b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530085623602352128/Helmeppo_3.jpg?ex=6a644ac8&is=6a62f948&hm=d2938c2170d911d5eb78e1b8cb98469166dfb5e86cce4aa0714d9d64a6020e84&",
  },
  buggy_the_clown: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530088880873672844/buggy_1.jpg?ex=6a644dd0&is=6a62fc50&hm=f6d1b2ea4b69bb13412543cdeee1141c86d72ac2f61078b39391c9f7b86c22bf&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530088881184178277/buggy_2.jpg?ex=6a644dd0&is=6a62fc50&hm=7e4a5515f96c1b438829a67528837380ad33122453a009dbd0084b467a32f8be&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530088881708597358/buggy_3.jpg?ex=6a644dd1&is=6a62fc51&hm=855255bff9224a11fc29e1f03a5b9702d1a53e2deff0b1be4164bb2596c1c99c&",
  },
  kuro_hundred_plans: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530091005456547911/kuro_1.jpg?ex=6a644fcb&is=6a62fe4b&hm=03fca1ef176c67da5bec3910dcc45000f7eb095e84b775aba191d5d1a2fc2301&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530091005766795444/kuro_2.jpg?ex=6a644fcb&is=6a62fe4b&hm=89d89435c9a7039d7ce7fc8a8e4e14ee29510d208ed2a404cae563643197c347&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530091006089891870/kuro_3.jpg?ex=6a644fcb&is=6a62fe4b&hm=3c1a51bb3e6e8a33dd4bdfb1df392aaad9254f4af223f337ab33f98c135e3f90&",
  },
  jango_hypnotist: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530097318450434109/Jango_1.jpg?ex=6a6455ac&is=6a63042c&hm=79e686a8c1a9b574f325ce832fc4dfee3ab41a9d49299a0bb6eee0e6bfe55240&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530097318810882068/Jango_2.jpg?ex=6a6455ac&is=6a63042c&hm=7616703e3b88977e12998cee9618a526e366a425515911cae239efc238b4ee48&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530097319431897138/Jango_3.jpg?ex=6a6455ac&is=6a63042c&hm=53534b851057210b0393eddb4fc22fa282efed532dd7e11d8152dfe9e8f361b9&",
  },
  don_krieg_admiral: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530099312061583460/Don_Krieg_1.jpg?ex=6a645787&is=6a630607&hm=bdb2aed057ecec902cd24ffaa8552181ae43ef3cce0faac8af2e1c96f216ee22&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530099312371957791/Don_Krieg_2.jpg?ex=6a645787&is=6a630607&hm=c6fd6ec4ab32520f91b5a46ab983f382f5b833a9785422e4dd88cf19364e1217&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530099312686796980/Don_Krieg_3.jpg?ex=6a645788&is=6a630608&hm=908fe3ad4184ec6b0f54e62d186c8d00adcf0ba1c5987d34b73d67efb747a387&",
  },
  gin_man_demon: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530101705180713001/Gin_1.jpg?ex=6a6459c2&is=6a630842&hm=d7b61831a5b936a444e1815948e4b46a0febbd59b63feea9ac0d1e229d11a2c1&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530101705608527922/Gin_2.jpg?ex=6a6459c2&is=6a630842&hm=4eb90732bff21e5bd168c7fd5e3f705d55a822728b2c159645b086b5847f8612&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530101706459840512/Gin_3.jpg?ex=6a6459c2&is=6a630842&hm=3bebef387a7f1ce8dc455497bc5309a6817ba10324ea8c1c5ccdbb51b9ef980b&",
  },
  arlong_saw: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530103192527044679/arlong_1.jpg?ex=6a645b25&is=6a6309a5&hm=71beacb827ae1f6745b33c14457f25fc2f4102179b4b5ac41b39e09469e04b09&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530103192845815808/arlong_2.jpg?ex=6a645b25&is=6a6309a5&hm=192101961cf0efe9e1aa608e2ef71176bdafe56f8f5062b4692b70fb846bc832&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530103193176903730/arlong_3.jpg?ex=6a645b25&is=6a6309a5&hm=48eda30298483b753bd96a2fdfaddb7c876b64134c53b26adfb999513b772d31&",
  },
  hatchan_six_sword_style: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530109493550125138/Hatchan_1.jpg?ex=6a646103&is=6a630f83&hm=42c5872102f4fd18e0eeb0866afb3d92054482852dd0a80fb44f14beaf5d4770&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530109493919219782/Hatchan_2.jpg?ex=6a646103&is=6a630f83&hm=b3e6335231f190dd5725e502b1fc5059880fcdfdc51a2c326eadf7a37b9629da&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530109494338781334/Hatchan_3.jpg?ex=6a646103&is=6a630f83&hm=3978eef5933d4363537c92075d9fbbbbc7c1349049e56d9ccd8d82e85894bf96&",
  },
  smoker_white_hunter: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530110714578997328/smoker_1.jpg?ex=6a646226&is=6a6310a6&hm=4b9f4cb9f64f8ac941abfd7ec359430af90c8822c4ef18b4578f0469ccf2f4f1&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530110714876919978/smoker_2.jpg?ex=6a646226&is=6a6310a6&hm=fc3af1ea5d999142c38b1b0ce10b5770e494bd6d40408e5c16256d161e1839e7&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530110715241959456/smoker_3.jpg?ex=6a646226&is=6a6310a6&hm=3e45035865f3e8aea5fb0e9294d98bc92b877b20fb971a7328feb751fac4c117&",
  },
  tashigi_swordswoman: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530112468565758094/tashigi_1.jpg?ex=6a6463c8&is=6a631248&hm=ce737b842f53997486dafe7c51260db8f4db5aad8884447492f7a1d021bb8c55&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530112468980858982/tashigi_2.jpg?ex=6a6463c8&is=6a631248&hm=435fc38279f994fe76541933a52afdec7e8d500328c437a672e15fa8b4d3d786&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530112469333184603/tashigi_3.jpg?ex=6a6463c8&is=6a631248&hm=1b65b5484983e3ac6e17c4366f40ccb1357ae5ce5211da63f3f148c689f1b7ab&",
  },
  chopper_cotton_candy_lover: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1526619625729691771/chopper_1.jpeg?ex=6a585791&is=6a570611&hm=2188521c45e5cc100ddf37b9af53898d980f8096edefd6391baa6b4d590240a2&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1526619626019229807/chopper_2.jpeg?ex=6a585792&is=6a570612&hm=a64716b2ce5a2732ab0b5d7f265c5547914084ff420dcc7e8d731464b9f9febd&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1526619626320953496/chopper_3.jpeg?ex=6a585792&is=6a570612&hm=c852ae0b792253c4d7311e22a22d8e76079d8fe9158b8593a991ba557ad2e712&",
  },
  kaya_medical_patron: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530115010200604703/kaya_1.jpg?ex=6a646626&is=6a6314a6&hm=7b047b1e46e177a4950e5bf292037821324441554bbcf68a293c006e3d06ceba&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530115010498658476/kaya_2.jpg?ex=6a646626&is=6a6314a6&hm=9f7b682592d34ae1b470d0ccdc3743c5472461dcff7e7e95e3c01b5bcd8a7976&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530115010842464287/kaya_3.jpg?ex=6a646626&is=6a6314a6&hm=f1125c351fda13afdee11779b2bc86eefcb4ed9095672015a18e1c14ddb0a440&",
  },
  bepo_navigator_support: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530116307809206323/berp_1.jpg?ex=6a64675b&is=6a6315db&hm=acdcc62dc5f5f9f0954aaf7ab5234cc44f00cf883e0d43c13ecd0877370c1c54&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530116308145012907/berp_2.jpg?ex=6a64675c&is=6a6315dc&hm=a83104ec35315df13076284406f5b700f48f9c1a2b4b13808e88ba8ce278ed56&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530116308513984582/berp_3.jpg?ex=6a64675c&is=6a6315dc&hm=121644559ea41bf626391fc919b121e7762f6a08bf1ec69012ec6f9cd856dd20&",
  },
  killer_massacre_soldier: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530119173819072642/killer_1.jpg?ex=6a646a07&is=6a631887&hm=b7b7f93e865e2039218ddee871d57473c9d264590823f867e28b05cf48147bc4&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530119174175719624/killer_2.jpg?ex=6a646a07&is=6a631887&hm=14937783849d51f0e7960e5a59b2f86db1d2c92425152d085a6c4d03094be78b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530119174481776650/killer_3.jpg?ex=6a646a07&is=6a631887&hm=e046b1fe26ee00d9b727d9a0c4c0cc2c7522924e714adc911385ef0182533ecc&",
  },
  marco_phoenix: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530146487932158023/Marco_1.jpg?ex=6a648377&is=6a6331f7&hm=ed8185c0dc70a207598123621f31798bde13bc8e1ea56795167eab82b803d223&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530146488410181742/Marco_2.jpg?ex=6a648377&is=6a6331f7&hm=eea271ef6a69d0b179f8918c962ee3c52d899cdeebc441d774ed9d30ff98ad95&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530146488926208081/Marco_3.jpg?ex=6a648377&is=6a6331f7&hm=8fe9bfc70173fa6adc850a9b25d7407c1c36db5369a52ee08d2644c8861e108d&",
  },
  ben_beckman: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530155438895665222/Benn_1.jpg?ex=6a648bcd&is=6a633a4d&hm=1a54589e017423baa167439019ed87f38825a981f36ee2b69b8ca10fd882af6a&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530155439260700742/Benn_2.jpg?ex=6a648bcd&is=6a633a4d&hm=5150c6667950fb90d73a6f5666e32a2b9b627bb4202a11ffda52eb7c254dcfe7&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530155439638183946/Benn_3.jpg?ex=6a648bcd&is=6a633a4d&hm=c47dd60baa40d946f9ffab2182723e4e6375590f0b521f058dc59372791f1400&",
  },
  charlotte_pudding: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530159939283058709/pudding_1.jpg?ex=6a648ffe&is=6a633e7e&hm=caa9214aefb7900d748c561d423914703ca5f54aa3b34d3aeb727074b9c09dc2&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530159939610218506/pudding_2.jpg?ex=6a648ffe&is=6a633e7e&hm=301a34917828d44aeb7d56cded99e6f69b4f088b9aa9ce01e1c8ab37c906919c&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530159939925049404/pudding_3.jpg?ex=6a648ffe&is=6a633e7e&hm=6c30da915d6adcfdf7a901c6f90656cf5159a6c61c1de907adeab9e1e579b6a5&",
  },
  mansherry_healing_princess: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530166310174982234/Mansherry_1.jpg?ex=6a6495ed&is=6a63446d&hm=9088a8fcda8aca9b9a485dad1df403799d1f63dafe4c925ff2bdbf6014bdf9be&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530166310452072558/Mansherry_2.jpg?ex=6a6495ed&is=6a63446d&hm=1121bdefed3400e83a65747f39fa7b10b741d28fb25c681e6dd86739506bd665&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530166310796001431/Mansherry_3.jpg?ex=6a6495ed&is=6a63446d&hm=5362a9b1d43765e7425b36034fccbab0627792646df318472274616cfad2aad5&",
  },
  vegapunk_stella: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530167626972663909/dr_vegapunk_1.jpg?ex=6a649727&is=6a6345a7&hm=6d48aab0d2ba5dbbcd820d4ee7a131fbfd8303ff2b2b175b300d548b0af03417&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530167627492753408/dr_vegapunk_2.jpg?ex=6a649727&is=6a6345a7&hm=a07f3bedf61125a9290cd7b721b94300f52f0cf4521802cec336dc8b7322f01d&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530167628109451284/dr_vegapunk_3.jpg?ex=6a649727&is=6a6345a7&hm=fd7c9f89908058318af64199c1117c2dfdac3d7c7c2ec1e1b0abb33c3cfe4504&",
  },
  lindbergh_revolutionary_genius: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530179846293033050/Lindbergh_1.jpg?ex=6a64a288&is=6a635108&hm=1e5b64d5ba5a96127be7e594e57be4da2d448ef074f7fa29c84759c70cbf081a&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530179846661996656/Lindbergh_2.jpg?ex=6a64a288&is=6a635108&hm=0131f292e689086df149a923c1c8de3f8fc5e630ba319cac703ebdf58a52cb29&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530179847001997505/Lindbergh_3.jpg?ex=6a64a288&is=6a635108&hm=8c2b613fd52256e61ac6fd919668f40d2580ca55901b20b3694822abf61587ac&",
  },
  doc_q_sickly_support: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530494267695304785/Doc_Q_1.jpg?ex=6a65c75c&is=6a6475dc&hm=e3392cd4256cfcb7239cd746af63f66d91cf9e80cb9767f3c425afba9745cd3f&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530494268047888435/Doc_Q_2.jpg?ex=6a65c75c&is=6a6475dc&hm=738c3e3f7438f530d1a595354239d8fe3dabe0813defec5738b357a57b29a2c6&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530494268404142210/Doc_Q_3.jpg?ex=6a65c75c&is=6a6475dc&hm=1dea28ff651cf2154e5e1567e547a9ddd61d11b7dd79df7ba4b720e2e77446a3&",
  },
  shirahoshi_sea_princess: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530497563608743976/Shirahoshi_1.jpg?ex=6a65ca6e&is=6a6478ee&hm=66520a547327b598bafbddacff101ca36b1db09d7219d028c11c09109cb05b08&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530497563957002312/Shirahoshi_2.jpg?ex=6a65ca6e&is=6a6478ee&hm=bce5e0c7458d1a3436f3e92f497697034ee27e61d755b5a528e60368d30c400f&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530497564452065450/Shirahoshi_3.jpg?ex=6a65ca6e&is=6a6478ee&hm=cbd41c47b9506d8fa4b9ecf8437ac14dd69f3d2f3a807572406c6961ee7249db&",
  },
  hiyori_festival_support: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530499621938397194/Kozuki_Hiyori_1.jpg?ex=6a65cc59&is=6a647ad9&hm=83371fa8ee9e9b42029d7f55555d2a883af192d325abb5fa88cbf6aca682051c&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530499622320214027/Kozuki_Hiyori_2.jpg?ex=6a65cc59&is=6a647ad9&hm=d864c2a6f1b186f869085b7d469ac77f1f45f2fc6d88dd83425e2cfe78db9618&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530499622647103540/Kozuki_Hiyori_3.jpg?ex=6a65cc59&is=6a647ad9&hm=99c0cb4a37331e819c31f9731e1191b0e236f142132c6f27728217b7309f89d7&",
  },
  carina_treasure_hunter: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530502686628118649/Carina_1.jpg?ex=6a65cf33&is=6a647db3&hm=e02e9211487b9041748fbe756ac8507f42417008c70e50f9918e7ffd90f4d4be&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530502687039291452/Carina_2.jpg?ex=6a65cf33&is=6a647db3&hm=fc909f67a71eb69729e195d840224089489e4988645b420a792cbf3d1790d80d&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530502687395680317/Carina_3.jpg?ex=6a65cf34&is=6a647db4&hm=883e3f3f7b6c9e7fb6f32e8e805cd86ef7c86f0bf96f5546cd31811819753bcf&",
  },
  kalifa_cp9_support: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530516355634429972/Kalifa_1.jpg?ex=6a65dbee&is=6a648a6e&hm=0b92f44e2dd660a6ba123809e2b903af2505268f762cbb148f6ddb65fee5a200&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530516355948871680/Kalifa_2.jpg?ex=6a65dbee&is=6a648a6e&hm=aa13d15566245d6442efcfb5080d3ad997d502c18f8465280413b3766bbae840&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530516356271968397/Kalifa_3.jpg?ex=6a65dbee&is=6a648a6e&hm=e71f6971942e8d8da2976a8c36bb0411f69dfb035ee24952997514f30246cae4&",
  },
  baccarat_lucky_draw: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530520477548679278/Baccarat_1.jpg?ex=6a65dfc5&is=6a648e45&hm=aaf486dbbb48018b229539a81c0afe6c87b02d2c4eda36e9cc790435b3f5b9ad&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530520477888413878/Baccarat_2.jpg?ex=6a65dfc5&is=6a648e45&hm=0b65468135a3dd18cf925e535617a1913cf3131bff364945d5cda2e3063e3234&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530520478249386126/Baccarat_3.jpg?ex=6a65dfc5&is=6a648e45&hm=d657c3908a4952e51574412274b074ab46a5410675670746b779d568ead8878f&",
  },
  perona_ghost_princess: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530525396007915652/Perona_1.jpg?ex=6a65e45a&is=6a6492da&hm=2576160712bf6b132f40d1ab076eef1150db77ef375c6e7eeb827a284502e278&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530525396452249690/Perona_2.jpg?ex=6a65e45a&is=6a6492da&hm=fc0986d2edc2c79c1a923946011376c3a761923304998ccf433ce9de07ad6a91&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530525396863287296/Perona_3.jpg?ex=6a65e45a&is=6a6492da&hm=bf1eddc509107a9500084985c173d90fe2e83787dffe9b836d0e78141fe14bbd&",
  },
  tsuru_tactical_support: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530923040655806544/Tsuru_1.jpeg?ex=6a6756b0&is=6a660530&hm=7336cd27a375a093db6306435c71e559b46ddb02bac50df7a0d3dd5f9e8a9bac&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530923040945475635/Tsuru_2.jpeg?ex=6a6756b0&is=6a660530&hm=b518f9888c7b7a204f9e522c4d8844e5463825ea5271d0d3a8d4d23b570229b1&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530923041209581708/Tsuru_3.jpeg?ex=6a6756b0&is=6a660530&hm=9c5918eaa287c87f0570e3deca72747b5a9de4aa58033d5ee4ad26ad4f3c7b87&",
  },
  reiju_poison_pink: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530930403005829200/Reiju_1.jpeg?ex=6a675d8b&is=6a660c0b&hm=38dd1aae48dcf9a51e58f3c22359e288b4a5f042d99344c77f325d0bfd7aefaf&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530930403307683950/Reiju_2.jpeg?ex=6a675d8b&is=6a660c0b&hm=f36f0d403aaca45f55be375fd43eed52731c2f2cda824fd887cf22e1ca31c169&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530930403651752177/Reiju_3.jpeg?ex=6a675d8b&is=6a660c0b&hm=cfd5ed6332fa1227b50467e1a6f6bddc455d92201fb37cd35bcc8aa493890569&",
  },
  otama_kibi_support: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530934087487848699/otama_1.jpeg?ex=6a6760f9&is=6a660f79&hm=c944cf43d71831b6de4b79ff623da0077c882357ac5a50b8553bcb34cb4218c1&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530934087865471037/otama_2.jpeg?ex=6a6760f9&is=6a660f79&hm=9b15656b9cc63240aae5d153db41c98d88901e76625234113485a9489d24c598&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530934088192495837/otama_3.jpeg?ex=6a6760fa&is=6a660f7a&hm=05c2e65c8f5d3f8ed149794509a486ec42846e402d658abf2db30a8c2d4e17b5&",
  },
  iceburg: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530936255041503445/iceberg_1.jpeg?ex=6a6762fe&is=6a66117e&hm=cca0fb288b4e06eb09a2a269d0c0c551d16189965879eb37470396128c81c946&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530936255460806706/iceberg_2.jpeg?ex=6a6762fe&is=6a66117e&hm=ee4c3c8cb4cf13dd7ee53bdb0a06ca474916c1eec5add7c433a9773082777505&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530936255788093531/iceberg_3.jpeg?ex=6a6762fe&is=6a66117e&hm=f7228ba7da2504c0f4ab3358c207225dffb17d280d4d14c250418c95e320afa5&",
  },
  laboon: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530939557036429453/laboon_1.jpeg?ex=6a676611&is=6a661491&hm=9f6d66c492d0880189c4a0831ba6afe88ee48952c5cfe840f22ff9c0d2430ac4&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530939557560848496/laboon_2.jpeg?ex=6a676612&is=6a661492&hm=3e08c9f272a5fabf02abff848936bc68c9802eb3343804b5a975b0eb788c45c6&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530939557934272594/laboon_3.jpeg?ex=6a676612&is=6a661492&hm=ce283f466f5634466ac60e4f30fb52f77966f2f3e79294b0c676bfff5e578842&",
  },
  sniper_focus: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530945070851821650/sniper_focus_1.jpeg?ex=6a676b34&is=6a6619b4&hm=078da8b78bd64cbb3b570dc5ff762a442bb04e2776666ca67bc3633a03746d04&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530945071094956173/sniper_focus_2.jpeg?ex=6a676b34&is=6a6619b4&hm=c3d32fda3ba49107bdc5a31e1c5d88e269833696f3fda1d7fb32978c9acef50d&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530945071338356786/sniper_focus_3.jpeg?ex=6a676b34&is=6a6619b4&hm=c1e41f64c2901ad61beb3018058f80dd480de810907788d3b6a4d87f54bba9b2&",
  },
  weather_science: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530954094628307015/Weather_Science_1.jpeg?ex=6a67739b&is=6a66221b&hm=08f6050c1133c54bf46396eeb7dab527aace414d69523e5d6d8bbc6fbd8c5a4a&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530954095135953087/Weather_Science_2.jpeg?ex=6a67739c&is=6a66221c&hm=0000ab4a2aee52636b5f53e565bcc2145859a3b4395d4985248218062ea14021&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530954095467434205/Weather_Science_3.jpeg?ex=6a67739c&is=6a66221c&hm=8316d5110e8033a3322b939817ea939c698609e437af831ff48ac392c5239042&",
  },
  wado_ichimonji_spirit: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530995315904221314/Wado_Ichimonji_Spirit_1.jpeg?ex=6a6842bf&is=6a66f13f&hm=cca3226ac79ecfad73bbbee3c97c06a6ac74b08d9bb388e8853aa5738a07e682&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530995316675842088/Wado_Ichimonji_Spirit_2.jpeg?ex=6a6842c0&is=6a66f140&hm=119dc4d0663e1602ba699d0efbc412ce57bf655114e092e6bfd9234281c38bf3&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530995317258981396/Wado_Ichimonji_Spirit_3.jpeg?ex=6a6842c0&is=6a66f140&hm=df9ad73c545f620beb366a80011ff3106387423f7ef4a018126a493c8959b094&",
  },
  suna_suna_core: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1530998618457243838/Suna_Suna_Core_1.jpeg?ex=6a6845d3&is=6a66f453&hm=c994b65970134c92852c0f89a99c61188094b5c66bb161e7530e00a9d8a56284&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1530998618935263323/Suna_Suna_Core_2.jpeg?ex=6a6845d3&is=6a66f453&hm=781c73813ab710e6b6f7474be383f815cf523e72f106416791a30fa4fbc9eb26&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1530998619388379188/Suna_Suna_Core_3.jpeg?ex=6a6845d3&is=6a66f453&hm=fb0eba5bf388060b838ad4a3aa79d89cac96991791af0af6c09bd0a34214192e&",
  },
  ohara_will: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1531003057561800806/Ohara_Will_1.jpeg?ex=6a6849f5&is=6a66f875&hm=2ebf35f8a1721aa7b17803c9b309354545def7f0e70e99316ac1e44be94803fa&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1531003057872310527/Ohara_Will_2.jpeg?ex=6a6849f5&is=6a66f875&hm=cb304953c9a3e3b281d3fac04ed3e1837cce89e4a7779efd2dc5fa259fab1e74&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1531003058232754356/Ohara_Will_3.jpeg?ex=6a6849f5&is=6a66f875&hm=fc6f8019618c9f47d2cf4b321d613d5510502da8d91f7a8566078595b9a5cb7c&",
  },
  goro_goro_core: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1531005799957266632/Goro_Goro_Core_1.jpeg?ex=6a684c83&is=6a66fb03&hm=aa639b76106c1353a856db8b01e671bc26e65b8ed41081d67dee66b9c66b1048&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1531005800321912972/Goro_Goro_Core_2.jpeg?ex=6a684c83&is=6a66fb03&hm=064da1baf627800ab7991f71b8a102df6fcc6f69557684e7ca2f2e4e2887152d&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1531005800728891634/Goro_Goro_Core_3.jpeg?ex=6a684c83&is=6a66fb03&hm=b5ebc96fefcc6ab6f6d9611151d334d6085bce6ba2d1a988f830b7db625f6818&",
  },
  cola_engine: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497144715852906626/content.png?ex=69ec742b&is=69eb22ab&hm=da696883a6cf06a7e3dd2bab3b7f9f54fe95ec021a1d27f49d51f5a3d07ec437&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497144716301434880/content.png?ex=69ec742b&is=69eb22ab&hm=f2fd1a13b74cefdf844f0c6df4b36bd43f38e5775d0f84e06676c55c25eeedb0&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497144716695961660/content.png?ex=69ec742c&is=69eb22ac&hm=0cda76a7ae720bfd741c3f025db95ae5c4ed486d18cbe6408d7dd7f21612f2f9&",
  },
  rokushiki_manual: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497164138130964532/content.png?ex=69ec8642&is=69eb34c2&hm=4b898c59703f71b9aaa56ee10346b58a5ffe1fdbf28bf1cca20fc6672e4b3dcd&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497164138554855454/content.png?ex=69ec8642&is=69eb34c2&hm=a4b42cf285b945f38fd1cb6972a4f9e41de2fa87af8201261a77248ea7e642d5&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497164139037069382/content.png?ex=69ec8642&is=69eb34c2&hm=a1527ad8079f4644d7652808dc62cae76b1e145a501b8749af43cace5d914bf5&",
  },
  soul_solid: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497190504847114331/content.png?ex=69ed4790&is=69ebf610&hm=81c0d7d5ef5196efc661122b2e4a05fbd506abd4d0b336f87a790a5ac71df8bd&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497190505572990976/content.png?ex=69ed4790&is=69ebf610&hm=3c1d7006c787943fdbe4d7d3b04d7e445f20135c84ec18f447b6d8b899455a80&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497190506357063750/content.png?ex=69ed4791&is=69ebf611&hm=25a24e135a9df8df4af18def1cfb9aa0ac84702979d9631c32b1dd3ef790ac3c&",
  },
  shadow_core: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497551724448055347/content.png?ex=69edef3a&is=69ec9dba&hm=afe40259ede98e04b9b1eb770dbf80af99aa60b5f83a36b5877ddbf78b6b4b88&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497551724859232386/content.png?ex=69edef3a&is=69ec9dba&hm=5f9a0468d74281109645cb6fbd565cb0d9251676350bae7ad0fbd4449cb65791&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497551725299503154/content.png?ex=69edef3a&is=69ec9dba&hm=99607436954c2ab095e2078f1430d35b77532a977d1ed5a8d415b04a7e7a7e57&",
  },
  kuja_haki: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497580840685670450/content.png?ex=69ee0a58&is=69ecb8d8&hm=751a079d74e087247248f0af3211c3b62319f9203a392ddde063ad19f933503c&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497580841243770980/content.png?ex=69ee0a58&is=69ecb8d8&hm=d3f2da897144bdcdd326d59f7a3fe06268b029357a77301eb3e549b9c4779909&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497580841918795946/content.png?ex=69ee0a58&is=69ecb8d8&hm=84423b54010a587ea84271cfc1a5f5bf290b56317b64ac4bcf46a392baf05418&",
  },
  fishman_karate_scroll: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497556719859929229/content.png?ex=69edf3e1&is=69eca261&hm=38a9caa06b3927b240606cdc33af0458e35c2c595dae937f00ad63b8c6501e60&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497556720342536322/content.png?ex=69edf3e1&is=69eca261&hm=4ed26750e5f5827039afe2efcca88a471a62d214fa6e320f85ada7231a9c646a&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497556720929607711/content.png?ex=69edf3e1&is=69eca261&hm=e89a6358f0989e1ffee8c41d5628d55cb357609862fb0a8e663d6d228e9776e7&",
  },
  mera_mera_will: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497587770062012437/content.png?ex=69ee10cc&is=69ecbf4c&hm=6f4fcd451b8ea71179bc938e5290ccd8bbf1481017757d62a8872464818973cd&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497587770724585492/content.png?ex=69ee10cc&is=69ecbf4c&hm=6c93b525abaefad548d92dca40a195b62ab7f44ef238316bcc8f7a81c33601f8&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497587771429097522/content.png?ex=69ee10cc&is=69ecbf4c&hm=49bf241ffaa3c1edb5bd5e13a03ef54e357c42cb5113e0b58ca4ac906ddab3a4&",
  },
  gura_gura_will: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497593316143796284/content.png?ex=69ee15f6&is=69ecc476&hm=9037cb90c8bb702a1963282533439eec663ed09e66ec7aa30b9ccee2c91136d7&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497593316693512345/content.png?ex=69ee15f6&is=69ecc476&hm=124e0eede84eeceed56a25082b77feccb088ab3704d6ba1b87ccb51c306a651d&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497593317137842186/content.png?ex=69ee15f6&is=69ecc476&hm=ce60dedb044dfddb13bef54a8dfd345d890f796494124ffdd508ee8aaa77a4d1&",
  },
  fist_of_love: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497600630930538596/content.png?ex=69ee1cc6&is=69eccb46&hm=c19fe5b6fce9284101873b71f66a2363af2820a4841a304103522eac7e17214a&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497600631601369149/content.png?ex=69ee1cc6&is=69eccb46&hm=a6d2760ad718db35eb0a487a74b1f73fb2ad0e199d447f69452a85d3bfe5a836&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497600632167858217/content.png?ex=69ee1cc6&is=69eccb46&hm=596d6ce20408c25935b63d82ef956737fcd5d32449842ad21c1001bc6b7ebf36&",
  },
  golden_buddha_mandate: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497607427279814737/content.png?ex=69eecbda&is=69ed7a5a&hm=5ff8193b29cf4bceb906d6d027d93ed2bb4c52272fd4ecee18ab539550a4271c&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497607427775009000/content.png?ex=69eecbda&is=69ed7a5a&hm=13e2693ec042a2f57d2d4b1a86f7ae69b1d4a797d5a37f1e405ed5804d9848ee&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497607428248830122/content.png?ex=69eecbdb&is=69ed7a5b&hm=e5dee84802e87fad7f0abab2963c7cb9388111b8ea0e825ac0ef7b46aebe00e7&",
  },
  magma_core: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497836383019073586/content.png?ex=69eef856&is=69eda6d6&hm=b477e4ae590d00fd58fd580ee43e55a4d465e5751106c7a2af41580a6368574e&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497836383706812527/content.png?ex=69eef856&is=69eda6d6&hm=5110e1ca599e34d4cbd05c29c99cdbf462a36a725fde52ed4e53ea07adf86d1f&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497836384462045355/content.png?ex=69eef856&is=69eda6d6&hm=621ffe52a2d8dc2ae72d57bfcde8f54a04927e9ea7e0afe563edf3d2f7a0a0c8&",
  },
  ice_core: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497881024120619058/content.png?ex=69ef21e9&is=69edd069&hm=df259bb727cace7b671692f318af069ba50ed2934aad9c180c4caf4da8d701dd&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497881024871534652/content.png?ex=69ef21e9&is=69edd069&hm=7aac32fdf34080ec99b0623413f518bd1ccf34fa2a3053e9992f25fa4ee69299&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497881025810923540/content.png?ex=69ef21e9&is=69edd069&hm=139755cd3f06d87c79c6ef49581bce9ad7d88e36ca7fbc1fe43997d1f170ffad&",
  },
  light_core: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497844505695485973/content.png?ex=69eeffe6&is=69edae66&hm=1a883d9cbcd565b856e2f7146500794839a3b6e0590b9d432e182c6daf99ee8b&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497844506110988368/content.png?ex=69eeffe6&is=69edae66&hm=643067956d83b84c1f1a31666df2ba365396017b4e8073e38b7b36e567bf4dd8&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497844506702254110/content.png?ex=69eeffe7&is=69edae67&hm=25f6478d26b3946ffe2636c4e3ca588fae037c98609f0bf23694343440fbe0f5&",
  },
  darkness_core: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497862736049082388/content.png?ex=69ef10e1&is=69edbf61&hm=7787be96fe50318c02d9c66ed1a7aeee56510bbc84e3cb31ca58f0bd436ce45e&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497862736892399686/content.png?ex=69ef10e1&is=69edbf61&hm=ddbf8e69d279a521959623a76596d4e0c67cf18361cd279ff5501e3bf82be158&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497862737529671680/content.png?ex=69ef10e1&is=69edbf61&hm=7a58a0cfaabbed94be7ba71f6bafff826d756717ff14cf6bffcee4e115502649&",
  },
  ope_ope_notes: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497873917937848412/content.png?ex=69ef1b4b&is=69edc9cb&hm=e0cefd32d3be1a7cabc5eb8e44d06c0792d6ea121fc6a0d155b940730aa66b51&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497873918369988672/content.png?ex=69ef1b4b&is=69edc9cb&hm=04a3a7a3b611100f746d7217bd9a44658f276b6a9cdeaa1792319648f1be7abf&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497873918763995247/content.png?ex=69ef1b4b&is=69edc9cb&hm=688ff147b17025e3386e637724a0f99e427b53ef9d49dcbad25704e65837bc5f&",
  },
  magnet_core: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497890419068108871/content.png?ex=69ef2aa9&is=69edd929&hm=1ea44ca1f0ee7702edebe4a04eaf5c1085495919fe90b938130f84b6d9a904af&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497890419680481360/content.png?ex=69ef2aa9&is=69edd929&hm=61e8d2d6a97b751cff8fe2823f699d81ae1b734e114a995931214ccae732df48&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497890420280262697/content.png?ex=69ef2aa9&is=69edd929&hm=491d336ccc63180542d5b2c9d18e12eb9a308b0b41fd916fc618091527baeb7f&",
  },
  ito_ito_awakening: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497918959708541008/content.png?ex=69ef453d&is=69edf3bd&hm=29e8b3d3f78d8899ad9314df4ba04865f0845fd655420a809df68206fb434bfc&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497918960337817830/content.png?ex=69ef453e&is=69edf3be&hm=9d99aa87a695e33e964e4f1a5056273e1bdfce91e83b390df2505af8d0c7bb43&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497918961046782032/content.png?ex=69ef453e&is=69edf3be&hm=996af8a0437e0e38e0c719d46788644255628cded6d762c8ad939e8c23fb5f07&",
  },
  future_sight: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497924627010424892/content.png?ex=69ef4a85&is=69edf905&hm=0eac371a0edeed23d32dc7babd15ca50eaed245362fa6970c5085f651b082b32&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497924627442176110/content.png?ex=69ef4a85&is=69edf905&hm=c3ba788e0af74f4482a2aef84e1e7b52d077d6e7130435cb83f1188fccde312d&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497924627899482122/content.png?ex=69ef4a85&is=69edf905&hm=ad39b1035ef81631d9623f308e67c159a50d865d81e8afa4d8c772fb64f7194f&",
  },
  soru_soru_soul: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497932070591135804/content.png?ex=69ef5173&is=69edfff3&hm=caadabba2d145230d0e486dc474be08834b73b4583006cdd370ad641a7340b47&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497932071212023828/content.png?ex=69ef5174&is=69edfff4&hm=b8c9e1403a58a9f904f610de614662601d943834d1c42c2f7ac63f2291a48dde&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497932071711014922/content.png?ex=69ef5174&is=69edfff4&hm=57ee27b31e73a35fd42ddee65fbdf480fc5c71c013ec1ac9c33f85bce609cd52&",
  },
  lunarian_flame: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497938374714064986/content.png?ex=69ef5752&is=69ee05d2&hm=4df53894d96c6ead28034956a743ab918948b1bb5e3891a3dbcfac1af7b772f0&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497938375192084693/content.png?ex=69ef5752&is=69ee05d2&hm=6189e2619b0aeb7cdebbbf15a7caff436abd163912e6b79aacb21dbd6c16e9b3&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497938375687143474/content.png?ex=69ef5753&is=69ee05d3&hm=3fae355f97cd635289351805e5f9b3ac0ec8dbeab708ce99e58d4fc878925492&",
  },
  plague_tech: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497942549506031748/content.png?ex=69ef5b36&is=69ee09b6&hm=a379a2447bba44149ece6fbcec6ebae819304d44123c36dad4f6414f34fe5a06&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497942549938176040/content.png?ex=69ef5b36&is=69ee09b6&hm=c769428eb627b376d01d517d536b60be58d2cd60c5793cec69f568f7e467facc&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497942550475051039/content.png?ex=69ef5b36&is=69ee09b6&hm=4be17df44100f3f5a5d567acd415a90533c504dfa342fe6209b4a6a1e053bb1e&",
  },
  beast_core: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497947425472778341/content.png?ex=69ef5fc0&is=69ee0e40&hm=deb4bfea63a2601c7a90d105f4b992df29bde60986dbddee2d34d3477f5f9ae5&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497947426135347370/content.png?ex=69ef5fc0&is=69ee0e40&hm=7e766879b039a3f3f2053b943b889242de8c7dc424124112203c55efe88850ee&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497947426667888780/content.png?ex=69ef5fc1&is=69ee0e41&hm=af67c6651a98eacf0e843b9a0c661147f9366d21477ab39fd2716a155a7cda2d&",
  },
  oni_lineage: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1498240687903211590/content.png?ex=69f070df&is=69ef1f5f&hm=59b0af49450515468d6e4a31837d18ab842c9a52ba1128a87d25b5270fd94d9a&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1498240688528035941/content.png?ex=69f070e0&is=69ef1f60&hm=8dae91930d48c69ae766b130dcd915f5e3d52da01479c8af9b88100214889227&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1498240689337663590/content.png?ex=69f070e0&is=69ef1f60&hm=21ee65ad3848a428b70ff926c0028746575ad8bfb767ddec1d264d40ed4fe6dd&",
  },
  forest_core: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1498252036561571880/content.png?ex=69f07b71&is=69ef29f1&hm=bfccea0c1ad8064b044488d521616ae9a91ef71869ff545c6ee24c9352daa7ec&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1498252037266079855/content.png?ex=69f07b71&is=69ef29f1&hm=5da76478cbcd5d6689a5b6485f3ec3984c2682cc0865fd8a36bce5b4e684c835&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1498252037719330866/content.png?ex=69f07b71&is=69ef29f1&hm=bb6768427bcdec4fb0707c041f2ba3e9d90cf5393e6d1710826cb1fef3480263&",
  },
  nika_drums: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1498265231208743032/content.png?ex=69f087bb&is=69ef363b&hm=a18c81d47c83a6244de8c794aeab40c9cf03d71ed41c5ae50bc18264f9c43eb4&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1498265231791755264/content.png?ex=69f087bb&is=69ef363b&hm=1b49a97770821e9821fefaeba0564dc363b4e535304ce51df259467a19f92ba3&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1498265232332554310/content.png?ex=69f087bb&is=69ef363b&hm=3ad512e01649deffdda2a847861baaec4f3ffb5e352aa8001308c3449cb29d44&",
  },
  supreme_haki: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1498283844116287488/content.png?ex=69f09911&is=69ef4791&hm=936c7ad2c85450ccd324b12dbf43f6274e94d041a3b4317afeeec7b304704a2f&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1498283844644900924/content.png?ex=69f09911&is=69ef4791&hm=657b62eab608b4b0ddfccb9bd180fe15d4e3d8a3bf0ec26299ff67b7e8e49627&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1498283845202477216/content.png?ex=69f09911&is=69ef4791&hm=36f346f62cf508042287ad1e81d54547f4fb6b2c951293b19eeb9963f3d8b155&",
  },
  black_blade_yoru: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1498529224900743238/content.png?ex=69f17d98&is=69f02c18&hm=15e933388fb864eeed11a56683ca09dbdbcb53cb51cda70cae8a315d3de78cab&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1498529225588604979/content.png?ex=69f17d98&is=69f02c18&hm=c17faf9d45e406e7f8ebcfa667615a09c298c27e1f66fb3e28dba8837a0d016d&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1498529226175938620/content.png?ex=69f17d98&is=69f02c18&hm=2bbcffb0e65a5475d98bb2f8bc24f8d49001a908150f75a151864d5aa0205f91&",
  },
  chaos_core: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1498530353802121338/content.png?ex=69f17ea5&is=69f02d25&hm=6b390721ff78f1fa8b45c20e7fb99ef75c02d7a37cde8ee10cd4adb46d60bacc&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1498530354187735171/content.png?ex=69f17ea5&is=69f02d25&hm=fff218c626402e0138281f9c6794d825942c331b9d47b8ec185dff09a4387f15&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1498530354573873162/content.png?ex=69f17ea5&is=69f02d25&hm=0a9262913769cef59f3e60c402e1fe1169e0494e8fede0337269121cd22a360e&",
  },
  storm_mandate: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1498582780223688766/content.png?ex=69f1af79&is=69f05df9&hm=06d1719334756222e43882a1fa1bc2fa0793284e9d1eff2d44b6485305827640&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1498582780588720208/content.png?ex=69f1af79&is=69f05df9&hm=194b18c48249375224813a67d73bca0728d2ec7b321ed79b3a94883bc0e20375&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1498582781037383691/content.png?ex=69f1af79&is=69f05df9&hm=b007cae4581183d8dbb5e49ea0d521449e1e8c863144ddd2932c5bbcdb16f38e&",
  },
  empty_throne_edict: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1498589673717633064/content.png?ex=69f1b5e4&is=69f06464&hm=2287bb75e17541cd2549747d75c98bda2ba65f9952370bf36d950a224f468c4b&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1498589674208235610/content.png?ex=69f1b5e4&is=69f06464&hm=29a4998cbaa863dcde45ba3556fbc1a7a341653c43e3d528548877e988effbf5&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1498589674678124635/content.png?ex=69f1b5e4&is=69f06464&hm=d44815eb2bb5b6e60b7608281a0d7eb4c8834de3b7205e7049e3ac96d49ecc5d&",
  },
  holy_knight_sigil: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1498593048848765058/content.png?ex=69f1b909&is=69f06789&hm=c5d6261e21f653c0312debebc61bf300fe3ec1065e9dd6cb3c42edb05c6f5cdc&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1498593049260069035/content.png?ex=69f1b909&is=69f06789&hm=74ebc8d30219b0908ff18013a7a6a349873fb280ffb457424fb9fe5ab5d0d8be&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1498593049658265600/content.png?ex=69f1b909&is=69f06789&hm=80de839a544e00da8fc7ba3666a7e7f70b71ce1d63d0b0c267ec307c54cf97d5&",
  },
  giant_curse: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1498594055804944384/content.png?ex=69f1b9f9&is=69f06879&hm=a70b1f5580993f8b2a49daa758c3ce601330fca5be36d3273ef04c8e5a4b3b57&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1498594056177975296/content.png?ex=69f1b9f9&is=69f06879&hm=1563500dcec6c5969221150c970e06c8a6919fae7c2c767ba07f6d6d51819e6b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1498594056534753340/content.png?ex=69f1b9f9&is=69f06879&hm=387a0da85344d7f4a21cabebf9177224aedd6a59ba0a3e0ba1431630a2882a5b&",
  },
  samurai_spirit: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1498626467825848340/content.png?ex=69f1d829&is=69f086a9&hm=d845743ec54c76c3c4dfdb3ff0dbb11317e01fde2c87b1f604228586e40cc678&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1498626468308324373/content.png?ex=69f1d829&is=69f086a9&hm=b94b8c7998de65bd3a6c8484eeac781030e3cc06da35acc76c664d696a707b31&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1498626468710846485/content.png?ex=69f1d829&is=69f086a9&hm=7e2049fd8ee4b20ef7c2e76081287dc6ab52c18dabdbe59a44d87a86f6852741&",
  },
  crocodile_desert_king: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1535177196757581824/crocodile_1.jpg?ex=6a76d0ad&is=6a757f2d&hm=4dc340cac0171f8f654300407f20cf0d6fac31150e9afab0bd4a387723de2ce3&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1535177197147656282/crocodile_2.jpg?ex=6a76d0ae&is=6a757f2e&hm=549440cbead6d5a084acf46b7e9597ac4ab0e2bd79bd6c947bc66566c9535e7d&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1535177197596180571/crocodile_3.jpg?ex=6a76d0ae&is=6a757f2e&hm=9e077a00cb1f27f2cdfb741a1048607888b834ce823185dfc028a586b685cd62&",
  },
  nico_robin_devil_child: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1526616595751895202/robin_1.jpeg?ex=6a5854bf&is=6a57033f&hm=a244a8e9193188adca1a8a7c2b22776418f0f23787e97a4d57b0572347d46b12&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1526616596053758002/robin_2.jpeg?ex=6a5854bf&is=6a57033f&hm=ef17b7cfc19b496ec4b509ffa019c4ce7cfe444abd0b8cf666f9476b4a2c8878&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1526616596309606420/robin_3.jpeg?ex=6a5854bf&is=6a57033f&hm=9401293d98dc1863dc0122c0e1b4084dcd471daead5e1f26ba84871bdbe72a32&",
  },
  daz_bonez: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1535179328709464134/Daz_Bonez_1.jpg?ex=6a76d2aa&is=6a75812a&hm=712a77a8aac8616499fa831970eb998589fff7a61090c1c9b71cfefd29101106&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1535179328994680952/Daz_Bonez_2.jpg?ex=6a76d2aa&is=6a75812a&hm=cbf379a685f4909d3318534e520d258f1579cc02826720bb5c4c58cc89e24671&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1535179329305317527/Daz_Bonez_3.jpg?ex=6a76d2aa&is=6a75812a&hm=94ae282b626d2ca962be22d76821b40d0cc5f0ea1aa90c6adae856455b17f450&",
  },
  bellamy_hyena: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1535186377837117470/Bellamy_1.jpg?ex=6a76d93a&is=6a7587ba&hm=9b82dac2d364c14c670d8050ba501e4666fbfb124d053782d77eacf070773444&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1535186378193903626/Bellamy_2.jpg?ex=6a76d93a&is=6a7587ba&hm=908199c22f759aba33aed109d4044e55a6ed19456d2ee2f17ddeac64d0756893&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1535186378680311878/Bellamy_3.jpg?ex=6a76d93b&is=6a7587bb&hm=865c69f849593a3c95031f6a3d97fe115f7d3ebbc67ab247823d194368c4aaa7&",
  },
  wyper_shandian_warrior: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1535582574876033044/wyper_1.jpeg?ex=6a784a37&is=6a76f8b7&hm=06788d73f38fc78d532b18e6b30df3d422cfcd03029a3b5664b0536d18dd9152&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1535582575467302984/wyper_2.jpeg?ex=6a784a37&is=6a76f8b7&hm=f33d87e7e985aa0c7e426e3478118a63988c56b404cb6953dd59e479dffeb272&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1535582575869952041/wyper_3.jpeg?ex=6a784a37&is=6a76f8b7&hm=b7ba75980a966777b511ae4ed02d796e7caa2ca40a9e1fcefebadc38108c3890&",
  },
  enel_god: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1535586738007965767/enel_1.jpeg?ex=6a784e18&is=6a76fc98&hm=513f972c680757de4d467dd52388d01c016666f3e6593e16a214a5310bdee3b5&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1535586738410492016/enel_2.jpeg?ex=6a784e18&is=6a76fc98&hm=119687e52af4b2c2afbaf6e5ed4297e2648a55ecd7a197644e720a34c5c1bf5d&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1535586738947235920/enel_3.jpeg?ex=6a784e18&is=6a76fc98&hm=c56618d57b6c10ef04a2573d36a44a0f7b355f039fed6e943da92f603f3eabb4&",
  },
  franky_cyborg: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1526622823282638889/franky_1.jpeg?ex=6a585a8c&is=6a57090c&hm=7532d9de23e6a4d4c9c369d366a13e969b68db2d8b30a0e2f21d6322edc1787e&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1526622823563395072/franky_2.jpeg?ex=6a585a8c&is=6a57090c&hm=36a930335e37358959fbdd9701b0fcfcaa6ac1a18a101f6bffe26cbb05a757c1&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1526622823848611902/franky_3.jpeg?ex=6a585a8c&is=6a57090c&hm=62e18c3682e0d0802284f840d51e557031c945a159e71fc1acb30e4387ddb61d&",
  },
  lucci_cp9: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1535590485605748797/rob_lucci_1.jpeg?ex=6a785195&is=6a770015&hm=dcf06a16ef3d3775f6155a95f0d0eec713a672ad925252acba70656080533d03&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1535590485891219526/rob_lucci_2.jpeg?ex=6a785195&is=6a770015&hm=7aa89ad706efa600687d315835b36ef5544d3e61145a4964462f7bd515030702&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1535590486193213540/rob_lucci_3.jpeg?ex=6a785195&is=6a770015&hm=33ab13987288130865d40cf4e8280a0903311866711a6eaaef3855a7e90ca2a0&",
  },
  kaku_cp9: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1535597885767548998/Kaku_1.jpeg?ex=6a785879&is=6a7706f9&hm=7ba9d0abb84e097b8b647a83c05c99bca1b52118a1bd27a6325a1a582354fc4e&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1535597886040047736/Kaku_2.jpeg?ex=6a78587a&is=6a7706fa&hm=4ecc2b26df006fc64360bffd3a30fcf70a5c5884f95567b4c71d563d260769ba&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1535597886333788200/Kaku_3.jpeg?ex=6a78587a&is=6a7706fa&hm=743003001901f268a5f492c6c99252d8a12c4a71569e34e4dbd9a7f785aab87e&",
  },
  brook_soul_king: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1526528170881454201/brook_1.jpg?ex=6a5759a5&is=6a560825&hm=92859effb6b2bd941c7127c5f5a29946ab42e0a7ce7e667ac6ec8358860c31cd&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1526528171221061712/brook-2.jpg?ex=6a5759a5&is=6a560825&hm=ee31a2c7b05945f324415fbdc6b300c6272b611a584ef838fad76e5e9e80fdb9&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1526528171854532679/brook-3.jpg?ex=6a5759a5&is=6a560825&hm=89d65793353fe269e3e872aa93f7c9051265e91543f9b1b97c122e04aa54c5cb&",
  },
  gecko_moria: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1535601247430910013/Gecko_Moria_1.jpeg?ex=6a785b9b&is=6a770a1b&hm=107d6d5f7777ab2959032b4193933aae0b128e298294f0285c85d532660ac563&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1535601247728439356/Gecko_Moria_2.jpeg?ex=6a785b9b&is=6a770a1b&hm=5278dde1f561423238b2fbd54c171c7ed6ee24088364e77b7faf2806c0f14cf7&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1535601248051527720/Gecko_Moria_3.jpeg?ex=6a785b9b&is=6a770a1b&hm=9164b4f3893cf55de7270d7712c8e25d0e658f14726801c990b33c20a242f50f&",
  },
  bartholomew_kuma: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1535604229723529246/Bartholomew_Kuma_1.jpeg?ex=6a785e62&is=6a770ce2&hm=69aa488a6e3ff12c3f8136dd23c6b5095dafd46697b3fdea10da352d246bc626&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1535604230067322940/Bartholomew_Kuma_2.jpeg?ex=6a785e62&is=6a770ce2&hm=dee84c1e677e0141014805e51fee8f04c7a1f7a55a18a9bcdbf683294eb24094&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1535604230390419488/Bartholomew_Kuma_3.jpeg?ex=6a785e62&is=6a770ce2&hm=c907f960b2bbfae7b601259577d25d826ea0025fc9907cf1ac3caf58a30e9724&",
  },
  boa_hancock: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1535606311553597451/Boa_Hancock_1.jpeg?ex=6a786052&is=6a770ed2&hm=12955b6a8a8b17c4e9c9482c78a6952c0af7511e98755a13b9bfdb019388fb6b&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1535606312174624768/Boa_Hancock_2.jpeg?ex=6a786053&is=6a770ed3&hm=df63f1d04513960e4124580d05bf467e9acf89b667ebf6d949e69d4ac7190e64&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1535606312530878566/Boa_Hancock_3.jpeg?ex=6a786053&is=6a770ed3&hm=773320978a24949f632d3be57fa1c09b1751263dbb14a166f4b04bc42331ca0b&",
  },
  jinbe_first_son_of_the_sea: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1526627372550324245/jinbe_1.jpeg?ex=6a585ec8&is=6a570d48&hm=40d262b20e7f9c67ae0b6cdb0aee3a4a27b6879ce605cff3919df60cd32d5a64&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1526627372831346791/jinbe_2.jpeg?ex=6a585ec9&is=6a570d49&hm=022708dc4526db7b6c5a414acf7d3fdfb1d4aec1bff381fe7acd9c26fc2b4d54&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1526627373158629497/jinbe_3.jpeg?ex=6a585ec9&is=6a570d49&hm=f6daa1a4c4df8193da2b9cac07b4b34553287016a991065125c87e125d91762d&",
  },
  ace_fire_fist: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1535979948479750225/ace_1.jpeg?ex=6a79bc4c&is=6a786acc&hm=93f75f1699db4978d17d094b1ef47eadfab7874b2af2f2dde7f514c16dce32a1&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1535979948886462464/ace_2.jpeg?ex=6a79bc4c&is=6a786acc&hm=e4529f6982f9102e5fc3e742fc3ba77e0efb88be3cd9500c89a17a4848b6b0eb&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1535979949251633192/ace_3.jpeg?ex=6a79bc4d&is=6a786acd&hm=6c549a26c561ec0b0253d52587e77c2728b17a8c43ecb4503e038977f8a6cb03&",
  },
  whitebeard_strongest_man: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1535995965893255259/newgate_1.jpeg?ex=6a79cb37&is=6a7879b7&hm=b87a1cdde98bb02732eeb0162b8005da352f49ffc0de25dc58ae47afec60544d&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1535995966232985663/newgate_2.jpeg?ex=6a79cb37&is=6a7879b7&hm=63915d6de062c14159a5c4ec088376cbb80082777a21a4aba0cf3d333089054b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538059248209240145/whitebeard-one-piece.gif?ex=6a814ccc&is=6a7ffb4c&hm=8a5b8ab9e9fd7b92cd2db490775c1238f56c97e0852f9a800362d6acd8bffe28",
  },
  blackbeard_emperor_of_darkness: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1537033348533190716/marshal_d_teach_1.jpg?ex=6a7d915a&is=6a7c3fda&hm=37e7c12424ef19c117c7c43fcf3e30a53f67d87e4ccc6b472f800be1be34d766&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1537033349355405362/marshal_d_teach_2.jpg?ex=6a7d915b&is=6a7c3fdb&hm=3c506bc12590f24e37e27b4f248bbdafbc55ab4d1811bee9a043cddc87820452&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1537033349963710576/marshal_d_teach_3.jpg?ex=6a7d915b&is=6a7c3fdb&hm=9c16e89d3989916827f1eab7ffd682f19a697d85ea7df0a5b9d39530cfe5cc03&",
  },
  garp_hero_of_the_marines: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1537039161108733952/monkey_d_garp_1.jpg?ex=6a7d96c4&is=6a7c4544&hm=9e9702335d1ec2bbb59883ebdbee6def1fbc83813f623ba88d6f1abafb35de8b&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1537039161515708537/monkey_d_garp_2.jpg?ex=6a7d96c4&is=6a7c4544&hm=b4fa6c81f019a184da706647a425e15701546f5a45e0a95006c4b98737b0bb0b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1537039161893326878/monkey_d_garp_3.jpg?ex=6a7d96c5&is=6a7c4545&hm=e6750f344b24f57961830a3358728df60998b8ba1bcf3e16895ce0561d8ed32e&",
  },
  sengoku_buddha: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1537045377021251635/Sengoku_1.jpg?ex=6a7d9c8e&is=6a7c4b0e&hm=1fc0f28fc7d4fe2c8b3d0ab38200375d7fe383e0e9d443160d8fd7a4f06f6d5e&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1537045377365180436/Sengoku_2.jpg?ex=6a7d9c8e&is=6a7c4b0e&hm=ce91fdfde5b75d3339676f0b13629111ec408c3f0c68c5146687bf745af5ce47&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1537045377763770378/Sengoku_3.jpg?ex=6a7d9c8e&is=6a7c4b0e&hm=59614873a0ea02a646f18e1a0c9453305aa7cb1057e707a6df18b995959b8e68&",
  },
  akainu: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1537317097225330748/Sakazuki_Akainu_1.jpg?ex=6a7e999d&is=6a7d481d&hm=6b082952ba2a4f6a6c04185d66862b8143ffda382cabb65f69e996a99d4b9e67&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1537317097573580931/Sakazuki_Akainu_2.jpg?ex=6a7e999e&is=6a7d481e&hm=cdcdc79dafa43d9aa0792d99616c142710dc04cf8815d007d74303b09d894ddd&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1537317097926041600/Sakazuki_Akainu_3.jpg?ex=6a7e999e&is=6a7d481e&hm=da2c4e9e5e38c66189b4ee9f62d403c3bac544a5ba1c4874a64be6689d8bfd03&",
  },
  aokiji: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1537319078157623326/Kuzan_Aokiji_1.jpg?ex=6a7e9b76&is=6a7d49f6&hm=31491f88f51ba20bac4dc3db1ba4abd91bb15afb77c78b0b58db2f64b5542036&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1537319078568534087/Kuzan_Aokiji_2.jpg?ex=6a7e9b76&is=6a7d49f6&hm=0d51abe951ed4c20278b61e8dac6552c5ee749a0d8108b856495da25633394c3&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1537319078996349019/Kuzan_Aokiji_3.jpg?ex=6a7e9b76&is=6a7d49f6&hm=6c0e6bbfce1e11fdbdad9201800883c4c5d40cad6474c09cdffa6daeac371511&",
  },
  kizaru: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1537322719207755857/Borsalino_Kizaru_1.jpg?ex=6a7e9eda&is=6a7d4d5a&hm=73845f309f0041fc159a1cdae7e58ea9a3b94a8942a58c26d9b2a2fec68d20dc&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1537322719689838602/Borsalino_Kizaru_2.jpg?ex=6a7e9eda&is=6a7d4d5a&hm=ec35dac8891cebfede024bfac2d327ba0599f2c74962e56f82b3c10232f4f050&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1537322720042426478/Borsalino_Kizaru_3.jpg?ex=6a7e9eda&is=6a7d4d5a&hm=ce6fdab18e6323bad243cb7e2be883737d013108b3ea8df9577d92c855628c02&",
  },
  shanks_red_hair: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1537326668190846996/shanks_1.jpg?ex=6a7ea287&is=6a7d5107&hm=9731655bd36c7dbcdc74566175d4cd7327a593a9e1f5c0fbabe79aaeeebb4e6d&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1537326668484444180/shanks_2.jpg?ex=6a7ea287&is=6a7d5107&hm=7004d3c599774dec13b4f6d779af29446c93094e354fa2ade48355d82443911f&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538887071647932416/shanks_3_new_.jpg?ex=6a844fc5&is=6a82fe45&hm=434867f2de6a4c931da9bdc376f8e6342c6a54025bd453f1397155bcaa33b0ca",
  },
  mihawk_hawk_eyes: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1537333460371378197/mihawk_1.jpg?ex=6a7ea8db&is=6a7d575b&hm=6edd88de15546ca594af447792afde691f54d493cdb0a9846a7ec5af3d49d1b1&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1537333460799062106/mihawk_2.jpg?ex=6a7ea8db&is=6a7d575b&hm=25575dfd84ec41109f25c7b585b9f12b9c19b7c709feadd4385c6a61fb975934&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1537333461180747787/mihawk_3.jpg?ex=6a7ea8db&is=6a7d575b&hm=1795bc6f61c7b6ae8be50a1eec1e7ddba94c226d9241d560be571b97ae597525&",
  },
  roger_king_of_the_pirates: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1535995938160779334/gol_d_roger_1.jpeg?ex=6a79cb31&is=6a7879b1&hm=5455f5f349b2382f30be0cbaff48afdd48290414d5425f6ca64b293f31e83afb&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1535995938458308668/gol_d_roger_2.jpeg?ex=6a79cb31&is=6a7879b1&hm=d70c8fc7ad2102d1c82677aeb2b028d4cf4a7dab6573742aa7066c0eedc0e747&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1536003199884857384/gol-d-roger.gif?ex=6a79d1f4&is=6a788074&hm=74f7e570c08c5dd4222fa0f2c003fa3d2de717826eebf64343b5fdd3e551205a",
  },
  xebec_captain_of_rocks: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1537726848027594772/rocks_d_xebec_1.jpg?ex=6a840bba&is=6a82ba3a&hm=2af95657b95d2e95edeb55261a0c2034a7cfb94f6f61e41b04128088a26331d7&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1537726848388300880/rocks_d_xebec_2.jpg?ex=6a840bba&is=6a82ba3a&hm=d1d4707d936ad4d0c088bce249abc3c20e043b4765a67b318fb069cae1c070bb&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1537726848950206485/rocks_d_xebec_3.jpg?ex=6a840bba&is=6a82ba3a&hm=868d546907b62dd423bc631941d186158b2af1bf9c1120dc092a0982fd9f8da5&",
  },
  dragon_revolutionary_leader: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1537729446700777492/dragon_1.jpg?ex=6a80c265&is=6a7f70e5&hm=603702308dcea69b93f0bb7fcf64749e75055482f4f4ae60959edcd6bb69b8d7&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1537729447036190780/dragon_2.jpg?ex=6a80c265&is=6a7f70e5&hm=5c986f4941cd6b13bce7a37734fcc59c66bc4a679352255125ecb0e75e0d3cb3&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1537729447430459472/dragon_3.jpg?ex=6a80c265&is=6a7f70e5&hm=1fe9cd16424e411b7366cad58ece486ba8306077413179fe3d2c058338384be2&",
  },
  saturn: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1537750613331410954/Saturn_1.jpg?ex=6a80d61c&is=6a7f849c&hm=78d289dee8030d534e24c37f2ae10daabe4afc0125c5f0f07746980abd2d688b&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1537750613734203434/Saturn_2.jpg?ex=6a80d61c&is=6a7f849c&hm=dfc1fed92aa4bee70821bb24b7f8bda87f6be5bd1b743987fea760c40771d034&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1537750614107230258/Saturn_3.jpg?ex=6a80d61c&is=6a7f849c&hm=1e6a468e76e3e9e750918a21e2184563a06f2bf47b4fe921082020fd6e073ffa&",
  },
  mars: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538115108298035290/Saint_Marcus_Mars_1.jpeg?ex=6a8180d2&is=6a802f52&hm=9936671280ad2c0355d1163adb3b518750828830032a6a3ff5f652b560ab7fc7&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538115108566335528/Saint_Marcus_Mars_2.jpeg?ex=6a8180d2&is=6a802f52&hm=895f78c80702923185dadd5cecd3f4c926dd29955afea8e18c6c0541205a194b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538115108843167884/Saint_Marcus_Mars_3.jpeg?ex=6a8180d2&is=6a802f52&hm=bfc0c24778675767f912d077f95c358afd24d66a03575145ba98a5028b2090f2&",
  },
  warcury: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538118192294133790/Saint_Topman_Warcury_1.jpeg?ex=6a8183b1&is=6a803231&hm=ea47a2379d469236b024be89c2ad061f09e926c5bd8142d868232989bd0f27e3&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538118192696664084/Saint_Topman_Warcury_2.jpeg?ex=6a8183b1&is=6a803231&hm=4bf55fd6e48b2af08230b9499a083a7f6f0d0fc7c1b315aeb6fbaf1f38f7ce5e&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538118193019617302/Saint_Topman_Warcury_3.jpeg?ex=6a8183b2&is=6a803232&hm=f7320e8b8650132ebe55957544a8b7067747abe55e8ed4322d83f5d1d20e2f0c&",
  },
  nusjuro: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538122093420486727/Saint_Ethanbaron_V_Nusjuro_1.jpeg?ex=6a818753&is=6a8035d3&hm=1c36891e3b986a5a86ef18ea27676efd63debe5664c1490988bc0d62ef6241d2&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538122093697171546/Saint_Ethanbaron_V_Nusjuro_2.jpeg?ex=6a818754&is=6a8035d4&hm=a3a6380a4710609e5f57a8f775378e94b9953774b7a4da22292935a0de337519&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538122093999431711/Saint_Ethanbaron_V_Nusjuro_3.jpeg?ex=6a818754&is=6a8035d4&hm=b1d28ee5932fece9502815276d40cfc50bcbc80185b682c71772b6b099e6f23f&",
  },
  ju_peter: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538125401128177715/Saint_Shepherd_Ju_Peter_1.jpeg?ex=6a818a68&is=6a8038e8&hm=b3fe4acd425fc87043d38e21867560b63b53cbe0aa099a56c3c8ec4d32b6bc36&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538125401401073734/Saint_Shepherd_Ju_Peter_2.jpeg?ex=6a818a68&is=6a8038e8&hm=3f8df5b0abf2021e87df575e528f93763800890e917c263e9f50a07da8eebc55&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538125401832955984/Saint_Shepherd_Ju_Peter_3.jpeg?ex=6a818a68&is=6a8038e8&hm=618faf5b19928e70507a4f7dbf848d1cfb61066edad87a2a8c498d8547988616&",
  },
  imu: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538164569107734660/imu_1.jpeg?ex=6a81aee2&is=6a805d62&hm=d22e00cae5536587d7ff5c96dc93603c7b16e648bbf1140e75dd5249e061f692&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538164569363452004/imu_2.jpeg?ex=6a81aee3&is=6a805d63&hm=24ab0080cc78e24da8de07175dbe32029920e1d400c52808b18524a896140e51&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538164569661509683/imu_3.jpeg?ex=6a81aee3&is=6a805d63&hm=d8b2701906d2cb624f57bb56b52f96bd72dc47ce2bd24b30b9669d0dbcb3f569&",
  },
  garling: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538144880352563292/Figarland_Garling_1.jpeg?ex=6a819c8c&is=6a804b0c&hm=34e2765bb35dc54e0fd07e826d64d5fa758db60345239d06e24fcbb1c80c2d54&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538144880616935565/Figarland_Garling_2.jpeg?ex=6a819c8c&is=6a804b0c&hm=7e373e5ea0cd32d5c61659b320b3594b86b641fe0c26aa1b1f790cb667fa643e&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538144880927318137/Figarland_Garling_3.jpeg?ex=6a819c8c&is=6a804b0c&hm=5020a7a62628b2bec3ceb5d7f2103e69a249677fdb4060f5e6215e28f66e7637&",
  },
  loki: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538155219790073938/loki_1.jpeg?ex=6a81a62d&is=6a8054ad&hm=ddaaeeb99d363e43afbafd40fc7507b337983f7249ff9b3356d4a6e7adea4f0e&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538155220335464549/loki_2.jpeg?ex=6a81a62e&is=6a8054ae&hm=64d4eb8b4233c0a17b08704431f7c6759dcb46f69341eca6dec91edb5bcce7d0&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538155220750831736/loki_3.jpeg?ex=6a81a62e&is=6a8054ae&hm=02f87e0b32b1f35aa48e94fb1183c4725ad899f3674d1b63cfdecdffde89673c&",
  },
  rayleigh_dark_king: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538164278580879390/Silvers_Rayleigh_1.jpeg?ex=6a81ae9d&is=6a805d1d&hm=48145c208e7c2cdbe4515526d95a1c26b5247bbee107babba85456737288bfc9&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538164278937522316/Silvers_Rayleigh_2.jpeg?ex=6a81ae9d&is=6a805d1d&hm=0aafd701b0497ac4819abd2dda25abc0400ff58f8f93924106bfd5bf0784c14a&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539537091124396093/rayleigh_m3.jpg?ex=6a86ad25&is=6a855ba5&hm=b9a65a1e9efb41395b952beb2e96a70bd230c5902fdf82a7fe378fb77bf0c7b5",
  },
  oden: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538168201320464404/oden_1.jpeg?ex=6a81b244&is=6a8060c4&hm=8f3250d5a9354c51cfa7269c9df6f28de98e7bb30d24b7fb2c859c8bdd55c03a&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538168201639108608/oden_2.jpeg?ex=6a81b245&is=6a8060c5&hm=7e47199dcfd3218520d97783103d247e100507412f202af554629ca0918b6582&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538168201907806350/oden_3.jpeg?ex=6a81b245&is=6a8060c5&hm=b2dec50153138f049973691bfebc85a7bfbf995b45c13d9707371c16bb6f1a2a&",
  },
  perospero: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538472456933740604/Perospero_1.jpeg?ex=6a82cda1&is=6a817c21&hm=35fda37864e0a8c7dec30170ef1bbbe5f069aad4bf3f27412e1b75f2f69e1fa8&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538472457323683910/Perospero_2.jpeg?ex=6a82cda1&is=6a817c21&hm=9f9030a02d404c36c5e9bb609cb665e2b234c6b51e25737e8b5af64447bcdf55&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538472457655296060/Perospero_3.jpeg?ex=6a82cda1&is=6a817c21&hm=f088f68a619ef5f0db72946d220343140a4635727542bf22f2c4f6cf5d078077&",
  },
  trebol_underworld_support: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538479587237822575/Trebol_1.jpeg?ex=6a82d445&is=6a8182c5&hm=2a45fdb67576089ff82134d562d13a3d44f520797ee1b54d72485a5db8253c58&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538479587560914985/Trebol_2.jpeg?ex=6a82d445&is=6a8182c5&hm=299190120dd61a0b914e654dea491461e89a824e67e09d496f0974a233b5f121&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538479587829358652/Trebol_3.jpeg?ex=6a82d445&is=6a8182c5&hm=3d74ae52877a5c918c209073da856ffe76b1c26094d3fa003c9503841d273a2c&",
  },
  queen_the_plague: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538485906951114812/queen_1.jpeg?ex=6a82da27&is=6a8188a7&hm=f94081efc3f72a4c54f8ef8c6e10dac4a694bdebdcdd76ff75c28f4525064e9b&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538485907253100594/queen_2.jpeg?ex=6a82da27&is=6a8188a7&hm=203e5dd7391e99deb44d8c519c285fb8c9cb6a82ddc3e8d7ee0634f4e28f65e3&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538485907647373395/queen_3.jpeg?ex=6a82da28&is=6a8188a8&hm=711e89f7d9fd12703a1fbbe29ed29147b85c57dd6678a26418787814d68d85b7&",
  },
  king_wildfire: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538488633148051506/king_1.jpeg?ex=6a82dcb1&is=6a818b31&hm=c7dbf760c1ff62a4467d79395b03c5e58cc20c8715600cdc9133264db66b4a45&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538488633462620240/king_2.jpeg?ex=6a82dcb1&is=6a818b31&hm=e8f6f95a81cf30f465a387f93ab0f4f11aa51b29f90f01c33e0e8dd71f685244&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538488633848242317/king_3.jpeg?ex=6a82dcb2&is=6a818b32&hm=d6b7b47d2826c086a0183df4b82a66f4194fad978d6abea755fc9d74cc8a0994&",
  },
  jack_the_drought: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538493419750690826/jack_1.jpeg?ex=6a82e127&is=6a818fa7&hm=d3575860ec3c4db1e4a5f91f60cb542642b7da84d8e2528b9d9b536c4fe97c95&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538493420077588590/jack_2.jpeg?ex=6a82e127&is=6a818fa7&hm=cb481e1365070a442ff128b32ff3233b86beff1366b14e83f6646dfadd849caf&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539606584202895464/Jack_m3.jpg?ex=6a86edde&is=6a859c5e&hm=b229cde05c81b9c689c09003572e4e76615258ce479320b7605c5667ea716c0c",
  },
  yamato_oni_princess: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538498713549414540/yamato_1.jpeg?ex=6a82e615&is=6a819495&hm=f4239db1a3fd533709ed4b89ad76cd2017991720bf1f5dbf52c18e6643641df2&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538498713914187856/yamato_2.jpeg?ex=6a82e615&is=6a819495&hm=871c0b0f25be0296a417c6d8686ccaeb02c0686c4a6022ff0d40430a11fa37b2&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538498714195202098/yamato_3.jpeg?ex=6a82e615&is=6a819495&hm=14cc28f240b255910133e9d0a93d66a2608d7a228a82e2b2992f6b59c8d493d4&",
  },
  greenbull: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538545944339947700/Aramaki_Greenbull_1.jpeg?ex=6a831211&is=6a81c091&hm=e7a599fc2009560499df6fe59673d549749eff80ab484a70160109238f5d64ad&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538545944893849700/Aramaki_Greenbull_2.jpeg?ex=6a831212&is=6a81c092&hm=9267ab05281b0d94321c75588d112fa7606358d7edf26bb1a7afcecb9eb84b6b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538545945334255627/Aramaki_Greenbull_3.jpeg?ex=6a831212&is=6a81c092&hm=f6489ff8b024d3ce40631ef0f9a76ce2d3372741e682a2bb4071f0f193d722ea&",
  },
  kaido_strongest_creature: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538551132610240532/kaido_1.jpeg?ex=6a8316e6&is=6a81c566&hm=7ec4af9ebc65b7f813bd159e10d3ded362e149a0ffd59bf95e5eff8a09b7066a&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538551133260222505/kaido_2.jpeg?ex=6a8316e7&is=6a81c567&hm=46c44468e30f0d43b290381835eb9ed66268e17cacaaf829e2c001082f26bdda&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538551133876912169/kaido_3.jpeg?ex=6a8316e7&is=6a81c567&hm=74526db20a7eaa497acdb655cbddc42becc9371343bb24ad939b38dde0b0fada&",
  },
  doflamingo_heavenly_demon: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538554764919308439/Doflamingo_1.jpeg?ex=6a831a48&is=6a81c8c8&hm=11951a34f31570cd7eeecc38a7d2fe981d869f67f20528393278262d61633209&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538554765221564416/Doflamingo_2.jpeg?ex=6a831a48&is=6a81c8c8&hm=98e058a1e6525e22c4f308c837c537c31dfb467b4fbb66f04efb57f6206cc7cd&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538554765561040946/Doflamingo_3.jpeg?ex=6a831a49&is=6a81c8c9&hm=8b59e4d013e326e778013e6a08d8e2e9c9d9b61934ea58774453384899e1d240&",
  },
  sabo_flame_emperor: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538558086476726362/sabo_1.jpeg?ex=6a831d60&is=6a81cbe0&hm=aa6fc85f5d8092d3b399087a83f98e92f8f43b4cff9a2c0a3ddacf68ee29f24e&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538558086770597949/sabo_2.jpeg?ex=6a831d60&is=6a81cbe0&hm=daa1cb4ec16a850a58e24ba738d91d22f13bbc43d40c62f70aebedd90e2780cf&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538558087009407018/sabo_3.jpeg?ex=6a831d60&is=6a81cbe0&hm=fff955ad84cbf371e7245ae387420c6240f1dffd50a26d7e189385fc9fbf3055&",
  },
  fujitora: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538776080821780540/Issho_Fujitora_1.jpg?ex=6a83e866&is=6a8296e6&hm=6ae71a9c78e424b551d13612fae0d88d5dff500e0949cd3ac6f4541c9997ccba&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538776081182625802/Issho_Fujitora_2.jpg?ex=6a83e866&is=6a8296e6&hm=2fe98a08367b30098d7e599a680db1a5a4bfc3d94c65b8eff84c0d6ae71c6ef4&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538776081526554714/Issho_Fujitora_3.jpg?ex=6a83e866&is=6a8296e6&hm=e292c166dd4dffe9a6e1479445353e759430dc0fbc2ada6c7cdbf1ab21fbf284&",
  },
  katakuri_strongest_sweet_commander: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538782193776721931/Charlotte_Katakuri_1.jpg?ex=6a83ee18&is=6a829c98&hm=4ecca47195c5704a3203958a1d7b77b34a2ec7ce5bbccb5c5c4bd18e654a4f85&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538782194158276648/Charlotte_Katakuri_2.jpg?ex=6a83ee18&is=6a829c98&hm=3f7f19d7c7169311d069f1fabdef6cd03aaa3731f55257442773cd8e4de83fa1&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538782194443485245/Charlotte_Katakuri_3.jpg?ex=6a83ee18&is=6a829c98&hm=fda7df679438b9baec5cf1f283dab4244af8b5bbf293a6879de2493f85933170&",
  },
  big_mom_emperor: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538784073563246702/big_mom_1.jpg?ex=6a83efd8&is=6a829e58&hm=1fcc18169d37ab837b3fd7874e50931aefa2bf7d4e5c044b23981522925ff00d&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538784073902723092/big_mom_2.jpg?ex=6a83efd8&is=6a829e58&hm=102b5f0e7ae37e764eb3152c1033902274782f1f573c0c781615c32547269bfa&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538784074217553930/big_mom_3.jpg?ex=6a83efd8&is=6a829e58&hm=1207fc85f67999a74330edee84a80987cd35171c63a20b06e5a2e1034ba97dd7&",
  },
  shiryu: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538786034278469662/shiryu_1.jpg?ex=6a83f1ab&is=6a82a02b&hm=9b7f7e67ef11bfd6c6637e406b596927285b092e94386bfffac086619a4da718&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538786034735915059/shiryu_2.jpg?ex=6a83f1ab&is=6a82a02b&hm=c22e982e41184717b7a38b2ff505cbaedebd4751b51cd4ebc16f5727d5b530b8&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538786035100557382/shiryu_3.jpg?ex=6a83f1ac&is=6a82a02c&hm=d73fc2f52f2f47604c3a1a359f0540413ece74362ce70baf403346130b497ace&",
  },
  boa_seraphim: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538790613732958290/s-snake_1.jpg?ex=6a83f5ef&is=6a82a46f&hm=bbe281d4199146e4f322aaa568f2470ed8719fe1863f90e13b50d20291afbd0c&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538790614097993778/s-snake_2.jpg?ex=6a83f5ef&is=6a82a46f&hm=a685f77e20183999a324320f914f1508942f8532a474ab5629718591b1c6d468&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538790614622015528/s-snake_3.jpg?ex=6a83f5ef&is=6a82a46f&hm=9f9d608206d61fad1c0fda019337955406eb8a20ac53fd18fe15d0c73135c5ac&",
  },
  mihawk_seraphim: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538793202272698448/s-hawk_1.jpg?ex=6a83f858&is=6a82a6d8&hm=0662a2c6f719977d9062adc0028527567e00e376b4f560b901878c97b80cf351&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538793202574819399/s-hawk_2.jpg?ex=6a83f858&is=6a82a6d8&hm=8253a4875163fe0ce71c337909f658e36eeb4dabca5b6ffc7079a474f8c45345&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538793202885075034/s-hawk_3.jpg?ex=6a83f858&is=6a82a6d8&hm=aa33a36abac0283363d7871a95ead492b154360d5c281e2343c9ea803b52c399&",
  },
  germa_lineage_factor: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1538881809234923520/Germa_Lineage_Factor_1.jpg?ex=6a844ade&is=6a82f95e&hm=ddb5ff476fb99951d40b15fa4420e4b53fc4d311b26c29945dce62dc4649eca2&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1538881809721589770/Germa_Lineage_Factor_2.jpg?ex=6a844ade&is=6a82f95e&hm=7ea354615bfd8c8aea5accb818cb82dae2a773dc4a966c19d6978f1498bb1cdd&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538881810140762254/Germa_Lineage_Factor_3.jpg?ex=6a844ade&is=6a82f95e&hm=5da8893881b8c093d155160af61748d6dd4b47c65315c30925a4341888876a74&",
  },
  gravity_sheath: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500409555933200454/content.png?ex=69f854ca&is=69f7034a&hm=ac5b4a57958ea954314ea783516b19bcef9dae3410be082400a0e90acfc14126&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500409556424200313/content.png?ex=69f854ca&is=69f7034a&hm=66504d7f98db142d35a239bad1a5d17ad70f39b4e74ba4d645ceca287f118c69&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500409556877049926/content.png?ex=69f854ca&is=69f7034a&hm=7f4f9fcaa430847ec1b9791ebd3ead2fcba1c4be1afd51c3af312084af09481a&",
  },
  holy_knight_standard: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500410573173555200/content.png?ex=69f855bc&is=69f7043c&hm=e88b29f19ae2a51b98af41172155924140b0577a0b3209fbe154ffbf6ecd7ff4&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500410573572149269/content.png?ex=69f855bd&is=69f7043d&hm=4832ff76911272b303f3cf779e33026246d3da55f1e2351aa22595bda8e5d438&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500410574117535875/content.png?ex=69f855bd&is=69f7043d&hm=8102b93eb5693dd8040a64bd5e05acbedf623a42abca6b7f86ba7a5d9daae1b8&",
  },
  revolutionary_banner: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500421568113676470/content.png?ex=69f85ffa&is=69f70e7a&hm=d0b45362be47af424d9b991156ca4f662cd47c97ab996c96205698b7b1c55f50&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500421568759595068/content.png?ex=69f85ffa&is=69f70e7a&hm=4dd330fc38bc6f1b098024ec715d4183e9b798e8389e0e49033e8128305e2779&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500421569242071110/content.png?ex=69f85ffa&is=69f70e7a&hm=74b4168c7d9591f6c761fd8567fed93e9604e926baf021a82d2a747e5739ca30&",
  },
  revolutionary_oath: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500423699625541742/content.png?ex=69f861f6&is=69f71076&hm=18a2cb247548df5b6e5328d23296b75015afbafff5365910e7fcedf9e7abc792&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500423700095434923/content.png?ex=69f861f6&is=69f71076&hm=df92d19a73d7be8ae78233f151e7c7c95fa0181dca537fa3279360d3e5265f08&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500423700552486992/content.png?ex=69f861f6&is=69f71076&hm=c7bbd922821a8e41ecae7829899ff9d8480d32028ef56159d2ee37336dd66828&",
  },
  donquixote_family: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500432063185158198/content.png?ex=69f869c0&is=69f71840&hm=6dc607185d71d29c8fed7cad4724a984f92cb37c5e538a282f35c1ce8da86d90&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500432063705120778/content.png?ex=69f869c0&is=69f71840&hm=6c038dbb9e5cc3a48e682cf445b522dc23161bb2eee9a0dc233c1194c75e43f3&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500432064263098418/content.png?ex=69f869c0&is=69f71840&hm=9d605dba766fa213717345fccf5931dbd90cb8c7e7c1718cee080dc510801110&",
  },
  beast_pirates_terror: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500435426689941544/content.png?ex=69f86ce2&is=69f71b62&hm=5130e59cf97789e46c4cd48f3e09424d15df2d6bdbfee3574a7d319bdc2c9df9&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500435427352379432/content.png?ex=69f86ce2&is=69f71b62&hm=641811641cb0a2dbcdc9e24a076e1e573811a9872e98a89b608dde711e82de27&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500435427813756998/content.png?ex=69f86ce2&is=69f71b62&hm=40b4ee449eda6a6fe93360f18b6c3934c66a4e55f8c7a90b5a01866efe13aa2b&",
  },
  sweet_commander_pride: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500437006780596354/content.png?ex=69f86e5b&is=69f71cdb&hm=38db4e001374ccc3eabf3eb7b9828de1c184daeb9873c24ed1b295cc1353dbce&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500437007376191558/content.png?ex=69f86e5b&is=69f71cdb&hm=17e75f0ebf56c4b14b9ec438d44f644abeae8cd521058b6e9aa47c9911d180ec&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500437007862861854/content.png?ex=69f86e5b&is=69f71cdb&hm=7b5c86ed8ae6e6028f34246fb694328cf64eedbd68881f43028eaaf7c81212db&",
  },
  cp0_mask: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500449713537683568/content.png?ex=69f87a30&is=69f728b0&hm=2e22cb17807a0a25bca9de6a645f6b4ee29c4d3ea45317b8873176173c294c8c&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500449714108235877/content.png?ex=69f87a30&is=69f728b0&hm=b5c0bed1fe5491e37b67f7eedaeb2ea2009c538bf804957f01ce4e0a529166d0&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500449714749833269/content.png?ex=69f87a31&is=69f728b1&hm=2ee2df243aad833a83e35e46568f14ced8efbfbcc9b537b7106fbd60c0bb97a3&",
  },
  world_government_edict: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500452488027832371/content.png?ex=69f87cc6&is=69f72b46&hm=6ff4f00a2388b0af780ad085350947b554caf465ad7d89a2db14e6c5ca75a025&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500452488908902400/content.png?ex=69f87cc6&is=69f72b46&hm=e9e40890c2c5eb160ed5c2a2d240eea4e8fbc58265182d28630b4676a8acc15a&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500452489504362607/content.png?ex=69f87cc6&is=69f72b46&hm=44125633ff75de565960183483d6905316355599e7605a2b0f5cecf66939e48c&",
  },
  marineford_legacy: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500455144318308476/content.png?ex=69f87f3f&is=69f72dbf&hm=f4024c5501f98458b5bdb6c0d9bb598b48ae84910d66fd8d1649557226518385&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500455145761407036/content.png?ex=69f87f3f&is=69f72dbf&hm=7d0caa7846cd233673444a5e08c7b438017512b2ac7b18bbffcc3a92ae0c216e&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500455146692542615/content.png?ex=69f87f40&is=69f72dc0&hm=b78367fe9aff72e3c52d1b83618a71a0e53a8205f9c1e1d39f01666247b6a15e&",
  },
  cross_guild_bounty: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500459028411715624/content.png?ex=69f882dd&is=69f7315d&hm=abd034526eb1c658ae949f35186f817ded616fb5810e4f45dc4cfcc25213350d&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500459028898119680/content.png?ex=69f882dd&is=69f7315d&hm=7e82ac15c3b8c68f18433704e0536ad8217841368f8fea5cdfeeed96e157b487&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500459029519011860/content.png?ex=69f882dd&is=69f7315d&hm=17a22b78f478c97f7be41fc6c34acd812f7cd46e0f235ad84c90448cc2c4af06&",
  },
  god_valley_echo: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500462480277766266/content.png?ex=69f88614&is=69f73494&hm=6b7a905268b90ff862b822293de61bfd86db388f3302e138897d99bb7139262f&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500462480869036252/content.png?ex=69f88614&is=69f73494&hm=8cd3e2b6ae2997b536e43a27c5b10f4584f2a3bed99ab50667a325027a5fbe30&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500462481342988398/content.png?ex=69f88614&is=69f73494&hm=284087acddcb3a8e39711540ab00c7c26cdd8b27713205287fd7894739507230&",
  },
  elbaf_might: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500466364521906216/content.png?ex=69f889b2&is=69f73832&hm=10f6c35e2d8c751947a23859f86e1988631eb892d2bf8dc69cea94985a37984f&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500466365272817808/content.png?ex=69f889b2&is=69f73832&hm=59c1bac75ae45e9ece0861b085fc70edbfa0910adba39abf41f94380e821406a&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500466366254289047/content.png?ex=69f889b3&is=69f73833&hm=8b12147f6f52c040c87a29af0c27386ef93146ea45156d7040bb13678312aa48&",
  },
  void_century_fragment: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500468562890854480/content.png?ex=69f88bbe&is=69f73a3e&hm=bff36fddb3be73561ec9b7dc70f68e2183bc0349b22620690f0f0cb4f65b1942&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500468563671122040/content.png?ex=69f88bbe&is=69f73a3e&hm=102900bfadc214de38c832b713f8883fad7a43844462379d38be5d9bcc57bf72&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500468564203933726/content.png?ex=69f88bbf&is=69f73a3f&hm=4dca379b59789e98a68cb80d172696390a474a4ba7969a66deb48ea6d962c1c5&",
  },
  relic_of_joy: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500471945324662965/content.png?ex=69f88ee5&is=69f73d65&hm=3b9871f4c9018550999284fca9387ced53f5ab90f413a040dd037ead0eb8df82&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500471946050146365/content.png?ex=69f88ee5&is=69f73d65&hm=fe02368b15a05021338dc9cb471c4a316c130877a0f3ffe4083820aac852e378&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500471946704326831/content.png?ex=69f88ee5&is=69f73d65&hm=95aa5a411661fd04362f967da11d9e5ae041c74e7ca302226b18789c8bf1c731&",
  },
  pirate_king_log: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500473265666134217/content.png?ex=69f8901f&is=69f73e9f&hm=15b5bde6bd9dd06f9376ad2cef3101663f0b4c1af8985c28bd2927d05b1193fc&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500473266186485951/content.png?ex=69f89020&is=69f73ea0&hm=daa4a69451c471a851d07cf469a59b83e1c632be69aa9db34beb3ddc21219c4e&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500473267394183300/content.png?ex=69f89020&is=69f73ea0&hm=6f2a8e3c33d04b0359bea956ad632208cc0d3f7b9091d244d4656f4127d7e1cb&",
  },
  corazon: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539578734552682546/Donquixote_Rosinante_1.jpg?ex=6a86d3ee&is=6a85826e&hm=2c0fbd794b872cb5068aedda64449a829f5b28f42bc938adab77d13139451eae&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539578734938562610/Donquixote_Rosinante_2.jpg?ex=6a86d3ee&is=6a85826e&hm=b4902e1e226acb1869bbc500c152249af93f406c353f2792dcdfb1359128324f&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539578735248805898/Donquixote_Rosinante_3.jpg?ex=6a86d3ee&is=6a85826e&hm=7b65a2b01a4b498bb5a25e9fc530d5fb1349c0b2b4d5cc75ee86a31e5562191a&",
  },
  yasopp: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539532393550192640/yasopp_1.jpg?ex=6a86a8c5&is=6a855745&hm=a78c9f71e7468e4cefea3e0be833717517e4d170d777840b60727ae94e48eaca&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539532393982066748/yasopp_2.jpg?ex=6a86a8c5&is=6a855745&hm=c649407bb787ec60dd6de43fecadeef69acdc0e13693f64921be453c544922a3&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539532394342649876/yasopp_3.jpg?ex=6a86a8c5&is=6a855745&hm=eeeafee921be7ac5e87eb32840df0c1443e5041dd5780141965b7ebfb487273c&",
  },
  sentomaru: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539185945734025257/Sentomaru_1.jpg?ex=6a85661e&is=6a84149e&hm=396bbe8f44f159871edd23b99143ea549689cff2554fe37ea9e41be31cc36eea&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539185946673811506/Sentomaru_2.jpg?ex=6a85661e&is=6a84149e&hm=5172b1ec09e9b7eb8b9e2c95bf2b44a52887aa905e1a23605b14e5bda72e6d88&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539185947214618654/Sentomaru_3.jpg?ex=6a85661e&is=6a84149e&hm=6302a4ff0d8e6f8d2a7275a35be87808488f91d1b2611a3b6091f66507705c4d&",
  },
  gan_fall: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539600590718500936/Gan_Fall_1.jpg?ex=6a86e849&is=6a8596c9&hm=c1d1ddf12e2fc733bffc30e280c0023660cce6ad46523ec9d221c347288a1228&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539600591171354664/Gan_Fall_2.jpg?ex=6a86e849&is=6a8596c9&hm=2e452064ca511eb959813dcd6754099d5702b8810a50c9edd8340fa5ceb4383b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539600591557500968/Gan_Fall_3.jpg?ex=6a86e849&is=6a8596c9&hm=3a022a675347411c73535c2c776bfc26bf386ee476f1664eb5aab3fd3522fd41&",
  },
  saul: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539240412143685642/Jaguar_D._Saul_1.jpg?ex=6a8598d7&is=6a844757&hm=d75239e05c4d4bff51d85f3b6e9ebee43f81c647f051c1a169648072f3a55d54&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539240412877955102/Jaguar_D._Saul_2.jpg?ex=6a8598d8&is=6a844758&hm=b0d7fe1d80d2b303860267e3ceab60c2662641862fe8734cf98b60c36843358b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539240413360029726/Jaguar_D._Saul_3.jpg?ex=6a8598d8&is=6a844758&hm=cc7b911d158722851bda7223ba20d9591febc2e9eefcfb1c5cb6186b8785839a&",
  },
  mr3: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539614415408861285/galdino_1.jpg?ex=6a86f529&is=6a85a3a9&hm=e13a95db07fdff43912b207accf7838260166a349c87d157f3e7aafe74901cb9&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539614415832227911/galdino_2.jpg?ex=6a86f529&is=6a85a3a9&hm=9d74a1718a7cecd02dc59d941a2ed47bf77531ee513a6b5b907793c5d6e00833&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539614416176291920/galdino_3.jpg?ex=6a86f529&is=6a85a3a9&hm=292381689cf43e7c530a45f615d2ca592812beb868918956e096bbbdc7da4186&",
  },
  wapol: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539212677358948352/wapol_1.jpg?ex=6a857f03&is=6a842d83&hm=bafa019c7daf339638057f79946d2d17d0dcc85d300b9b673772a8dc33073878&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539212678084431923/wapol_2.jpg?ex=6a857f03&is=6a842d83&hm=baa93c315af5a53d36ee466635f4a4d8d54fc57402ce2a40a6837b495a8ccbef&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539212678718033971/wapol_3.jpg?ex=6a857f03&is=6a842d83&hm=ac2ace5970955043d49d2fe05ae7592ca340d6d606e94eb3ad231141f4784b54&",
  },
  caesar_clown: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539218870110523402/caeser_clown_1.jpg?ex=6a8584c7&is=6a843347&hm=3d9886c76e833fa8569587ba45e9bd3b80318cc68f7a37850efb392749e8886f&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539218870475169912/caeser_clown_2.jpg?ex=6a8584c8&is=6a843348&hm=17a14bc5540a6a359abb22256691ad3fe5db5e44c473b83c5c20d3756f595a50&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539218870890528768/caeser_clown_3.jpg?ex=6a8584c8&is=6a843348&hm=738ee241dd7dc2d24e2c168f3e48421670d17321740fca506bc3c472f429d81f&",
  },
  gunko_holy_knight: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539517739935211551/Gunko_1.jpg?ex=6a869b20&is=6a8549a0&hm=184d7ec236e1a108e56e0e83071a9bf95c01f02131bbf575066d746070b615e3&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539517740304433162/Gunko_2.jpg?ex=6a869b20&is=6a8549a0&hm=7203e5b6218ad2131979a871a357531e22063d96f79117ce05629f91c090828d&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539517740665147422/Gunko_3.jpg?ex=6a869b20&is=6a8549a0&hm=a7ede158f3e8fb3d9f2b01752b0e3641b6819b9ff1f2fab75100f6abe63f5559&",
  },
  hody_jones: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539620485137047562/Hody_Jones_1.jpg?ex=6a86fad0&is=6a85a950&hm=cca8a59966711c086abd314755ef60463878731f889766a07baae3fde52c6135&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539620485485301830/Hody_Jones_2.jpg?ex=6a86fad0&is=6a85a950&hm=a373d32aaf9f41978a185d2f12c32a87e8cb07886ec949aab5960236b2f2b5b0&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539620485942214766/Hody_Jones_3.jpg?ex=6a86fad0&is=6a85a950&hm=238a269fde23148d204afa4551570dd822d1b41114f660870cb54c4d228a08d2&",
  },
  law_surgeon_of_death: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539628654001258556/law_1.jpg?ex=6a87026c&is=6a85b0ec&hm=6b966ea8c11542decf0b1cf3bf186c8ea8ba83ced0df092920a2e363a1d48027&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539628654668161075/law_2.jpg?ex=6a87026c&is=6a85b0ec&hm=6d1aede73074b5ba1cf942d42bba773c55846dca70b18ba467b0912ac4f7fe37&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539628655133589645/law_3.jpg?ex=6a87026c&is=6a85b0ec&hm=15b608107e06e5f6e3c5a69a6864f7331699883d7a3552aeee783819a563a3ee&",
  },
  kid_captain: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539623550615420928/Eustass_Kid_1.jpg?ex=6a86fdab&is=6a85ac2b&hm=d642ae62cf2bd9dba41a13d6c573488519d9ef8e0e2433add868ec571d7d8b7d&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539623550972076042/Eustass_Kid_2.jpg?ex=6a86fdab&is=6a85ac2b&hm=0c5f2569fb5a0ae542324f54eb37e1192510084e0063c7ecea738dc69d3f212f&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539623551320199188/Eustass_Kid_3.jpg?ex=6a86fdab&is=6a85ac2b&hm=3683d3540aaa7fea5d793aa2803b38cfde135edccb1d4fb6c5a77c40bbf591be&",
  },
  road_poneglyph: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1509896780140122173/content.png?ex=6a1ad874&is=6a1986f4&hm=d87b67833f80098990749647a61557010fab709b11f5506131bdde240f8b8b77&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1509896780605821068/content.png?ex=6a1ad875&is=6a1986f5&hm=91a3346638973f4edd898901e05de3fcc6d3e386d05371c41fa108067c32266c&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1509896781029310504/content.png?ex=6a1ad875&is=6a1986f5&hm=0ccb2aeec6920bf5e61f4300f8cf59e27c954da4ada502e75877bb88645f25c3&",
  },
  lzs: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1529385587004407899/lzs_1.jpg?ex=6a61bed2&is=6a606d52&hm=e33c8c7f4363860ba880799c30dea43c8190bef240574799920ecbe9d0953b5a&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1529825699681275944/merge_card_lzs_2.jpg?ex=6a6358b5&is=6a620735&hm=405eaf93df8756d7a2b909ffcb7f9a7bf9a39d85a0db8f7d200ddcac6053c076&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1538852267598553128/lzs_3.jpg?ex=6a842f5b&is=6a82dddb&hm=b877ce33fd5f42de9a9585aeb5579ddd94704fd6a26972c406a6496d1fdde5f0",
  },
  mr2: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539630706265948230/bon_clay_1.jpg?ex=6a870455&is=6a85b2d5&hm=ac7973df04a94136aa747a606607e45bc000cb6eced249dd090ad4800b94f36b&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539630706844766268/bon_clay_2.jpg?ex=6a870455&is=6a85b2d5&hm=b93f9dc424e6f811e55deadae82645090ccb9090951fafb2f87903bfce3aa28f&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539630707469455421/bon_clay_3.jpg?ex=6a870455&is=6a85b2d5&hm=374f0dbd36b291396672bd6ca02dba5cebf62bc89ac563cdcf5b51c91744ed30&",
  },
  higuma: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539157733721513994/hipemo_1.jpg?ex=6a854bd7&is=6a83fa57&hm=4f06c02744893dc40fc2544959591fcf5a91139e6bdc2aebbebc591165d9f728&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539157734212243476/hipemo_2.jpg?ex=6a854bd8&is=6a83fa58&hm=41ffeb0326715a925f6cc62f84ba7531e470863a6e7ec1138850fc41ead1ba9b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539157734677680138/hipemo_3.jpg?ex=6a854bd8&is=6a83fa58&hm=1ec166a9b29d18fb3cad65e86c6d82c96c3b5b003dead64715544fd40ad8f8fb&",
  },
  x_drake: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539849380012625950/x_drake_1.jpg?ex=6a87cffd&is=6a867e7d&hm=93a3136a13ed4bc4628f43fbf2192f6854ad95befdf74e2fd8d6736817a2ee3e&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539849380599832667/x_drake_2.jpg?ex=6a87cffd&is=6a867e7d&hm=3242c2ab169eb4b0fcfd47f03d7c053bad33e406adb335bc548f26a9026df1db&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539849380918460436/x_drake_3.jpg?ex=6a87cffd&is=6a867e7d&hm=5a476ee1c21a87ffc9fa747cdc06047c5f8e37b88e50207b6cae5351293bb497&",
  },
  scratchmen_apoo: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1515696761585402006/content.png?ex=6a31ec5c&is=6a309adc&hm=74b23cea971d62d38cd96fe8582d55291e630483a0e16de50f1c08634041d0cb&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1515696762235392050/content.png?ex=6a31ec5c&is=6a309adc&hm=0bd5913b7f32890f1fe376e7f7a4c1928c418eefa09c7cf567bd8212cbccfd48&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1515696762789036072/content.png?ex=6a31ec5c&is=6a309adc&hm=46032542236dd9b18cf2d69db23507c558b762704ae61a8e1fe7eba90b72794d&",
  },
  charlotte_daifuku: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1515699540735557763/content.png?ex=6a31eef2&is=6a309d72&hm=64d137f20bc19daf727f47ed0c81e74d39e0798cb499625c44e5645a67179a50&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1515699541217771571/content.png?ex=6a31eef2&is=6a309d72&hm=8528e3bce4e1fff86a4a5184b47eed5faef3a3ed340e70f00d64c5e70c8803e8&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1515699541674823721/content.png?ex=6a31eef3&is=6a309d73&hm=15b4d46a2f803ae34eb91b3e649350a59d16dbaa520762b06d3e04545b8cc680&",
  },
  charlotte_oven: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1515701426553094244/content.png?ex=6a31f0b4&is=6a309f34&hm=97f2ec4b1b67134fab7030c9fe9eae6e91fe71a62d025cfa4b1155d781c64f19&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1515701426972528662/content.png?ex=6a31f0b4&is=6a309f34&hm=0f5b4e82dbf8e9962202f98b47e9b42cb5bbc7ea0a61309f61be32b8d3f80dc3&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1515701427388022944/content.png?ex=6a31f0b4&is=6a309f34&hm=061e8394654a7b96a98e26560618dcb9bd52f6fcfc245a06276c4aa1eff4e8fd&",
  },
  charlotte_brulee: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539852003348451328/brulee_1.jpg?ex=6a87d26e&is=6a8680ee&hm=2fb364b740878884ccf9985dd0fd66ba3f981107886967d8c56f2b85f1a51396&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539852003923206196/brulee_2.jpg?ex=6a87d26e&is=6a8680ee&hm=de8cedae955b18b6c938213e646c5a66e9b13c765c5401bf14b2d67fd0dbe0db&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539852004321525790/brulee_3.jpg?ex=6a87d26e&is=6a8680ee&hm=9e36cff64f4b6f9d2d62e2cda646e85a0776c5842d96b4fbcb83607f6019066e&",
  },
  basil_hawkins: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539857162766131232/basil_1.jpg?ex=6a87d73c&is=6a8685bc&hm=81a6ee725e1d505750621c1d4aa4e967e27be857928ed517d79fd1cb8e1e3dff&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539857163151872000/basil_2.jpg?ex=6a87d73c&is=6a8685bc&hm=285610641c6e49e701dfa5a14383b48bcd3a3d4efd9326f45fefc4e5659320bb&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539857163596341258/basil_3_new.jpg?ex=6a87d73c&is=6a8685bc&hm=c6557332fb15c063305dbab301137f5490e4fd20cca4ed281d99d580632316df&",
  },
  capone_bege: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539859353899900998/capone_bege_1.jpg?ex=6a87d947&is=6a8687c7&hm=60c7bc6293f6e1a48701758372f49a33b99ba692fdd6d8d4ae13e3b2930c86ed&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539859354386305044/capone_bege_2.jpg?ex=6a87d947&is=6a8687c7&hm=848a0c70d89dcdc0753c522bc30e0b201847d12c70aa5a7c3ed4d14f7a9ee8ef&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539859354994343936/capone_bege_3.jpg?ex=6a87d947&is=6a8687c7&hm=fb08fa5ac8e3b67d24f86c1acbfb9fb162014f902d8b943a3b6398fa6592549d&",
  },
  neptune: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539862635984588912/neptune_1.jpg?ex=6a87dc55&is=6a868ad5&hm=3e708f577ca72f54ca672a7c28e83fd33cc09b56e5a6090979d806e75d12a7f6&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539862636357750844/neptune_2.jpg?ex=6a87dc55&is=6a868ad5&hm=e12c7525a8583a8a135817b58cbec44cac54c777352265ccf1d22202662a3766&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539862636882034708/neptune_3.jpg?ex=6a87dc55&is=6a868ad5&hm=a7f9976d9d3df3ee2b8c362033dd29becee3de662bd326574c2563521b3cd0fa&",
  },
  dorry: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539868994297798676/dorry_1.jpg?ex=6a87e241&is=6a8690c1&hm=6326309943f371935126294bffc3c46b03e17d71902a089218bcd52c93fdece1&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539868994725486642/dorry_2.jpg?ex=6a87e241&is=6a8690c1&hm=14627a2b168b6b46c469cab20d26e987c506d1b5d6b65d4999674e8b5b19a6c3&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539868995123937410/dorry_3.jpg?ex=6a87e241&is=6a8690c1&hm=fdfab12a1ef05527ce944e80b0c3759b956ac856c78870eef3afedd970f1d4da&",
  },
  brogy: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539869599481339914/brogy_1.jpg?ex=6a87e2d1&is=6a869151&hm=871465583138980a2522810acac418c30995341cb7fca11213308cd19cd3101b&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539869599884116028/brogy_2.jpg?ex=6a87e2d2&is=6a869152&hm=c49ea6fcf3eab8ce447c0c422ff3eba67c5d5fc4db5963286a7ee68ed9d81d0f&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539869600278249593/brogy_3.jpg?ex=6a87e2d2&is=6a869152&hm=0297eafffc81644cc979b95ab2adf5509ba68951ac5cc6fccce5ef7c89b61bdb&",
  },
  emporio_ivankov: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1516432598694625441/content.png?ex=6a329f69&is=6a314de9&hm=8ba195d8c1555eeac363e18004271dc01938896220ed2728b6fc7c91a5c05cc0&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1516432599139225690/content.png?ex=6a329f69&is=6a314de9&hm=19bfc03b41fe1b8c189acb8d50cee7aeeac7cfcf63f8178e463c7133ec591878&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1516432599604789389/content.png?ex=6a329f69&is=6a314de9&hm=e4d04f9d6236ca5c5d98ed6bb151991bae607e2c03a0405a6faf52958609e3a8&",
  },
  karasu: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1516433707760877668/content.png?ex=6a32a071&is=6a314ef1&hm=a3b84d65aa44ce74631369eb29b6d90943d601f47f74d59b4525a2faf690bfd3&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1516433708289363968/content.png?ex=6a32a072&is=6a314ef2&hm=6f1ca11fa416166153e9d103e5334969c609f40cfd033838fa68450ccd31d9e4&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1516433708754800641/content.png?ex=6a32a072&is=6a314ef2&hm=5b90e420523e09749d08eec2aeb160641728e5eeb72582fae010b1d9f88edd81&",
  },
  belo_betty: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1516437580713951453/content.png?ex=6a32a40d&is=6a31528d&hm=5d3327cc97659bc1ffb42ede62294e039fd087ade8a0c8a435dd657369ffb28b&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1516437581288444044/content.png?ex=6a32a40d&is=6a31528d&hm=36e8cf3d4904cb5ca2b9e913cff77575efaa3044425c424370aef82cc33c3945&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1516437581829505134/content.png?ex=6a32a40d&is=6a31528d&hm=8cff7fe31f4dc6014436c1952f6383e18b6b2fd588f0b45d8402402396d2d0bb&",
  },
  inazuma: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1516441791379800204/content.png?ex=6a32a7f9&is=6a315679&hm=5a9257f49d3a2d24181bf6a7e01c17a9dcc5d1acfb8f2369bc7411c932088d8e&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1516441792021794918/content.png?ex=6a32a7f9&is=6a315679&hm=8bfed90b81d41fece261cf19a4ac272506d4d3502b13b689b9c2543b6bba1170&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1516441792688422975/content.png?ex=6a32a7f9&is=6a315679&hm=ccca7703a00961952de0dfa1a5e45f5e26b93f8403013a0ef5a74af7084311c7&",
  },
  jewelry_bonney: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1516442761283375114/content.png?ex=6a32a8e0&is=6a315760&hm=f1be14457af04859d9c2607ed019108c8753818f455c662dab3425cf12ae64dd&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1516442761841344744/content.png?ex=6a32a8e0&is=6a315760&hm=ec02afa96823abb4334dc03bfc19048f2acad1e4d46468c4009a17f22bd9c63f&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1516442762449260735/content.png?ex=6a32a8e0&is=6a315760&hm=abd9dca1dcc8b4cba8b3dba6be14fb073bf9cc65e78ae61d53abecd1b6616025&",
  },
  figarland_shamrock: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539871061175435265/Shamrock_1.jpg?ex=6a87e42e&is=6a8692ae&hm=72adb4dd903df8612cff7da4e84b8a636bb5295c7bfe72e0724a3dad483d1e37&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539871061687148605/Shamrock_2.jpg?ex=6a87e42e&is=6a8692ae&hm=7e0025ab6e38815b6109ea2e98d9a19caee06eafc91c9c508108e54efa2db00c&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539871062064365648/Shamrock_3.jpg?ex=6a87e42e&is=6a8692ae&hm=d2ca04c854ea718b0dd472a9e0e96d75e283203e36ade5c4e761a624924f4c91&",
  },
  jesus_burgess: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1516444707809394708/content.png?ex=6a32aab0&is=6a315930&hm=78da6f74b2cef6320d7d4a4d6845ca001c389eeed4858636a954e8c43a727ca8&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1516444708203794432/content.png?ex=6a32aab0&is=6a315930&hm=59a99d1f1f819adb0bd017397026f286ce5a0404babd03845b15930f130d1a08&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1516444708606316604/content.png?ex=6a32aab0&is=6a315930&hm=08312543bf2062a7c2beef3c7adf9f1c809731c26efe57ea43c0a5b360222749&",
  },
  catarina_devon: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1516445540068626545/content.png?ex=6a32ab76&is=6a3159f6&hm=87eac49caa50f5618e74c4df7be00ea303b386780cf74b151498e9a084da9aad&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1516445540580065351/content.png?ex=6a32ab77&is=6a3159f7&hm=30c767085b09e351df01d15cdd93d0601dd3caf1d30f11fbc41f28c5d7bdb28d&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1516445541104619571/content.png?ex=6a32ab77&is=6a3159f7&hm=59cb067699042e55fe5301b264f06982677c0683201c72896cf3569187b5a2e2&",
  },
  scopper_gaban: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539882425868619845/gaban_1.jpg?ex=6a87eec3&is=6a869d43&hm=7cdc36c1fa10178474b79865f3bdd8b7758da6531ffe868dde975fd1e3d368ef&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539882426766073989/gaban_2.jpg?ex=6a87eec4&is=6a869d44&hm=8a6dda02bec2a74b9267be2c52683bef4ef6b22669ed00f19ff651996331ae3e&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539882427206606858/gaban_3.jpg?ex=6a87eec4&is=6a869d44&hm=e041443b53f270f2212a07f79b134032fe845067d778ab213046f54927550412&",
  },
  chew: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539886061164040212/chew_1.jpg?ex=6a87f226&is=6a86a0a6&hm=433dee75ccbf3e5c89c42de446013fb1978dd4d4c3e9394d01c8b2df5132e39c&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539886061491064932/chew_2.jpg?ex=6a87f226&is=6a86a0a6&hm=4b49e400cdcc16bb6a198357f6da93b858f14bbc3ce68dccc6e248cc794ec702&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539886061868818512/chew_3.jpg?ex=6a87f226&is=6a86a0a6&hm=b05a48fb4dcf79e2e617782e7868f6a824db88828a28faa5e6f39a3d5e1d65a6&",
  },
  kuroobi: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539234522279714936/Kuroobi_1.jpg?ex=6a85935b&is=6a8441db&hm=339586fe905295914d57ab70f16104912b5eec17a6397568d500b66af7414efd&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539234522829426698/Kuroobi_2.jpg?ex=6a85935b&is=6a8441db&hm=eb93499b57e08ab63b8b4bfbd7d3e5c53bafbd0b32edaab884d3cdea4e545f07&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539234523345064117/Kuroobi_3.jpg?ex=6a85935b&is=6a8441db&hm=b8f784ac0f3be2c903cd1d15133fff6fab02bec6715ff0d5f9ac0d61fff013e9&",
  },
  dogra: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539892693927202878/dogra_1.jpg?ex=6a87f854&is=6a86a6d4&hm=c801e43080e1ba91d3f9d1a411d32e0c645f5a69cbdbacadd5da96d103820d28&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539892694334312448/dogra_2.jpg?ex=6a87f854&is=6a86a6d4&hm=594393e56f4c402862ea29561e3fa875138ce9f76ece68a00fc1a0740270b2d6&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539892694753476619/dogra_3.jpg?ex=6a87f854&is=6a86a6d4&hm=e7a1983e12ddd0d6d8a67f0465d687ef7143fe6b50dd7e8c4776ef82b51cb203&",
  },
  magra: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539893790217605180/magra_1.jpg?ex=6a87f959&is=6a86a7d9&hm=8a184c0376d657b467f2fa1b19aa344dec8fa04c1d616745edccebec2750316c&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539893790691557416/magra_2.jpg?ex=6a87f959&is=6a86a7d9&hm=b0522afb2fcaab6deadd88f6d74006800f5fe8dc67840b7002dcb8460187c440&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539893791241281557/magra_3.jpg?ex=6a87f959&is=6a86a7d9&hm=b7f9ef3a8f174b4c5a80a6bb818bc449e83bd407ea6f86e422761a5b4aa08649&",
  },
  gvl: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1529727977024127106/gvl_1.jpg?ex=6a62fdb2&is=6a61ac32&hm=a3fbdcbb2e5005d58111e7aaf0fdbe1ebfd68167405aafb4e56fe9396dab20cc&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1529727977464795317/gvl_2.jpg?ex=6a62fdb2&is=6a61ac32&hm=e4308a0bd61a96ce474f262aadff15e4064ca9564f40d9a58ea60b395d1598e2&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1529727978018439178/gvl_3.jpg?ex=6a62fdb2&is=6a61ac32&hm=00f9cd13109ce2cf0dddf5f0cdbc4f77493f8268b22d260adcc639da767d076f&",
  },
  tfb: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1529722258472435732/flame_bros_1.jpg?ex=6a62f85f&is=6a61a6df&hm=893e258a3bb95e9cdd4702a69b6637ea99c9accfb2a110dbcddc16c938e7a573&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1529722258820435988/flame_bros_2.jpg?ex=6a62f85f&is=6a61a6df&hm=f35209e470087b57a739a0ebc0bd7248c088737d8a6a8769552c5910b064dc48&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1529722259181408406/flame_bros_3.jpg?ex=6a62f85f&is=6a61a6df&hm=7698329075957f8715f229f9a944df1d25e5aca1362b6c55bf7155a000c90308&",
  },
  wgd: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1529731250557030520/law_and_kid_1.jpg?ex=6a6300bf&is=6a61af3f&hm=af0bbe543508c7dcb4129c0fb1d26bfda99a73622d689b42f1386071331601a8&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1529731251060084796/law_and_kid_2.jpg?ex=6a6300bf&is=6a61af3f&hm=d41bd498a2bb0a3a75e876d2fc04b8dc69a846ca129321350434669e8d4ea93b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1529731251421052948/law_and_kid_3.jpg?ex=6a6300bf&is=6a61af3f&hm=d0206bd31a079e9e900dcaaa4c96f044ea2f5dace956597a910d287e476f37c1&",
  },
  harald: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539898899802628106/harald_1.jpg?ex=6a87fe1b&is=6a86ac9b&hm=14f09df8223a7594a16d262201693c8871109dc29be44a94ee51c9938626af7d&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539898900222050324/harald_2.jpg?ex=6a87fe1b&is=6a86ac9b&hm=9ead5f05e18c07151efa77aad677d8ae41dc37b78214fa74110afa17af9ca904&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539919949932269628/harald_3_new.jpg?ex=6a8811b6&is=6a86c036&hm=3da8f2686de0550e5d27ff7757da23c5646e990039e08f8bff646f4879d9d8fb",
  },
  uta_diva: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539939902702227497/uta_1.jpg?ex=6a88244b&is=6a86d2cb&hm=c0c85994d5daba6c69da13f7ff70ae9e8a6ad2b7cfe603f9a9d463e19428d542&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539939903100551179/uta_2.jpg?ex=6a88244b&is=6a86d2cb&hm=a77af6d9714a23958fa93ac5e42cc782e3b72530f6f0bad9d66167b214fe024b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539939903582773298/uta_3.jpg?ex=6a88244b&is=6a86d2cb&hm=2508e85b10ac13af237485e8c620ddcecc05b736fbddac28e1634d49dc77ed98&",
  },
  lucky_roux: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1522561377737244733/content.png?ex=6a48eb48&is=6a4799c8&hm=7c1243580bfec88ceec455060263f7fbde3e4c39832df10d3ee95f19503f7ded&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1522561378877968395/content.png?ex=6a48eb48&is=6a4799c8&hm=43fb845d3b909453fd7c34726ec29e0ffe95ea83bacbf615738275dd5dc6d1ac&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1522561379528347709/content.png?ex=6a48eb48&is=6a4799c8&hm=198ca6e4e0e8282d1121ea40c5bc862a6d737389d4efb79979f67db4b70b8065&",
  },
  carrot_mink: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1522564118391947396/content.png?ex=6a48edd5&is=6a479c55&hm=409c221a2656a4d7412f4c6a25aafc71d6562d43052afde8d7e7c52349a5546b&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1522564118869971055/content.png?ex=6a48edd5&is=6a479c55&hm=13d7c37a733d8f3c4995cad39e15dbe258470c7bf99c3bd199e547b475f38db8&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1522564119394255040/content.png?ex=6a48edd5&is=6a479c55&hm=75ff0fb19f29f9bd48d8a68c22a848961157cf24d1362e23d7e54353622b1978&",
  },
  stussy: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1522567852047994900/content.png?ex=6a48f14f&is=6a479fcf&hm=bcb508a9de624b2d143571ec0ae5eff11c9a8149c038167a0d68f51e6a46a86c&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1522567852442390669/content.png?ex=6a48f14f&is=6a479fcf&hm=76b5fafbed84d59b813bb8ad8b07593fab9ede3c460772b8a648e9bddee16546&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1522567852912283869/content.png?ex=6a48f150&is=6a479fd0&hm=0841c396235a6aa7fff691ee7db9b3718b55b98a02141486592986c22acff2fa&",
  },
  momonosuke_shogun: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539147619094364181/momo_1.jpg?ex=6a85426c&is=6a83f0ec&hm=a49da55562c79eeff8145c36fb0f2c862b18a159d7731a22ced2cbc0dffdebf4&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539147619438436463/momo_2.jpg?ex=6a85426c&is=6a83f0ec&hm=0a20b9dba4a32a716af6f1b5e65ccae4135045fb4a2fb5e91bc671dd26b7c957&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539147619744354354/momo_3.jpg?ex=6a85426c&is=6a83f0ec&hm=2b2381e97ec1b1a98feee980679edd38f3ba642589207064bb35b13256e522d7&",
  },
  inuarashi_duke: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1539937559596109824/Inuarashi_1.jpg?ex=6a88221c&is=6a86d09c&hm=eaf277e19d0f2f54d7ddc172d5ba0b383f925fb0da5abd6b36a2b056d35c6859&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539937559918940210/Inuarashi_2.jpg?ex=6a88221c&is=6a86d09c&hm=921978f806bdc267d3044db763f07bbe7968379c5614eed6708def366b2fdff5&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539937560254619750/Inuarashi_3.jpg?ex=6a88221d&is=6a86d09d&hm=5008b44f0f0a28ce980382b1b3d773f72e12c8cc65a54311c3c189422cf026f8&",
  },
  wsr: {
    M1: "https://cdn.discordapp.com/attachments/1492807857207382090/1531654188394745906/3c70d698-610c-4bc9-9149-61f9ae575634.png?ex=6a69ff9f&is=6a68ae1f&hm=159cc5ef59e0399c6b6d9f237ea3591dc1883197d4e3609ec62e2fffbec3ea2c",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1539528718500765696/mihawk_and_shanks_m2.jpg?ex=6a86a559&is=6a8553d9&hm=530bb0d3743085924542afccb3f410bb6a4f86c61f7970e212e335fcc19a7502",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1539524358266028043/mihawk_and_shanks_m3_new.jpg?ex=6a86a149&is=6a854fc9&hm=40232a4851130165cabe141390649ddbd14f82dba9579f9f43c0990518d8e60b",
  },
  gm: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1529733623853350992/dorry_and_brogy_1.jpg?ex=6a6302f5&is=6a61b175&hm=e65f7e56df496cb58b0e3c3f59584743c39e20556a0b9794c677549ea85f1b27&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1529733624197287986/dorry_and_brogy_2.jpg?ex=6a6302f5&is=6a61b175&hm=e5caa6f144a699b1ba9e1e40eac3fb409602b58ebc4711fb9344d18d1e95e444&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1529733624558125066/dorry_and_brogy_3.jpg?ex=6a6302f5&is=6a61b175&hm=ec7a5e8445387502bd0d9f0fa854fc6589eed75bed52cbeade7e89ce143e3c85&",
  },
  tre: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1529505536528355388/loki_harald_1.jpeg?ex=6a622e88&is=6a60dd08&hm=e59cb3860b2661937d339e85dd9e7d8526614b179361150a586a0ca2b1e7021f&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1529505536951718009/loki_harald_2.jpeg?ex=6a622e88&is=6a60dd08&hm=fff95dd443758fa5af2c203486c1c4c2ee07abae6fcf19ad7f751daab2e5c7a6&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1529505537228538087/loki_harald_3.jpeg?ex=6a622e88&is=6a60dd08&hm=db8baca34a9d599ea0b53405efbcc3076187a49f39059a8bd54702d39c4b2ff5&",
  },
  killingham: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1529346143052365894/killingham_1.jpg?ex=6a619a16&is=6a604896&hm=ae735b6cb0518801b08a68b87f1b30d438fc6d6bd9a991da7f719860e0327dec&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1529346143484514414/killingham_2.jpg?ex=6a619a16&is=6a604896&hm=8ba80fcc611de2a548c82d05dd54473ed9b2a08f687e9c2ec363e5aeb41b28fc&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1529346143887298751/killingham_3.jpg?ex=6a619a16&is=6a604896&hm=5d367da6bf66f736cedcfc1b7b93927e91971d70f726c9fa86ad10946ead533c&",
  },
  sommers: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1529346211612721243/sommers_1.jpg?ex=6a619a26&is=6a6048a6&hm=d2ee36cf8f7a7566dd58898c0f75cc0dce7df3405ad38e085a8c06d202697422&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1529346211948003420/sommers_2.jpg?ex=6a619a26&is=6a6048a6&hm=43b32acc155d48d4b73d1a47bc3e8204d9572047aca74b5dd953d5fbced16e12&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1529346212270968944/sommers_3.jpg?ex=6a619a26&is=6a6048a6&hm=031f74e52dcc807e0dd879c0081287c31845d62b63507a66ef24b2c3c022c615&",
  },
  wgs: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1529458516132237382/1.png?ex=6a6202be&is=6a60b13e&hm=4a7bad9824a043ed9edec743afb4abe3fd1f95d0d9e500431227ac932f0f87f8&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1529458516627296307/2.png?ex=6a6202be&is=6a60b13e&hm=afe480d2ac31da807396c871874b69f7f8f66733155302b63dfefe7d361eba6f&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1529458517151449158/3.png?ex=6a6202be&is=6a60b13e&hm=840f59148bdde801e4b43407339385179073c5c2024bb895fdad2e01bea4914c&",
  },
  ya: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1529505464075685918/big_mom__kaido_1.jpeg?ex=6a622e77&is=6a60dcf7&hm=58c7ccac2ad08af2b9339df45954a4dbd9382344a52986446556227b989fd040&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1529505464562221088/big_mom__kaido_2.jpeg?ex=6a622e77&is=6a60dcf7&hm=7c0d0f2fcc5e2732e4b6fc2ca42224e72a1f74a84a75cd47435b5dfa5b130048&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1529505464960946357/big_mom__kaido_3.jpeg?ex=6a622e77&is=6a60dcf7&hm=889a1be5475915dee4820b04a51a2bd1b352d754dea4dfebeac70160c5dd2d6d&",
  },
  gvc: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1529507525752393788/xebec__teach_1.jpeg?ex=6a623063&is=6a60dee3&hm=3b103bd7c10a2449989fd71be93f1c1480f69d0bdfe2c3b05ed4aaf796dbe429&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1529507526087934143/xebec__teach_new_2.jpeg?ex=6a623063&is=6a60dee3&hm=331e750cc616d4b76a1698cbdf1e077e357241ed35bf827361c254ff30125c26&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1529507526369087648/xebec__teach_3.jpeg?ex=6a623063&is=6a60dee3&hm=f82fe8205f4375f38469ee61d2046194c07c3cddd9cb02de489d91031b4761cb&",
  },
  dk: {
    M1: "https://cdn.discordapp.com/attachments/1492807857207382090/1535945126982066267/shamrockxgunko_1.jpeg?ex=6a799bde&is=6a784a5e&hm=fead2d288dfca3f4f30912896b1796fb6a3d10949b3e1d5dd654ef214c9e30ee&",
    M2: "https://cdn.discordapp.com/attachments/1492807857207382090/1535945127703613440/shamrockxgunko_3.jpeg?ex=6a799bde&is=6a784a5e&hm=0b58823f3b3ddb560716b226da086f61c6a5c5cf8f3e6f891df26c1d558530e3&",
    M3: "https://cdn.discordapp.com/attachments/1492807857207382090/1535945127422333008/shamrockxgunko_2.jpeg?ex=6a799bde&is=6a784a5e&hm=f4145e6458b3b1b60d46422c3f0cf57516499971ada9219543dad1c81e5fd2bf&",
  },
  ta: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1535942023893221376/3admiral_1.jpeg?ex=6a7998fa&is=6a78477a&hm=04fecbea2da95ed7f3d616ba12e0cd78685cc090dc7824c6052a6715f96d9394&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1535942024174370837/3admiral_2.jpeg?ex=6a7998fa&is=6a78477a&hm=52acbe83ec090649e54c7de72c5c800db5251e30698c53e0ddd9ccccda69a9e7&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1535942024631681034/3admiral_3.jpeg?ex=6a7998fb&is=6a78477b&hm=fc1d8420d4efa5cb9fee7f881585e14722bea13ac8797300b22a31973beb51ae&",
  },
  lw: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1535942095959883786/whitebeardxoden_1.jpeg?ex=6a79990c&is=6a78478c&hm=c9a05f140d38be1b7784dcb7b909b66c2e172250791ce67a41194758b4c24a72&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1535942096207487036/whitebeardxoden_2.jpeg?ex=6a79990c&is=6a78478c&hm=e40f64c9100aec8037be18f3b89c631a94cb5d1bc7fe2524a4f257ac12bbb550&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1535942096484044910/whitebeardxoden_3.jpeg?ex=6a79990c&is=6a78478c&hm=2a8d23cf9397d24513cc04e6bc00feebcaaf4f89ef623410bedfba541a140921&",
  },
  hw: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1535958185058504734/yamatoxmomonosuke_1.jpeg?ex=6a79a808&is=6a785688&hm=7de03b35c6f334751784e199574e07250b66eec34e2437bf4ab4b8ffe0654a88&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1535958185641377872/yamatoxmomonosuke_2_new.jpeg?ex=6a79a808&is=6a785688&hm=3a622fd0f711b818df6b3706c78d89516576fec56b1d123f3b3b2219e8e7c0df&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1535958186127794206/yamatoxmomonosuke_3.jpeg?ex=6a79a808&is=6a785688&hm=1c468fb9b4b0dbf9a1de7b7f92ae1ec0dc0a729fb3658db75ff04794b4950ec4&",
  },
  pkw: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1535944968957464666/gaban_and_rayleigh_1.jpeg?ex=6a799bb9&is=6a784a39&hm=8d45ae30cb8df9f0acdf4e93b99a44b9d7e2d4b4c9a3ed9d8781be1af55f9792&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1535944969238618143/gaban_and_rayleigh_2.jpeg?ex=6a799bb9&is=6a784a39&hm=875762043fef0cf6e8cfd12b8d1140dbf56833dfa458d6391f8b56c3a9b4b865&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1535944969544671332/gaban_and_rayleigh_3.jpeg?ex=6a799bb9&is=6a784a39&hm=503be284d5f21334b33721d34fedabffc1703032e415012334116fb497aec645&",
  },
};

const WEAPON_IMAGES = {
  aces: "https://cdn.discordapp.com/attachments/1539985332806619258/1539990714648236122/weapon_rogers.jpg?ex=6a88539e&is=6a87021e&hm=9835528f2b1e34a7c006b38056914202c2300f779c0c53f6dc34c9e58571593e&",
  hat: "https://cdn.discordapp.com/attachments/1539985332806619258/1539995893250396240/weapon_ace.jpg?ex=6a885870&is=6a8706f0&hm=9c6dbce698e434f959727c3511864cd8a938021e7127568135dc86272b122d36&",
  ame_no_habakiri: "https://cdn.discordapp.com/attachments/1539985332806619258/1539989001002553445/weapon_momo.jpg?ex=6a885205&is=6a870085&hm=72c361fb89b634b930c497d84a6178200e507da23da05471ba7a57c6f13343e5&",
  ex_habakiri: "https://cdn.discordapp.com/attachments/1539985332806619258/1539988999152861287/weapon_oden.jpg?ex=6a885205&is=6a870085&hm=08e14bbde32ccd3eada5ede4c74a26f5ac5f2085a888a97091af6815e4eea693&",
  basic_iron_club: "https://cdn.discordapp.com/attachments/1539985332806619258/1539996585134661652/weapon_alvida.jpg?ex=6a885915&is=6a870795&hm=eb97cf5377acc1b279c88e0111d783f7dc7cae1c9ab6938180598525c31efbf5&",
  basic_marine_saber: "https://cdn.discordapp.com/attachments/1539985332806619258/1539994010670727198/weapon_marines.jpg?ex=6a8856af&is=6a87052f&hm=f64b6228300e63668b0791cadb8aa8d4ae4f6d84814bbfcfb052dbe618b257c2",
  basic_slingshot: "https://cdn.discordapp.com/attachments/1539985332806619258/1539991820803776572/weapon_Usopp.jpg?ex=6a8854a5&is=6a870325&hm=d328e723baf7ec63dc6d07054ac05c4e8f382a327b78a1c12a336141838d8348&",
  clima_tact: "https://cdn.discordapp.com/attachments/1539985332806619258/1539989002361249812/weapon_nami.jpg?ex=6a885205&is=6a870085&hm=6933e4d911ab23f3a23067caa10f4f133a5fb4c3d09f470e261e33cb31772b30&",
  battle_axe: "https://cdn.discordapp.com/attachments/1539985332806619258/1539991817980874782/weapon_Sentomaru.jpg?ex=6a8854a5&is=6a870325&hm=6089c4c4dfd0662797b72eacfb615ee7016ace6c8ef0d0fa7d166f1161324d2c&",
  bible: "https://cdn.discordapp.com/attachments/1539985332806619258/1539988144747712593/weapon_kuma.jpg?ex=6a885139&is=6a86ffb9&hm=2d01ce4d60c51f34e51307a6feda7d5a818da34bffc50a7ecd9ba92800aae97c&",
  bisento: "https://cdn.discordapp.com/attachments/1539985332806619258/1539997793215717537/weapon_edward.jpg?ex=6a885a35&is=6a8708b5&hm=45074a0d4ba39e90411a64e53c6cc05c71ea2eac538ee23cfa2a803a31bd2722&",
  black_blade_replica: "https://cdn.discordapp.com/attachments/1539985332806619258/1539990714996494386/weapon_s_hawk.jpg?ex=6a88539e&is=6a87021e&hm=0b7925181be357ee05248c79ec65d04214b066db661cf68c4fe405911b109344&",
  black_leg_combat_shoes: "https://cdn.discordapp.com/attachments/1539985332806619258/1539990713033298022/weapon_sanji.jpg?ex=6a88539d&is=6a87021d&hm=a688c79e21de35310d93317201f4fa67dff759ebcc712546ce7533da05aba980&",
  burn_bazooka: "https://cdn.discordapp.com/attachments/1539985332806619258/1539995895280439326/weapon_wyper.jpg?ex=6a885871&is=6a8706f1&hm=0c4cbf0f71917b78b5d4e08d400c65d21cf62bcd2459cc119e616824cc0f775b&",
  candy_cane: "https://cdn.discordapp.com/attachments/1539985332806619258/1539988999622496376/weapon_Perospero.jpg?ex=6a885205&is=6a870085&hm=4a074280ca65edd2e425aa93b8f2df22cba4e344681d20f7733ea1a05cbb214e&",
  cannon_jaw: "https://cdn.discordapp.com/attachments/1539985332806619258/1539995894433317024/weapon_wapol.jpg?ex=6a885870&is=6a8706f0&hm=26ee9a9f186dd7cd7b09130535d00a462e5ee56f0bb6b0404bb44cf304200dd0&",
  cat_claws: "https://cdn.discordapp.com/attachments/1539985332806619258/1539988145163079752/weapon_Kuro.jpg?ex=6a885139&is=6a86ffb9&hm=09c213f031da84aab84b84abcaa4a8274877bddaba37a495f3b16aae32baf20a&",
  chemical_staff: "https://cdn.discordapp.com/attachments/1539985332806619258/1539996584211914752/weapon_Caesar_Clown.jpg?ex=6a885915&is=6a870795&hm=6301b466ba6532930cd2b2996631887ef827e6d3f3a3e9b91d81f112a42c6db8&",
  dragon_claw_gloves: "https://cdn.discordapp.com/attachments/1539985332806619258/1539990711930195988/weapon_sabo.jpg?ex=6a88539d&is=6a87021d&hm=d03920a997437b64c8c5fbd4ef2918a07243069fbffabbbbbc182ccaeb0161a5&",
  dual_daggers: "https://cdn.discordapp.com/attachments/1539985332806619258/1539996588422996069/weapon_buggy.jpg?ex=6a885916&is=6a870796&hm=f94899b402c627db0554dbe366dee10746a2ffaf054622cd48c47dd9278bfedb&",
  eclipse: "https://cdn.discordapp.com/attachments/1539985332806619258/1539990714228801718/weapon_rocks.jpg?ex=6a88539d&is=6a87021d&hm=d36642b31081bc118135a07de7d54e98f31e891938f8338c472b3e4f6298e318&",
  enma: "https://cdn.discordapp.com/attachments/1539985332806619258/1539995892822704158/weapon_zoro.jpg?ex=6a885870&is=6a8706f0&hm=e5ab855f78c50b8da30ae495a170293ec2e944c5ab0c68f18a5ccd761a5a5307&",
  ex_enma: "https://cdn.discordapp.com/attachments/1539985332806619258/1539988998741688392/weapon_oden_ex-enma.jpg?ex=6a885204&is=6a870084&hm=4ad7299bb739ed919027d8d6299d291e1cf2daed102cc02c13913c4aaff57cf2&",
  nonosama_bo: "https://cdn.discordapp.com/attachments/1539985332806619258/1539997793580617868/weapon_enel.jpg?ex=6a885a35&is=6a8708b5&hm=95fea22e9f438c99f09839e8c578a8aa3d25d21cebbfa1290d1b6b4b80c5eaf9&",
  fish_man_karate: "https://cdn.discordapp.com/attachments/1539985332806619258/1539986917737758740/weapon_jinbe.jpg?ex=6a885014&is=6a86fe94&hm=3ff8d78d2cf41581aba8df3a36fad4a935d7afc1858421f94f7b53df447dbb9d&",
  fists: "https://cdn.discordapp.com/attachments/1539985332806619258/1539989001413599242/weapon_monkey_d_garp.jpg?ex=6a885205&is=6a870085&hm=5cf184722b4e1f1500915db7136336727ebce35efd95417031fffa8e97ab17fd&",
  giant_fists: "https://cdn.discordapp.com/attachments/1539985332806619258/1539986917058420846/weapon_Jaguar_D._Saul.jpg?ex=6a885014&is=6a86fe94&hm=7525c7c5450a7a117869e1155a83d2fcdf2d2116cf1876746c27d1ccba76c817&",
  ragnir: "https://cdn.discordapp.com/attachments/1539985332806619258/1539988146673164508/weapon_loki.jpg?ex=6a885139&is=6a86ffb9&hm=03f2c994c85e5b822e08bed8f0bb8bb324958f5997bd46767fc5652efd4c7637&",
  golden_hook: "https://cdn.discordapp.com/attachments/1539985332806619258/1539997791319752795/weapon_crocodile.jpg?ex=6a885a35&is=6a8708b5&hm=9a7fbbf119a83b1d2b52d9cb1ed8dd656b2e74ab8507f48d33d9328bb81674f6&",
  general_franky_arsenal: "https://cdn.discordapp.com/attachments/1539985332806619258/1539998314546602124/weapon_franky.jpg?ex=6a885ab1&is=6a870931&hm=c9fdc7cd039b767619f65f983f42702b3dfa57003abd100acd87416e88e79b6a&",
  gryphon: "https://cdn.discordapp.com/attachments/1539985332806619258/1539991818706362409/weapon_shanks.jpg?ex=6a8854a5&is=6a870325&hm=038ce0472f3b5fcfc379309f34e8c0c828e9bada0997a55e9d628167de3a4d24&",
  hypnosis_ring: "https://cdn.discordapp.com/attachments/1539985332806619258/1539986917381251183/weapon_jango.jpg?ex=6a885014&is=6a86fe94&hm=59587991939d8b6d5b6d1fa44bf706d9d93783db1fad65dc3a5ecbeb70de8926&",
  ice_saber: "https://cdn.discordapp.com/attachments/1539985332806619258/1539988145859203112/weapon_kuzan.jpg?ex=6a885139&is=6a86ffb9&hm=c6b8889fdc82734a8e7489dcfd679cd9a22841e4e7c77aca8c70435f0a5e0c0e&",
  imperial_blade: "https://cdn.discordapp.com/attachments/1539985332806619258/1539988147742576701/weapon_king.jpg?ex=6a88513a&is=6a86ffba&hm=8248f6821ada7fcdf5e1e45c05e44b797e34e1d0653c9a073d24e6358b7d0d18&",
  jitte: "https://cdn.discordapp.com/attachments/1539985332806619258/1539991819381899355/weapon_smoker.jpg?ex=6a8854a5&is=6a870325&hm=595bf6fd7961bf5edd1323e4fb9ece41d156638c19ea6e299e03aec1abaa89ce&",
  kanabo: "https://cdn.discordapp.com/attachments/1539985332806619258/1539995896153112596/weapon_yamato.jpg?ex=6a885871&is=6a8706f1&hm=b78f65ed2e995c6c2bfcd3ef04e1729e48f139e8b788d6110841523870c07a80&",
  kiribachi: "https://cdn.discordapp.com/attachments/1539985332806619258/1539996585516212394/weapon_arlong.jpg?ex=6a885915&is=6a870795&hm=66b88505582cc27ca6f2f03d5e33a9a001bd9b0358077cec3008af6597e31c78&",
  laser_kicks: "https://cdn.discordapp.com/attachments/1539985332806619258/1539990715336228945/weapon_s_snake.jpg?ex=6a88539e&is=6a87021e&hm=48c003f869a27446118ea0ed58e23674e975c8ec7025badd5572ba00ace9ee2a&",
  long_rifle: "https://cdn.discordapp.com/attachments/1539985332806619258/1539995891753160714/weapon_yasopp.jpg?ex=6a885870&is=6a8706f0&hm=400edd8176bd8bcb6d7e9c4cda36b50576bd5d1a94e84b14b6bd1fee7184ff63&",
  long_sword: "https://cdn.discordapp.com/attachments/1539985332806619258/1539990713465442494/weapon_rayleigh.jpg?ex=6a88539d&is=6a87021d&hm=356507c57dbd189097349b32909d8784374a9f3b23c15f2f0e175c1b49131806&",
  magma_fist: "https://cdn.discordapp.com/attachments/1539985332806619258/1539990712685432872/weapon_Sakazuki.jpg?ex=6a88539d&is=6a87021d&hm=ea95cdeca963dd3ecca294799f72108b3330cdb029f2f5a20ea700f10a276c67&",
  mogura: "https://cdn.discordapp.com/attachments/1539985332806619258/1539997790506065950/weapon_Charlotte_Katakuri.jpg?ex=6a885a35&is=6a8708b5&hm=d1d1d168bba867162722e9f6719a328525d078b2ca6a8a24a1d2c6d861fcb435&",
  napoleon: "https://cdn.discordapp.com/attachments/1539985332806619258/1539996586439082054/weapon_big_mom.jpg?ex=6a885915&is=6a870795&hm=e0e839f592371ef0e6c68846121a40eee3a41aaaa00219528cb5dfaf51158820&",
  hassaikai: "https://cdn.discordapp.com/attachments/1539985332806619258/1539986918257983608/weapon_kaido.jpg?ex=6a885014&is=6a86fe94&hm=48bff3252a31fb03fc95f86bb5b7f106db9ce44ae7dce7c358b11fb09c57f264&",
  plague_arsenal: "https://cdn.discordapp.com/attachments/1539985332806619258/1539989000138268732/weapon_queen.jpg?ex=6a885205&is=6a870085&hm=6617551d7b8161aad8d33ec961c4158a2ecb66640863cd47ef1bfb0423784117&",
  raiu: "https://cdn.discordapp.com/attachments/1539985332806619258/1539991819033641000/weapon_Shiryu.jpg?ex=6a8854a5&is=6a870325&hm=f70f19e8a63aacea730bf5c7e55e6842b63eb685239baa7bcb76307222cabb85&",
  rokushiki: "https://cdn.discordapp.com/attachments/1539985332806619258/1539990713805054103/weapon_rob_lucci.jpg?ex=6a88539d&is=6a87021d&hm=a921ce89f19de1d4f30c5b8677013bae851c4c725cd0e5e23fd85913b0b36a78&",
  sacred_saber: "https://cdn.discordapp.com/attachments/1539985332806619258/1539998313804206110/weapon_Figarland_Garling.jpg?ex=6a885ab1&is=6a870931&hm=46c43e6f4d2a0f9272056d81c3cec10bd58bceb24f7dcc68555a01fc1ac36e44&",
  sandai_kitetsu: "https://cdn.discordapp.com/attachments/1539985332806619258/1539995892105347112/weapon_zoro_Sandai_Kitetsu.jpg?ex=6a885870&is=6a8706f0&hm=e82965872334d2f13146b79214bd9d66779cd6d3f3f1db2fb56cd028c22dfbc5&",
  scissors: "https://cdn.discordapp.com/attachments/1539985332806619258/1539998316169924618/weapon_Gecko_Moria.jpg?ex=6a885ab2&is=6a870932&hm=5cc0c193a2e29aa4de83879664fcf02f4f72bf9d14159f096bc589728ff31e86&",
  shikomizue: "https://cdn.discordapp.com/attachments/1539985332806619258/1539986916210905168/weapon_Issho.jpg?ex=6a885014&is=6a86fe94&hm=06aeb54ea1021f32a3b58d4d92b2393ce3db030a0fcd8f96d43caad4b3a349c7&",
  shodai_kitetsu: "https://cdn.discordapp.com/attachments/1539985332806619258/1539990712278327316/weapon_Saint_Ethanbaron_V_Nusjuro.jpg?ex=6a88539d&is=6a87021d&hm=05e158f50742e1722ba5169a7c3ba8eeee17ce6532f5e4e5ae5a2fefc5a2af7d&",
  silencer_handgun: "https://cdn.discordapp.com/attachments/1539985332806619258/1539997792494424134/weapon_Donquixote_Rosinante.jpg?ex=6a885a35&is=6a8708b5&hm=671f52e6de0bc7556e33fe41eb8f8e6ed06506e72aabfd9fe06fcf0e7861d427&",
  six_swords: "https://cdn.discordapp.com/attachments/1539985332806619258/1539998312919474377/weapon_Hatchan.jpg?ex=6a885ab1&is=6a870931&hm=fb8a6276ee7df659c757c2a2ba88b4af15a6cda2c8f0345970fe9de0761773aa&",
  sky_lance: "https://cdn.discordapp.com/attachments/1539985332806619258/1539998315716935721/weapon_Gan_Fall.jpg?ex=6a885ab2&is=6a870932&hm=f8f9b6329b93d481cca9de1f4592d52847258a5344829402a9ba76afe21359de&",
  soul_solidd: "https://cdn.discordapp.com/attachments/1539985332806619258/1539996587881668640/weapon_brook.jpg?ex=6a885916&is=6a870796&hm=a7e03284acacc709e55ebda6b41dfb6c3e9c03b6a50d6d0b72d49b8187a6ed91&",
  tonfa: "https://cdn.discordapp.com/attachments/1539985332806619258/1539998317105385603/weapon_Gin.jpg?ex=6a885ab2&is=6a870932&hm=26d42386832ec4de130a3dac05452d9858d50ada399bd06f741a45d76cc22a2b&",
  twin_blades: "https://cdn.discordapp.com/attachments/1539985332806619258/1539986916618010635/weapon_jack.jpg?ex=6a885014&is=6a86fe94&hm=918bbb29508074edf628ecc72f1b527e64cf54510dbe08255ba4457096170226&",
  wado_ichimonji: "https://cdn.discordapp.com/attachments/1539985332806619258/1539995892457934939/weapon_zoro_wado.jpg?ex=6a885870&is=6a8706f0&hm=67a8e3b80f34b9df0e0dbf6083a6f99883f8720a590dc11d29450a9d2a2f9be6&",
  wax_blade: "https://cdn.discordapp.com/attachments/1539985332806619258/1539998315301707816/weapon_galdino.jpg?ex=6a885ab2&is=6a870932&hm=8cedeacf99de71336be86d221c3563254d4b384dbbb7a69fa80c4ac55c27010e&",
  wootz_steel_spear: "https://cdn.discordapp.com/attachments/1539985332806619258/1539997792049565746/weapon_Don_Krieg.jpg?ex=6a885a35&is=6a8708b5&hm=5ada9df55fe33810ff2dc7b222ca93881cd3c8f9a8d7af5a811f915c2f044784&",
  yoru: "https://cdn.discordapp.com/attachments/1539985332806619258/1539989000587190322/weapon_mihawk.jpg?ex=6a885205&is=6a870085&hm=29560163d5dfe67379f1eed874a21516835bf0c31c1567129b9f60e8668aa1e1&",
  trident: "https://cdn.discordapp.com/attachments/1539985332806619258/1539998394385432616/weapon_hody_jones.jpg?ex=6a885ac5&is=6a870945&hm=fd57430c28f4961bce5ef685aa246ee4e41a30d4e2ea0a7973e2b63734a2158e",
  metal_arm: "https://cdn.discordapp.com/attachments/1539985332806619258/1539986918744530984/weapon_kid.jpg?ex=6a885015&is=6a86fe95&hm=43058299da95d262a9520acc077c6fed0466c5af0a90c7017bb9fb5c5f8707fb&",
  kikoku: "https://cdn.discordapp.com/attachments/1539985332806619258/1539988146190688466/weapon_law.jpg?ex=6a885139&is=6a86ffb9&hm=78c3188b83b7620d17c9a6dc116d4a651098c39026769cfbe29f9096083752b7&",
  nemesis: "https://cdn.discordapp.com/attachments/1539985332806619258/1539986914923249774/weapon_imu.jpg?ex=6a885014&is=6a86fe94&hm=aa219cecc816e196ef9ac2fe911af45c0a64f1afd90592295d7b15e031b22384&",
  sandals: "https://cdn.discordapp.com/attachments/1539985332806619258/1539988147079741460/weapon_luffy.jpg?ex=6a885139&is=6a86ffb9&hm=ee3873924a258d781b1ff36973863622cf5b8d1cd0fa1f7a401e53b85f38ea34&",
  okama_kenpo: "https://cdn.discordapp.com/attachments/1539985332806619258/1539996587072430210/weapon_bon_clay.jpg?ex=6a885916&is=6a870796&hm=54818355043230cb166539a69654505ab252909a9f31cc7dfe27a6392ea0de52&",
  saber_and_axe: "https://cdn.discordapp.com/attachments/1539985332806619258/1539995895704195182/weapon_x_drake.jpg?ex=6a885871&is=6a8706f1&hm=34013d07630f200679accbb6c4ab7a4a761121cc67f95f18a458119aaeedd774&",
  scythe: "https://cdn.discordapp.com/attachments/1539985332806619258/1539997793962172456/weapon_Charlotte_Brulee.jpg?ex=6a885a35&is=6a8708b5&hm=cfce6771199ff9ad609a06a0ac7a18f1eeec35869619cec7b94e355fb164e7f0&",
  straw_sword: "https://cdn.discordapp.com/attachments/1539985332806619258/1539996585935507496/weapon_Basil_Hawkins.jpg?ex=6a885915&is=6a870795&hm=259480a3fc7bd314ba2839382cb6f3a6191ad02ef6f24cb402fb692e88c268b6&",
  fire_tank_arsenal: "https://cdn.discordapp.com/attachments/1539985332806619258/1539996584685867049/weapon_Capone_Bege.jpg?ex=6a885915&is=6a870795&hm=dff697e1d7b1b13c3c125ebe948700d7683cdf42caaf024b352e43085be3c00d&",
  sea_spear: "https://cdn.discordapp.com/attachments/1539985332806619258/1539989002810036224/weapon_neptune.jpg?ex=6a885205&is=6a870085&hm=2273772633f1aa2eedcb74f71949ef5c71ecc1ec7b05183f70add2f17f99fb32&",
  terry_sword: "https://cdn.discordapp.com/attachments/1539985332806619258/1539997792892887060/weapon_dorry.jpg?ex=6a885a35&is=6a8708b5&hm=164f142ee2cb5687ef8d1cdabcc03637cc89a21897d99408459cff6ff5d86268&",
  bruiser_axe: "https://cdn.discordapp.com/attachments/1539985332806619258/1539996587479138356/weapon_brogy.jpg?ex=6a885916&is=6a870796&hm=e0f3ff085c503373c653a3ce16dd40aaf3b8c649d48be2bc77414810fe02de78&",
  cerberus: "https://cdn.discordapp.com/attachments/1539985332806619258/1539991818370949190/weapon_Shamrock.jpg?ex=6a8854a5&is=6a870325&hm=aa44513d2cf486be4ef964c106339b2bf76b69068faad860eb2c0aaefa688d7f&",
  twin_axes: "https://cdn.discordapp.com/attachments/1539985332806619258/1539991817641271316/weapon_Scopper_Gaban.jpg?ex=6a8854a4&is=6a870324&hm=3e05b4d3d88440d10a296ff175086ba61e2811dc36293308f6c9597f705bff37&",
  water_bullets: "https://cdn.discordapp.com/attachments/1539985332806619258/1539997790850252820/weapon_chew.jpg?ex=6a885a35&is=6a8708b5&hm=ec89fb558a2236c774cd8c4906c6cc76ac6e11eb92bb35f018c1e48685e6fd3f&",
  bandit_club: "https://cdn.discordapp.com/attachments/1539985332806619258/1539997791676399747/weapon_Dogra.jpg?ex=6a885a35&is=6a8708b5&hm=99bf236a78a4a471f0514abc00adae7688e20bfefe1c759000060926bdc6ef1e&",
  bandit_knife: "https://cdn.discordapp.com/attachments/1539985332806619258/1539988147427872850/weapon_Magra.jpg?ex=6a885139&is=6a86ffb9&hm=7e2a1e22947981c3fde82dcb4b13cf8f99b07281b55a85ea875a41bd976a2288&",
  fish_karate: "https://cdn.discordapp.com/attachments/1539985332806619258/1539988145532309625/weapon_Kuroobi.jpg?ex=6a885139&is=6a86ffb9&hm=3bdfd10ecb23d9307d7637905c0428aa7cfafed4f28011f6133bfa49dc8a48de&",
  gauntlet: "https://cdn.discordapp.com/attachments/1539985332806619258/1539998317453377577/weapon_gunko.jpg?ex=6a885ab2&is=6a870932&hm=c93f0924b5c03e673d533e1faedbebbba9ecb54c222765eddf78ed20d5529364&",
  kagi: "https://cdn.discordapp.com/attachments/1539985332806619258/1539991820430221402/weapon_teach.jpg?ex=6a8854a5&is=6a870325&hm=bbdaa995e378bd731b6aa96b9c813e4a1120a9bc45af333b39d5d6b2ecc64d0d&",
  excalibur: "https://cdn.discordapp.com/attachments/1539985332806619258/1539998312038535260/weapon_harald.jpg?ex=6a885ab1&is=6a870931&hm=d37b6c5370fa1d11a90c49cf85086c3ae902aae622232306e24750baee8d73a1&",
  rapier: "https://cdn.discordapp.com/attachments/1539985332806619258/1539986915288293476/weapon_Inuarashi.jpg?ex=6a885014&is=6a86fe94&hm=8975acf0f8f1f438a64e229bb50945f103a81efde4976248fe34bfc11b1cd885&",
  knight_form: "https://cdn.discordapp.com/attachments/1539985332806619258/1539995893741133865/weapon_uta.jpg?ex=6a885870&is=6a8706f0&hm=3b8d4baeb5c5ef49b72d9c586d334b41b22decb46b14a0d7deafdc83051252a7&",
  leister: "https://cdn.discordapp.com/attachments/1539985332806619258/1539986914575253594/weapon_Killingham.jpg?ex=6a885014&is=6a86fe94&hm=4e9de49175829b0e9c56f9dd76a7864ff8af98d559e02ec17681561df9a87d62&",
  tetsubo: "https://cdn.discordapp.com/attachments/1539985332806619258/1539991819704602716/weapon_Sommers.jpg?ex=6a8854a5&is=6a870325&hm=1941a99352be230ae375f9e6fbe66353399c727c21f667d5556d2356c500f519&",
  ame_no_murakumo: "https://cdn.discordapp.com/attachments/1539985332806619258/1539988148124393472/weapon_kizaru.jpg?ex=6a88513a&is=6a86ffba&hm=0b3489525b74c07f8d3ca4506955a5bd04bfc44b7725322ee190c8c0f41eeb1b&",
};

const DEVIL_FRUIT_IMAGES = {
  akuma_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494944000807796887/akumanomi.png?ex=69e47298&is=69e32118&hm=5e44cb53b4d74a491e80917f21ae028572697415136b4e3c6863f816f5882799",
  ryu_ryu_no_mi_model_nidhoggr: "https://cdn.discordapp.com/attachments/1493204525975076944/1494707764197589174/Nidhoggr.png?ex=69e43f55&is=69e2edd5&hm=943d43beac19fdeac8ad4b7db58f322f89ecd86dfa13cd71e74a9df8c12ce493&",
  baku_baku_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494707765220999229/banebanenomi.png?ex=69e43f55&is=69e2edd5&hm=2ad84ae2e8fbb71ccc1b8f60c63b813c95dede6cb062a237d41bf95c3383dc7b&",
  bane_bane_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494707765803876613/Bane_Bane_no_Mi.png?ex=69e43f55&is=69e2edd5&hm=733d5bfc9c82031d83645b6c0e7135b711ed4bb78fe510eaa1575e52f70535d5&",
  bara_bara_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494707764700909608/Bara_Bara_no_Mi.png?ex=69e43f55&is=69e2edd5&hm=297f56ffd9a4cef02f3c33ce8b3c9228793db8ff81bb8dfb17b36caf1a7682da&",
  beta_beta_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494941851856142396/Beta_Beta_no_Mi.png?ex=69e47098&is=69e31f18&hm=6558d99f23ef6076f897331a1a278160538673bc95e837724eaadfa6907485d6&",
  chiyu_chiyu_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494941852418310296/Chiyu_Chiyu_no_Mi.png?ex=69e47098&is=69e31f18&hm=a36667b3b221856fad6d9d7aacff923a33eb18be472673b997b3ba804d145b33&",
  doru_doru_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494941853022425198/Doru_Doru_no_Mi.png?ex=69e47098&is=69e31f18&hm=7caa75c05cd5bfde016a3864292242d9d6ed2785cddedcc00441929adebaf08c&",
  gasu_gasu_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494941853705965669/Gasu_Gasu_no_Mi.png?ex=69e47098&is=69e31f18&hm=70ef9628a3c8ab8b6c8d514cce4e58b910274c0cf3deab61da6935529bcb726f&",
  goro_goro_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494941854209146971/Goro_Goro_no_Mi.png?ex=69e47098&is=69e31f18&hm=ff0039e4570a42ae6affa828c4a137c7f7244346fce0c4e1a79241d90aba59a5&",
  gura_gura_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494942548492550166/Gura_Gura_no_Mi.png?ex=69e4713e&is=69e31fbe&hm=f6548652d9beb533f2f5c5536f4e7f541bf26073cb3cd224fa57a2f4ecd7c679&",
  hana_hana_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494942549218037910/Hana_Hana_no_Mi.png?ex=69e4713e&is=69e31fbe&hm=f4b59bc35513a27ea473987f4019b37512f706ebca32b70b2db2f2318c6257ad&",
  hie_hie_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494942549931196526/Hie_Hie_no_Mi.png?ex=69e4713e&is=69e31fbe&hm=d78cd2bac2a9fa08832df79b20e17ff160e0115955c9a85b56869f67e752f355&",
  hito_hito_no_mi_model_tonakai: "https://cdn.discordapp.com/attachments/1493204525975076944/1494942550577119242/Hito_Hito_no_Mi.png?ex=69e4713e&is=69e31fbe&hm=b046201916f0e33fb6018e39a1a3575203a0cadd098dda340a5044e82028481d&",
  hito_hito_no_mi_model_daibutsu: "https://cdn.discordapp.com/attachments/1493204525975076944/1494942551386493018/Hito_Hito_no_Mi_Model_Daibutsu.png?ex=69e4713e&is=69e31fbe&hm=ccb5d43e9002758c431bbfbb0dda968b8d47ea8bdf7855bfa480910689a61eae&",
  hito_hito_no_mi_model_fengxi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494970445940654141/Hito_Hito_no_Mi_Model_Fengxi.png?ex=69e48b39&is=69e339b9&hm=57e23065b316b635d4d4cd04738a3684f3e6cfea1cd47da6d89c8bec9fb47440&",
  hito_hito_no_mi_model_nika: "https://cdn.discordapp.com/attachments/1493204525975076944/1494970446377123980/Hito_Hito_no_Mi_Model_Nika.png?ex=69e48b39&is=69e339b9&hm=aa15b6b17307803f43d681480c22f0f0de712c6c2c63cae1db07f1835964bb89&",
  horo_horo_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494971311049408563/Horo_Horo_no_Mi.png?ex=69e48c07&is=69e33a87&hm=38689bcfbce09c9b67f43e1130f6b949b440386ad887e1ad53bf62befeb76248",
  inu_inu_no_mi_model_okuchi_no_makami: "https://cdn.discordapp.com/attachments/1493204525975076944/1494970446867730482/Inu_Inu_no_Mi_Model_Okuchi_no_Makami.png?ex=69e48b39&is=69e339b9&hm=837cdf69e8e98b43bdae317736e1a31a563109025a7a0ea8b0f69903456d5b4b&",
  kage_kage_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494970447366983802/Kage_Kage_no_Mi.png?ex=69e48b39&is=69e339b9&hm=713ac7ab914c7079a0bec0b8df0939b755370b34175977eed2f068ad306d6f9a&",
  kibi_kibi_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494970447924695110/Kibi_Kibi_no_Mi_Otama.png?ex=69e48b39&is=69e339b9&hm=d4a5117c9edc02c1b256495b232e784231d2d13e1b95dc11e33c46e516b0c6f4&",
  magu_magu_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494970448407167036/Magu_Magu_no_Mi.png?ex=69e48b3a&is=69e339ba&hm=4a0e64204c14ced5d0422b4c65eb7e4089d1a29ede1802157a5a0c7853a0fa1d&",
  memo_memo_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494970448901967952/Memo_Memo_no_Mi.png?ex=69e48b3a&is=69e339ba&hm=b9caf58fe47abcad81f06b5ec1244d7f33e05ebd68eb9e0b05036f27f8a86342&",
  mera_mera_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494970449388376214/Mera_Mera_no_Mi_Ace__Sabo.png?ex=69e48b3a&is=69e339ba&hm=56e2010d1f41a4b3590f2914a400de9953b3a5105d33e4fd821e90e4bcfe150d&",
  tori_tori_no_mi_model_phoenix: "https://cdn.discordapp.com/attachments/1493204525975076944/1494970449912795146/Tori_Tori_no_Mi_Model_Phoenix.png?ex=69e48b3a&is=69e339ba&hm=e81f24ee1a0ccd91bd8bf804c4feb149c607c7e46184f5723bdfabd1fc66db44&",
  uo_uo_no_mi_model_seiryu: "https://cdn.discordapp.com/attachments/1493204525975076944/1494970450437214259/Uo_Uo_no_Mi_Model_Seiryu.png?ex=69e48b3a&is=69e339ba&hm=680290769446c529132b21c72b5ea7afc0d75cd33b8b3240063eae35b4a74966&",
  ito_ito_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494972637061840906/Ito_Ito_no_Mi.png?ex=69e48d43&is=69e33bc3&hm=8efc82fc58b0c9e1b5729d219f51c4fb78ba16d8d4a76ac8aaef5a2564a61eb5&",
  uma_uma_no_mi_model_bakotsu: "https://cdn.discordapp.com/attachments/1493204525975076944/1494972637653373019/Uma_Uma_no_Mi_Model_Bakotsu.png?ex=69e48d44&is=69e33bc4&hm=f53407e465ecdad5bdfbcbb9aa58d4a4820bb247c7239e3b600d2bd52ade6d24&",
  mero_mero_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494987270132989952/Mero_Mero_no_Mi.png?ex=69e49ae4&is=69e34964&hm=ff398c5ae64d98fa04c8ebbafa3508aff272813d915d08e59fdc7b36756b8a4a&",
  mochi_mochi_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494987271097552916/Mochi_Mochi_no_Mi.png?ex=69e49ae4&is=69e34964&hm=ea36aa28b2d0b27f1ec82a92736e98d997956879fa173dbf2bc98b216bcb28f7&",
  mero_replica: "https://cdn.discordapp.com/attachments/1493204525975076944/1494987270132989952/Mero_Mero_no_Mi.png?ex=69e49ae4&is=69e34964&hm=ff398c5ae64d98fa04c8ebbafa3508aff272813d915d08e59fdc7b36756b8a4a&",  
  moku_moku_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494987271638745208/Moku_Moku_no_Mi.png?ex=69e49ae5&is=69e34965&hm=13b498cbbea1845a998eddcfacb756fc04e310126b6e7518e5327c99c4ffc98d&",
  mori_mori_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494987272720879686/Mori_Mori_no_Mi.png?ex=69e49ae5&is=69e34965&hm=d1a19b3214551b13d86a4fde45231c2444b1949da472d78baaa1a782b125bd61&",
  mushi_mushi_no_mi_model_sandworm: "https://cdn.discordapp.com/attachments/1493204525975076944/1494987273320534116/Mushi_Mushi_no_Mi_Model_Sandworm.png?ex=69e49ae5&is=69e34965&hm=6102abf76fbdc4a12bceb869153f84d31c148987dadfc836db86eac0d7d08e47&",
  nagi_nagi_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494987274054668358/Nagi_Nagi_no_Mi.png?ex=69e49ae5&is=69e34965&hm=55896516af1b7b9e4e227ad7217e6c03f4ebc8d6af4779a83ca98abc1a30a248&",
  neko_neko_no_mi_model_leopard: "https://cdn.discordapp.com/attachments/1493204525975076944/1494987274709106748/Neko_Neko_no_Mi_Model_Leopard.png?ex=69e49ae5&is=69e34965&hm=42697d68b97353bb7f862dd3f271e00d91cf001ce0c195d5816ba0d5c4e1aca2&",
  nikyu_nikyu_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494987275640111134/Nikyu_Nikyu_no_Mi.png?ex=69e49ae6&is=69e34966&hm=0baf92013ea694d51c9316c021fe71882888f16500d1ed94fe4c35c2e120f1e5&",
  nomi_nomi_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494987276198084658/Nomi_Nomi_no_Mi.png?ex=69e49ae6&is=69e34966&hm=f05c5d1bda23eb0236cf1b83477e3a0b2ae7dee9d0048283a3ebc14a0eca9fb6&",
  ope_ope_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494987277175361566/Ope_Ope_no_Mi.png?ex=69e49ae6&is=69e34966&hm=df53ccdf7d3b1a9aaf9893b221864868b08ae7566d051dd48e1d6131d75ba41c&",
  pero_pero_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494999399036616964/Pero_Pero_no_Mi.png?ex=69e4a630&is=69e354b0&hm=bfb7d163b824f49fe4ce96de7753957970b9e55af3491ee74f0d8f413372deb0&",
  pika_pika_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494999399422496789/Pika_Pika_no_Mi.png?ex=69e4a630&is=69e354b0&hm=14f0ae6c5f84e159d76112508da705aa6779d5b693b703223e3b277a306e8d05&",
  raki_raki_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494999399800111164/Raki_Raki_no_Mi.png?ex=69e4a630&is=69e354b0&hm=269ce06436a33aad00503b45f23e7dc4cc9063b26e3f8c27d6bcf1840f6ba717&",
  shiku_shiku_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1511267123182178406/content.png?ex=6a1fd4b0&is=6a1e8330&hm=ebfa59cf88cea72c63b0ad09e1497f9b091b2a355fd9a6ca482c76d58145adf0",
  ryu_ryu_no_mi_model_brachiosaurus: "https://cdn.discordapp.com/attachments/1493204525975076944/1494999400353628190/Ryu_Ryu_no_Mi_Model_Brachiosaurus.png?ex=69e4a630&is=69e354b0&hm=cdae7529448b00bc80bf6400cdb2aba5d20b2edbfad3d74ef8c3a95c2712a6c8&",
  ryu_ryu_no_mi_model_pteranodon: "https://cdn.discordapp.com/attachments/1493204525975076944/1494999400789839872/Ryu_Ryu_no_Mi_Model_Pteranodon.png?ex=69e4a630&is=69e354b0&hm=a28d8dc7391a644bbb4a3edc4f1296f4b89c35cc1561303a7d560968019cb117&",
  soru_soru_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494999401603665921/Soru_Soru_no_Mi.png?ex=69e4a631&is=69e354b1&hm=0279bcd8dd694cf887d973f58b38414e73ea6652171da1c6ce02132a85b406fd&",
  sube_sube_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494999401993601214/Sube_Sube_no_Mi.png?ex=69e4a631&is=69e354b1&hm=1fd1dda9d2ec54007fe675f3cf8c4c313beac4f027663a24b7e3360a955867aa&",
  suke_suke_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494999402375286795/Suke_Suke_no_Mi.png?ex=69e4a631&is=69e354b1&hm=fd18f01a217510062b9464ba55fb07fb7001b3a3a62954e8ae7efd3a6403a012&",
  suna_suna_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494999402891313242/Suna_Suna_no_Mi.png?ex=69e4a631&is=69e354b1&hm=fbac7c278ddd5dfde67b1a2bf5214ec77807df608d7e895ae76c9d34018e43d3&",
  supa_supa_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494999403339972780/Supa_Supa_no_Mi.png?ex=69e4a631&is=69e354b1&hm=b8777702face53b446ad11ba6e209a6f8a84d7b639710d274cdf54b4cbfc734b&",
  tori_tori_no_mi_model_itsumade: "https://cdn.discordapp.com/attachments/1493204525975076944/1495024509193818152/Tori_Tori_no_Mi_Model_Itsumade.png?ex=69e4bd93&is=69e36c13&hm=25a4d069ee09f99972115618811cbe1ca4c72105b8baeb22a5cff2fa9ed04d09&",
  arashi_arashi_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1495024509651255469/Arashi_Arashi_no_Mi.png?ex=69e4bd93&is=69e36c13&hm=57360750aad6f3ff7fd532534e7ba053665d127fd86cccb569551c786b21efcb&",
  ushi_ushi_no_mi_model_giraffe: "https://cdn.discordapp.com/attachments/1493204525975076944/1495024510078947358/Ushi_Ushi_no_Mi_Model_Giraffe.png?ex=69e4bd93&is=69e36c13&hm=9b3d10c25f7835e7e2a1cc29367277008011f596ba0a846a33365d64211441ed&",
  ushi_ushi_no_mi_model_gyuki: "https://cdn.discordapp.com/attachments/1493204525975076944/1495025291851202731/Ushi_Ushi_no_Mi_Model_Gyuki.png?ex=69e4be4d&is=69e36ccd&hm=2167348935ba9cc6b840c8f7913c48771fb8b692d73936a96d6eecc6b001745f",
  woshu_woshu_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1495024510552772789/Woshu_Woshu_no_Mi.png?ex=69e4bd93&is=69e36c13&hm=1803de6a8b8ec1987c2de9ae130957839a12b3ff51bbf4e0a0d01889847522ad&",
  yami_yami_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1495024510993432756/Yami_Yami_no_Mi.png?ex=69e4bd93&is=69e36c13&hm=215f54e4ced7202c93de048247a653528da5b54e1a516dc5d03a965a4bff40d5&",
  yomi_yomi_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1495024511446290433/Yomi_Yomi_no_Mi.png?ex=69e4bd93&is=69e36c13&hm=217275c6ad43a7d534cd4c10636e200105149cd7b085e1ec20e5f1e863cb137e&",
  zou_zou_no_mi_model_mammoth: "https://cdn.discordapp.com/attachments/1493204525975076944/1495024511848812575/Zou_Zou_no_Mi_Model_Mammoth.png?ex=69e4bd93&is=69e36c13&hm=e39c6b545ef7b673c59ec47fb61b6697ff26393f0d18317e3ee75ce683bc1827&",
  zushi_zushi_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1495024512276889630/Zushi_Zushi_no_Mi.png?ex=69e4bd93&is=69e36c13&hm=fdeae4b2a64b7c73ffa770fcb65570506ea1d24262ec9febafed808e0618708a&",
  aro_aro_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1495336991309434881/content.png?ex=69e5e098&is=69e48f18&hm=24bcc663fb4ddd9a24ecd3a813c18f79593e2167f2480efe836936d6ab61087e",
  jiki_jiki_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1499048654135230564/content.png?ex=69f3615a&is=69f20fda&hm=4f7e8c0c8daaea4b15538024dcbe23b288d925011dd0d292a39ec498c7b9852a",
  mane_mane_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1515619133461500015/content.png?ex=6a2fa9d0&is=6a2e5850&hm=d930dbfc73feaadc4896b9c09fdcc90fe94eb340ccb5af611f11e44148ac0f6d&",
  ryu_ryu_no_mi_model_allosaurus: "https://cdn.discordapp.com/attachments/1493204525975076944/1515619133956554862/content.png?ex=6a2fa9d0&is=6a2e5850&hm=ca54136d937d56489507bf03221e0906d1a64d22b664b65263e3d1c04e9883b2&",
  oto_oto_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1515619134464069713/content.png?ex=6a2fa9d0&is=6a2e5850&hm=6c523be02adca29138eb7aa2438c3971007cdf3fdf68e6e6358f64a118e6f97d&",
  hoya_hoya_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1515619134866718813/content.png?ex=6a2fa9d0&is=6a2e5850&hm=c2a692ebbce6579c7415cc9e12267e303604d4e4d933c16b9c4d5799e2ac44f1&",
  netsu_netsu_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1515619135395070052/content.png?ex=6a2fa9d0&is=6a2e5850&hm=6857ad326625e63fae2f4dd4510b105e992209a74b72ce122b2ccf461a585732&",
  mira_mira_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1515619135860510841/content.png?ex=6a2fa9d0&is=6a2e5850&hm=e6b6a355736343fc5499a5fd4cd1d79f047662ce48c394e329db9ee37e2996ca&",
  wara_wara_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1515619136343117915/content.png?ex=6a2fa9d0&is=6a2e5850&hm=e09751381a907e330a525bfc6c8df973e8b747639cf953b8fd95f19ffc5f9f93&",
  shiro_shiro_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1515619136930189462/content.png?ex=6a2fa9d1&is=6a2e5851&hm=051095aea35b26164725a21aaa4bb10f34af34f81bc9130f6657a10f75c41a80&",
  horu_horu_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1515619137328644148/content.png?ex=6a2fa9d1&is=6a2e5851&hm=46b481256e18abb5c15577d052f8c0057ef2e03b7225866bea25d7cce5bb2400&",
  susu_susu_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1515619137743884378/content.png?ex=6a2fa9d1&is=6a2e5851&hm=d5729a4550cf61c95b7965421b1e92132e1579ba94e12b75731dd155b8b6ebc2&",
  kobu_kobu_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1515677657482657912/content.png?ex=6a2fe051&is=6a2e8ed1&hm=59ba3bae06502c741613aa05343a65c82f1c563bf53ba10c456dfc87daa1cb39&",
  choki_choki_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1515677658074189904/content.png?ex=6a2fe051&is=6a2e8ed1&hm=1612c52d4a6d6b104b129c0f426aff3b427868231907adaf05ba26d91c8dc09b&",
  toshi_toshi_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1515677658678296657/content.png?ex=6a2fe051&is=6a2e8ed1&hm=2e16159ca8b94bd7792e83b1ca4db94c59b5e53070008eeb2a9d4cc2a340862f&",
  riki_riki_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1515677659110051990/content.png?ex=6a2fe051&is=6a2e8ed1&hm=088056e2aec013f3339410733b9af075a6ec6f216d4d25b66de50afdd28230e2&",
  inu_inu_no_mi_model_kyubi_no_kitsune: "https://cdn.discordapp.com/attachments/1493204525975076944/1515677659806433401/content.png?ex=6a2fe052&is=6a2e8ed2&hm=7d0d21068135ff37b6c82e290d6078ead92eee58988c0f9dae90f8505344ba64&",
  uta_uta_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1522616128931893268/content.png?ex=6a491e45&is=6a47ccc5&hm=f9980cff254b074ac193926c51812aef036d67df81b5e7191f79420bb6315807&",
  batto_batto_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1522616129489473556/content.png?ex=6a491e46&is=6a47ccc6&hm=14c4f8e120ca9803ebdce2b90fb2cf42f92de292b973fa39cb91036df51ec6fc&",
  uo_replica: "https://cdn.discordapp.com/attachments/1493204525975076944/1522616130005368832/content.png?ex=6a491e46&is=6a47ccc6&hm=2c58f39278635cede3a34e6e4e3944f5cfc189083ea05391dab537067687ea76&",
  ryu_ryu_no_mi_model_kirin: "https://cdn.discordapp.com/attachments/1493204525975076944/1529416610035793972/content.png?ex=6a61dbb7&is=6a608a37&hm=c7c1719121b97c3903d31d6054bdb1d450c93006cbb4c5f96293dd8dad0b3b76&",
  iba_iba_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1529416609092075530/content.png?ex=6a61dbb6&is=6a608a36&hm=488f18c7d6587f17cf443f2b54f3091e650a5e2b72eca437fa46fc7a0c8ad180&",
};

const SHIP_IMAGES = {
  small_boat: "https://cdn.discordapp.com/attachments/1493204525975076944/1494626220464144506/smallboat.png?ex=69e34aa3&is=69e1f923&hm=23e64b5c38abc306369d7746afdc3df33fdb80c3382b58ba96910b373f2e4552&",
  going_merry: "https://cdn.discordapp.com/attachments/1493204525975076944/1494626221039026318/goingmerry.png?ex=69e34aa3&is=69e1f923&hm=4a67471e41f4bbc0d05923bd0d3d9b5f3e9ada23f7e497fa331ee3ee820d4632&",
  improved_merry: "https://cdn.discordapp.com/attachments/1493204525975076944/1494626221558992936/improvemerry.png?ex=69e34aa4&is=69e1f924&hm=b563d6a75b856bb359ebe94938e839e0e169e5f0a4b6f790e1e2ca7c85f6f953&",
  thousand_sunny: "https://cdn.discordapp.com/attachments/1493204525975076944/1494626222129545347/thousandsunny.png?ex=69e34aa4&is=69e1f924&hm=14be30334ca5d12e989f8e248cef8c7c827a78c4d98b83d494744cd993fb2785&",
  sunny_final: "https://cdn.discordapp.com/attachments/1493204525975076944/1494626222947434526/thousandsunnyfinal.png?ex=69e34aa4&is=69e1f924&hm=3eb5582eda7ed00bab988fbe32c7a8c88501a4292eb1345e5d4dd204edd283bb&",
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
  elbaf: "https://cdn.discordapp.com/attachments/1493204525975076944/1508084233762115675/elbaf.png?ex=6a144064&is=6a12eee4&hm=9491f17ba38dc4837d77645bf19ee5cbce487464b1a1cf7b018406840d796656",
};

function getRarityBadge(rarity) {
  const tier = normalizeRarity(rarity);

  return RARITY_BADGES[tier] || "";
}

function getRarityEmoji(rarity) {
  const tier = normalizeRarity(rarity);
  const emojiId = RARITY_EMOJI_IDS[tier];
  const emojiName = RARITY_EMOJI_NAMES[tier];

  if (!emojiId || !emojiName) {
    return "";
  }

  return `<:${emojiName}:${emojiId}>`;
}

function getCardImage(code, stage = "M1", fallback = "") {
  const entry = CARD_IMAGES[code];

  if (!entry) return fallback || "";

  if (typeof entry === "string") {
    return entry || fallback || "";
  }

  return entry[stage] || entry.M1 || fallback || "";
}

function getWeaponImage(code, fallback = "") {
  return WEAPON_IMAGES[String(code || "")] || fallback || "";
}

function getDevilFruitImage(code, fallback = "") {
  return DEVIL_FRUIT_IMAGES[String(code || "")] || fallback || "";
}

function getShipImage(code, fallback = "") {
  return SHIP_IMAGES[String(code || "")] || fallback || "";
}

function getIslandImage(code, fallback = "") {
  return ISLAND_IMAGES[String(code || "")] || fallback || "";
}

module.exports = {
  RARITY_BADGES,
  RARITY_EMOJI_IDS,
  RARITY_EMOJI_NAMES,
  CARD_IMAGES,
  WEAPON_IMAGES,
  DEVIL_FRUIT_IMAGES,
  SHIP_IMAGES,
  ISLAND_IMAGES,
  getRarityBadge,
  getRarityEmoji,
  getCardImage,
  getWeaponImage,
  getDevilFruitImage,
  getShipImage,
  getIslandImage,
};