const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("../playerStore");
const { ITEMS } = require("../data/items");

const MERGE_RULES = {
  B: {
    from: "C",
    cost: 5,
  },
  A: {
    from: "B",
    cost: 15,
  },
  S: {
    from: "A",
    cost: 3,
  },
};

const UNIVERSAL_ITEMS = {
  C: ITEMS.universalCFragment,
  B: ITEMS.universalBFragment,
  A: ITEMS.universalAFragment,
  S: ITEMS.universalSFragment,
};

function normalizeCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function getUniversalItem(rarity) {
  return UNIVERSAL_ITEMS[String(rarity || "").toUpperCase()] || null;
}

function getUniversalCode(rarity) {
  return getUniversalItem(rarity)?.code || `universal_${String(rarity || "").toLowerCase()}`;
}

function getUniversalName(rarity) {
  return getUniversalItem(rarity)?.name || `Universal ${String(rarity || "").toUpperCase()} Fragment`;
}

function safeItems(player) {
  if (Array.isArray(player?.items)) return player.items;
  if (Array.isArray(player?.inventory)) return player.inventory;
  return [];
}

function setItems(player, items) {
  if (Array.isArray(player?.items) || !Array.isArray(player?.inventory)) {
    return {
      ...player,
      items,
    };
  }

  return {
    ...player,
    inventory: items,
  };
}

function isUniversalItem(item, rarity) {
  const target = String(rarity || "").toUpperCase();
  const targetCode = getUniversalCode(target);
  const targetName = getUniversalName(target);

  const code = normalizeCode(item?.code);
  const name = normalizeName(
    item?.name ||
      item?.displayName ||
      item?.itemName ||
      item?.title
  );

  return (
    code === normalizeCode(targetCode) ||
    name === normalizeName(targetName)
  );
}

function getUniversalItemIndex(items, rarity) {
  return (Array.isArray(items) ? items : []).findIndex((item) =>
    isUniversalItem(item, rarity)
  );
}

function getUniversalAmount(items, rarity) {
  const index = getUniversalItemIndex(items, rarity);
  if (index === -1) return 0;

  return Math.max(0, Math.floor(Number(items[index]?.amount || 0)));
}

function removeUniversalItems(items, rarity, amount) {
  const list = Array.isArray(items)
    ? items.map((item) => ({ ...item }))
    : [];

  const index = getUniversalItemIndex(list, rarity);

  if (index === -1) {
    throw new Error(`You do not have ${getUniversalName(rarity)}.`);
  }

  const owned = Math.max(0, Math.floor(Number(list[index]?.amount || 0)));
  const removeAmount = Math.max(1, Math.floor(Number(amount || 1)));

  if (owned < removeAmount) {
    throw new Error(
      `You need **${removeAmount}x ${getUniversalName(rarity)}**, but you only have **${owned}x**.`
    );
  }

  const left = owned - removeAmount;

  if (left <= 0) {
    list.splice(index, 1);
  } else {
    list[index] = {
      ...list[index],
      amount: left,
    };
  }

  return {
    items: list,
    left,
  };
}

function addUniversalItems(items, rarity, amount) {
  const list = Array.isArray(items)
    ? items.map((item) => ({ ...item }))
    : [];

  const rarityKey = String(rarity || "").toUpperCase();
  const template = getUniversalItem(rarityKey);
  const addAmount = Math.max(1, Math.floor(Number(amount || 1)));
  const index = getUniversalItemIndex(list, rarityKey);

  if (index !== -1) {
    list[index] = {
      ...list[index],
      amount: Math.max(0, Math.floor(Number(list[index]?.amount || 0))) + addAmount,
      code: list[index].code || template?.code || getUniversalCode(rarityKey),
      name: list[index].name || template?.name || getUniversalName(rarityKey),
      displayName: list[index].displayName || template?.name || getUniversalName(rarityKey),
      rarity: template?.rarity || rarityKey,
      type: template?.type || "Fragment",
    };

    return list;
  }

  list.push({
    ...(template || {}),
    code: template?.code || getUniversalCode(rarityKey),
    name: template?.name || getUniversalName(rarityKey),
    displayName: template?.name || getUniversalName(rarityKey),
    amount: addAmount,
    rarity: template?.rarity || rarityKey,
    type: template?.type || "Fragment",
  });

  return list;
}

function parseTargetRarity(value) {
  const rarity = String(value || "").toUpperCase().trim();

  if (!MERGE_RULES[rarity]) return null;

  return rarity;
}

function parseAmount(value) {
  const amount = Math.floor(Number(value || 1));

  if (!Number.isFinite(amount) || amount <= 0) return 0;

  return amount;
}

function getUsageText() {
  return [
    "Usage: `op merge <rarity> <amount>`",
    "",
    "Examples:",
    "`op merge b 1` → 5x Universal C Fragment = 1x Universal B Fragment",
    "`op merge a 2` → 30x Universal B Fragment = 2x Universal A Fragment",
    "`op merge s 1` → 3x Universal A Fragment = 1x Universal S Fragment",
    "",
    "Merge Rules:",
    "C → B: 5x Universal C Fragment",
    "B → A: 15x Universal B Fragment",
    "A → S: 3x Universal A Fragment",
  ].join("\n");
}

module.exports = {
  name: "merge",
  aliases: ["umg", "unimerge"],

  async execute(message, args = []) {
    const targetRarity = parseTargetRarity(args[0]);
    const amount = parseAmount(args[1] || 1);

    if (!targetRarity || !amount) {
      return message.reply({
        content: getUsageText(),
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const rule = MERGE_RULES[targetRarity];
    const fromRarity = rule.from;
    const costPerMerge = rule.cost;
    const totalCost = costPerMerge * amount;

    let result = null;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          let items = safeItems(fresh).map((item) => ({ ...item }));

          const ownedInput = getUniversalAmount(items, fromRarity);

          if (ownedInput < totalCost) {
            throw new Error(
              [
                `Not enough ${getUniversalName(fromRarity)}.`,
                "",
                `Required: **${totalCost}x ${getUniversalName(fromRarity)}**`,
                `Owned: **${ownedInput}x ${getUniversalName(fromRarity)}**`,
                "",
                `Command: \`op merge ${targetRarity.toLowerCase()} ${amount}\``,
              ].join("\n")
            );
          }

          const removed = removeUniversalItems(items, fromRarity, totalCost);

          items = addUniversalItems(
            removed.items,
            targetRarity,
            amount
          );

          const outputOwned = getUniversalAmount(items, targetRarity);

          result = {
            fromRarity,
            targetRarity,
            amount,
            costPerMerge,
            totalCost,
            inputLeft: removed.left,
            outputOwned,
          };

          return setItems(fresh, items);
        },
        message.author.username
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to merge universal fragments.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("Universal Fragment Merged")
      .setDescription(
        [
          `**Created:** ${result.amount}x ${getUniversalName(result.targetRarity)}`,
          `**Used:** ${result.totalCost}x ${getUniversalName(result.fromRarity)}`,
          "",
          "**Rate**",
          `${result.costPerMerge}x ${getUniversalName(result.fromRarity)} → 1x ${getUniversalName(result.targetRarity)}`,
          "",
          "**Current Balance**",
          `${getUniversalName(result.fromRarity)}: ${result.inputLeft}`,
          `${getUniversalName(result.targetRarity)}: ${result.outputOwned}`,
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Universal Merge",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};