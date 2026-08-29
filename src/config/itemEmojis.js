const ITEM_EMOJIS = Object.freeze({
  berries:
    "<:berry:1532401337063702538>",
  gems:
    "<:gems:1532392133611229304>",

    universal_c:
    "<:uni_c:1535244137056444446>",
  universal_b:
    "<:uni_b:1535244131188871239>",
  universal_a:
    "<:uni_a:1535244126201585735>",
  universal_s:
    "<:uni_s:1535244115313434644>",
  random_universal_fragment:
    "<:uni_random:1535244120812032141>",

  cola_engine_part:
    "<:colaenginepart:1535245952468787261>",
  iron_plating:
    "<:ironplating:1535245946609336340>",
  enhancement_stone:
    "<:enhancementstone:1535245939785081012>",
  hardwood:
    "<:hardwood:1535245933980164098>",
  sail_cloth:
    "<:sailcloth:1535245929391849542>",
  fruit_essence:
    "<:fruitessence:1535249059412054088>",

  wooden_material_box:
    "<:wooden:1535218843667140608>",
  iron_material_box:
    "<:iron:1535218839002939463>",
  royal_material_box:
    "<:royal:1535218832334000139>",

  basic_resource_box:
    "<:basicb:1535218866290958447>",
  rare_resource_box:
    "<:rareb:1535218862197571584>",
  elite_resource_box:
    "<:eliteb:1535218857189318706>",
  legend_resource_box:
    "<:legendb:1535218853339070514>",
  mother_flame_treasure_box:
    "<:mftreasure:1535255316177096744>",
  eternal_box:
    "<:eternalb:1535218848264101908>",

  common_raid_ticket:
    "<:craid:1535243666422243399>",
  raid_ticket:
    "<:raid:1524049572790538401>",
  gold_raid_ticket:
    "<:graid:1524049593913053447>",
  empty_throne_raid_writ:
    "<:throne:1535246103468056597>",
  mythic_raid_ticket:
    "<:mraid:1524049580239487168>",
  pull_reset_ticket:
    "<:pullreset:1534501021957750784>",

  tl_common_raid_ticket:
    "<:craid:1535243666422243399>",
  tl_raid_ticket:
    "<:raid:1524049572790538401>",
  tl_gold_raid_ticket:
    "<:graid:1524049593913053447>",
  tl_mythic_raid_ticket:
    "<:mraid:1524049580239487168>",

  rum_beer:
    "<:rumbeer:1535218871064207420>",
  ryuma_pity_charm:
    "<:ryumapity:1535255277249630218>",
});

const CATEGORY_EMOJIS = Object.freeze({
  main: "🎒",
  fruit:
    "<:devil_fruit:1535189630750564433>",
  ticket:
    "<:ticketss:1493157873427939430>",
  box:
    "<:boxes:1493143416425549824>",
  consum:
    "<:rumbeer:1535218871064207420>",
  material:
    "<:material:1493157840783675395>",
  item:
    "<:items:1493155207838826526>",
});

function normalizeItemCode(value) {
  if (value && typeof value === "object") {
    return String(
      value.code ||
        value.itemCode ||
        value.name ||
        ""
    )
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getItemEmoji(itemOrCode) {
  const normalizedCode =
    normalizeItemCode(itemOrCode);

  const aliases = {
    berry: "berries",
    gem: "gems",

    universal_c_fragment:
      "universal_c",
    universal_b_fragment:
      "universal_b",
    universal_a_fragment:
      "universal_a",
    universal_s_fragment:
      "universal_s",

    universal_random:
      "random_universal_fragment",
    random_universal:
      "random_universal_fragment",
  };

  const code =
    aliases[normalizedCode] ||
    normalizedCode;

  return ITEM_EMOJIS[code] || "";
}

function getCategoryEmoji(category) {
  const key = String(category || "main")
    .toLowerCase()
    .trim();

  return (
    CATEGORY_EMOJIS[key] ||
    CATEGORY_EMOJIS.main
  );
}

module.exports = {
  ITEM_EMOJIS,
  CATEGORY_EMOJIS,
  getItemEmoji,
  getCategoryEmoji,
};