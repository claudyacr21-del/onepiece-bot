const PIRATE_SHOP_ITEMS = {
  rum: {
    key: "rum_beer",
    name: "Rum Beer",
    price: 2,
    amount: 50,
    type: "item",
    code: "rum",
    rarity: "B",
    description: "Pirate rum item.",
  },

  pull_reset: {
    key: "pull_reset",
    name: "Pull Reset",
    price: 5,
    type: "item",
    code: "pull_reset_ticket",
    rarity: "A",
    description: "Reset pull slot usage.",
  },

  universal_random: {
    key: "universal_random",
    name: "Universal Random",
    price: 8,
    type: "item",
    code: "universal_random",
    rarity: "S",
    description: "Random A/S universal reward only.",
  },

  raid_ticket: {
    key: "raid_ticket",
    name: "Raid Ticket",
    price: 15,
    type: "ticket",
    code: "raid_ticket",
    rarity: "A",
    description: "A-tier raid ticket.",
  },

  gold_raid_ticket: {
    key: "gold_raid_ticket",
    name: "Gold Raid Ticket",
    price: 20,
    type: "ticket",
    code: "gold_raid_ticket",
    rarity: "S",
    description: "S-tier gold raid ticket.",
  },
};

function normalizePirateShopKey(query) {
  const raw = String(query || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const compact = raw.replace(/_/g, "");

  const aliases = {
    rum: "rum",

    pullreset: "pull_reset",
    resetpull: "pull_reset",
    pull_reset: "pull_reset",
    reset: "pull_reset",

    universal: "universal_random",
    universalrandom: "universal_random",
    randomuniversal: "universal_random",
    universal_random: "universal_random",

    raid: "raid_ticket",
    raidticket: "raid_ticket",
    raid_ticket: "raid_ticket",

    gold: "gold_raid_ticket",
    goldraid: "gold_raid_ticket",
    goldticket: "gold_raid_ticket",
    goldraidticket: "gold_raid_ticket",
    gold_raid_ticket: "gold_raid_ticket",
  };

  return aliases[raw] || aliases[compact] || null;
}

module.exports = {
  PIRATE_SHOP_ITEMS,
  normalizePirateShopKey,
};