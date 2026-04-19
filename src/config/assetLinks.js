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
  }
  //arlong_saw: {
    //M1: "",
    //M2: "",
    //M3: "",
  //},
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