const ITEMS = {
  basicResourceBox: {
    name: "Basic Resource Box",
    amount: 1,
    rarity: "C",
    code: "basic_resource_box",
    type: "Box",
    description: "A small box containing basic resources."
  },
  rareResourceBox: {
    name: "Rare Resource Box",
    amount: 1,
    rarity: "B",
    code: "rare_resource_box",
    type: "Box",
    description: "A better box with improved rewards."
  },
  motherFlameTreasureBox: {
    name: "Mother Flame Treasure Box",
    amount: 1,
    rarity: "S",
    code: "mother_flame_treasure_box",
    type: "Box",
    description: "A premium treasure box with high-value rewards."
  },
  woodenMaterialBox: {
    name: "Wooden Material Box",
    amount: 1,
    rarity: "C",
    code: "wooden_material_box",
    type: "Box",
    description: "A cheap random material box bought with gems."
  },
  ironMaterialBox: {
    name: "Iron Material Box",
    amount: 1,
    rarity: "B",
    code: "iron_material_box",
    type: "Box",
    description: "A better random material box with improved material rewards."
  },
  royalMaterialBox: {
    name: "Royal Material Box",
    amount: 1,
    rarity: "A",
    code: "royal_material_box",
    type: "Box",
    description: "A premium random material box with stronger rewards."
  },
  randomWeaponBox: {
    name: "Random Weapon Box",
    amount: 1,
    rarity: "A",
    code: "random_weapon_box",
    type: "Box",
    description: "A random weapon box containing C, B, or A rarity weapons."
  },
  randomDevilFruitBox: {
    name: "Random Devil Fruit Box",
    amount: 1,
    rarity: "A",
    code: "random_devilfruit_box",
    type: "Box",
    description: "A random devil fruit box containing C, B, or A rarity fruits."
  },
  pullResetTicket: {
    name: "Pull Reset Ticket",
    amount: 1,
    rarity: "A",
    code: "pull_reset_ticket",
    type: "Ticket",
    description: "Resets your pull usage manually."
  },
  treasureMaterialPack: {
    name: "Treasure Material Pack",
    amount: 1,
    rarity: "B",
    code: "treasure_material_pack",
    type: "Material",
    description: "A set of useful treasure materials."
  },
  enhancementStone: {
    name: "Enhancement Stone",
    amount: 1,
    rarity: "C",
    code: "enhancement_stone",
    type: "Material",
    description: "A future upgrade material reserved for equipment enhancement systems."
  },
  hardwood: {
    name: "Hardwood",
    amount: 1,
    rarity: "C",
    code: "hardwood",
    type: "Material",
    description: "Ship upgrade wood material."
  },
  ironPlating: {
    name: "Iron Plating",
    amount: 1,
    rarity: "B",
    code: "iron_plating",
    type: "Material",
    description: "Ship upgrade metal material."
  },
  sailCloth: {
    name: "Sail Cloth",
    amount: 1,
    rarity: "C",
    code: "sail_cloth",
    type: "Material",
    description: "A reinforced cloth used for sails."
  },
  colaEnginePart: {
    name: "Cola Engine Part",
    amount: 1,
    rarity: "A",
    code: "cola_engine_part",
    type: "Material",
    description: "A high-grade ship upgrade component."
  }
};

function cloneItem(item, amount = 1) {
  return { ...item, amount };
}

module.exports = { ITEMS, cloneItem };