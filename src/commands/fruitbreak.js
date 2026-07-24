const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const { ITEMS, cloneItem } = require("../data/items");
const devilFruitsDb = require("../data/devilFruits");

const ESSENCE_BY_RARITY = {
  C: 5,
  B: 15,
  A: 20,
  S: 25,
  UR: 100,
};

const BULK_BREAK_RARITIES = new Set(
  Object.keys(ESSENCE_BY_RARITY)
);

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^model:\s*/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function scoreQuery(query, candidates) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;
  const qWords = q.split(" ").filter(Boolean);

  for (const raw of candidates.filter(Boolean)) {
    const value = normalize(raw);
    if (!value) continue;

    if (value === q) best = Math.max(best, 1000 + value.length);
    else if (value.startsWith(q)) best = Math.max(best, 800 + q.length);
    else if (value.includes(q)) best = Math.max(best, 500 + q.length);
    else if (qWords.length && qWords.every((word) => value.includes(word))) {
      best = Math.max(best, 300 + qWords.join("").length);
    }
  }

  return best;
}

function findFruitTemplate(value) {
  const q = normalize(value);
  if (!q) return null;

  const scored = (Array.isArray(devilFruitsDb) ? devilFruitsDb : [])
    .map((fruit) => ({
      fruit,
      score: scoreQuery(q, [
        fruit.code,
        fruit.name,
        fruit.displayName,
        fruit.type,
        ...(Array.isArray(fruit.aliases) ? fruit.aliases : []),
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].fruit : null;
}

function findOwnedFruitIndex(devilFruits, query) {
  const scored = (Array.isArray(devilFruits) ? devilFruits : [])
    .map((fruit, index) => {
      const template = findFruitTemplate(fruit.code || fruit.name) || {};
      return {
        index,
        fruit: {
          ...template,
          ...fruit,
          name: template.name || fruit.name,
          code: template.code || fruit.code,
          rarity: template.rarity || fruit.rarity,
        },
        score: scoreQuery(query, [
          fruit.code,
          fruit.name,
          fruit.displayName,
          template.code,
          template.name,
          template.displayName,
          template.type,
          ...(Array.isArray(template.aliases) ? template.aliases : []),
        ]),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0] : null;
}

function addStack(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = String(item?.code || "").toLowerCase();

  const index = arr.findIndex(
    (entry) => String(entry?.code || "").toLowerCase() === code
  );

  if (index >= 0) {
    arr[index] = {
      ...arr[index],
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

function parseArgs(args) {
  if (!Array.isArray(args) || args.length < 2) {
    return {
      ok: false,
      message:
        "Usage: `op fbreak <fruit name> <amount/all>` or `op fbreak <rarity> all`\nExamples: `op fbreak sube all`, `op fbreak c all`",
    };
  }

  const last = String(
    args[args.length - 1] || ""
  ).toLowerCase();

  const query = args
    .slice(0, -1)
    .join(" ")
    .trim();

  if (!query) {
    return {
      ok: false,
      message:
        "Usage: `op fbreak <fruit name> <amount/all>` or `op fbreak <rarity> all`\nExamples: `op fbreak sube all`, `op fbreak c all`",
    };
  }

  if (last === "all") {
    const bulkRarity =
      args.length === 2 &&
      BULK_BREAK_RARITIES.has(
        String(args[0] || "").toUpperCase()
      )
        ? String(args[0]).toUpperCase()
        : null;

    return {
      ok: true,
      query,
      useAll: true,
      amount: Infinity,
      bulkRarity,
    };
  }

  const amount = Math.floor(Number(last));

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      message: "Invalid amount. Use a positive number or `all`.",
    };
  }

  return {
    ok: true,
    query,
    useAll: false,
    amount,
    bulkRarity: null,
  };
}

async function breakAllFruitsByRarity(message, targetRarity) {
  let totalBroken = 0;
  let totalEssence = 0;
  let fruitTypesBroken = 0;

  try {
    updatePlayerAtomic(
      message.author.id,
      (fresh) => {
        const devilFruits = Array.isArray(fresh.devilFruits)
          ? [...fresh.devilFruits]
          : [];

        const remainingFruits = [];

        for (const ownedFruit of devilFruits) {
          const template =
            findFruitTemplate(
              ownedFruit.code || ownedFruit.name
            ) || {};

          const rarity = String(
            template.rarity ||
              ownedFruit.rarity ||
              "C"
          ).toUpperCase();

          const amount = Math.max(
            0,
            Math.floor(
              Number(ownedFruit.amount || 0)
            )
          );

          if (rarity !== targetRarity || amount <= 0) {
            remainingFruits.push(ownedFruit);
            continue;
          }

          totalBroken += amount;
          fruitTypesBroken += 1;
          totalEssence +=
            amount *
            (ESSENCE_BY_RARITY[targetRarity] ||
              ESSENCE_BY_RARITY.C);
        }

        if (totalBroken <= 0) {
          throw new Error(
            `You do not have any ${targetRarity} rarity Devil Fruits.`
          );
        }

        const materials = addStack(
          fresh.materials || [],
          cloneItem(
            ITEMS.fruitEssence,
            totalEssence
          )
        );

        return {
          ...fresh,
          devilFruits: remainingFruits,
          materials,
        };
      },
      message.author.username
    );
  } catch (error) {
    return message.reply({
      content:
        error.message ||
        "Failed to break Devil Fruits.",
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("🍈 Devil Fruits Broken Down")
    .setDescription(
      [
        `**Rarity:** ${targetRarity}`,
        `**Fruit Types Broken:** ${fruitTypesBroken}`,
        `**Total Fruits Broken:** x${totalBroken}`,
        `**Fruit Essence Gained:** +${totalEssence}`,
        "",
        "Use `op fshop` to see what you can buy with Fruit Essence.",
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Fruit Essence",
    });

  return message.reply({
    embeds: [embed],
    allowedMentions: {
      repliedUser: false,
    },
  });
}

module.exports = {
  name: "fruitbreak",
  aliases: ["fbreak"],

  async execute(message, args = []) {
    const parsed = parseArgs(args);

    if (!parsed.ok) {
      return message.reply({
        content: parsed.message,
        allowedMentions: { repliedUser: false },
      });
    }

    if (parsed.bulkRarity) {
      return breakAllFruitsByRarity(
        message,
        parsed.bulkRarity
      );
    }

    let foundFruit = null;
    let rarity = "C";
    let essencePerFruit = 0;
    let essenceAmount = 0;
    let amountToBreak = 0;
    let remaining = 0;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const devilFruits = Array.isArray(fresh.devilFruits)
            ? [...fresh.devilFruits]
            : [];

          const found = findOwnedFruitIndex(devilFruits, parsed.query);

          if (!found) {
            throw new Error(
              `Devil Fruit matching \`${parsed.query}\` was not found in your inventory.`
            );
          }

          foundFruit = found.fruit;

          const ownedAmount = Math.max(
            0,
            Number(devilFruits[found.index].amount || 0)
          );

          amountToBreak = parsed.useAll ? ownedAmount : parsed.amount;

          if (ownedAmount <= 0) {
            throw new Error(`You do not have any **${found.fruit.name}** left.`);
          }

          if (amountToBreak > ownedAmount) {
            throw new Error(`You only have **${ownedAmount}x ${found.fruit.name}**.`);
          }

          rarity = String(found.fruit.rarity || "C").toUpperCase();
          essencePerFruit = ESSENCE_BY_RARITY[rarity] || ESSENCE_BY_RARITY.C;
          essenceAmount = essencePerFruit * amountToBreak;
          remaining = ownedAmount - amountToBreak;

          if (remaining <= 0) {
            devilFruits.splice(found.index, 1);
          } else {
            devilFruits[found.index] = {
              ...devilFruits[found.index],
              amount: remaining,
            };
          }

          const materials = addStack(
            fresh.materials || [],
            cloneItem(ITEMS.fruitEssence, essenceAmount)
          );

          return {
            ...fresh,
            devilFruits,
            materials,
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to break Devil Fruit.",
        allowedMentions: { repliedUser: false },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle("🍈 Devil Fruit Broken Down")
      .setDescription(
        [
          `**Fruit:** ${foundFruit.name}`,
          `**Rarity:** ${rarity}`,
          `**Broken:** x${amountToBreak}`,
          `**Fruit Essence Gained:** +${essenceAmount}`,
          `**Remaining Fruit:** ${remaining}`,
          "",
          "Use `op fshop` to see what you can buy with Fruit Essence.",
        ].join("\n")
      )
      .setFooter({
        text: "One Piece Bot • Fruit Essence",
      });

    return message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  },
};