const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { ITEMS, cloneItem } = require("../data/items");
const devilFruitsDb = require("../data/devilFruits");

const ESSENCE_BY_RARITY = {
  C: 3,
  B: 5,
  A: 8,
  S: 10,
  SS: 12,
  UR: 15,
};

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
        "Usage: `op fbreak <fruit name> <amount/all>`\nExample: `op fbreak sube all`",
    };
  }

  const last = String(args[args.length - 1] || "").toLowerCase();
  const query = args.slice(0, -1).join(" ").trim();

  if (!query) {
    return {
      ok: false,
      message:
        "Usage: `op fbreak <fruit name> <amount/all>`\nExample: `op fbreak sube all`",
    };
  }

  if (last === "all") {
    return {
      ok: true,
      query,
      useAll: true,
      amount: Infinity,
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
  };
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

    const player = getPlayer(message.author.id, message.author.username);
    const devilFruits = Array.isArray(player.devilFruits)
      ? [...player.devilFruits]
      : [];

    const found = findOwnedFruitIndex(devilFruits, parsed.query);

    if (!found) {
      return message.reply({
        content: `Devil Fruit matching \`${parsed.query}\` was not found in your inventory.`,
        allowedMentions: { repliedUser: false },
      });
    }

    const ownedAmount = Math.max(0, Number(devilFruits[found.index].amount || 0));
    const amountToBreak = parsed.useAll ? ownedAmount : parsed.amount;

    if (ownedAmount <= 0) {
      return message.reply({
        content: `You do not have any **${found.fruit.name}** left.`,
        allowedMentions: { repliedUser: false },
      });
    }

    if (amountToBreak > ownedAmount) {
      return message.reply({
        content: `You only have **${ownedAmount}x ${found.fruit.name}**.`,
        allowedMentions: { repliedUser: false },
      });
    }

    const rarity = String(found.fruit.rarity || "C").toUpperCase();
    const essencePerFruit = ESSENCE_BY_RARITY[rarity] || ESSENCE_BY_RARITY.C;
    const essenceAmount = essencePerFruit * amountToBreak;

    const remaining = ownedAmount - amountToBreak;

    if (remaining <= 0) {
      devilFruits.splice(found.index, 1);
    } else {
      devilFruits[found.index] = {
        ...devilFruits[found.index],
        amount: remaining,
      };
    }

    const materials = addStack(
      player.materials || [],
      cloneItem(ITEMS.fruitEssence, essenceAmount)
    );

    updatePlayer(message.author.id, {
      devilFruits,
      materials,
    });

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle("🍈 Devil Fruit Broken Down")
      .setDescription(
        [
          `**Fruit:** ${found.fruit.name}`,
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