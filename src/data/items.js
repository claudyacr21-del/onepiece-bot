const ITEMS = {
  basicResourceBox: {
    name: "Basic Resource Box",
    amount: 1,
    rarity: "C",
    code: "basic_resource_box",
    type: "Box",
    description: "A small box containing basic resources.",
  },

  rareResourceBox: {
    name: "Rare Resource Box",
    amount: 1,
    rarity: "B",
    code: "rare_resource_box",
    type: "Box",
    description: "A better box with improved rewards.",
  },

  motherFlameTreasureBox: {
    name: "Mother Flame Treasure Box",
    amount: 1,
    rarity: "S",
    code: "mother_flame_treasure_box",
    type: "Box",
    description: "A premium treasure box with high-value rewards.",
  },

  woodenMaterialBox: {
    name: "Wooden Material Box",
    amount: 1,
    rarity: "C",
    code: "wooden_material_box",
    type: "Box",
    description: "A cheap random material box bought with gems.",
  },

  ironMaterialBox: {
    name: "Iron Material Box",
    amount: 1,
    rarity: "B",
    code: "iron_material_box",
    type: "Box",
    description: "A better random material box with improved material rewards.",
  },

  raidTicket: {
    name: "Raid Ticket",
    amount: 1,
    rarity: "A",
    code: "raid_ticket",
    type: "Ticket",
    description: "Used to create an A/S raid room.",
  },

  commonRaidTicket: {
    name: "Common Raid Ticket",
    amount: 1,
    rarity: "B",
    code: "common_raid_ticket",
    type: "Ticket",
    description: "Used to create a C/B common raid room.",
  },

  royalMaterialBox: {
    name: "Royal Material Box",
    amount: 1,
    rarity: "A",
    code: "royal_material_box",
    type: "Box",
    description: "A premium random material box with stronger rewards.",
  },

  pullResetTicket: {
    name: "Pull Reset Ticket",
    amount: 1,
    rarity: "A",
    code: "pull_reset_ticket",
    type: "Ticket",
    description: "Resets your pull usage manually.",
  },

  enhancementStone: {
    name: "Enhancement Stone",
    amount: 1,
    rarity: "C",
    code: "enhancement_stone",
    type: "Material",
    description: "A weapon-only upgrade material reserved for weapon enhancement systems.",
  },

  hardwood: {
    name: "Hardwood",
    amount: 1,
    rarity: "C",
    code: "hardwood",
    type: "Material",
    description: "Ship upgrade wood material.",
  },

  ironPlating: {
    name: "Iron Plating",
    amount: 1,
    rarity: "B",
    code: "iron_plating",
    type: "Material",
    description: "Ship upgrade metal material.",
  },

  sailCloth: {
    name: "Sail Cloth",
    amount: 1,
    rarity: "C",
    code: "sail_cloth",
    type: "Material",
    description: "A reinforced cloth used for sails.",
  },

  colaEnginePart: {
    name: "Cola Engine Part",
    amount: 1,
    rarity: "A",
    code: "cola_engine_part",
    type: "Material",
    description: "A high-grade ship upgrade component.",
  },
};

function cloneItem(item, amount = 1) {
  return { ...item, amount };
}

module.exports = { ITEMS, cloneItem };