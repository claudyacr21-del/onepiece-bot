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
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1498676197490688060/content.png?ex=69f20679&is=69f0b4f9&hm=e8878d06105c235a382e50820d489cc79cd11587550eb58dfaf965f88a5600f1&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1498676197960192061/content.png?ex=69f20679&is=69f0b4f9&hm=91b29d6b8094cf2220ca7a2b2000397e178ddb1e5bb840c364804c310548cbcf&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1498676198409109544/content.png?ex=69f20679&is=69f0b4f9&hm=05ed790dd3edb038329c46fe3d98a402c4aae9350c72307ed64a6de679f483df&",
  },
  bellamy_hyena: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1498685243912228984/content.png?ex=69f20ee6&is=69f0bd66&hm=f7000224c632d4b53fd85e01e816633f89d64f8759726e3a937af46e8941b741&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1498685244327460894/content.png?ex=69f20ee6&is=69f0bd66&hm=3177c95250893a518a6838f77a063497b57765eaae47d9d02e8f5441b26ceeab&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1498685244906410184/content.png?ex=69f20ee6&is=69f0bd66&hm=4e295b30c849fdb8b0af3fc6a7e78e4bf3bcde508682c428b60ae5682d960594&",
  },
  wyper_shandian_warrior: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1498687068585590824/content.png?ex=69f21099&is=69f0bf19&hm=8e5a66f9821578d17f611a2164ccb663018b72b4d37f72cfd7c1b59fcd955bc5&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1498687069197697136/content.png?ex=69f21099&is=69f0bf19&hm=ac99dbb3e5e5cce2996a3af196634047755fcecb54ecf3d7cc9f9adde9fd08cb&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1498687069566926970/content.png?ex=69f21099&is=69f0bf19&hm=ed75f603473fcb3c7e23f2901b21d09b28c6fb1f9b97a1d4a4ccf9f469a2f1aa&",
  },
  enel_god: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499014890830958723/content.png?ex=69f341e8&is=69f1f068&hm=0fde7c04bd36c37e9de0a00959c529033f6a83347ebcba2399b62f230aa6e2b5&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499014891133210705/content.png?ex=69f341e8&is=69f1f068&hm=29d634dab654cb582db31ada2865a9711ae6b25f19f2a2882d147e4574598e84&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499014891443585034/content.png?ex=69f341e8&is=69f1f068&hm=9967d0fd20d081041209305fb7c590678184ef4a66fcb72a5cb6bf4bb2b1050e&",
  },
  franky_cyborg: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499020033379008612/content.png?ex=69f346b2&is=69f1f532&hm=4aabe9a0806a851bfd7a385ff4d3e61f4f1f83ed6c2ce2f811975294e8e7b8a6&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499020033710493830/content.png?ex=69f346b2&is=69f1f532&hm=c9d12393c5c0a37ba9f6f9d9a2d4fee9cee07d7c614f629ef1070682dca5bb9b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499020034171863090/content.png?ex=69f346b2&is=69f1f532&hm=e3aa3b6ef1ffbcaad3ac1b7c595a0df1847afeabd679a8d893e79dbacac5d0a7&",
  },
  lucci_cp9: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499041802894971040/content.png?ex=69f35af8&is=69f20978&hm=cdfa618c8191e693f83b53e436312318c84a7fa2a2a8f33641aeb9672709922e&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499041803398283334/content.png?ex=69f35af8&is=69f20978&hm=6e4557d1de5385b1cb474705096a2a2dbd9736ad4dc7e2ebef4a3dafafa11101&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499041803763056681/content.png?ex=69f35af8&is=69f20978&hm=d42a549858bc0c11e7e98afe6414215d06a222cfa3b013de0f57456f7887cb01&",
  },
  kaku_cp9: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499299516988395621/content.png?ex=69f44afc&is=69f2f97c&hm=579ed45541ba271f852267cecbed9a6559464c3c7de55e072c0b504e547b49ac&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499299517881651260/content.png?ex=69f44afc&is=69f2f97c&hm=dcebaa36243cb1b349bd97838d0911394f54b8c91b00afa191b8302f7e88bf00&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499299518708187146/content.png?ex=69f44afc&is=69f2f97c&hm=be1f0e1c4fe741eaae0ec7b99a708953d84d1093a2efe5e5d2313df014d2a106&",
  },
  brook_soul_king: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499307326606151820/content.png?ex=69f45242&is=69f300c2&hm=cce049fd98c4e65cbc7180906106ab8c687523d411d1117138fc66184837bb2c&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499307327088492585/content.png?ex=69f45242&is=69f300c2&hm=3effc5669502d7b818f46ac8cc14afb18477175de0decb532c46ab1838d5919f&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499307327843733634/content.png?ex=69f45242&is=69f300c2&hm=bd5f556eda184d840eec11643b9bc534d56e46dc428a6d9669a1f111c84eb46a&",
  },
  gecko_moria: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499321141620117604/content.png?ex=69f45f20&is=69f30da0&hm=70c893c0089f2b3179ad4dbaac0983f89ec42d97a6f7fd7dd0ac0d766dce72f8&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499321141989478440/content.png?ex=69f45f20&is=69f30da0&hm=42f181b7da21be7bbee7cca2f1ad6d05deb50cf6697d30db057a7630cb10263c&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499321142328955012/content.png?ex=69f45f20&is=69f30da0&hm=7ec57c548066372bee451e058e1ab1389b417bd3116f8ba7484bd0320049f0e2&",
  },
  bartholomew_kuma: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499346233012125917/content.png?ex=69f4767e&is=69f324fe&hm=2ab205cc95fda03ca39d345bd936977f7ce2ea467920f81c70c79d349cdab6a6&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499346233637081208/content.png?ex=69f4767e&is=69f324fe&hm=c6fa31e991682d7041a0053d36e24094b2d5e4725f4cc82f3aace498ac3fbcae&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499346234165694525/content.png?ex=69f4767e&is=69f324fe&hm=7b75b72fcc0fb50d071790013c6396cea809323ac2c122cf11f1116bbbfd6ece&",
  },
  boa_hancock: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499361312726192302/content.png?ex=69f48489&is=69f33309&hm=69cddd8f7751b4a988e079866692e624d7db49ef63f22f7bfa919c05e812dda2&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499361313409859584/content.png?ex=69f48489&is=69f33309&hm=d99e075d51ea219a63c4cad7c5e474ec455cc38d5a86f738ad8ed6ed3e88c398&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499361314034679908/content.png?ex=69f4848a&is=69f3330a&hm=4f9b1344d03ff012ba72c0a811acc09cc0e3f12ae8b48df7d3dd4b21d6abd666&",
  },
  jinbe_first_son_of_the_sea: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499380080001159199/content.png?ex=69f53ec4&is=69f3ed44&hm=d7acf04881de80eef008f65fcced8e06a59413546ad0f20957455ee2dd8f4738&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499380080315600916/content.png?ex=69f53ec4&is=69f3ed44&hm=a512a81d366405ec68e64ea13149fd4dc9cd1c0dec7ce9519856c546f8e3e4c2&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499380080697147392/content.png?ex=69f53ec4&is=69f3ed44&hm=6f078d3d248be3b896d0bdb8663316e8487b08cf82966297a88c95542feb564f&",
  },
  ace_fire_fist: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499415227912032370/content.png?ex=69f55f80&is=69f40e00&hm=e915d0bba33987d771fbdb28609d77ef023dfe78eb539031e17988709a0768b6&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499415228448768133/content.png?ex=69f55f80&is=69f40e00&hm=bf2704c65265976118ee91eced8aa1dc4738ad96d619f52957e501fa14d001a9&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499415229065461851/content.png?ex=69f55f80&is=69f40e00&hm=28952b6966b13d3ca72686e2704df164ec5d9f5d246977ffc9eb988d56d77bd5&",
  },
  whitebeard_strongest_man: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499669312766476339/content.png?ex=69f5a362&is=69f451e2&hm=2937d6ffeab051631d9620ad106f885d0e9e004310f4dc6cce790fa404e6f71b&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499669313223921724/content.png?ex=69f5a362&is=69f451e2&hm=39b0d340a2409efa600fdf21c7019b0c4a83f9dd1b681a22028f83ca2cd707da&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499669313693679746/content.png?ex=69f5a362&is=69f451e2&hm=3b0e141ddc804f7cc493487649afb8912f2cb32e145f6e0140025bc8af6b944f&",
  },
  blackbeard_emperor_of_darkness: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499673550636847175/content.png?ex=69f5a755&is=69f455d5&hm=3f0a89901418819208e0bd73a1b99029115457dd06369488cdd10cafaf648816&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499673551450669116/content.png?ex=69f5a755&is=69f455d5&hm=9a596a0c4b2211b24a4f307846903e66f0f6ec1e4036c38c0952da388a237259&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499673552134209566/content.png?ex=69f5a755&is=69f455d5&hm=1f0c48ce7af42c8a3f6bcbea979147c9b2998f83d13cbcd0eccca5e29cb14c5a&",
  },
  garp_hero_of_the_marines: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499674943812796436/content.png?ex=69f5a8a1&is=69f45721&hm=a4b967be315fb293651201f4624fa750e7b4f6456be61cd68634a99ce0ea90b6&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499674944466845776/content.png?ex=69f5a8a1&is=69f45721&hm=6d6c5b44d872af9f68d2735467a5cf8e9dc068b324a0065d1e5f37a93e80232b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499674945058504804/content.png?ex=69f5a8a1&is=69f45721&hm=93784704b9d94895182b53efd7f5c63dac8399f9c8644f82e95ecd9c7e90d494&",
  },
  sengoku_buddha: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499678836714111076/content.png?ex=69f5ac41&is=69f45ac1&hm=9f2dac46e7cbc35bbaea88519d0915d00a80adb4389d43a1f9c9abdd6d6a4707&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499678837338931300/content.png?ex=69f5ac41&is=69f45ac1&hm=1de1aa45f2345046a15bd9b22af2eed6233a6cf1136e03251fece95e20ea3b2c&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499678838039511111/content.png?ex=69f5ac41&is=69f45ac1&hm=47a783c14409c37262daa38193fc83fbb3f94de467f76c0c8d92bb3de2847dbc&",
  },
  akainu: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499723588012474470/content.png?ex=69f5d5ee&is=69f4846e&hm=82c724fab50b739d6df0d2bee5cd30ace1dd15402e4f9172ad3d502087168021&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499723588557602876/content.png?ex=69f5d5ef&is=69f4846f&hm=341aba94118f40627ccadfc64cb89f48efb4399d5a20c0074486b8b08c977948&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499723589203529819/content.png?ex=69f5d5ef&is=69f4846f&hm=d6e7bffa19e51c2b25868755699a64a2f7159a22419702275cb50eaf06a18f24&",
  },
  aokiji: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499729047645716603/content.png?ex=69f5db04&is=69f48984&hm=00a6af44bafe0f21f8963a97a1b97d7fddb51c1da871772b73027adb434f8b76&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499729048287318147/content.png?ex=69f5db04&is=69f48984&hm=d6efe35484979c7839d85990a5589a95756bfb6fc13303b0f56632e51155a93c&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499729048769659003/content.png?ex=69f5db04&is=69f48984&hm=30ef650969e52070c4362632a9c92d2dc0eb76448bc229e94d7ce8891d15a2b7&",
  },
  kizaru: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499737837115801751/content.png?ex=69f5e334&is=69f491b4&hm=251812f447ea1f89cd66f193fccd46cf506f389c9c0d899b08e4dd07e4448278&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499737837623316510/content.png?ex=69f5e334&is=69f491b4&hm=6397eee13a9eaecdde7567b3b87ec81b7da066c275baae8c484fc7c1d17123d1&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499737838214840461/content.png?ex=69f5e334&is=69f491b4&hm=0f5144ee42e3dcf8cbdc3e3f0d65cfd4b2d1a267952e236280e0348c832996fb&",
  },
  shanks_red_hair: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499770679225225306/content.png?ex=69f601ca&is=69f4b04a&hm=cf0a77c3879be99a336f29fca12f13e2befa3ab93a7630b912eda02d07022e21&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499770679657234473/content.png?ex=69f601ca&is=69f4b04a&hm=4be422bd333505018da48de98d2dafff69a4efec87ce3976d0a5560724048243&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499770680214814811/content.png?ex=69f601ca&is=69f4b04a&hm=26833ef06230779618bcc2c92caa8fa112ce928a64f2dda745b3b2d95da067a5&",
  },
  mihawk_hawk_eyes: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499772856333242551/content.png?ex=69f603d1&is=69f4b251&hm=fd9510069d9c758dd646b5125f8f2fa0f790e64fe4f52012535a58bf74e531c1&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499772857058590841/content.png?ex=69f603d1&is=69f4b251&hm=7904bc11895a9737bc86d0072c3c2fad77969e2efc8e5b5a1a80d1e3a9937733&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499772857889067029/content.png?ex=69f603d1&is=69f4b251&hm=f7e8cada45bc13c7b810fedfbbaf351390a9eb644f50dcbde9a24b1deb302902&",
  },
  roger_king_of_the_pirates: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499986340232696019/content.png?ex=69f6caa3&is=69f57923&hm=196afc4d9bd2f4c0a43c73580c288577a0f41567eeb47134382767a2a117b6a4&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499986340673093794/content.png?ex=69f6caa4&is=69f57924&hm=da72e5cd851c7d4b3a42b4f071710c30f95555d2cced9edbb781812ff6ee428a&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499986341218222210/content.png?ex=69f6caa4&is=69f57924&hm=57ae0e7a929ca023972a437d821f6a6b74c3cfbcbb6a4b484e935035ff27a52c&",
  },
  xebec_captain_of_rocks: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1499993006000832583/content.png?ex=69f6d0d9&is=69f57f59&hm=d97e69d0d50b05fca9673ed559b523fddb9be8a9e4427833b128065ef2344520&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1499993006500216984/content.png?ex=69f6d0d9&is=69f57f59&hm=1ad72cb0ee28e8a28617de6934d5396dcdd2b89a4b460b22983d39a63cd4160b&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1499993007032631456/content.png?ex=69f6d0d9&is=69f57f59&hm=d1bc21224a0638619032d2ba41c6b2a08188497a082c957a2ad3f35d08f658bb&",
  },
  dragon_revolutionary_leader: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500007984976101519/content.png?ex=69f6decc&is=69f58d4c&hm=b3058086de688026add7cf6530498268e7790ecb0cd6736d73386ec56b62ea96&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500007985832005684/content.png?ex=69f6decc&is=69f58d4c&hm=11e70091e5517d3f04509f244f828bb2613f17ddf2ec9a413367cd60bb9dfc3e&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500007986339254413/content.png?ex=69f6decc&is=69f58d4c&hm=925ad99c4be4f3add6a6cc7bc3bc466cd76ef62a8c80714896887ac97e67f377&",
  },
  saturn: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500028884798804119/content.png?ex=69f6f243&is=69f5a0c3&hm=61d83c14a51e01410cf4c2f44bde7087889ff1a20148deb805156f705be80700&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500028885192937482/content.png?ex=69f6f243&is=69f5a0c3&hm=3574baab72d9c26d3d226734d9268b246024fddafd3a30c062e9d85988e62a59&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500028885616824390/content.png?ex=69f6f243&is=69f5a0c3&hm=c30bb1dc0243adbbb91d5a11c8acfa21727de3bfb93fa8dc65190f2de12b3a64&",
  },
  mars: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500033685443973225/content.png?ex=69f6f6bb&is=69f5a53b&hm=9c655738cfd5aae0ee3424f259f93cafa52ff36b9afd02ac155054027197d9e4&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500033686089891910/content.png?ex=69f6f6bc&is=69f5a53c&hm=6a4950ee5f4e313fb7c6119822e0583f3cb3854ac4502fe19fc5ed7619013433&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500033686538817686/content.png?ex=69f6f6bc&is=69f5a53c&hm=67a7239a2d856f7ff02793623cddca183895bb8923f29768d09f41bad34eaa45&",
  },
  warcury: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500036195688648856/content.png?ex=69f6f912&is=69f5a792&hm=655b7c1884d88a8e6f94420032b396b0fc09c4cbba7241b7b064dde28e1a59c6&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500036196171251853/content.png?ex=69f6f912&is=69f5a792&hm=d3c02f3e020713588f3b1419382d5f60f787fcb1fd0fd4a21aa1d4b92bc4151f&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500036196657659964/content.png?ex=69f6f912&is=69f5a792&hm=9cfb2b877274a98f8c702a9b5c0e58c4d58a02602f292e9a0bed60368fcd6b70&",
  },
  nusjuro: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500056126656483328/content.png?ex=69f70ba2&is=69f5ba22&hm=d3ffa3cab7446a6f9cc73d469e0c34ed80e1810be877ef38c03c1ed08869211c&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500056127092822066/content.png?ex=69f70ba2&is=69f5ba22&hm=96ca157a9cdf7f3dcf0014eaf3775a84248ada9af4d100b42d1080af91171f90&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500056127562322002/content.png?ex=69f70ba2&is=69f5ba22&hm=2fa9f36dbef2d8c47957168e6d8b93321adc38af98c50f073dd29bd9dd21e35f&",
  },
  ju_peter: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500054665365164133/content.png?ex=69f70a45&is=69f5b8c5&hm=92aa7c167e766e902229118d3bd136c719fc1a3ecde339c9b074418ce2ec09aa&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500054666225127576/content.png?ex=69f70a46&is=69f5b8c6&hm=554811c4420950e18c8f3506e6cdc2c29c1d0d4d28a6fba0ce1237a9777fb562&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500054666984030310/content.png?ex=69f70a46&is=69f5b8c6&hm=7c1a8233948eccdd58a15e799c4f9e18cb89a53076799432c22322a9ddb07121&",
  },
  imu: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500069275786936381/content.png?ex=69f717e1&is=69f5c661&hm=6d2569d03d5c3993c781399c8c87c01a3bb035e1f8dec14a3861f9dbf1bf5fd1&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500069276772729084/content.png?ex=69f717e1&is=69f5c661&hm=36398221886acbce889f76e5ef346936e90697a84d11b523470ac671185f17a3&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500069277200289872/content.png?ex=69f717e1&is=69f5c661&hm=7ec9d6b824e3c438b5b1c39260d2dce975d5a863fb61735720d46d96d36ff428&",
  },
  garling: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500075900107096198/content.png?ex=69f71e0c&is=69f5cc8c&hm=3c0a28ce956a62d4847d85de371e780d1c62e9c65726012efd6a9bda3d18240a&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500075900576862218/content.png?ex=69f71e0c&is=69f5cc8c&hm=dfcf8976c0326888e2f91c7bc4013b874c68fa17766bd883bab230a18fc41fc8&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500075901155545138/content.png?ex=69f71e0c&is=69f5cc8c&hm=2854ae8ceaefd7e72863c4f860e006c85312764ee102eef2b32052d400793b03&",
  },
  loki: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500082098248093827/content.png?ex=69f723d2&is=69f5d252&hm=9a6c90dfc955711fa04453a7d1f9630037f5f64c17b7a1bdea44eec46e85f6d0&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500082098654937261/content.png?ex=69f723d2&is=69f5d252&hm=4cc3b450bd039588498aa9c6aeff27c5893bee0ff1339fdd5d1e9fcf3259630e&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500082099154194535/content.png?ex=69f723d2&is=69f5d252&hm=c4c24bbdf64fbf88e446fc0130fd206e420cb4a84e516a24a988bc5bbd76ac9f&",
  },
  rayleigh_dark_king: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500086492406616276/content.png?ex=69f727ea&is=69f5d66a&hm=2b7e35f9d16c0d706cbf9506932586cd3ad73f5c10e44f3260db9d6db1311058&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500086492981366876/content.png?ex=69f727ea&is=69f5d66a&hm=9abba325238b76aa07259927d277408d75b2fef22a08c81e2c8ff32eab6eea62&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500086493522296832/content.png?ex=69f727ea&is=69f5d66a&hm=3ed37c6d66121dbeabeab3081592e48ae7fa74e9eda6a4167895f97bf716cbf5&",
  },
  oden: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500088873676705892/content.png?ex=69f72a21&is=69f5d8a1&hm=b6229e386583fe84dc97e8724d3ed7ebadcaa75972b735b0435b79352e80de52&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500088874112778300/content.png?ex=69f72a21&is=69f5d8a1&hm=8052cb4dcfcb7428fb8c77bf4aedd7a977550ed2bcc7a05c235006e65577912d&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500088874553049128/content.png?ex=69f72a21&is=69f5d8a1&hm=98ada4a9fa3d9d1d6def719dbdfabc7149ebd2f46439c76b817e02a3d1f3274e&",
  },
  perospero: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500101788009758750/content.png?ex=69f73628&is=69f5e4a8&hm=06ae54781085ed370843f14bd52542ac206a6b1122592b1483b92ebab965a7de&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500101788446228480/content.png?ex=69f73628&is=69f5e4a8&hm=30cbbda9f4e4808d67e3c03c2e3edacdb0eb663bfb938b0ba7a874bafdd62e2d&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500101788920057958/content.png?ex=69f73629&is=69f5e4a9&hm=782934584a2c77f69e5e51044007a79ca8dd5dfb5f314aebeda2014926ff7bf6&",
  },
  trebol_underworld_support: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500106585001955338/content.png?ex=69f73aa0&is=69f5e920&hm=6595f5da57ff8e9a13e8a10bbf80c5dc120cb6b0c7fc0b605fe3432f0b8ac9d5&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500106585001955338/content.png?ex=69f73aa0&is=69f5e920&hm=6595f5da57ff8e9a13e8a10bbf80c5dc120cb6b0c7fc0b605fe3432f0b8ac9d5&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500106586226688163/content.png?ex=69f73aa0&is=69f5e920&hm=da453fad7e849ff1f112e154338f88daddbf83c109a0669874aeed90cfc71aef&",
  },
  queen_the_plague: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500107708479832145/content.png?ex=69f73bac&is=69f5ea2c&hm=369fe0de731c8f3692b0c07605a8023b76b1327c8a72d45e2365258619a3b8e3&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500107709297594499/content.png?ex=69f73bac&is=69f5ea2c&hm=aa75fcb29e6fadd845f984fd144002bc4fb00e4872f264cd8e0b4f245d4df6e7&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500107709834330142/content.png?ex=69f73bac&is=69f5ea2c&hm=ef3fead0da5a10aa958e334dc102f0a77891530397db1aca6d8cb3f6b53fe64d&",
  },
  king_wildfire: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500110059106205696/content.png?ex=69f73ddc&is=69f5ec5c&hm=1135cd29aadbe7bc9d3b94eedb4190e031c6c9c2f49ed8967cd8d70108ff9278&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500110059764449330/content.png?ex=69f73ddc&is=69f5ec5c&hm=fb73ba72f2cb18ecfca422247f9ae5ecac396098ec404e7bb08758c86ab17f5f&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500110060309975180/content.png?ex=69f73ddd&is=69f5ec5d&hm=2f547b5c40f34b5b499914dc3deb0185ede7c674f651b9198534b8cd6612bafc&",
  },
  jack_the_drought: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500112408323297350/content.png?ex=69f7400c&is=69f5ee8c&hm=7ec92edb79ae0a872203ed8bc9528b0e29609e5b0e3c68a9d7ec784fdc8f7eb6&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500112408797249566/content.png?ex=69f7400c&is=69f5ee8c&hm=7ccfa724a1799dc290e9e5d26b4be2e18d6ffe9e017b4fc4557747fbde7ff0e5&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500112409401102347/content.png?ex=69f7400d&is=69f5ee8d&hm=ef456e2f7f3645f87c7a43aa872b7c96c1d6651d7372f168a56cd0fcfdb9d4f2&",
  },
  yamato_oni_princess: {
    M1: "https://cdn.discordapp.com/attachments/1493204525975076944/1500117273426264214/content.png?ex=69f74494&is=69f5f314&hm=927bacc20da1d1f27fb0f4ffd5be5c8b0dd03a769f83c1bc89e2e1fd79d8dcb6&",
    M2: "https://cdn.discordapp.com/attachments/1493204525975076944/1500117274361860187/content.png?ex=69f74495&is=69f5f315&hm=fe5ad980749140e1787f9c55b37d0e1a525e326771c45405ec0192776b80242a&",
    M3: "https://cdn.discordapp.com/attachments/1493204525975076944/1500117275121025244/content.png?ex=69f74495&is=69f5f315&hm=c55ae7b75c4449b80a03fcdfaef94d9cebd936ef8458a6479ecaf86a30fb8ab5&",
  },
  greenbull: {
    M1: "",
    M2: "",
    M3: "",
  },
  kaido_strongest_creature: {
    M1: "",
    M2: "",
    M3: "",
  },
  doflamingo_heavenly_demon: {
    M1: "",
    M2: "",
    M3: "",
  },
  sabo_flame_emperor: {
    M1: "",
    M2: "",
    M3: "",
  },
  fujitora: {
    M1: "",
    M2: "",
    M3: "",
  },
  katakuri_strongest_sweet_commander: {
    M1: "",
    M2: "",
    M3: "",
  },
  big_mom_emperor: {
    M1: "",
    M2: "",
    M3: "",
  },
  shiryu: {
    M1: "",
    M2: "",
    M3: "",
  },
  boa_seraphim: {
    M1: "",
    M2: "",
    M3: "",
  },
  mihawk_seraphim: {
    M1: "",
    M2: "",
    M3: "",
  },
};

const WEAPON_IMAGES = {
  ace: "",
  ame_no_habakiri: "",
  basic_iron_club: "",
  basic_marine_saber: "",
  basic_slingshot: "",
  basic_staff: "",
  battle_axe: "",
  bible: "",
  bisento: "",
  black_blade_replica: "",
  black_leg_combat_shoes: "",
  burn_bazooka: "",
  candy_cane: "",
  cannon_jaw: "",
  cat_claws: "",
  chemical_staff: "",
  dragon_claw_gloves: "",
  dual_daggers: "",
  eclipse: "",
  enma: "",
  fish_man_karate: "",
  fists: "",
  giant_fists: "",
  ragnir: "",
  golden_hook: "",
  golden_staff: "",
  general_franky_arsenal: "",
  gryphon: "",
  hypnosis_ring: "",
  ice_saber: "",
  imperial_blade: "",
  jitte: "",
  kanabo: "",
  kiribachi: "",
  laser_kicks: "",
  long_rifle: "",
  long_sword: "",
  magma_fist: "",
  mogura: "",
  napoleon: "",
  hassaikai: "",
  perfume_femur: "",
  plague_arsenal: "",
  raiu: "",
  rokushiki: "",
  rokushiki_blades: "",
  sacred_saber: "",
  sandai_kitetsu: "",
  scissors: "",
  shikomizue: "",
  shodai_kitetsu: "",
  silencer_handgun: "",
  six_swords: "",
  sky_lance: "",
  soul_solid: "",
  steel_blades: "",
  sticky_staff: "",
  tonfa: "",
  twin_blades: "",
  wado_ichimonji: "",
  wax_blade: "",
  wootz_steel_spear: "",
  yoru: "",
  trident: ""
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
  jiki_jiki_no_mi: "https://cdn.discordapp.com/attachments/1493204525975076944/1499048654135230564/content.png?ex=69f3615a&is=69f20fda&hm=4f7e8c0c8daaea4b15538024dcbe23b288d925011dd0d292a39ec498c7b9852a",
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