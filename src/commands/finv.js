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
const PAGE_SIZE = 8;
const COLOR = 0x8e44ad;
const BASE_FRAGMENT_STORAGE = 200;
const MAX_FRAGMENT_STORAGE = 5000;
const VALID_RARITIES = new Set(["C", "B", "A", "S", "SS", "UR"]);
const FRAGMENT_EMOJIS = {
  luffy_straw_hat: "<:asd:123456778>",
  zoro_pirate_hunter: "<:asd:123456778>",
  nami_cat_burglar: "<:asd:123456778>",
  usopp_sniper: "<:asd:123456778>",
  sanji_black_leg: "<:asd:123456778>",
  koby_aspiring_marine: "<:asd:123456778>",
  alvida_iron_club: "<:asd:123456778>",
  morgan_axe_hand: "<:asd:123456778>",
  helmeppo_spoiled_brat: "<:asd:123456778>",
  buggy_the_clown: "<:asd:123456778>",
  kuro_hundred_plans: "<:asd:123456778>",
  jango_hypnotist: "<:asd:123456778>",
  don_krieg_admiral: "<:asd:123456778>",
  gin_man_demon: "<:asd:123456778>",
  arlong_saw: "<:asd:123456778>",
  hatchan_six_sword_style: "<:asd:123456778>",
  smoker_white_hunter: "<:asd:123456778>",
  tashigi_swordswoman: "<:asd:123456778>",
  chopper_cotton_candy_lover: "<:asd:123456778>",
  kaya_medical_patron: "<:asd:123456778>",
  bepo_navigator_support: "<:asd:123456778>",
  killer_massacre_soldier: "<:asd:123456778>",
  marco_phoenix: "<:asd:123456778>",
  ben_beckman: "<:asd:123456778>",
  charlotte_pudding: "<:asd:123456778>",
  mansherry_healing_princess: "<:asd:123456778>",
  vegapunk_stella: "<:asd:123456778>",
  lindbergh_revolutionary_genius: "<:asd:123456778>",
  doc_q_sickly_support: "<:asd:123456778>",
  shirahoshi_sea_princess: "<:asd:123456778>",
  hiyori_festival_support: "<:asd:123456778>",
  carina_treasure_hunter: "<:asd:123456778>",
  kalifa_cp9_support: "<:asd:123456778>",
  baccarat_lucky_draw: "<:asd:123456778>",
  perona_ghost_princess: "<:asd:123456778>",
  tsuru_tactical_support: "<:asd:123456778>",
  reiju_poison_pink: "<:asd:123456778>",
  otama_kibi_support: "<:asd:123456778>",
  iceburg: "<:asd:123456778>",
  laboon: "<:asd:123456778>",
  sniper_focus: "<:asd:123456778>",
  weather_science: "<:asd:123456778>",
  wado_ichimonji_spirit: "<:asd:123456778>",
  suna_suna_core: "<:asd:123456778>",
  ohara_will: "<:asd:123456778>",
  goro_goro_core: "<:asd:123456778>",
  cola_engine: "<:asd:123456778>",
  rokushiki_manual: "<:asd:123456778>",
  soul_solid: "<:asd:123456778>",
  shadow_core: "<:asd:123456778>",
  kuja_haki: "<:asd:123456778>",
  fishman_karate_scroll: "<:asd:123456778>",
  mera_mera_will: "<:asd:123456778>",
  gura_gura_will: "<:asd:123456778>",
  fist_of_love: "<:asd:123456778>",
  golden_buddha_mandate: "<:asd:123456778>",
  magma_core: "<:asd:123456778>",
  ice_core: "<:asd:123456778>",
  light_core: "<:asd:123456778>",
  darkness_core: "<:asd:123456778>",
  ope_ope_notes: "<:asd:123456778>",
  magnet_core: "<:asd:123456778>",
  ito_ito_awakening: "<:asd:123456778>",
  future_sight: "<:asd:123456778>",
  soru_soru_soul: "<:asd:123456778>",
  lunarian_flame: "<:asd:123456778>",
  plague_tech: "<:asd:123456778>",
  beast_core: "<:asd:123456778>",
  oni_lineage: "<:asd:123456778>",
  forest_core: "<:asd:123456778>",
  nika_drums: "<:asd:123456778>",
  supreme_haki: "<:asd:123456778>",
  black_blade_yoru: "<:asd:123456778>",
  chaos_core: "<:asd:123456778>",
  storm_mandate: "<:asd:123456778>",
  empty_throne_edict: "<:asd:123456778>",
  holy_knight_sigil: "<:asd:123456778>",
  giant_curse: "<:asd:123456778>",
  samurai_spirit: "<:asd:123456778>",
  crocodile_desert_king: "<:asd:123456778>",
  nico_robin_devil_child: "<:asd:123456778>",
  daz_bonez: "<:asd:123456778>",
  bellamy_hyena: "<:asd:123456778>",
  wyper_shandian_warrior: "<:asd:123456778>",
  enel_god: "<:asd:123456778>",
  franky_cyborg: "<:asd:123456778>",
  lucci_cp9: "<:asd:123456778>",
  kaku_cp9: "<:asd:123456778>",
  brook_soul_king: "<:asd:123456778>",
  gecko_moria: "<:asd:123456778>",
  bartholomew_kuma: "<:asd:123456778>",
  boa_hancock: "<:asd:123456778>",
  jinbe_first_son_of_the_sea: "<:asd:123456778>",
  ace_fire_fist: "<:asd:123456778>",
  whitebeard_strongest_man: "<:asd:123456778>",
  blackbeard_emperor_of_darkness: "<:asd:123456778>",
  garp_hero_of_the_marines: "<:asd:123456778>",
  sengoku_buddha: "<:asd:123456778>",
  akainu: "<:asd:123456778>",
  aokiji: "<:asd:123456778>",
  kizaru: "<:asd:123456778>",
  shanks_red_hair: "<:asd:123456778>",
  mihawk_hawk_eyes: "<:asd:123456778>",
  roger_king_of_the_pirates: "<:asd:123456778>",
  xebec_captain_of_rocks: "<:asd:123456778>",
  dragon_revolutionary_leader: "<:asd:123456778>",
  saturn: "<:asd:123456778>",
  mars: "<:asd:123456778>",
  warcury: "<:asd:123456778>",
  nusjuro: "<:asd:123456778>",
  ju_peter: "<:asd:123456778>",
  imu: "<:asd:123456778>",
  garling: "<:asd:123456778>",
  loki: "<:asd:123456778>",
  rayleigh_dark_king: "<:asd:123456778>",
  oden: "<:asd:123456778>",
  perospero: "<:asd:123456778>",
  trebol_underworld_support: "<:asd:123456778>",
  queen_the_plague: "<:asd:123456778>",
  king_wildfire: "<:asd:123456778>",
  jack_the_drought: "<:asd:123456778>",
  yamato_oni_princess: "<:asd:123456778>",
  greenbull: "<:asd:123456778>",
  kaido_strongest_creature: "<:asd:123456778>",
  doflamingo_heavenly_demon: "<:asd:123456778>",
  sabo_flame_emperor: "<:asd:123456778>",
  fujitora: "<:asd:123456778>",
  katakuri_strongest_sweet_commander: "<:asd:123456778>",
  big_mom_emperor: "<:asd:123456778>",
  shiryu: "<:asd:123456778>",
  boa_seraphim: "<:asd:123456778>",
  mihawk_seraphim: "<:asd:123456778>",
  germa_lineage_factor: "<:asd:123456778>",
  gravity_sheath: "<:asd:123456778>",
  holy_knight_standard: "<:asd:123456778>",
  revolutionary_banner: "<:asd:123456778>",
  revolutionary_oath: "<:asd:123456778>",
  donquixote_family: "<:asd:123456778>",
  beast_pirates_terror: "<:asd:123456778>",
  sweet_commander_pride: "<:asd:123456778>",
  cp0_mask: "<:asd:123456778>",
  world_government_edict: "<:asd:123456778>",
  marineford_legacy: "<:asd:123456778>",
  cross_guild_bounty: "<:asd:123456778>",
  god_valley_echo: "<:asd:123456778>",
  elbaf_might: "<:asd:123456778>",
  void_century_fragment: "<:asd:123456778>",
  relic_of_joy: "<:asd:123456778>",
  pirate_king_log: "<:asd:123456778>",
  corazon: "<:asd:123456778>",
  yasopp: "<:asd:123456778>",
  sentomaru: "<:asd:123456778>",
  gan_fall: "<:asd:123456778>",
  saul: "<:asd:123456778>",
  mr3: "<:asd:123456778>",
  wapol: "<:asd:123456778>",
  caesar_clown: "<:asd:123456778>",
  gunko_holy_knight: "<:asd:123456778>",
  hody_jones: "<:asd:123456778>",
  law_surgeon_of_death: "<:asd:123456778>",
  kid_captain: "<:asd:123456778>",
  road_poneglyph: "<:asd:123456778>",
  lzs: "<:asd:123456778>",
  mr2: "<:asd:123456778>",
  higuma: "<:asd:123456778>",
  x_drake: "<:asd:123456778>",
  scratchmen_apoo: "<:asd:123456778>",
  charlotte_daifuku: "<:asd:123456778>",
  charlotte_oven: "<:asd:123456778>",
  charlotte_brulee: "<:asd:123456778>",
  basil_hawkins: "<:asd:123456778>",
  capone_bege: "<:asd:123456778>",
  neptune: "<:asd:123456778>",
  dorry: "<:asd:123456778>",
  brogy: "<:asd:123456778>",
  emporio_ivankov: "<:asd:123456778>",
  karasu: "<:asd:123456778>",
  belo_betty: "<:asd:123456778>",
  inazuma: "<:asd:123456778>",
  jewelry_bonney: "<:asd:123456778>",
  figarland_shamrock: "<:asd:123456778>",
  jesus_burgess: "<:asd:123456778>",
  catarina_devon: "<:asd:123456778>",
  scopper_gaban: "<:asd:123456778>",
  chew: "<:asd:123456778>",
  kuroobi: "<:asd:123456778>",
  dogra: "<:asd:123456778>",
  magra: "<:asd:123456778>",
  gvl: "<:asd:123456778>",
  tfb: "<:asd:123456778>",
  wgd: "<:asd:123456778>",
  harald: "<:asd:123456778>",
  uta_diva: "<:asd:123456778>",
  lucky_roux: "<:asd:123456778>",
  carrot_mink: "<:asd:123456778>",
  stussy: "<:asd:123456778>",
  momonosuke_shogun: "<:asd:123456778>",
  inuarashi_duke: "<:asd:123456778>",
  wsr: "<:asd:123456778>",
  gm: "<:asd:123456778>",
  tre: "<:asd:123456778>",
  killingham: "<:asd:123456778>",
  sommers: "<:asd:123456778>",
  wgs: "<:asd:123456778>",
  ya: "<:asd:123456778>",
  gvc: "<:asd:123456778>",
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
  const list = Array.isArray(fragments) ? fragments : [];

  if (!query) return list;

  const rawQuery = String(query || "").trim();
  const upperQuery = rawQuery.toUpperCase();

  if (isExactRarityQuery(rawQuery)) {
    return list.filter((fragment) => getDisplayRarity(fragment) === upperQuery);
  }

  return list.filter((fragment) => fragmentMatchesQuery(fragment, rawQuery));
}

function getFragmentIcon(fragment) {
  const category = getResolvedFragmentCategory(fragment);
  const matched = getFragmentCatalogMatch(fragment);
  const { codeKeys } = getFragmentIdentityKeys(fragment);

  const possibleKeys = [
    matched?.code,
    matched?.id,
    fragment?.code,
    fragment?.cardCode,
    fragment?.sourceCode,
    fragment?.sourceCardCode,
    fragment?.characterCode,
    fragment?.weaponCode,
    fragment?.sourceWeaponCode,
    ...codeKeys,
  ]
    .map(normalizeFragmentCode)
    .filter(Boolean);

  for (const key of possibleKeys) {
    const emoji = FRAGMENT_EMOJIS[key];

    if (
      emoji &&
      !emoji.includes("PASTE_EMOJI_ID")
    ) {
      return emoji;
    }
  }

  return DEFAULT_FRAGMENT_EMOJIS[category] || "🃏";
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

        const icon = getFragmentIcon(fragment);
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
    const player = getPlayer(message.author.id, message.author.username);
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