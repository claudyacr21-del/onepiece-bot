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
    description: "A stone used to strengthen growth systems."
  }
};

function cloneItem(item, amount = 1) {
  return {
    ...item,
    amount
  };
}

module.exports = {
  ITEMS,
  cloneItem
};