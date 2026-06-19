const { EmbedBuilder } = require("discord.js");
const {
  getPlayer,
  updatePlayerAtomic,
  flushPlayerNow,
} = require("../playerStore");
const { ITEMS } = require("../data/items");
const { incrementQuestPayload } = require("../utils/questProgress");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getCatalogItemByCode(code, fallback = {}) {
  const target = String(code || "").toLowerCase().trim();

  const found =
    Object.values(ITEMS || {}).find(
      (item) => String(item?.code || "").toLowerCase().trim() === target
    ) || null;

  return found || fallback || null;
}

function getPullResetTicketItem() {
  return getCatalogItemByCode("pull_reset_ticket", {
    code: "pull_reset_ticket",
    name: "Pull Reset Ticket",
    type: "Ticket",
    rarity: "S",
  });
}

function getRaidTicketItem() {
  return getCatalogItemByCode("raid_ticket", {
    code: "raid_ticket",
    name: "Raid Ticket",
    type: "Ticket",
    rarity: "S",
  });
}

function getGoldRaidTicketItem() {
  return getCatalogItemByCode("gold_raid_ticket", {
    code: "gold_raid_ticket",
    name: "Gold Raid Ticket",
    type: "Ticket",
    rarity: "S",
  });
}

function getUniversalAFragmentItem() {
  return getCatalogItemByCode("universal_a", {
    code: "universal_a",
    name: "Universal A Fragment",
    type: "Consumable",
    rarity: "A",
    category: "universal",
  });
}

function getUniversalSFragmentItem() {
  return getCatalogItemByCode("universal_s", {
    code: "universal_s",
    name: "Universal S Fragment",
    type: "Consumable",
    rarity: "S",
    category: "universal",
  });
}

function getUniversalBFragmentItem() {
  return getCatalogItemByCode("universal_b", {
    code: "universal_b",
    name: "Universal B Fragment",
    type: "Consumable",
    rarity: "B",
    category: "universal",
  });
}

function getUniversalCFragmentItem() {
  return getCatalogItemByCode("universal_c", {
    code: "universal_c",
    name: "Universal C Fragment",
    type: "Consumable",
    rarity: "C",
    category: "universal",
  });
}

function addOrIncrease(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = String(item?.code || "").trim().toLowerCase();
  const name = String(item?.name || "").trim();

  const index = arr.findIndex((entry) => {
    const entryCode = String(entry?.code || "").trim().toLowerCase();

    if (code && entryCode) return entryCode === code;

    return normalize(entry?.name) === normalize(name);
  });

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      ...item,
      code: item.code || arr[index].code,
      name: item.name || arr[index].name,
      amount: Number(arr[index].amount || 0) + Number(item.amount || 1),
    };

    return arr;
  }

  arr.push({
    ...item,
    amount: Number(item.amount || 1),
  });

  return arr;
}

function moveMisplacedConsumablesToItems(state) {
  const nextState = {
    ...state,
    materials: [...(state.materials || [])],
    items: [...(state.items || [])],
  };

  const misplacedCodes = new Set(["rum_beer", "universal_random"]);

  const remainingMaterials = [];

  for (const material of nextState.materials) {
    const code = String(material?.code || "").toLowerCase();

    if (misplacedCodes.has(code)) {
      nextState.items = addOrIncrease(nextState.items, {
        ...material,
        type: material.type || "Consumable",
      });
    } else {
      remainingMaterials.push(material);
    }
  }

  nextState.materials = remainingMaterials;
  return nextState;
}

function addRewardLine(rewardMap, label, amount) {
  const current = Number(rewardMap.get(label) || 0);
  rewardMap.set(label, current + Number(amount || 0));
}

function getBoxByQuery(query) {
  const all = Object.values(ITEMS).filter((item) => item.type === "Box");
  const q = normalize(query);

  return (
    all.find((item) => normalize(item.name) === q) ||
    all.find((item) => normalize(item.code) === q) ||
    all.find((item) => normalize(item.name).includes(q)) ||
    all.find((item) => normalize(item.code).includes(q)) ||
    null
  );
}

function getOpenableItemByQuery(query) {
  const q = normalize(query);

  const openableItems = [
    {
      name: "Universal Random",
      code: "universal_random",
      type: "Consumable",
    },
    {
      name: "Pull Reset Ticket",
      code: "pull_reset_ticket",
      type: "Ticket",
      notOpenableReason:
        "Pull Reset Ticket is not opened from `op open`.\nUse it through the pull reset system instead.\n\nExample:\n`op reset`",
    },
    {
      name: "Raid Ticket",
      code: "raid_ticket",
      type: "Ticket",
      notOpenableReason:
        "Raid Ticket is not opened from `op open`.\nIt will be used for the raid system.",
    },
    {
      name: "Gold Raid Ticket",
      code: "gold_raid_ticket",
      type: "Ticket",
      notOpenableReason:
        "Gold Raid Ticket is not opened from `op open`.\nIt will be used for the raid system.",
    },
  ];

  return (
    openableItems.find((item) => normalize(item.name) === q) ||
    openableItems.find((item) => normalize(item.code) === q) ||
    openableItems.find((item) => normalize(item.name).includes(q)) ||
    openableItems.find((item) => normalize(item.code).includes(q)) ||
    null
  );
}

function getOwnedItemAmount(player, itemCode) {
  const code = String(itemCode || "").toLowerCase();

  const itemAmount = (Array.isArray(player.items) ? player.items : [])
    .filter((entry) => String(entry.code || "").toLowerCase() === code)
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  const ticketAmount = (Array.isArray(player.tickets) ? player.tickets : [])
    .filter((entry) => String(entry.code || "").toLowerCase() === code)
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  const materialAmount = (Array.isArray(player.materials) ? player.materials : [])
    .filter((entry) => String(entry.code || "").toLowerCase() === code)
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  return Math.max(0, itemAmount + ticketAmount + materialAmount);
}

function removeItemFromList(list, code, amount) {
  let left = Number(amount || 0);

  const arr = (Array.isArray(list) ? list : [])
    .map((entry) => ({ ...entry }))
    .filter((entry) => Number(entry.amount || 0) > 0);

  for (let i = 0; i < arr.length && left > 0; i++) {
    if (String(arr[i].code || "").toLowerCase() !== String(code || "").toLowerCase()) {
      continue;
    }

    const current = Number(arr[i].amount || 0);
    const take = Math.min(current, left);

    arr[i].amount = current - take;
    left -= take;
  }

  return {
    list: arr.filter((entry) => Number(entry.amount || 0) > 0),
    removed: Number(amount || 0) - left,
    missing: left,
  };
}

function removeOwnedOpenableItem(state, code, amount) {
  let left = Number(amount || 0);

  const itemRemove = removeItemFromList(state.items || [], code, left);
  left = itemRemove.missing;

  const ticketRemove = removeItemFromList(state.tickets || [], code, left);
  left = ticketRemove.missing;

  const materialRemove = removeItemFromList(state.materials || [], code, left);
  left = materialRemove.missing;

  if (left > 0) return null;

  return {
    items: itemRemove.list,
    tickets: ticketRemove.list,
    materials: materialRemove.list,
  };
}

function pickUniversalRandomReward() {
  const pool = [getUniversalAFragmentItem(), getUniversalSFragmentItem()].filter(Boolean);
  return pool[Math.floor(Math.random() * pool.length)] || getUniversalAFragmentItem();
}

function parseOpenArgs(args) {
  const rawArgs = [...args];

  if (!rawArgs.length) {
    return {
      query: "",
      requestedAmount: 1,
      all: false,
    };
  }

  const lastArg = String(rawArgs[rawArgs.length - 1] || "").toLowerCase();

  if (lastArg === "all") {
    rawArgs.pop();

    return {
      query: rawArgs.join(" ").trim(),
      requestedAmount: null,
      all: true,
    };
  }

  const numericAmount = Number(lastArg);

  if (Number.isInteger(numericAmount) && numericAmount > 0) {
    rawArgs.pop();

    return {
      query: rawArgs.join(" ").trim(),
      requestedAmount: numericAmount,
      all: false,
    };
  }

  return {
    query: rawArgs.join(" ").trim(),
    requestedAmount: 1,
    all: false,
  };
}

function getOwnedBoxAmount(boxes, code) {
  const found = (Array.isArray(boxes) ? boxes : []).find(
    (entry) => entry.code === code
  );

  return Math.max(0, Number(found?.amount || 0));
}

function removeBoxes(list, code, amount) {
  const arr = Array.isArray(list) ? [...list] : [];
  const index = arr.findIndex((entry) => entry.code === code);

  if (index === -1) return null;

  const current = Number(arr[index].amount || 0);

  if (current < amount) return null;

  if (current === amount) {
    arr.splice(index, 1);
  } else {
    arr[index] = {
      ...arr[index],
      amount: current - amount,
    };
  }

  return arr;
}

function normalizeRewardItem(item, amount) {
  return {
    ...item,
    amount: Number(amount || 1),
  };
}

function getRewardType(item) {
  return String(item?.type || "").toLowerCase();
}

function isUniversalFragment(item) {
  const code = String(item?.code || "").toLowerCase();
  const name = String(item?.name || "").toLowerCase();

  return (
    code.startsWith("universal_") ||
    code.includes("universal") ||
    name.includes("universal")
  );
}

function isTicketReward(item) {
  const code = String(item?.code || "").toLowerCase().trim();
  const type = String(item?.type || "").toLowerCase().trim();

  return (
    type === "ticket" ||
    code === "pull_reset_ticket" ||
    code === "raid_ticket" ||
    code === "gold_raid_ticket" ||
    code.endsWith("_ticket")
  );
}

function normalizeTicketReward(item, amount) {
  const code = String(item?.code || "").toLowerCase().trim();

  if (code === "pull_reset_ticket") {
    return {
      code: "pull_reset_ticket",
      name: "Pull Reset Ticket",
      type: "Ticket",
      amount,
    };
  }

  if (code === "raid_ticket") {
    return {
      code: "raid_ticket",
      name: "Raid Ticket",
      type: "Ticket",
      amount,
    };
  }

  if (code === "gold_raid_ticket") {
    return {
      code: "gold_raid_ticket",
      name: "Gold Raid Ticket",
      type: "Ticket",
      amount,
    };
  }

  return {
    ...item,
    type: "Ticket",
    amount,
  };
}

function normalizeUniversalReward(item, amount) {
  const code = String(item?.code || "").toLowerCase().trim();
  const name = String(item?.name || "").trim();

  return {
    ...item,
    code: code || item?.code,
    name: name || item?.name || "Universal Fragment",
    type: "Consumable",
    category: "universal",
    amount,
  };
}

function getRewardStorageKey(item) {
  const type = String(item?.type || "").toLowerCase();
  const code = String(item?.code || "").toLowerCase();

  if (type === "material") return "materials";
  if (type === "ticket") return "tickets";
  if (type === "fragment") return "fragments";
  if (type === "box") return "boxes";

  if (type === "consumable") return "items";

  if (code === "pull_reset_ticket") return "tickets";

  if (
    code === "rum_beer" ||
    code === "universal_random" ||
    code.startsWith("universal_")
  ) {
    return "items";
  }

  return "items";
}

function grantRewardItem(state, rewardMap, item, qty, boxAmount) {
  if (!item) return state;

  const totalAmount = Number(qty || 0) * Number(boxAmount || 1);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return state;

  const reward = normalizeRewardItem(item, totalAmount);
  const type = getRewardType(reward);

  const nextState = {
    ...state,
    materials: [...(state.materials || [])],
    items: [...(state.items || [])],
    tickets: [...(state.tickets || [])],
    fragments: [...(state.fragments || [])],
    boxes: [...(state.boxes || [])],
  };

  if (isTicketReward(reward)) {
    const ticketReward = normalizeTicketReward(reward, totalAmount);
    nextState.tickets = addOrIncrease(nextState.tickets, ticketReward);
    addRewardLine(rewardMap, ticketReward.name || reward.name || "Ticket", totalAmount);
    return nextState;
  }

  if (isUniversalFragment(reward)) {
    const universalReward = normalizeUniversalReward(reward, totalAmount);
    nextState.items = addOrIncrease(nextState.items, universalReward);
    addRewardLine(rewardMap, universalReward.name || reward.name || "Universal Fragment", totalAmount);
    return nextState;
  }

  if (type === "material") {
    nextState.materials = addOrIncrease(nextState.materials, {
      ...reward,
      type: "Material",
    });
    addRewardLine(rewardMap, reward.name || "Material", totalAmount);
    return nextState;
  }

  if (type === "fragment") {
    nextState.fragments = addOrIncrease(nextState.fragments, {
      ...reward,
      category: reward.category || "fragment",
    });
    addRewardLine(rewardMap, reward.name || "Fragment", totalAmount);
    return nextState;
  }

  if (type === "box") {
    nextState.boxes = addOrIncrease(nextState.boxes, {
      ...reward,
      type: "Box",
    });
    addRewardLine(rewardMap, reward.name || "Box", totalAmount);
    return nextState;
  }

  nextState.items = addOrIncrease(nextState.items, {
    ...reward,
    type: reward.type || "Consumable",
  });
  addRewardLine(rewardMap, reward.name || "Item", totalAmount);
  return nextState;
}

function addRandomUniversalFragment(state, rewardMap, pool, qty, boxAmount) {
  const list = (Array.isArray(pool) ? pool : []).filter(Boolean);

  if (!list.length) return state;

  const picked = list[Math.floor(Math.random() * list.length)];

  return grantRewardItem(state, rewardMap, picked, qty, boxAmount);
}

function grantBoxRewards(box, amount, state, rewardMap) {
  let nextState = {
    materials: [...(state.materials || [])],
    items: [...(state.items || [])],
    tickets: [...(state.tickets || [])],
    fragments: [...(state.fragments || [])],
    boxes: [...(state.boxes || [])],
    berries: Number(state.berries || 0),
    gems: Number(state.gems || 0),
  };

  function addReward(item, qty) {
    nextState = grantRewardItem(nextState, rewardMap, item, qty, amount);
  }

  function addRandomFragment(pool, qty) {
    nextState = addRandomUniversalFragment(nextState, rewardMap, pool, qty, amount);
  }

  function addBerries(qty) {
    const totalAmount = Number(qty || 0) * Number(amount || 1);
    nextState.berries += totalAmount;
    addRewardLine(rewardMap, "Berries", totalAmount);
  }

  function addGems(qty) {
    const totalAmount = Number(qty || 0) * Number(amount || 1);
    nextState.gems += totalAmount;
    addRewardLine(rewardMap, "Gems", totalAmount);
  }

  if (box.code === "wooden_material_box") {
    addReward(ITEMS.hardwood, 3);
    addReward(ITEMS.sailCloth, 2);
    addReward(ITEMS.enhancementStone, 3);
  } else if (box.code === "iron_material_box") {
    addReward(ITEMS.hardwood, 7);
    addReward(ITEMS.ironPlating, 3);
    addReward(ITEMS.sailCloth, 6);
    addReward(ITEMS.enhancementStone, 12);
  } else if (box.code === "royal_material_box") {
    addReward(ITEMS.hardwood, 10);
    addReward(ITEMS.ironPlating, 6);
    addReward(ITEMS.sailCloth, 8);
    addReward(ITEMS.colaEnginePart, 3);
    addReward(ITEMS.enhancementStone, 25);
  } else if (box.code === "basic_resource_box") {
    addBerries(2000);
    addGems(10);
    addReward(ITEMS.enhancementStone, 1);

    if (Math.random() < 0.25) {
      addReward(ITEMS.rumBeer, 1);
    }

    if (Math.random() < 0.30) {
      addRandomFragment([getUniversalCFragmentItem()], 1);
    }
  } else if (box.code === "rare_resource_box") {
    addBerries(5000);
    addGems(20);
    addReward(ITEMS.ironPlating, 1);
    addReward(ITEMS.enhancementStone, 4);

    if (Math.random() < 0.45) {
      addReward(ITEMS.rumBeer, Math.random() < 0.5 ? 2 : 1);
    }

    if (Math.random() < 0.35) {
      addRandomFragment(
        [getUniversalCFragmentItem(), getUniversalBFragmentItem()],
        Math.random() < 0.5 ? 2 : 1
      );
    }
  } else if (box.code === "elite_resource_box") {
    addBerries(9000);
    addGems(35);
    addReward(ITEMS.ironPlating, 1);
    addReward(ITEMS.hardwood, 1);
    addReward(ITEMS.colaEnginePart, 1);
    addReward(ITEMS.enhancementStone, 8);
    addReward(ITEMS.rumBeer, 3 + Math.floor(Math.random() * 2));

    if (Math.random() < 0.55) {
      addRandomFragment(
        [getUniversalBFragmentItem(), getUniversalAFragmentItem()],
        Math.random() < 0.5 ? 2 : 1
      );
    }
  } else if (box.code === "legend_resource_box") {
    addBerries(15000);
    addGems(60);
    addReward(ITEMS.ironPlating, 1);
    addReward(ITEMS.hardwood, 1);
    addReward(ITEMS.colaEnginePart, 1);
    addReward(ITEMS.enhancementStone, 10);
    addReward(ITEMS.rumBeer, 5 + Math.floor(Math.random() * 3));

    if (Math.random() < 0.50) {
      addRandomFragment(
        [getUniversalAFragmentItem(), getUniversalSFragmentItem()],
        Math.random() < 0.28 ? 2 : 1
      );
    }

    if (Math.random() < 0.35) {
      addReward(getPullResetTicketItem(), 1);
    }
  } else if (box.code === "mother_flame_treasure_box") {
    addBerries(50000);
    addGems(150);
    addReward(ITEMS.colaEnginePart, 5);
    addReward(ITEMS.hardwood, 3);
    addReward(ITEMS.enhancementStone, 20);
    addReward(ITEMS.rumBeer, 10);

    if (Math.random() < 0.75) {
      addRandomFragment(
        [getUniversalAFragmentItem(), getUniversalSFragmentItem()],
        Math.random() < 0.4 ? 3 : 2
      );
    }
  } else {
    return null;
  }

  return moveMisplacedConsumablesToItems(nextState);
}

function grantOpenableItemRewards(item, amount, state, rewardMap) {
  let nextState = {
    materials: [...(state.materials || [])],
    items: [...(state.items || [])],
    tickets: [...(state.tickets || [])],
    fragments: [...(state.fragments || [])],
    boxes: [...(state.boxes || [])],
    berries: Number(state.berries || 0),
    gems: Number(state.gems || 0),
  };

  if (item.code === "universal_random") {
    for (let i = 0; i < amount; i++) {
      const reward = pickUniversalRandomReward();

      nextState = grantRewardItem(
        nextState,
        rewardMap,
        {
          ...reward,
          type: "Consumable",
          category: "universal",
        },
        1,
        1
      );
    }

    return nextState;
  }

  return null;
}

function formatRewardLines(rewardMap) {
  const lines = [];

  for (const [name, amount] of rewardMap.entries()) {
    if (name === "Berries") {
      lines.push(` Berries +${Number(amount || 0).toLocaleString("en-US")}`);
    } else if (name === "Gems") {
      lines.push(` Gems +${Number(amount || 0).toLocaleString("en-US")}`);
    } else {
      lines.push(` ${name} x${Number(amount || 0).toLocaleString("en-US")}`);
    }
  }

  return lines;
}

module.exports = {
  name: "open",
  aliases: ["obox", "openbox"],

  async execute(message, args) {
    const parsed = parseOpenArgs(args);

    if (!parsed.query) {
      return message.reply(
        [
          "Usage:",
          "`op open <box name>`",
          "`op open <box name> <amount>`",
          "`op open <box name> all`",
          "",
          "Examples:",
          "`op open rare`",
          "`op open rare 2`",
          "`op open rare all`",
          "`op open universal random`",
          "`op open universal random 3`",
          "`op open universal random all`",
        ].join("\n")
      );
    }

    const player = getPlayer(message.author.id, message.author.username);
    const box = getBoxByQuery(parsed.query);
    const openableItem = box ? null : getOpenableItemByQuery(parsed.query);

    if (!box && !openableItem) {
      return message.reply("That box/item was not found.");
    }

    if (openableItem?.notOpenableReason) {
      return message.reply(openableItem.notOpenableReason);
    }

    if (openableItem) {
      const ownedAmount = getOwnedItemAmount(player, openableItem.code);

      if (ownedAmount <= 0) {
        return message.reply(`You do not own **${openableItem.name}**.`);
      }

      const openAmount = parsed.all ? ownedAmount : Number(parsed.requestedAmount || 1);

      if (!Number.isInteger(openAmount) || openAmount <= 0) {
        return message.reply("Open amount must be a positive number.");
      }

      if (openAmount > ownedAmount) {
        return message.reply(
          `You only own **${ownedAmount}x ${openableItem.name}**.\nUse \`op open ${parsed.query} all\` to open all owned items.`
        );
      }

      const rewardMap = new Map();

      try {
        await updatePlayerAtomic(
          message.author.id,
          (fresh) => {
            const fixedFresh = moveMisplacedConsumablesToItems({
              ...fresh,
              materials: [...(fresh.materials || [])],
              items: [...(fresh.items || [])],
            });

            const freshOwnedAmount = getOwnedItemAmount(fixedFresh, openableItem.code);

            if (freshOwnedAmount <= 0) {
              throw new Error(`You do not own **${openableItem.name}**.`);
            }

            if (openAmount > freshOwnedAmount) {
              throw new Error(
                `You only own **${freshOwnedAmount}x ${openableItem.name}**.\nUse \`op open ${parsed.query} all\` to open all owned items.`
              );
            }

            const removedState = removeOwnedOpenableItem(
              {
                items: [...(fixedFresh.items || [])],
                tickets: [...(fixedFresh.tickets || [])],
                materials: [...(fixedFresh.materials || [])],
              },
              openableItem.code,
              openAmount
            );

            if (!removedState) {
              throw new Error(`You do not own enough **${openableItem.name}**.`);
            }

            const rewardState = grantOpenableItemRewards(
              openableItem,
              openAmount,
              {
                materials: removedState.materials,
                items: removedState.items,
                tickets: removedState.tickets,
                fragments: [...(fixedFresh.fragments || [])],
                boxes: [...(fixedFresh.boxes || [])],
                berries: Number(fixedFresh.berries || 0),
                gems: Number(fixedFresh.gems || 0),
              },
              rewardMap
            );

            if (!rewardState) {
              throw new Error("This item is not configured yet.");
            }

            const updatedQuests = incrementQuestPayload(fixedFresh, "boxesOpened", openAmount);

            return {
              ...fixedFresh,
              boxes: rewardState.boxes,
              materials: rewardState.materials,
              items: rewardState.items,
              tickets: rewardState.tickets,
              fragments: rewardState.fragments,
              berries: rewardState.berries,
              gems: rewardState.gems,
              quests: updatedQuests,
            };
          },
          message.author.username
        );
      } catch (error) {
        return message.reply(error.message || "Failed to open item.");
      }
      try {
        await flushPlayerNow(
          message.author.id,
          Number(process.env.PLAYER_DB_COMMAND_FLUSH_MS || 8000)
        );
      } catch (error) {
        console.error("[OPEN ITEM FORCE FLUSH ERROR]", error);
      }
      const rewardLines = formatRewardLines(rewardMap);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(` Opened ${openableItem.name} x${openAmount}`)
            .setDescription(
              rewardLines.length ? rewardLines.join("\n") : "No rewards were generated."
            )
            .setFooter({
              text: "One Piece Bot • Open Item",
            }),
        ],
      });
    }

    const ownedAmount = getOwnedBoxAmount(player.boxes || [], box.code);

    if (ownedAmount <= 0) {
      return message.reply(`You do not own **${box.name}**.`);
    }

    const openAmount = parsed.all ? ownedAmount : Number(parsed.requestedAmount || 1);

    if (!Number.isInteger(openAmount) || openAmount <= 0) {
      return message.reply("Open amount must be a positive number.");
    }

    if (openAmount > ownedAmount) {
      return message.reply(
        `You only own **${ownedAmount}x ${box.name}**.\nUse \`op open ${parsed.query} all\` to open all owned boxes.`
      );
    }

    const rewardMap = new Map();

    try {
      await updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const fixedFresh = moveMisplacedConsumablesToItems({
            ...fresh,
            materials: [...(fresh.materials || [])],
            items: [...(fresh.items || [])],
          });

          const freshOwnedAmount = getOwnedBoxAmount(fixedFresh.boxes || [], box.code);

          if (freshOwnedAmount <= 0) {
            throw new Error(`You do not own **${box.name}**.`);
          }

          if (openAmount > freshOwnedAmount) {
            throw new Error(
              `You only own **${freshOwnedAmount}x ${box.name}**.\nUse \`op open ${parsed.query} all\` to open all owned boxes.`
            );
          }

          const updatedBoxes = removeBoxes(fixedFresh.boxes || [], box.code, openAmount);

          if (!updatedBoxes) {
            throw new Error(`You do not own enough **${box.name}**.`);
          }

          const rewardState = grantBoxRewards(
            box,
            openAmount,
            {
              materials: [...(fixedFresh.materials || [])],
              items: [...(fixedFresh.items || [])],
              tickets: [...(fixedFresh.tickets || [])],
              fragments: [...(fixedFresh.fragments || [])],
              boxes: updatedBoxes,
              berries: Number(fixedFresh.berries || 0),
              gems: Number(fixedFresh.gems || 0),
            },
            rewardMap
          );

          if (!rewardState) {
            throw new Error("This box is not configured yet.");
          }

          const updatedQuests = incrementQuestPayload(fixedFresh, "boxesOpened", openAmount);

          return {
            ...fixedFresh,
            boxes: rewardState.boxes,
            materials: rewardState.materials,
            items: rewardState.items,
            tickets: rewardState.tickets,
            fragments: rewardState.fragments,
            berries: rewardState.berries,
            gems: rewardState.gems,
            quests: updatedQuests,
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply(error.message || "Failed to open box.");
    }
    try {
      await flushPlayerNow(
        message.author.id,
        Number(process.env.PLAYER_DB_COMMAND_FLUSH_MS || 8000)
      );
    } catch (error) {
      console.error("[OPEN BOX FORCE FLUSH ERROR]", error);
    }
    const rewardLines = formatRewardLines(rewardMap);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(` Opened ${box.name} x${openAmount}`)
          .setDescription(
            rewardLines.length ? rewardLines.join("\n") : "No rewards were generated."
          )
          .setFooter({
            text: "One Piece Bot • Open Box",
          }),
      ],
    });
  },
};