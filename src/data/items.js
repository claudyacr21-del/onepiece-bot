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

  eliteResourceBox: {
    name: "Elite Resource Box",
    amount: 1,
    rarity: "A",
    code: "elite_resource_box",
    type: "Box",
    description: "A high-grade resource box with stronger rewards.",
  },

  legendResourceBox: {
    name: "Legend Resource Box",
    amount: 1,
    rarity: "S",
    code: "legend_resource_box",
    type: "Box",
    description: "A legendary resource box containing premium rewards.",
  },

  motherFlameTreasureBox: {
    name: "Mother Flame Treasure Box",
    amount: 1,
    rarity: "S",
    code: "mother_flame_treasure_box",
    type: "Box",
    description: "A premium treasure box with high-value rewards.",
  },

  exclusiveEventChest: {
    name: "Exclusive Event Chest",
    amount: 1,
    rarity: "UR",
    code: "exclusive_event_chest",
    type: "Box",
    description:
      "A special Ryuma Global Boss Event chest. Not available in the shop.",
  },

  ryumaPityCharm: {
    name: "Ryuma Pity Charm",
    amount: 1,
    rarity: "S",
    code: "ryuma_pity_charm",
    type: "Event Item",
    description:
      "Passive Ryuma event item from global milestones. Reduces normal non-premium pity only. 1 charm = 140 pity, 2 charms = 135 pity, 3 charms = 130 pity. Maximum effect is 3 charms.",
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

  mythicRaidTicket: {
  name: "Mythic Raid Ticket",
  amount: 1,
  rarity: "UR",
  code: "mythic_raid_ticket",
  type: "Ticket",
  description: "Used to create a Mythic Merge Raid room.",
  },

  emptyThroneRaidWrit: {
    name: "Empty Throne Raid Writ",
    amount: 1,
    rarity: "S",
    code: "empty_throne_raid_writ",
    type: "Ticket",
    description: "A secret writ used only to challenge Imu in the Empty Throne Raid.",
  },

  goldRaidTicket: {
    name: "Gold Raid Ticket",
    amount: 1,
    rarity: "S",
    code: "gold_raid_ticket",
    type: "Ticket",
    description: "Used to create an S gold raid room.",
  },

  raidTicket: {
    name: "Raid Ticket",
    amount: 1,
    rarity: "A",
    code: "raid_ticket",
    type: "Ticket",
    description: "Used to create an A raid room.",
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

  rumBeer: {
    name: "Rum Beer",
    amount: 1,
    rarity: "B",
    code: "rum_beer",
    type: "Consumable",
    description: "A pirate drink used to add 100 EXP to a battle card.",
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

  fruitEssence: {
    name: "Fruit Essence",
    amount: 1,
    rarity: "A",
    code: "fruit_essence",
    type: "Material",
    description: "A refined essence obtained by breaking down Devil Fruits. Used in the Fruit Essence Shop.",
  },

  universalCFragment: {
    name: "Universal C Fragment",
    amount: 1,
    rarity: "C",
    code: "universal_c",
    type: "Fragment",
    description: "A universal fragment that can be converted into any C battle or boost card fragment.",
  },

  universalBFragment: {
    name: "Universal B Fragment",
    amount: 1,
    rarity: "B",
    code: "universal_b",
    type: "Fragment",
    description: "A universal fragment that can be converted into any B battle or boost card fragment.",
  },

  universalAFragment: {
    name: "Universal A Fragment",
    amount: 1,
    rarity: "A",
    code: "universal_a",
    type: "Fragment",
    description: "A universal fragment that can be converted into any A battle or boost card fragment.",
  },

  universalSFragment: {
    name: "Universal S Fragment",
    amount: 1,
    rarity: "S",
    code: "universal_s",
    type: "Fragment",
    description: "A universal fragment that can be converted into any S battle or boost card fragment.",
  },
};

function cloneItem(item, amount = 1) {
  return { ...item, amount };
}

module.exports = { ITEMS, cloneItem };