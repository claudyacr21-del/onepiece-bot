const RARITY_BADGES = {
  C: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237259963301898/badge_C.png?ex=69e1e064&is=69e08ee4&hm=a2b237507f8524f0edffb83bd19708e4775a48049e2e37445c231bb2abd56665&",
  B: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237259631693994/badge_B.png?ex=69e1e064&is=69e08ee4&hm=40df7e7b3dc2f96f6792015bbc60f8d54461ead429df60a7552140f5f5fd3131&",
  A: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237259346477067/badge_A.png?ex=69e1e064&is=69e08ee4&hm=019224c7ebd6fe08c9f67f2fe4e5261d2c0502f1389cb80a000943a587a48aa6&",
  S: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237260273418410/badge_S.png?ex=69e1e064&is=69e08ee4&hm=99c0019d884c4bcb6eee4defdac9b851f130ca487c95680f8c70afb85db36f58&",
  SS: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237260596383755/badge_SS.png?ex=69e1e064&is=69e08ee4&hm=4b1d718f4cc3bd3cca43ae5f5a1a41b18320d5a814662313778b859b5a71b7dd&",
  UR: "https://cdn.discordapp.com/attachments/1493204525975076944/1494237258910531736/badge_UR.png?ex=69e1e064&is=69e08ee4&hm=ff41f72431bcb6c2ea3acc190a98f536a491a11adbc11d9f6764ff79a0640a83&",
};

const CARD_IMAGES = {
  luffy_straw_hat: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495036251173163039/content.png?ex=69e4c882&is=69e37702&hm=3f3b0ef6742229335c7724d3d99e66d5a0a748b1fb66f4b8a7fc5866235dece9&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495036252196442213/content.png?ex=69e4c882&is=69e37702&hm=c0e041edc3b096c8965348b00430f66d157a210cea29ac7f88765356bd8317d0&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495036252729245706/content.png?ex=69e4c883&is=69e37703&hm=7d0cee4bacdfd726f63e6f08b8e626a948ff674a28a0e27f7b35b78950505672&",
  },
  zoro_pirate_hunter: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495039032336322750/content.png?ex=69e4cb19&is=69e37999&hm=eb41fbbc77d958badd3946c88e419d51b212ba4d3363044990b2148ff337f6b8&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495039033183834232/content.png?ex=69e4cb19&is=69e37999&hm=a58754950fb82325de4f16dd125e6af591ba6cd90a8392061fc8c15947618c4f&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495039034051919902/content.png?ex=69e4cb1a&is=69e3799a&hm=762f2844938e96b5b8abc10fb8efa2491e83bb216907208c14de16d9d4f361f7&",
  },
  nami_cat_burglar: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495041116511277086/content.png?ex=69e4cd0a&is=69e37b8a&hm=0abc7664cb9addde23f161ac8358c0664a49b7ce36306e72f89f4b086bb952da&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495041117002137781/content.png?ex=69e4cd0a&is=69e37b8a&hm=cbf0dab6e589d5f7aa7c97d37a42d0359773fcc2a697d540391ed494abc0771b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495041117496807455/content.png?ex=69e4cd0a&is=69e37b8a&hm=3920e4ecafb44b31a1181cb39e2a95afe8112e173f72baf12be879ebe0881826&",
  },
  usopp_sniper: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495044721549119548/content.png?ex=69e4d066&is=69e37ee6&hm=9972720dcce3d98e82ff41334ffe3e56e81c5230872fe0f500c7b2c08fed8f43&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495044721989652671/content.png?ex=69e4d066&is=69e37ee6&hm=b6b97ccd22bfd460643d7f2f51b27890bfca4523fcf8ee85fbbd665e3de833bd&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495044722454954075/content.png?ex=69e4d066&is=69e37ee6&hm=7adafe7267ec0fec2e8d54ba7e8a0707ffd59351587de408ab1c9f7c5ecfa7e1&",
  },
  sanji_black_leg: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495047379211128962/content.png?ex=69e4d2df&is=69e3815f&hm=5c1fc00c55ad3a01c3e6f202300392ae514c65ff9453795311e0f258613a37d3&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495047379819167886/content.png?ex=69e4d2df&is=69e3815f&hm=08aebca61e28ea4729417ceb07b6d2209f210d2611797f7d42c4eb68a5122a8a&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495047380326809682/content.png?ex=69e4d2e0&is=69e38160&hm=266bf4fa6c088e3fdf40665294dc283c3685c63f5dd4aacd8b839f24768a31ba&",
  },
  koby_aspiring_marine: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495052387163836496/content.png?ex=69e4d789&is=69e38609&hm=e0fa378c7fd0d4e6dc91eba399250cf0dd6eb87fa5c30dd8fc8eba16155775e1&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495052387709095976/content.png?ex=69e4d789&is=69e38609&hm=72080e34ac780d7f7ca122a637d1e496c9a7d34055aac41453bd99655e901d54&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495052388376252496/content.png?ex=69e4d78a&is=69e3860a&hm=246a2796f003acb32e82c4873079d6ff9748f4a8ee9e7e28528ec5b6205fd4b5&",
  },
  alvida_iron_club: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495054982238437518/content.png?ex=69e4d9f4&is=69e38874&hm=44131f044838842db018d3a74f1d354475b2a986c9bb16b0bd12206c1364c083&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495054983219908728/content.png?ex=69e4d9f4&is=69e38874&hm=c7012a327a7d7c16d15e297d4285a2b7069c48e9939b0547e4670d3a6cd5a57e&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495054983857704970/content.png?ex=69e4d9f4&is=69e38874&hm=d16119836e9549b15875826e9d53d408d2feb08c561222b9d5cbe70055ce8271&",
  },
  morgan_axe_hand: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495063651353104384/content.png?ex=69e4e207&is=69e39087&hm=9d821f6a4b8ab251d60e3834af8cbe4199b14f6ed7a072c1362fb78abea74bfa&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495063651927986226/content.png?ex=69e4e207&is=69e39087&hm=5ff824e300fcbea344853067ba1e737cebb30e24174d15406a9b1ed1c1b69b7c&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495063652359868527/content.png?ex=69e4e207&is=69e39087&hm=b1f3fa5f3e72340b904161f772c8b39c6fb830da9404a3fe0827164d24bc5ebc&",
  },
  helmeppo_spoiled_brat: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495255799319232642/content.png?ex=69e594fb&is=69e4437b&hm=fcb533b229b56604356f5d4aa8fefa2e45ee5327792b4563ab3c181875f10656&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495255799822418024/content.png?ex=69e594fb&is=69e4437b&hm=e6f92ac78af914811c6ddf5d06320bda07989c12be9c54645e3ec4f971d48ed9&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495255800380133447/content.png?ex=69e594fb&is=69e4437b&hm=133804471a6a62308ad1ec3b938d24923e57096036e75a72649c5975601b8f1b&",
  },
  buggy_the_clown: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495262922153398323/content.png?ex=69e59b9d&is=69e44a1d&hm=dcf85c00b2a8d4da07207ef61a178e0c6d23542175e8ee17c99efbc03266ca56&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495262923122151556/content.png?ex=69e59b9d&is=69e44a1d&hm=3c37b3a66638e7f1b4d695484d5796d8fd24c272fcf321903d3c9b2cf7c90621&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495262923860480150/content.png?ex=69e59b9d&is=69e44a1d&hm=12288f7bc6fa7b51466eea502bca683e537465fccf07172d91a24a0478a5cec2&",
  },
  kuro_hundred_plans: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495330139855130725/content.png?ex=69e5da37&is=69e488b7&hm=1b63833af263b4173039355a7afaf72c8204819451a5f6ee0d3aed89b5e31b9a&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495330140413231135/content.png?ex=69e5da37&is=69e488b7&hm=ebfce96292e552c3cac36adfbc7def2beb254458ceeef77898e1161284cfb8bb&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495330140857696417/content.png?ex=69e5da37&is=69e488b7&hm=b1a25092e4f82b9ace7d5982f8deefd701dd7ff37c241069f36797acf7011fdf&",
  },
  jango_hypnotist: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495356775598395432/content.png?ex=69e5f305&is=69e4a185&hm=79c5bc87bc1da76c615d3e6e895d659cef3e4d21873dfebe3c2b8e21b21ec4da&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495356776000913539/content.png?ex=69e5f305&is=69e4a185&hm=f04a01e4547906dde95696e2a8f0c45e857c760403b11be84e396b4e8f859f27&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495356776369881228/content.png?ex=69e5f305&is=69e4a185&hm=12b17bcf7f4989f151722cc3d8d760459e9b11cb2ab7dc1717c3eb7100607f59&",
  },
  don_krieg_admiral: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495366297754796194/content.png?ex=69e5fbe3&is=69e4aa63&hm=2cbe7845ff6aae389e2b138f562e190c938c05e54ae3ef020adcf9443eba2378&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495366298283282472/content.png?ex=69e5fbe4&is=69e4aa64&hm=d74358d81530080b88b53629c9573db55d2b941b86ec80bfd5dfb1bc65d19d38&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495366298841120768/content.png?ex=69e5fbe4&is=69e4aa64&hm=f7534198f8fa1d8c900429b23e47973c01294964537bf05bad4c70665e142a7a&",
  },
  gin_man_demon: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495382302476337262/content.png?ex=69e60acb&is=69e4b94b&hm=2059e4dd91ffce0830da4f377643ea6547e31b974835490e2ac6bdc029ef8c7e&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495382303218864178/content.png?ex=69e60acb&is=69e4b94b&hm=d60cfa713f0697406abcedda9d75264b947e1059c40f8bfc3cd097b5fa3db9b4&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495382303726108782/content.png?ex=69e60acc&is=69e4b94c&hm=12d9123b9df3ba90aa785c07671803a7a8e24cedca854521931655d8aabf9967",
  },
  arlong_saw: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495394849892073572/content.png?ex=69e6167b&is=69e4c4fb&hm=0b18612db1219bbebcbc0a1677b19dd5c4201588420ca60edbcbf45c6d37300b&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495394850676277288/content.png?ex=69e6167b&is=69e4c4fb&hm=bba0ac865a62f83cb103a63f6bfdcbd1b7cf85dd22972d5b5acbaada4110b5c3&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495394851389313197/content.png?ex=69e6167b&is=69e4c4fb&hm=5bfdce7c246050453093d15e4922a5e365a199fee61f357f41cad4bf1a2fd447&",
  },
  hatchan_six_sword_style: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495407104582877255/content.png?ex=69e621e5&is=69e4d065&hm=e01f09e10790b5205c2cf4e73fede45490a331bd2b6c84b33fdca564bd3e5a96&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495407105111494798/content.png?ex=69e621e5&is=69e4d065&hm=42e5d4da7aa7262dfa5249243bb64e9a5c0c6d4d4ea3f617f922d7d2f4fcdf9b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495407106235432980/content.png?ex=69e621e5&is=69e4d065&hm=335cf221bc845f7ce86c13c0cd81bfec7a29620610f5bac3f4856386cf02cee1&",
  },
  smoker_white_hunter: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495415320330895581/content.png?ex=69e6298b&is=69e4d80b&hm=7f2b0c187f8ebc9dcd7078a70c6da725b69027f75b308ebf5b15a5dabe5ce3af&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495415321186537652/content.png?ex=69e6298c&is=69e4d80c&hm=e8d0cb84005e1aaecc7bfc012e107cb5a1582a7d3cf5c6b843351ae8bfa51019&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495415321761288333/content.png?ex=69e6298c&is=69e4d80c&hm=5465142d1498f10e383b8d50e435e77dce76abb07465234ac2d56a7193ca6533&",
  },
  tashigi_swordswoman: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495636991667077282/content.png?ex=69e6f7fe&is=69e5a67e&hm=a20f8554b05df163ab19a38012e94c95394eaeee8068c08c9e826ff83e501ec6&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495636992690749601/content.png?ex=69e6f7fe&is=69e5a67e&hm=ddbc4e5d5d2e257109ac75868b5fe3e14a377fea5af2009778189d136403ba9a&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495636993567228054/content.png?ex=69e6f7fe&is=69e5a67e&hm=b7624df4ce836bb25f7d3984d40b84372ee22dc6f89c27150802fcf3dd67e810&",
  },
  chopper_cotton_candy_lover: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495661497412485151/content.png?ex=69e70ed1&is=69e5bd51&hm=27f52c1da9cb19f3467cd1440b84ad51afa52db2ff3b09df479318c5963f652b&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495661497999691847/content.png?ex=69e70ed1&is=69e5bd51&hm=c362c8ff3b791dcb8873d7601838583e424b7cb330deb1e7ff5ab86ca8014ab2&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495661498419384320/content.png?ex=69e70ed1&is=69e5bd51&hm=0fb7732c225cff73b4a52ef62ceef26679b3c5ec3362efab210663b5cee628f5&",
  },
  kaya_medical_patron: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495708425928314930/content.png?ex=69e73a85&is=69e5e905&hm=6a3aab77116500db764edb899a463e42bdd0d456a44e3dab6b1519cfa51e0527&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495708426804662304/content.png?ex=69e73a85&is=69e5e905&hm=1c9b5e9a92b8cf9212a4f956e61ac0fdde6f9ebbd01be221ec489e47b5530e1b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495708427421483029/content.png?ex=69e73a86&is=69e5e906&hm=cf4c0398657e4393e1f8096e03df660f1d521e124c7987751d9c68ec822def5a&",
  },
  bepo_navigator_support: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495720036067836104/content.png?ex=69e74555&is=69e5f3d5&hm=d139a6d512b974be235271f2b4d514b95eab98eb285ac9bfac1683894e0a54a8&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495720036759769228/content.png?ex=69e74555&is=69e5f3d5&hm=6ed0c6416d9ba5d96b9a45ce72ae8221d516a7125c9ba815a3ecf4a0c63f3ff4&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495720037485645895/content.png?ex=69e74556&is=69e5f3d6&hm=b8ed30d580bb325245a8595321821577b4b89611e290d9df3ce57d03da55b7a2&",
  },
  killer_massacre_soldier: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495728240852074496/content.png?ex=69e74cf9&is=69e5fb79&hm=d1d7b7a2f3e3c7bf24af9871c2e251484a359991df3e7300ddd17cd51b4ce38f&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495728241284219060/content.png?ex=69e74cfa&is=69e5fb7a&hm=70ce47a054ee473ed07cbe85b9acd232460e9a9a691142a582d967394e2cbaf4&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495728241879814174/content.png?ex=69e74cfa&is=69e5fb7a&hm=c25f1433e04759b927d97674a680c20a7db2d266ec34e1e5714dc042367bf370&",
  },
  marco_phoenix: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495743039350636594/content.png?ex=69e75ac2&is=69e60942&hm=a918a747dee9b7afdb3beb249d8b7b0eeb5d9978952f35f47172f40c40b0cca3&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495743039820402698/content.png?ex=69e75ac2&is=69e60942&hm=0eeebbda722a6b931d69e161fbd826cf01581780e0cd9233408907d5f3d9c23e&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495743040285835304/content.png?ex=69e75ac2&is=69e60942&hm=cdf4075336e32ac40c00dc38ee3069f512f830375246c3db394bb5c73d4340e1&",
  },
  ben_beckman: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1495992076406489230/content.png?ex=69e842b1&is=69e6f131&hm=3320015299579a4eab0c2fd1d1659cd64a9225a08861b04cd125fe63403152ac&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1495992077429903400/content.png?ex=69e842b1&is=69e6f131&hm=70d6509752eda945398de5f691aa66d09fa0ed3e9295a59a5c74f72e0af9f7ff&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1495992077870170132/content.png?ex=69e842b1&is=69e6f131&hm=0c7015fff8222903b47420b1572dd40f8dabccf1715f813dc15a7394f4784764&",
  },
  charlotte_pudding: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1496002509523914843/content.png?ex=69e84c68&is=69e6fae8&hm=55f274475f5d293acfe618cb021e33aee6baf95f96306196f4b33c6f77f38600&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1496002510056587364/content.png?ex=69e84c68&is=69e6fae8&hm=98b641fdce56ba29c805145f14f7e6fe02f4837d95887336e4573331803bf4bf&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1496023247857258547/content.png?ex=69e85fb9&is=69e70e39&hm=3004fe5047bbdbce1e0a2992d29b50cef6aef2752146db086e2f0e18d67ee3ae",
  },
  mansherry_healing_princess: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1496019374883082311/content.png?ex=69e85c1d&is=69e70a9d&hm=90c12ba613c215381dc24d88099f3153a1f34dde5010b945dd48090d8f1a72b3&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1496019375281537095/content.png?ex=69e85c1d&is=69e70a9d&hm=ecfccf72ef4fb8ccb755501707342e0e30ff6a487dce82cfc23c63b0d256eddd&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1496019375722074203/content.png?ex=69e85c1d&is=69e70a9d&hm=d72de1443765ff2b1d199a160d139f4a85af9c66b3ac71b453bbcffd10ec21ef&",
  },
  vegapunk_stella: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1496036387558920242/content.png?ex=69e86bf5&is=69e71a75&hm=1d06fc9d41f82280c7fda54d3e776c0197efa2a3491f12af08d0370b658a6035&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1496036388015964221/content.png?ex=69e86bf5&is=69e71a75&hm=55772fc537c79cbbe710bed871e9adb2ced5965228ef48bb1d6f2818bbd8ffc2&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1496036388557160448/content.png?ex=69e86bf6&is=69e71a76&hm=808f33e8831f3eb65b6b2ad74cb76f4fd6ed3eff55181d8a7c9018731c2d5ae9&",
  },
  lindbergh_revolutionary_genius: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1496052868766236692/content.png?ex=69e87b4f&is=69e729cf&hm=a3a1fb9624adf496c43afac03a5e6a8157f327d30b58d43db8c66ab5c21679d6&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1496052869231546428/content.png?ex=69e87b4f&is=69e729cf&hm=f301200324fa00a4026af052805e7e6b7c1cb26ce252e2b978519a539305829f&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1496052869672210442/content.png?ex=69e87b4f&is=69e729cf&hm=6a451bdb03cff00fa9aacf048ef026bdb8ab59245dfe1151734d9f07a2406b4e&",
  },
  doc_q_sickly_support: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1496769333375012904/content.png?ex=69eb1691&is=69e9c511&hm=5f2f20ea3db06675c4abfdd3aef3b9eea53046dfacea7c6fa6250d60bd3b92bf&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1496769333844770916/content.png?ex=69eb1691&is=69e9c511&hm=601a2837929267aef78f02d47102450e40113d6f62e21870a1cdff240de5e6ce&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1496769334360539236/content.png?ex=69eb1691&is=69e9c511&hm=6951a5b67ec98dda249b934a079d056befc628c91f3d28b54dd5a624b7f7f239&",
  },
  shirahoshi_sea_princess: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1496776917150335115/content.png?ex=69eb1da1&is=69e9cc21&hm=78f7096d3c43cb6feb554266f5e13f1df42ecd4e1b61ab76cc1b00a38d0a8b29&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1496776917762965604/content.png?ex=69eb1da1&is=69e9cc21&hm=bb73c81d70767adb82bd89cc36cbad910ea6ed01f76259d02d9c91c901de5cbd&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1496776918211760148/content.png?ex=69eb1da2&is=69e9cc22&hm=652b757d9e853a8f003c9fce8bd9a02fbb4889a945f60bbef1dbe5a5ed8bdd80&",
  },
  hiyori_festival_support: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1496801265202630706/content.png?ex=69eb344e&is=69e9e2ce&hm=546214afd5b30de8567f216be1a0649c8d3814e1fe8126e64f5219f0f76a19c2&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1496801265890492496/content.png?ex=69eb344f&is=69e9e2cf&hm=8e877e4cc8edd5811bba14e0128fc3995487afcdb657b63dd84d5076f2e17815&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1496801266456596551/content.png?ex=69eb344f&is=69e9e2cf&hm=abb4a6de36105ce56c25611306fbf190d9b3f8cfb2ab2520d0d38f2a7177a3f9&",
  },
  carina_treasure_hunter: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1496816391913996419/content.png?ex=69eb4265&is=69e9f0e5&hm=3a0a3795f9665a0578ca1f7bee09023f2bf4c9958cf50cf1bc35ab06a469effd&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1496816392647868426/content.png?ex=69eb4265&is=69e9f0e5&hm=85a816a221e46f54706518a45812c50b7b3906f6380d103bcecdd70aeac1aba5&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1496816393096794112/content.png?ex=69eb4265&is=69e9f0e5&hm=2ec3c862f43353892e7cc3b415b701c5932681cc6390b16ad48d801b0c716160&",
  },
  kalifa_cp9_support: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1496835523312877640/content.png?ex=69eb5436&is=69ea02b6&hm=5f95cdaa6704d9dc78e9cc0d862430668e51d6f20418cb74eca084749a9bb9a6&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1496835523761934446/content.png?ex=69eb5436&is=69ea02b6&hm=fe879947c68d32cadec8b3fa7aaa89f5799374e7c1701a49a6d26c268f0f95b5&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1496835524248207430/content.png?ex=69eb5436&is=69ea02b6&hm=242c03ca1f912e81ed6d97e5ff15ec33f36f7dc8cee542dac391fa268a75ad77&",
  },
  baccarat_lucky_draw: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1496840437733003284/content.png?ex=69eb58ca&is=69ea074a&hm=380518e59e099397ab499f3af4234aee5f386927151229aa3e209387d6988fef&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1496840438341046422/content.png?ex=69eb58ca&is=69ea074a&hm=eb928c4ca45f94c547311564c0c5de210542000d4cb5b8c1129d9c47c3df893c&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1496840438949085276/content.png?ex=69eb58ca&is=69ea074a&hm=40553250d87f4bf30885afb69291cb0c3caa9dd81743d0e34b9d06cea930b842&",
  },
  perona_ghost_princess: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1496849284069457980/content.png?ex=69eb6107&is=69ea0f87&hm=db1d3c4dbf4a8ecff8687d2ea0e8cd7c83877be1e0a02fb057ceb1b1511f90ac&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1496849284711321722/content.png?ex=69eb6107&is=69ea0f87&hm=374625e0ac8754864daf879199e4ed2c95ab8bf48b3db8153d0605bd345f3de9&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1496849285512429739/content.png?ex=69eb6107&is=69ea0f87&hm=1b1ec317eaeaeb54ca65516227273a3270bdf2ce5a9a6a3f62496b6aa8dd00c8&",
  },
  tsuru_tactical_support: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1496855095604940880/content.png?ex=69eb6671&is=69ea14f1&hm=7c67e2d58a973d7f495028aaa028c9bcab16cf1a9d5cbc3ba053267b45fc323b&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1496855096179294288/content.png?ex=69eb6671&is=69ea14f1&hm=f16d540ffc1e63237835be9c5f59b5e284f89d0d2e0fc190ce33f0aba6cd13d3&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1496855096926142537/content.png?ex=69eb6671&is=69ea14f1&hm=ba19330c6108db4aa558122ce560c782da9cd035823deb4b6a12cddff9a65ae3&",
  },
  reiju_poison_pink: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1496863181245517924/content.png?ex=69eb6df8&is=69ea1c78&hm=a2ea5da47068668e4d34b6d81fe16989c164a90c2961943bcee84397876b4843&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1496863181967200417/content.png?ex=69eb6df8&is=69ea1c78&hm=33f4fb91c9a11a46c2ee76c16ecffcec2903529e7a1657ce4d6a7bdc1f9974e7&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1496863182688489542/content.png?ex=69eb6df9&is=69ea1c79&hm=ef91622575b049bc20f031719508abc6d1529a4e019e3a43332fa7ee6153e613&",
  },
  otama_kibi_support: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1496867133253226516/content.png?ex=69eb71a7&is=69ea2027&hm=e248db44ff4a5022628a21f37d3f91c91145a8085b65591f349a71f3a48bf010&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1496867133748150463/content.png?ex=69eb71a7&is=69ea2027&hm=47fe0da31d07d9e6c53b220e640c16eaf49bec09b86774e354ea8886b2d0b504&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1496867134343614704/content.png?ex=69eb71a7&is=69ea2027&hm=10d488769d9d82a6c047347ecd33a81a3e8a90b7e303876eb55ff85371ef348d&",
  },
  iceburg: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1496879550855123066/content.png?ex=69eb7d37&is=69ea2bb7&hm=ca8515600850cecc3a31754ed011caa5dafb899fca236909a506a09f3ce10023&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1496879551320686652/content.png?ex=69eb7d37&is=69ea2bb7&hm=170644815546030cc8db9b8af49449d69c823956f12f638ce9463ab603cf846b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1496879551731597492/content.png?ex=69eb7d37&is=69ea2bb7&hm=1c10f01167d2d4989a22692eacafeaac6e376bd692c92e718ffb7b9eb3f6b639&",
  },
  laboon: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497102730919936051/content.png?ex=69ec4d11&is=69eafb91&hm=3f1a7b9813767820ee12b58567a6f2b588027a1a14142c35d60c9982e1d0a246&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497102731435839540/content.png?ex=69ec4d11&is=69eafb91&hm=f39492606fedf0f15f30508f9313bffd1fdf6ea2470720a8e22b409482440d64&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497102731897344010/content.png?ex=69ec4d12&is=69eafb92&hm=f56a41fbda426002462a8ad34dc253baee55c02198e392a35f697e2f5249712e&",
  },
  sniper_focus: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497111980069093476/content.png?ex=69ec55af&is=69eb042f&hm=f98e6dec24ddeaf77ed523b32db7729df95b13b2fa7c59eba0ac742d0208ff6b&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497111980589449276/content.png?ex=69ec55af&is=69eb042f&hm=154b29333b6bb5134b675692cef1e7bc18864fdec34f601ef475cd5bfd7e3688&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497111981243502683/content.png?ex=69ec55af&is=69eb042f&hm=d733fe2a0a804abd5b88295732e01a00ce47738c52459f9238ca918eb2491e4d&",
  },
  weather_science: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497125308317302895/content.png?ex=69ec6218&is=69eb1098&hm=2dfce6f34a854a347e4962d5e61bcd2e668dcdc028186f68548523e0fb17a8c7&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497125308736864276/content.png?ex=69ec6218&is=69eb1098&hm=d37570ab639f5feab8a04d5590b0615120ee855895f4dc2800e9879b0a0e3b29&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497125309169008652/content.png?ex=69ec6218&is=69eb1098&hm=c34d982607c3480e6b15bb28d573c7068e820db79eabc35dcef5c0466ac08812&",
  },
  wado_ichimonji_spirit: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497128448664014898/content.png?ex=69ec6505&is=69eb1385&hm=91155bea42fb601c6735bf142ed5c61391196d7f0244bb5c84d583385dd30f41&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497128449121321061/content.png?ex=69ec6505&is=69eb1385&hm=bc334d0963b0f185c32ea79b38e48623017b0206ca7bafcff9939fc66ee93aa0&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497128450031489094/content.png?ex=69ec6505&is=69eb1385&hm=46384e0c9ca745a3c98729eb2be15f1b5469bf23b7caf5a56b028ed99077b5ea&",
  },
  suna_suna_core: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497164569812930590/content.png?ex=69ec86a9&is=69eb3529&hm=401ac1179387e0d1da383164a7b79cb6a62d039c56eedaeca99535beba284623&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497164570299727912/content.png?ex=69ec86a9&is=69eb3529&hm=407d2951c60cfbd7da094dfb2446343bb252118bb09a4778b4bcafb67596d753&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497164570844991528/content.png?ex=69ec86a9&is=69eb3529&hm=5ab89d65741079b2f38b44c5cb6b708ae088ee6bb705c97a8125816fcf6a43fc&",
  },
  ohara_will: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497175059935133756/content.png?ex=69ec906e&is=69eb3eee&hm=47f2ed28b8a44ac8dc66dc33492cd12f00a85a46f1cd50c7db40b3a8bce2e6b4&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497175060543443014/content.png?ex=69ec906e&is=69eb3eee&hm=6cf9ce859e50c30f6efd5f43f59db52490f6d57abdcf2f8d9b687e9bbe39a956&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497175061277311036/content.png?ex=69ec906e&is=69eb3eee&hm=dfbddc3f2652f45f9c94c87837604fcb1c783247106bc53258eb9b838920c31d&",
  },
  goro_goro_core: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1497180360897859744/content.png?ex=69ee8f9e&is=69ed3e1e&hm=cecf68ad8da7820174c99cbf6f51936b6747b758fe3398e5889c0ce2edc19a23&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1497180361531064463/content.png?ex=69ee8f9e&is=69ed3e1e&hm=5ed963a70e8a2ff875551eebbc11ed2312ab3a8e80f103450ad4f55368711f22&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1497180362105684069/content.png?ex=69ee8f9e&is=69ed3e1e&hm=700ae574b6bc2bdfe2c7ca8b8bf7c9b564d99e72bb2d20e7ea99d098751a0bb2&",
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
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1498640798416375940/content.png?ex=69f1e581&is=69f09401&hm=a83a0efbd1b10109919f5cc27d7aafc4893060d1552421c412f885ef51434ce9&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1498640798961373286/content.png?ex=69f1e581&is=69f09401&hm=52a22c8197da147ddfa65ce4a216619f9f5c4e77758b17da5f8b116a9cf55f72&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1498640799456559184/content.png?ex=69f1e581&is=69f09401&hm=2b5924b8535368b37780383bffd7b2d4fab433c99be03c355591906ccad66082&",
  },
  nico_robin_devil_child: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1498650772177424636/content.png?ex=69f1eecb&is=69f09d4b&hm=9cc577a6e696fed76935315cc61e25b3267087ba384637ad461e86b29582ff6a&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1498650772978794728/content.png?ex=69f1eecb&is=69f09d4b&hm=18f91e4a2dfb50942281657a8badb613c3c9386732f3c456ff71f350038d8d66&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1498650773704278117/content.png?ex=69f1eecc&is=69f09d4c&hm=e66f46b7ab65319c3df7b8062241a939a300ed0d0f855ef74d74592168ad9d30&",
  },
  daz_bonez: {
    M1: "",
    M2: "",
    M3: "",
  },
  bellamy_hyena: {
    M1: "",
    M2: "",
    M3: "",
  },
  wyper_shandian_warrior: {
    M1: "",
    M2: "",
    M3: "",
  },
  enel_god: {
    M1: "",
    M2: "",
    M3: "",
  },
};

const WEAPON_IMAGES = {
  // enma: "https://...",
  // yoru: "https://...",
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
  hito_hito_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1494942550577119242/Hito_Hito_no_Mi.png?ex=69e4713e&is=69e31fbe&hm=b046201916f0e33fb6018e39a1a3575203a0cadd098dda340a5044e82028481d&",
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
  elbaf: "https://cdn.discordapp.com/attachments/1493204525975076944/1494258779473055904/Elbaf.png?ex=69e1f46f&is=69e0a2ef&hm=9db91589de83402921f4cf786362b69a346aa82a6f7eaf1074bb79d8573131cc&",
};

function getRarityBadge(rarity) {
  return RARITY_BADGES[String(rarity || "").toUpperCase()] || "";
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
  CARD_IMAGES,
  WEAPON_IMAGES,
  DEVIL_FRUIT_IMAGES,
  SHIP_IMAGES,
  ISLAND_IMAGES,
  getRarityBadge,
  getCardImage,
  getWeaponImage,
  getDevilFruitImage,
  getShipImage,
  getIslandImage,
};