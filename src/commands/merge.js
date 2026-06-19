const { EmbedBuilder } = require("discord.js");
const { updatePlayerAtomic } = require("../playerStore");

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

const RARITY_NAMES = {
  C: "Universal C",
  B: "Universal B",
  A: "Universal A",
  S: "Universal S",
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

function getUniversalCode(rarity) {
  return `universal_${String(rarity || "").toLowerCase()}`;
}

function getUniversalName(rarity) {
  const key = String(rarity || "").toUpperCase();
  return RARITY_NAMES[key] || `Universal ${key}`;
}

function isUniversalFragment(fragment, rarity) {
  const targetRarity = String(rarity || "").toUpperCase();
  const code = normalizeCode(fragment?.code);
  const name = normalizeName(
    fragment?.displayName ||
      fragment?.name ||
      fragment?.cardName ||
      fragment?.title
  );

  const validCodes = new Set([
    `universal_${targetRarity.toLowerCase()}`,
    `universal_${targetRarity.toLowerCase()}_fragment`,
    `universal_${targetRarity.toLowerCase()}_fragments`,
    `uni_${targetRarity.toLowerCase()}`,
    `uni_${targetRarity.toLowerCase()}_fragment`,
    `uni_${targetRarity.toLowerCase()}_fragments`,
  ]);

  const validNames = new Set([
    `universal ${targetRarity.toLowerCase()}`,
    `universal ${targetRarity.toLowerCase()} fragment`,
    `universal ${targetRarity.toLowerCase()} fragments`,
    `uni ${targetRarity.toLowerCase()}`,
    `uni ${targetRarity.toLowerCase()} fragment`,
    `uni ${targetRarity.toLowerCase()} fragments`,
  ]);

  return validCodes.has(code) || validNames.has(name);
}

function getUniversalFragmentIndex(fragments, rarity) {
  return (Array.isArray(fragments) ? fragments : []).findIndex((fragment) =>
    isUniversalFragment(fragment, rarity)
  );
}

function getUniversalAmount(fragments, rarity) {
  const index = getUniversalFragmentIndex(fragments, rarity);
  if (index === -1) return 0;

  return Math.max(0, Math.floor(Number(fragments[index]?.amount || 0)));
}

function removeUniversalFragments(fragments, rarity, amount) {
  const list = Array.isArray(fragments)
    ? fragments.map((fragment) => ({ ...fragment }))
    : [];

  const index = getUniversalFragmentIndex(list, rarity);

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
    fragments: list,
    left,
  };
}

function addUniversalFragments(fragments, rarity, amount) {
  const list = Array.isArray(fragments)
    ? fragments.map((fragment) => ({ ...fragment }))
    : [];

  const addAmount = Math.max(1, Math.floor(Number(amount || 1)));
  const index = getUniversalFragmentIndex(list, rarity);

  if (index !== -1) {
    list[index] = {
      ...list[index],
      amount: Math.max(0, Math.floor(Number(list[index]?.amount || 0))) + addAmount,
      rarity: String(rarity || "").toUpperCase(),
      category: "universal",
      code: list[index].code || getUniversalCode(rarity),
      name: list[index].name || getUniversalName(rarity),
    };

    return list;
  }

  list.push({
    name: getUniversalName(rarity),
    displayName: getUniversalName(rarity),
    amount: addAmount,
    rarity: String(rarity || "").toUpperCase(),
    category: "universal",
    code: getUniversalCode(rarity),
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
    "`op merge b 1` → 5x Universal C = 1x Universal B",
    "`op merge a 2` → 30x Universal B = 2x Universal A",
    "`op merge s 1` → 3x Universal A = 1x Universal S",
    "",
    "Merge Rules:",
    "C → B: 5x Universal C",
    "B → A: 15x Universal B",
    "A → S: 3x Universal A",
  ].join("\n");
}

module.exports = {
  name: "merge",

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
          let fragments = Array.isArray(fresh.fragments)
            ? fresh.fragments.map((fragment) => ({ ...fragment }))
            : [];

          const ownedInput = getUniversalAmount(fragments, fromRarity);

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

          const removed = removeUniversalFragments(
            fragments,
            fromRarity,
            totalCost
          );

          fragments = addUniversalFragments(
            removed.fragments,
            targetRarity,
            amount
          );

          const outputOwned = getUniversalAmount(fragments, targetRarity);

          result = {
            fromRarity,
            targetRarity,
            amount,
            costPerMerge,
            totalCost,
            inputLeft: removed.left,
            outputOwned,
          };

          return {
            ...fresh,
            fragments,
          };
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