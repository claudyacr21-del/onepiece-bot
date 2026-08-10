const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const { getPlayer } = require("../playerStore");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { getPirateFragmentStorageBonus } = require("../utils/pirateBoosts");
const cardsData = require("../data/cards");
const weaponsData = require("../data/weapons");
const { lw } = require("../config/raidBossImages");
const PAGE_SIZE = 8;
const COLOR = 0x8e44ad;
const BASE_FRAGMENT_STORAGE = 200;
const MAX_FRAGMENT_STORAGE = 5000;
const VALID_RARITIES = new Set(["C", "B", "A", "S", "SS", "UR"]);
const FRAGMENT_EMOJIS = {
  luffy_straw_hat: "<:luffy_f:1530195021834490036>",
  zoro_pirate_hunter: "<:zoro_f:1529865240261562569>",
  nami_cat_burglar: "<:nami_f:1530158045022261339>",
  usopp_sniper: "<:usopp_f:1530158064328769667>",
  sanji_black_leg: "<:sanji_f:1530158071232462908>",
  koby_aspiring_marine: "<:koby_f:1530158076488061019>",
  alvida_iron_club: "<:alvida_f:1530157995110170727>",
  morgan_axe_hand: "<:morgan_f:1530158001263083520>",
  helmeppo_spoiled_brat: "<:helmeppo_f:1530158007357542601>",
  buggy_the_clown: "<:buggy_f:1530158012579450920>",
  kuro_hundred_plans: "<:kuro_f:1530158018606399599>",
  jango_hypnotist: "<:jango_f:1530158023727775854>",
  don_krieg_admiral: "<:donkrieg_f:1530158029431902248>",
  gin_man_demon: "<:gin_f:1530158032770564167>",
  arlong_saw: "<:arlong_f:1530158040832016405>",
  hatchan_six_sword_style: "<:hatchan_f:1530159476542279811>",
  smoker_white_hunter: "<:smoker_f:1530159483110817962>",
  tashigi_swordswoman: "<:tashigi_f:1530159491318808616>",
  chopper_cotton_candy_lover: "<:chopper_f:1530159503927017653>",
  kaya_medical_patron: "<:kaya_f:1530159510042316841>",
  bepo_navigator_support: "<:bepo_f:1530159516216197168>",
  killer_massacre_soldier: "<:killer_f:1530159521518059641>",
  marco_phoenix: "<:marco_f:1530159527305941052>",
  ben_beckman: "<:ben_f:1530159534260355162>",
  charlotte_pudding: "<:pudding_f:1530195010304213042>",
  mansherry_healing_princess: "<:mansherry_f:1530195007015878777>",
  vegapunk_stella: "<:vegapunk_f:1530195016323043338>",
  lindbergh_revolutionary_genius: "<:lindbergh_f:1530234918670569572>",
  doc_q_sickly_support: "<:docq_f:1530234845299474492>",
  shirahoshi_sea_princess: "<:shirahoshi_f:1530234851137949767>",
  hiyori_festival_support: "<:hiyori_f:1530234858302079026>",
  carina_treasure_hunter: "<:carina_f:1530234913863897259>",
  kalifa_cp9_support: "<:kalifa_f:1530234865180610611>",
  baccarat_lucky_draw: "<:baccarat_f:1530234879764205809>",
  perona_ghost_princess: "<:perona_f:1530234885652873367>",
  tsuru_tactical_support: "<:tsuru_f:1530234892162433066>",
  reiju_poison_pink: "<:reiju_f:1530234839028989972>",
  otama_kibi_support: "<:otama_f:1530234895975055472>",
  iceburg: "<:iceburg_f:1530234902707179762>",
  laboon: "<:laboon_f:1530234907966701770>",
  sniper_focus: "<:sniper_f:1530485746698551337>",
  weather_science: "<:weather_f:1530488063661179010>",
  wado_ichimonji_spirit: "<:wadospi_f:1530485838104891452>",
  suna_suna_core: "<:sunacore_f:1530485698593951745>",
  ohara_will: "<:oharawill_f:1530485731510849689>",
  goro_goro_core: "<:gorocore_f:1530485678469677129>",
  cola_engine: "<:cola_f:1530484389270519900>",
  rokushiki_manual: "<:rokushikim_f:1530484383486578748>",
  soul_solid: "<:solid_f:1530485693099278468>",
  shadow_core: "<:shadowcore_f:1530485741459603566>",
  kuja_haki: "<:kuja_f:1530818764059312269>",
  fishman_karate_scroll: "<:fishmanb_f:1530485851568734228>",
  mera_mera_will: "<:merawill_f:1530818800507682856>",
  gura_gura_will: "<:gurawill_f:1530818811887095858>",
  fist_of_love: "<:fishoflove_f:1530485715203395654>",
  golden_buddha_mandate: "<:buddham_f:1530818818270564453>",
  magma_core: "<:magmacore_f:1530485813433991340>",
  ice_core: "<:icecore_f:1530485681636249701>",
  light_core: "<:lightcore_f:1530485790470176779>",
  darkness_core: "<:darknesscore_f:1530818797571801098>",
  ope_ope_notes: "<:openote_f:1530485753044402299>",
  magnet_core: "<:magnetcore_f:1530485686363492362>",
  ito_ito_awakening: "<:itoaw_f:1530485843280793734>",
  future_sight: "<:futuresi_f:1530485766407454720>",
  soru_soru_soul: "<:sorusoul_f:1530485760937955358>",
  lunarian_flame: "<:lunarianflame_f:1530485778126209238>",
  plague_tech: "<:plaguetech_f:1530485734979407973>",
  beast_core: "<:beastcore_f:1530485879842406570>",
  oni_lineage: "<:oni_f:1530818805624864948>",
  forest_core: "<:forestcore_f:1530908919415836804>",
  nika_drums: "<:nikadrums_f:1530908926974099616>",
  supreme_haki: "<:supreme_f:1530818773723119656>",
  black_blade_yoru: "<:yoru_f:1530485833117728778>",
  chaos_core: "<:chaoscore_f:1530818769272701070>",
  storm_mandate: "<:storm_f:1530908943516176444>",
  empty_throne_edict: "<:empty_f:1530908948222443610>",
  holy_knight_sigil: "<:knightsi_f:1530908953243025488>",
  giant_curse: "<:giantcurse_f:1530818792039383252>",
  samurai_spirit: "<:samurai_f:1530818778752094310>",
  crocodile_desert_king: "<:crocodile_f:1530524948173553725>",
  nico_robin_devil_child: "<:robin_f:1530158051284357150>",
  daz_bonez: "<:bonez_f:1530524939507990680>",
  bellamy_hyena: "<:bellamy_f:1530524862479863970>",
  wyper_shandian_warrior: "<:wyper_f:1530524926891790356>",
  enel_god: "<:enel_f:1530524889604423740>",
  franky_cyborg: "<:franky_f:1530158058213474364>",
  lucci_cp9: "<:lucci_f:1530524919085928448>",
  kaku_cp9: "<:kaku_f:1530524905391657040>",
  brook_soul_king: "<:brook_f:1530524876899745792>",
  gecko_moria: "<:gecko_f:1530524895727980684>",
  bartholomew_kuma: "<:kuma_f:1530524911804743771>",
  boa_hancock: "<:boa_f:1530524869836542115>",
  jinbe_first_son_of_the_sea: "<:jinbe_f:1529840552332492975>",
  ace_fire_fist: "<:ace_f:1529840565024329920>",
  whitebeard_strongest_man: "<:whitebeard_f:1529840528584216616>",
  blackbeard_emperor_of_darkness: "<:teach_f:1529840558569160846>",
  garp_hero_of_the_marines: "<:garp_f:1529840576110006333>",
  sengoku_buddha: "<:sengoku_f:1530526572434559046>",
  akainu: "<:akainu_f:1529840534506438887>",
  aokiji: "<:kuzan_f:1529840545931726923>",
  kizaru: "<:kizaru_f:1530526541329469450>",
  shanks_red_hair: "<:shanks_f:1529840524603953304>",
  mihawk_hawk_eyes: "<:mihawk_f:1529840521533460610>",
  roger_king_of_the_pirates: "<:roger_f:1529865223232552980>",
  xebec_captain_of_rocks: "<:xebec_f:1529865254253625685>",
  dragon_revolutionary_leader: "<:dragon_f:1530526493749280808>",
  saturn: "<:saturn_f:1529865227297095741>",
  mars: "<:mars_f:1529865204173766866>",
  warcury: "<:warcury_f:1529865233793945743>",
  nusjuro: "<:nusjuro_f:1529865210989383863>",
  ju_peter: "<:jupeter_f:1530526524581613649>",
  imu: "<:imu_f:1529865198804926554>",
  garling: "<:garling_f:1530526502184026232>",
  loki: "<:loki_f:1529865247115055216>",
  rayleigh_dark_king: "<:rayleigh_f:1530526564788342865>",
  oden: "<:oden_f:1529865216400162826>",
  perospero: "<:perospero_f:1530526550347485314>",
  trebol_underworld_support: "<:trebol_f:1530526582165340300>",
  queen_the_plague: "<:queen_f:1530526558220189867>",
  king_wildfire: "<:king_f:1530526532362305576>",
  jack_the_drought: "<:jack_f:1530526516339802284>",
  yamato_oni_princess: "<:yamato_f:1530526468076081162>",
  greenbull: "<:greenbull_f:1530526509767327784>",
  kaido_strongest_creature: "<:kaido_f:1529840581784768663>",
  doflamingo_heavenly_demon: "<:doflamingo_f:1530524831119052921>",
  sabo_flame_emperor: "<:sabo_f:1529840540609286385>",
  fujitora: "<:issho_f:1530524840207843328>",
  katakuri_strongest_sweet_commander: "<:katakuri_f:1530524852912656414>",
  big_mom_emperor: "<:linlin_f:1529840569981866084>",
  shiryu: "<:shiryu_f:1530526482118479902>",
  boa_seraphim: "<:snake_f:1530526489278156940>",
  mihawk_seraphim: "<:hawk_f:1530526476083007529>",
  germa_lineage_factor: "<:germa_f:1530485865548222504>",
  gravity_sheath: "<:gravity_f:1530485858329956495>",
  holy_knight_standard: "<:holyknights_f:1530908957856633056>",
  revolutionary_banner: "<:banner_f:1530908960838647838>",
  revolutionary_oath: "<:oath_f:1530485872682602578>",
  donquixote_family: "<:donfamily_f:1530485673365082203>",
  beast_pirates_terror: "<:beastpirate_f:1530485827883368479>",
  sweet_commander_pride: "<:compride_f:1530485659779727380>",
  cp0_mask: "<:cp0mask_f:1530485708777717810>",
  world_government_edict: "<:government_f:1530908972985487412>",
  marineford_legacy: "<:marinefordl_f:1530485820543471696>",
  cross_guild_bounty: "<:crossguild_f:1530485666733887559>",
  god_valley_echo: "<:godvalley_f:1530908977989156864>",
  elbaf_might: "<:elbafmight_f:1530485797617402016>",
  void_century_fragment: "<:centuryf_f:1530908985312677888>",
  relic_of_joy: "<:ofjoy_f:1530908992866488422>",
  pirate_king_log: "<:kinglog_f:1530908998839042178>",
  corazon: "<:corazon_f:1530588165088350299>",
  yasopp: "<:yasopp_f:1530588238820151296>",
  sentomaru: "<:sentomaru_f:1530588224651788288>",
  gan_fall: "<:ganfall_f:1530588171564482871>",
  saul: "<:saul_f:1530588216317710336>",
  mr3: "<:mr3_f:1530588209451630692>",
  wapol: "<:wapol_f:1530588229810786334>",
  caesar_clown: "<:caesar_f:1530588159019188364>",
  gunko_holy_knight: "<:gunko_f:1529865187098755264>",
  hody_jones: "<:hody_f:1530588150441836827>",
  law_surgeon_of_death: "<:law_f:1530588195832467576>",
  kid_captain: "<:kid_f:1530588189448998914>",
  road_poneglyph: "<:road_f:1530909004031725690>",
  lzs: "<:lzs_f:1530588138576023592>",
  mr2: "<:mr2_f:1530588201343778957>",
  higuma: "<:higuma_f:1530588177243574353>",
  x_drake: "<:drake_f:1530894356632830122>",
  scratchmen_apoo: "<:apoo_f:1530894362303791185>",
  charlotte_daifuku: "<:daifuku_f:1530895443138052188>",
  charlotte_oven: "<:oven_f:1530895449936892075>",
  charlotte_brulee: "<:brulee_f:1530895455444271274>",
  basil_hawkins: "<:hawkin_f:1530895464579334204>",
  capone_bege: "<:bege_f:1530895471302807723>",
  neptune: "<:neptune_f:1530895476734300280>",
  dorry: "<:dorry_f:1530895482174312618>",
  brogy: "<:brogy_f:1530895487253610656>",
  emporio_ivankov: "<:ivankov_f:1530895489900347554>",
  karasu: "<:karasu_f:1530895495558598717>",
  belo_betty: "<:betty_f:1530818786037600317>",
  inazuma: "<:inazuma_f:1530485721352372304>",
  jewelry_bonney: "<:bonney_f:1530895500222402650>",
  figarland_shamrock: "<:shamrock_f:1530894315319197867>",
  jesus_burgess: "<:burgess_f:1530894321883021433>",
  catarina_devon: "<:devon_f:1530894328267014144>",
  scopper_gaban: "<:gaban_f:1529865180807303280>",
  chew: "<:chew_f:1530894332163395724>",
  kuroobi: "<:kuroobi_f:1530894337922043954>",
  dogra: "<:dogra_f:1530894343492210709>",
  magra: "<:magra_f:1530894350181990450>",
  gvl: "<:gvl_f:1530902519557918840>",
  tfb: "<:tfb_f:1530902525882925116>",
  wgd: "<:wgd_f:1530902532371644496>",
  harald: "<:harald_f:1529865192580845698>",
  uta_diva: "<:uta_f:1530902535580422216>",
  lucky_roux: "<:lucky_f:1530485726427480134>",
  carrot_mink: "<:carrot_f:1530485703606141048>",
  stussy: "<:stussy_f:1530485784166273134>",
  momonosuke_shogun: "<:momonosuke_f:1529840518324949042>",
  inuarashi_duke: "<:inuarashi_f:1530902540944932945>",
  wsr: "<:wsr_f:1530902546258858086>",
  gm: "<:gm_f:1530902552852435018>",
  tre: "<:tre_f:1530902557843656784>",
  killingham: "<:killingham_f:1530902560628670666>",
  sommers: "<:sommers_f:1530902566844502177>",
  wgs: "<:wgs_f:1530902580639694918>",
  ya: "<:ya_f:1530902584313778318>",
  gvc: "<:gvc_f:1530902589892333699>",
  dk: "<:dk_f:1536279159976894554>",
  ta: "<:ta_f:1536279165316108298>",
  lw: "<:lw_f:1536279171032944740>",
  hw: "<:hw_f:1536279183137972254>",
  pkw: "<:pkw_f:1536279178217918575>",
  aces: "<:asd:123456778>",
  hat: "<:asd:123456778>",
  ame_no_habakiri: "<:asd:123456778>",
  basic_iron_club: "<:asd:123456778>",
  basic_marine_saber: "<:asd:123456778>",
  basic_slingshot: "<:asd:123456778>",
  clima_tact: "<:asd:123456778>",
  battle_axe: "<:asd:123456778>",
  bible: "<:asd:123456778>",
  bisento: "<:asd:123456778>",
  black_blade_replica: "<:asd:123456778>",
  black_leg_combat_shoes: "<:asd:123456778>",
  burn_bazooka: "<:asd:123456778>",
  candy_cane: "<:asd:123456778>",
  cannon_jaw: "<:asd:123456778>",
  cat_claws: "<:asd:123456778>",
  chemical_staff: "<:asd:123456778>",
  dragon_claw_gloves: "<:asd:123456778>",
  dual_daggers: "<:asd:123456778>",
  eclipse: "<:asd:123456778>",
  enma: "<:asd:123456778>",
  nonosama_bo: "<:asd:123456778>",
  fish_man_karate: "<:asd:123456778>",
  fists: "<:asd:123456778>",
  giant_fists: "<:asd:123456778>",
  ragnir: "<:asd:123456778>",
  golden_hook: "<:asd:123456778>",
  general_franky_arsenal: "<:asd:123456778>",
  gryphon: "<:asd:123456778>",
  hypnosis_ring: "<:asd:123456778>",
  ice_saber: "<:asd:123456778>",
  imperial_blade: "<:asd:123456778>",
  jitte: "<:asd:123456778>",
  kanabo: "<:asd:123456778>",
  kiribachi: "<:asd:123456778>",
  laser_kicks: "<:asd:123456778>",
  long_rifle: "<:asd:123456778>",
  long_sword: "<:asd:123456778>",
  magma_fist: "<:asd:123456778>",
  mogura: "<:asd:123456778>",
  napoleon: "<:asd:123456778>",
  hassaikai: "<:asd:123456778>",
  plague_arsenal: "<:asd:123456778>",
  raiu: "<:asd:123456778>",
  rokushiki: "<:asd:123456778>",
  sacred_saber: "<:asd:123456778>",
  sandai_kitetsu: "<:asd:123456778>",
  scissors: "<:asd:123456778>",
  shikomizue: "<:asd:123456778>",
  shodai_kitetsu: "<:asd:123456778>",
  silencer_handgun: "<:asd:123456778>",
  six_swords: "<:asd:123456778>",
  sky_lance: "<:asd:123456778>",
  soul_solidd: "<:asd:123456778>",
  tonfa: "<:asd:123456778>",
  twin_blades: "<:asd:123456778>",
  wado_ichimonji: "<:asd:123456778>",
  wax_blade: "<:asd:123456778>",
  wootz_steel_spear: "<:asd:123456778>",
  yoru: "<:asd:123456778>",
  trident: "<:asd:123456778>",
  metal_arm: "<:asd:123456778>",
  kikoku: "<:asd:123456778>",
  nemesis: "<:asd:123456778>",
  sandals: "<:asd:123456778>",
  okama_kenpo: "<:asd:123456778>",
  saber_and_axe: "<:asd:123456778>",
  scythe: "<:asd:123456778>",
  straw_sword: "<:asd:123456778>",
  fire_tank_arsenal: "<:asd:123456778>",
  sea_spear: "<:asd:123456778>",
  terry_sword: "<:asd:123456778>",
  bruiser_axe: "<:asd:123456778>",
  cerberus: "<:asd:123456778>",
  twin_axes: "<:asd:123456778>",
  water_bullets: "<:asd:123456778>",
  bandit_club: "<:asd:123456778>",
  bandit_knife: "<:asd:123456778>",
  fish_karate: "<:asd:123456778>",
  gauntlet: "<:asd:123456778>",
  kagi: "<:asd:123456778>",
  excalibur: "<:asd:123456778>",
  rapier: "<:asd:123456778>",
  knight_form: "<:asd:123456778>",
  leister: "<:asd:123456778>",
  tetsubo: "<:asd:123456778>",

  // Add the remaining card and weapon emojis here.
};

const DEFAULT_FRAGMENT_EMOJIS = {
  battle: "🃏",
  boost: "✨",
  weapon: "⚔️",
};

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function formatRarity(rarity) {
  return String(rarity || "C").toUpperCase();
}

function getDisplayName(fragment) {
  return (
    fragment?.displayName ||
    fragment?.name ||
    fragment?.title ||
    String(fragment?.code || "Unknown Fragment")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())
  );
}

function getFragmentAmount(fragment) {
  const amount = Number(fragment?.amount || 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function normalizeFragmentCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['".]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeFragmentName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['".]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function isValidRarity(value) {
  return VALID_RARITIES.has(String(value || "").toUpperCase()) || String(value || "").toUpperCase() === "M";
}

function getCatalogRarity(entry) {
  const rarity = String(
    entry?.currentTier ||
      entry?.tier ||
      entry?.rarity ||
      entry?.baseTier ||
      entry?.baseRarity ||
      "C"
  ).toUpperCase();

  return isValidRarity(rarity) ? rarity : "C";
}

function getFragmentIdentityKeys(fragment) {
  const rawCode = String(fragment?.code || "");
  const rawName = String(
    fragment?.name ||
      fragment?.displayName ||
      fragment?.title ||
      ""
  );

  const cleanCode = rawCode
    .replace(/^fragment_/i, "")
    .replace(/^weapon_fragment_/i, "")
    .replace(/^boost_fragment_/i, "")
    .replace(/_fragment$/i, "");

  const cleanName = rawName
    .replace(/\s+fragment$/i, "")
    .trim();

  const codeKeys = [
    fragment?.code,
    fragment?.cardCode,
    fragment?.sourceCode,
    fragment?.sourceCardCode,
    fragment?.characterCode,
    fragment?.weaponCode,
    fragment?.sourceWeaponCode,
    cleanCode,
  ]
    .map(normalizeFragmentCode)
    .filter(Boolean);

  const nameKeys = [
    fragment?.name,
    fragment?.displayName,
    fragment?.title,
    cleanName,
  ]
    .map(normalizeFragmentName)
    .filter(Boolean);

  return {
    codeKeys: [...new Set(codeKeys)],
    nameKeys: [...new Set(nameKeys)],
  };
}

function findCardForFragment(fragment) {
  const { codeKeys, nameKeys } =
    getFragmentIdentityKeys(fragment);

  return (
    (Array.isArray(cardsData) ? cardsData : []).find(
      (card) => {
        const cardCodes = [
          card?.code,
          card?.id,
          card?.baseCode,
          card?.cardCode,
          card?.characterCode,
        ]
          .map(normalizeFragmentCode)
          .filter(Boolean);

        const cardNames = [
          card?.name,
          card?.displayName,
          card?.title,
        ]
          .map(normalizeFragmentName)
          .filter(Boolean);

        return (
          codeKeys.some((key) =>
            cardCodes.includes(key)
          ) ||
          nameKeys.some((key) =>
            cardNames.includes(key)
          )
        );
      }
    ) || null
  );
}

function findWeaponForFragment(fragment) {
  const { codeKeys, nameKeys } =
    getFragmentIdentityKeys(fragment);

  return (
    (Array.isArray(weaponsData) ? weaponsData : []).find(
      (weapon) => {
        const weaponCodes = [
          weapon?.code,
          weapon?.id,
          weapon?.weaponCode,
        ]
          .map(normalizeFragmentCode)
          .filter(Boolean);

        const weaponNames = [
          weapon?.name,
          weapon?.displayName,
          weapon?.title,
        ]
          .map(normalizeFragmentName)
          .filter(Boolean);

        return (
          codeKeys.some((key) =>
            weaponCodes.includes(key)
          ) ||
          nameKeys.some((key) =>
            weaponNames.includes(key)
          )
        );
      }
    ) || null
  );
}

function getResolvedFragmentCategory(fragment) {
  const rawCode = normalizeFragmentCode(
    fragment?.code
  );

  const rawName = normalizeFragmentName(
    fragment?.name ||
      fragment?.displayName ||
      fragment?.title
  );

  const rawCategory = String(
    fragment?.category ||
      fragment?.type ||
      fragment?.kind ||
      ""
  )
    .toLowerCase()
    .trim();

  const explicitWeapon = Boolean(
    fragment?.weaponCode ||
      fragment?.sourceWeaponCode ||
      rawCode.startsWith("weapon_fragment_") ||
      rawCode.includes("_weapon_fragment") ||
      rawName.includes("weapon fragment")
  );

  if (explicitWeapon) {
    return "weapon";
  }

  const matchedCard = findCardForFragment(fragment);

  if (matchedCard) {
    const cardRole = String(
      matchedCard?.cardRole ||
        matchedCard?.role ||
        matchedCard?.type ||
        ""
    )
      .toLowerCase()
      .trim();

    if (
      cardRole === "boost" ||
      cardRole.includes("boost") ||
      cardRole.includes("support")
    ) {
      return "boost";
    }

    return "battle";
  }

  const matchedWeapon =
    findWeaponForFragment(fragment);

  if (matchedWeapon) {
    return "weapon";
  }

  if (
    rawCategory === "weapon" ||
    rawCategory.includes("weapon")
  ) {
    return "weapon";
  }

  if (
    rawCategory === "boost" ||
    rawCategory.includes("boost") ||
    rawCategory.includes("support")
  ) {
    return "boost";
  }

  return "battle";
}

function getFragmentCatalogMatch(fragment) {
  const category =
    getResolvedFragmentCategory(fragment);

  if (category === "weapon") {
    return findWeaponForFragment(fragment);
  }

  return findCardForFragment(fragment);
}

function getDisplayRarity(fragment) {
  const matched = getFragmentCatalogMatch(fragment);

  if (matched) {
    return getCatalogRarity(matched);
  }

  return formatRarity(fragment?.rarity);
}

function getStorageInfo(player, fragments, userId) {
  const total = fragments.reduce((sum, item) => sum + Math.max(0, Number(item.amount || 0)), 0);
  const passiveBoosts = getPassiveBoostSummary(player);
  const passiveBonus = Math.max(0, Number(passiveBoosts?.fragmentStorageBonus || 0));
  const pirateBonus = Math.max(0, Number(getPirateFragmentStorageBonus(userId) || 0));
  const bonus = passiveBonus + pirateBonus;
  const max = Math.min(MAX_FRAGMENT_STORAGE, BASE_FRAGMENT_STORAGE + bonus);

  return {
    total,
    max,
    bonus,
    passiveBonus,
    pirateBonus,
  };
}

function sortFragments(fragments) {
  const rarityOrder = {
    M: 7,
    UR: 6,
    SS: 5,
    S: 4,
    A: 3,
    B: 2,
    C: 1,
  };

  return [...(Array.isArray(fragments) ? fragments : [])].sort((a, b) => {
    const amountDiff = getFragmentAmount(b) - getFragmentAmount(a);
    if (amountDiff !== 0) return amountDiff;

    const rarityDiff =
      (rarityOrder[getDisplayRarity(b)] || 0) -
      (rarityOrder[getDisplayRarity(a)] || 0);

    if (rarityDiff !== 0) return rarityDiff;

    return getDisplayName(a).localeCompare(getDisplayName(b));
  });
}

function isExactRarityQuery(query) {
  return VALID_RARITIES.has(String(query || "").trim().toUpperCase());
}

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function getFragmentSearchNames(fragment) {
  const category = String(fragment?.category || "").toLowerCase();
  const rawName = String(fragment?.name || fragment?.displayName || "").trim();
  const rawCode = String(fragment?.code || "").trim();

  const cleanName = rawName.replace(/\s+fragment$/i, "").trim();

  const baseNames = [rawName, cleanName, rawCode];

  if (category !== "weapon") {
    return baseNames.map(normalizeSearch).filter(Boolean);
  }

  const cleanCode = rawCode
    .replace(/^weapon_fragment_/i, "")
    .replace(/_fragment$/i, "")
    .trim();

  return [
    rawName,
    cleanName,
    rawCode,
    cleanCode,
    fragment?.weaponCode,
    fragment?.sourceCode,
  ]
    .map(normalizeSearch)
    .filter(Boolean);
}

function fragmentMatchesQuery(fragment, query) {
  const q = normalizeSearch(query);
  if (!q) return true;

  const names = getFragmentSearchNames(fragment);

  return names.some((name) => {
    if (name === q) return true;
    if (name.startsWith(q)) return true;

    const qWords = q.split(" ").filter(Boolean);
    if (qWords.length && qWords.every((word) => name.split(" ").includes(word))) {
      return true;
    }

    return false;
  });
}

function filterFragments(fragments, query) {
  let list = Array.isArray(fragments)
    ? fragments
    : [];

  if (!query) return list;

  const rawQuery = String(query || "").trim();

  const queryParts = rawQuery
    .split(/\s+/)
    .filter(Boolean);

  const requestedCategory = String(
    queryParts[0] || ""
  ).toLowerCase();

  const validCategories = new Set([
    "weapon",
    "battle",
    "boost",
  ]);

  let remainingQuery = rawQuery;

  if (validCategories.has(requestedCategory)) {
    list = list.filter(
      (fragment) =>
        getResolvedFragmentCategory(fragment) ===
        requestedCategory
    );

    remainingQuery = queryParts
      .slice(1)
      .join(" ")
      .trim();

    if (!remainingQuery) {
      return list;
    }
  }

  const upperQuery = remainingQuery.toUpperCase();

  if (isExactRarityQuery(remainingQuery)) {
    return list.filter(
      (fragment) =>
        getDisplayRarity(fragment) === upperQuery
    );
  }

  return list.filter(
    (fragment) =>
      fragmentMatchesQuery(
        fragment,
        remainingQuery
      )
  );
}

const RESOLVED_FRAGMENT_EMOJIS_BY_ID =
  new Map();

const RESOLVED_FRAGMENT_EMOJIS_BY_NAME =
  new Map();

let fragmentEmojiCacheReady =
  false;

let fragmentEmojiCachePromise =
  null;

function registerFragmentEmoji(emoji) {
  if (!emoji?.id) return;

  const emojiText =
    typeof emoji.toString === "function"
      ? emoji.toString()
      : null;

  if (!emojiText) return;

  RESOLVED_FRAGMENT_EMOJIS_BY_ID.set(
    String(emoji.id),
    emojiText
  );

  const emojiName = String(
    emoji.name || ""
  )
    .toLowerCase()
    .trim();

  if (emojiName) {
    RESOLVED_FRAGMENT_EMOJIS_BY_NAME.set(
      emojiName,
      emojiText
    );
  }
}

async function ensureFragmentEmojiCache(
  client
) {
  if (
    fragmentEmojiCacheReady ||
    !client
  ) {
    return;
  }

  if (fragmentEmojiCachePromise) {
    await fragmentEmojiCachePromise;
    return;
  }

  fragmentEmojiCachePromise = (
    async () => {
      const guilds = [
        ...client.guilds.cache.values(),
      ];

      let guildEmojiCount = 0;
      let applicationEmojiCount = 0;

      const guildResults =
        await Promise.allSettled(
          guilds.map(async (guild) => {
            const fetchedEmojis =
              await guild.emojis.fetch();

            for (
              const emoji of
              fetchedEmojis.values()
            ) {
              registerFragmentEmoji(
                emoji
              );

              guildEmojiCount += 1;
            }
          })
        );

      guildResults.forEach(
        (result, index) => {
          if (
            result.status !==
            "rejected"
          ) {
            return;
          }

          const guild =
            guilds[index];

          console.error(
            "[FINV GUILD EMOJI FETCH ERROR]",
            {
              guildId:
                guild?.id || null,
              guildName:
                guild?.name ||
                "Unknown Guild",
              message:
                result.reason?.message ||
                result.reason,
            }
          );
        }
      );

      try {
        const applicationEmojis =
          await client.application
            ?.emojis?.fetch?.();

        if (
          applicationEmojis &&
          typeof applicationEmojis.values ===
            "function"
        ) {
          for (
            const emoji of
            applicationEmojis.values()
          ) {
            registerFragmentEmoji(
              emoji
            );

            applicationEmojiCount += 1;
          }
        }
      } catch (error) {
        console.error(
          "[FINV APPLICATION EMOJI FETCH ERROR]",
          error?.message || error
        );
      }

      fragmentEmojiCacheReady =
        true;

      console.log(
        [
          "[FINV EMOJI CACHE]",
          `Guilds: ${guilds.length}`,
          `Guild Emojis: ${guildEmojiCount}`,
          `Application Emojis: ${applicationEmojiCount}`,
          `Unique IDs: ${RESOLVED_FRAGMENT_EMOJIS_BY_ID.size}`,
        ].join(" | ")
      );
    }
  )();

  try {
    await fragmentEmojiCachePromise;
  } finally {
    fragmentEmojiCachePromise =
      null;
  }
}

function resolveExternalEmoji(
  configuredEmoji
) {
  const value = String(
    configuredEmoji || ""
  ).trim();

  const match = value.match(
    /^<(a?):([a-zA-Z0-9_]+):(\d{17,20})>$/
  );

  if (!match) {
    return null;
  }

  const emojiName = String(
    match[2] || ""
  )
    .toLowerCase()
    .trim();

  const emojiId = match[3];

  const emojiById =
    RESOLVED_FRAGMENT_EMOJIS_BY_ID.get(
      emojiId
    );

  if (emojiById) {
    return emojiById;
  }

  const emojiByName =
    RESOLVED_FRAGMENT_EMOJIS_BY_NAME.get(
      emojiName
    );

  if (emojiByName) {
    return emojiByName;
  }

  // Valid configured external emojis can still be rendered by Discord
  // even when the source guild emoji is not present in the local cache.
  return value;
}

function getFragmentEmojiCandidates(fragment) {
  const matched =
    getFragmentCatalogMatch(fragment);

  const rawCandidates = [
    fragment?.weaponCode,
    fragment?.sourceWeaponCode,
    fragment?.cardCode,
    fragment?.sourceCardCode,
    fragment?.characterCode,
    fragment?.sourceCode,
    matched?.code,
    matched?.id,
    fragment?.code,
  ];

  const candidates = [];

  for (const rawValue of rawCandidates) {
    const normalized =
      normalizeFragmentCode(rawValue);

    if (!normalized) continue;

    const cleaned = normalized
      .replace(
        /^weapon_fragment_/,
        ""
      )
      .replace(
        /^boost_fragment_/,
        ""
      )
      .replace(
        /^fragment_/,
        ""
      )
      .replace(
        /_fragment$/,
        ""
      );

    if (
      normalized &&
      !candidates.includes(normalized)
    ) {
      candidates.push(normalized);
    }

    if (
      cleaned &&
      !candidates.includes(cleaned)
    ) {
      candidates.push(cleaned);
    }
  }

  return candidates;
}

function getFragmentIcon(
  fragment,
  client
) {
  const category =
    getResolvedFragmentCategory(fragment);

  const candidates =
    getFragmentEmojiCandidates(fragment);

  for (const key of candidates) {
    const configuredEmoji =
      FRAGMENT_EMOJIS[key];

    const resolvedEmoji =
      resolveExternalEmoji(
        configuredEmoji
      );

    if (resolvedEmoji) {
      return resolvedEmoji;
    }
  }

  return (
    DEFAULT_FRAGMENT_EMOJIS[
      category
    ] ||
    DEFAULT_FRAGMENT_EMOJIS.battle
  );
}

function getMemberAvatar(message) {
  return (
    message.member?.displayAvatarURL?.({
      extension: "png",
      size: 512,
    }) ||
    message.author.displayAvatarURL({
      extension: "png",
      size: 512,
    })
  );
}

function buildPageEmbed(message, player, fragments, currentPage, isPrivate, searchQuery) {
  const sorted = sortFragments(fragments);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(currentPage, 0), totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const pageItems = sorted.slice(start, start + PAGE_SIZE);
  const allFragments = Array.isArray(player.fragments) ? player.fragments : [];
  const storage = getStorageInfo(player, allFragments, message.author.id);
  const memberAvatar = getMemberAvatar(message);

  const lines = pageItems.length
    ? pageItems.map((fragment) => {
        const category =
          getResolvedFragmentCategory(fragment);

        const icon = getFragmentIcon(
          fragment,
          message.client
        );
        const name = getDisplayName(fragment);

        const amount = getFragmentAmount(
          fragment
        ).toLocaleString("en-US");

        const rarity = getDisplayRarity(fragment);

        const categoryLabel =
          category === "weapon"
            ? "Weapon"
            : category === "boost"
              ? "Boost"
              : "Battle";

        return `${icon} **${name}** x${amount} • ${rarity} • ${categoryLabel}`;
      })
    : ["No fragments found."];

  const description = [
    "Fragments are used to summon and upgrade battle cards, boost cards, and weapons.",
    "",
    searchQuery ? `**Search:** \`${searchQuery}\`` : null,
    searchQuery ? "" : null,
    ...lines,
    "",
    `**Fragment Storage:** ${storage.total}/${storage.max}`,
    storage.bonus > 0 ? `**Storage Bonus:** +${storage.bonus}` : null,
    `**Visibility Mode:** ${isPrivate ? "Private" : "Public"}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(
      `${message.member?.displayName || message.author.username}'s Fragment Storage`
    )
    .setDescription(description)
    .setThumbnail(memberAvatar)
    .setFooter({
      text: `Page ${safePage + 1}/${totalPages} • ${sorted.length} fragment entries`,
      iconURL: memberAvatar,
    });

  return {
    embed,
    totalPages,
    safePage,
  };
}

function buildButtons(currentPage, totalPages, isPrivate) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("finv_prev")
      .setLabel("Previous")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage <= 0),
    new ButtonBuilder()
      .setCustomId("finv_next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId("finv_toggle_mode")
      .setLabel(isPrivate ? "Private" : "Public")
      .setStyle(isPrivate ? ButtonStyle.Danger : ButtonStyle.Success)
  );
}

module.exports = {
  name: "finv",
  aliases: ["fragmentinv", "fragments"],

  async execute(message, args) {
    await ensureFragmentEmojiCache(
      message.client
    );

    const player = getPlayer(
      message.author.id,
      message.author.username
    );
    const allFragments = Array.isArray(player.fragments) ? player.fragments : [];
    const searchQuery = args.length ? args.join(" ").trim() : "";
    const filteredFragments = filterFragments(allFragments, searchQuery);

    let currentPage = 0;
    let isPrivate = true;

    const initial = buildPageEmbed(
      message,
      player,
      filteredFragments,
      currentPage,
      isPrivate,
      searchQuery
    );

    const sentMessage = await message.reply({
      embeds: [initial.embed],
      components: [buildButtons(initial.safePage, initial.totalPages, isPrivate)],
      allowedMentions: {
        repliedUser: false,
      },
    });

    const collector = sentMessage.createMessageComponentCollector({
      time: 120000,
    });

    collector.on("collect", async (interaction) => {
      const isOwner = interaction.user.id === message.author.id;

      if (isPrivate && !isOwner) {
        return interaction.reply({
          content: "This fragment menu is private right now.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.customId === "finv_prev") {
        currentPage = Math.max(0, currentPage - 1);
      }

      if (interaction.customId === "finv_next") {
        currentPage += 1;
      }

      if (interaction.customId === "finv_toggle_mode") {
        if (!isOwner) {
          return interaction.reply({
            content: "Only the owner can change the visibility mode.",
            flags: MessageFlags.Ephemeral,
          });
        }

        isPrivate = !isPrivate;
      }

      const refreshedPlayer = getPlayer(message.author.id, message.author.username);
      const refreshedFragments = filterFragments(
        Array.isArray(refreshedPlayer.fragments) ? refreshedPlayer.fragments : [],
        searchQuery
      );

      const pageData = buildPageEmbed(
        message,
        refreshedPlayer,
        refreshedFragments,
        currentPage,
        isPrivate,
        searchQuery
      );

      currentPage = pageData.safePage;

      return interaction.update({
        embeds: [pageData.embed],
        components: [buildButtons(currentPage, pageData.totalPages, isPrivate)],
      });
    });

    collector.on("end", async () => {
      try {
        const refreshedPlayer = getPlayer(message.author.id, message.author.username);
        const refreshedFragments = filterFragments(
          Array.isArray(refreshedPlayer.fragments) ? refreshedPlayer.fragments : [],
          searchQuery
        );

        const pageData = buildPageEmbed(
          message,
          refreshedPlayer,
          refreshedFragments,
          currentPage,
          isPrivate,
          searchQuery
        );

        await sentMessage.edit({
          embeds: [pageData.embed],
          components: [],
        });
      } catch (_) {}
    });
  },
};

module.exports.ensureFragmentEmojiCache =
  ensureFragmentEmojiCache;

module.exports.getFragmentIcon =
  getFragmentIcon;