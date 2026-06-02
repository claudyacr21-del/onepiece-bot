const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const { ITEMS } = require("../data/items");
const { incrementQuestPayload } = require("../utils/questProgress");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function addOrIncrease(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = String(item?.code || "").trim();
  const name = String(item?.name || "").trim();

  const index = arr.findIndex((entry) => {
    if (code && entry.code) return String(entry.code) === code;
    return normalize(entry.name) === normalize(name);
  });

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      ...item,
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

  return Math.max(0, itemAmount + ticketAmount);
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

  if (left > 0) return null;

  return {
    items: itemRemove.list,
    tickets: ticketRemove.list,
  };
}

function pickUniversalRandomReward() {
  const pool = [ITEMS.universalAFragment, ITEMS.universalSFragment].filter(Boolean);
  return pool[Math.floor(Math.random() * pool.length)] || ITEMS.universalAFragment;
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

  if (type === "material") {
    nextState.materials = addOrIncrease(nextState.materials, reward);
  } else if (type === "ticket") {
    nextState.tickets = addOrIncrease(nextState.tickets, reward);
  } else if (type === "fragment") {
    if (isUniversalFragment(reward)) {
      nextState.items = addOrIncrease(nextState.items, {
        ...reward,
        type: "Consumable",
        category: "universal",
      });
    } else {
      nextState.fragments = addOrIncrease(nextState.fragments, {
        ...reward,
        category: reward.category || "fragment",
      });
    }
  } else if (type === "box") {
    nextState.boxes = addOrIncrease(nextState.boxes, reward);
  } else {
    nextState.items = addOrIncrease(nextState.items, reward);
  }

  addRewardLine(rewardMap, reward.name || "Unknown Reward", totalAmount);

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
    addReward(ITEMS.hardwood, 4);
    addReward(ITEMS.ironPlating, 1);
    addReward(ITEMS.sailCloth, 2);
    addReward(ITEMS.enhancementStone, 6);
  } else if (box.code === "royal_material_box") {
    addReward(ITEMS.hardwood, 5);
    addReward(ITEMS.ironPlating, 2);
    addReward(ITEMS.sailCloth, 3);
    addReward(ITEMS.colaEnginePart, 1);
    addReward(ITEMS.enhancementStone, 10);
  } else if (box.code === "basic_resource_box") {
    addBerries(2000);
    addGems(10);
    addReward(ITEMS.enhancementStone, 1);

    if (Math.random() < 0.25) {
      addReward(ITEMS.rumBeer, 1);
    }

    if (Math.random() < 0.30) {
      addRandomFragment([ITEMS.universalCFragment], 1);
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
        [ITEMS.universalCFragment, ITEMS.universalBFragment],
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
        [ITEMS.universalBFragment, ITEMS.universalAFragment],
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

    if (Math.random() < 0.60) {
      addRandomFragment(
        [ITEMS.universalAFragment, ITEMS.universalSFragment],
        Math.random() < 0.35 ? 2 : 1
      );
    }

    if (Math.random() < 0.35) {
      addReward(ITEMS.pullResetTicket, 1);
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
        [ITEMS.universalAFragment, ITEMS.universalSFragment],
        Math.random() < 0.4 ? 3 : 2
      );
    }
  } else {
    return null;
  }

  return nextState;
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
          type: "Fragment",
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
      lines.push(`💰 Berries +${Number(amount || 0).toLocaleString("en-US")}`);
    } else if (name === "Gems") {
      lines.push(`💎 Gems +${Number(amount || 0).toLocaleString("en-US")}`);
    } else {
      lines.push(`📦 ${name} x${Number(amount || 0).toLocaleString("en-US")}`);
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
          "`op open <box/item name>`",
          "`op open <box/item name> <amount>`",
          "`op open <box/item name> all`",
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
        updatePlayerAtomic(
          message.author.id,
          (fresh) => {
            const freshOwnedAmount = getOwnedItemAmount(fresh, openableItem.code);

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
                items: [...(fresh.items || [])],
                tickets: [...(fresh.tickets || [])],
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
                materials: [...(fresh.materials || [])],
                items: removedState.items,
                tickets: removedState.tickets,
                fragments: [...(fresh.fragments || [])],
                boxes: [...(fresh.boxes || [])],
                berries: Number(fresh.berries || 0),
                gems: Number(fresh.gems || 0),
              },
              rewardMap
            );

            if (!rewardState) {
              throw new Error("This item is not configured yet.");
            }

            const updatedQuests = incrementQuestPayload(fresh, "boxesOpened", openAmount);

            return {
              ...fresh,
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

      const rewardLines = formatRewardLines(rewardMap);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`📦 Opened ${openableItem.name} x${openAmount}`)
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
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const freshOwnedAmount = getOwnedBoxAmount(fresh.boxes || [], box.code);

          if (freshOwnedAmount <= 0) {
            throw new Error(`You do not own **${box.name}**.`);
          }

          if (openAmount > freshOwnedAmount) {
            throw new Error(
              `You only own **${freshOwnedAmount}x ${box.name}**.\nUse \`op open ${parsed.query} all\` to open all owned boxes.`
            );
          }

          const updatedBoxes = removeBoxes(fresh.boxes || [], box.code, openAmount);

          if (!updatedBoxes) {
            throw new Error(`You do not own enough **${box.name}**.`);
          }

          const rewardState = grantBoxRewards(
            box,
            openAmount,
            {
              materials: [...(fresh.materials || [])],
              items: [...(fresh.items || [])],
              tickets: [...(fresh.tickets || [])],
              fragments: [...(fresh.fragments || [])],
              boxes: updatedBoxes,
              berries: Number(fresh.berries || 0),
              gems: Number(fresh.gems || 0),
            },
            rewardMap
          );

          if (!rewardState) {
            throw new Error("This box is not configured yet.");
          }

          const updatedQuests = incrementQuestPayload(fresh, "boxesOpened", openAmount);

          return {
            ...fresh,
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

    const rewardLines = formatRewardLines(rewardMap);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`📦 Opened ${box.name} x${openAmount}`)
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