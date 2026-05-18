const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const rawCards = require("../data/cards");

const UNIVERSAL_FRAGMENT_BY_RARITY = {
  C: { code: "universal_c", name: "Universal C Fragment" },
  B: { code: "universal_b", name: "Universal B Fragment" },
  A: { code: "universal_a", name: "Universal A Fragment" },
  S: { code: "universal_s", name: "Universal S Fragment" },
};

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getCardName(card) {
  return card.displayName || card.name || "Unknown Card";
}

function findBattleOrBoostCard(query) {
  const q = normalize(query);
  if (!q) return null;

  const cards = rawCards.filter((card) => {
    const role = String(card.cardRole || "").toLowerCase();
    return role === "battle" || role === "boost";
  });

  return (
    cards.find((card) => normalize(card.code) === q) ||
    cards.find((card) => normalize(getCardName(card)) === q) ||
    cards.find((card) => normalize(card.code).includes(q)) ||
    cards.find((card) => normalize(getCardName(card)).includes(q)) ||
    null
  );
}

function addFragment(list, card, amount) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = String(card.code || "");
  const index = arr.findIndex(
    (entry) => String(entry.code || "").toLowerCase() === code.toLowerCase()
  );

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 0) + Number(amount || 0),
    };
    return arr;
  }

  arr.push({
    name: getCardName(card),
    amount: Number(amount || 0),
    rarity: card.baseTier || card.rarity || "C",
    category: String(card.cardRole || "").toLowerCase() === "boost" ? "boost" : "battle",
    code: card.code,
    image: card.image || "",
  });

  return arr;
}

function removeUniversalFragment(items, universalCode, amount) {
  const arr = Array.isArray(items) ? [...items] : [];
  const index = arr.findIndex(
    (item) => String(item.code || "").toLowerCase() === universalCode.toLowerCase()
  );

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

function getUniversalOwned(items, universalCode) {
  const found = (Array.isArray(items) ? items : []).find(
    (item) => String(item.code || "").toLowerCase() === universalCode.toLowerCase()
  );

  return Number(found?.amount || 0);
}

module.exports = {
  name: "convert",

  async execute(message, args) {
    const amount = Math.floor(Number(args[0] || 0));
    const query = args.slice(1).join(" ").trim();

    if (!amount || amount <= 0 || !query) {
      return message.reply({
        content: [
          "Usage: `op convert <amount> <card name>`",
          "Example: `op convert 5 luffy`",
          "",
          "Only battle and boost cards can be converted.",
          "Imu cannot use universal fragments.",
        ].join("\n"),
        allowedMentions: { repliedUser: false },
      });
    }

    const previewPlayer = getPlayer(message.author.id, message.author.username);
    const card = findBattleOrBoostCard(query);

    if (!card) {
      return message.reply({
        content: `Battle or boost card matching \`${query}\` was not found.`,
        allowedMentions: { repliedUser: false },
      });
    }

    if (String(card.code || "").toLowerCase() === "imu") {
      return message.reply({
        content: "Universal fragments cannot be converted into **Imu** fragments.",
        allowedMentions: { repliedUser: false },
      });
    }

    const rarity = String(card.baseTier || card.rarity || "C").toUpperCase();
    const universal = UNIVERSAL_FRAGMENT_BY_RARITY[rarity];

    if (!universal) {
      return message.reply({
        content: `Universal fragment conversion is not available for rarity **${rarity}**.`,
        allowedMentions: { repliedUser: false },
      });
    }

    const previewOwnedUniversal = getUniversalOwned(previewPlayer.items || [], universal.code);

    if (previewOwnedUniversal < amount) {
      return message.reply({
        content: `You need **${amount}x ${universal.name}** to convert into **${getCardName(card)} Fragment**.\nYou currently have **${previewOwnedUniversal}x**.`,
        allowedMentions: { repliedUser: false },
      });
    }

    let remainingUniversal = previewOwnedUniversal - amount;

    try {
      updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const ownedUniversal = getUniversalOwned(fresh.items || [], universal.code);

          if (ownedUniversal < amount) {
            throw new Error(
              `You need **${amount}x ${universal.name}** to convert into **${getCardName(card)} Fragment**.\nYou currently have **${ownedUniversal}x**.`
            );
          }

          const updatedItems = removeUniversalFragment(fresh.items || [], universal.code, amount);

          if (!updatedItems) {
            throw new Error("Failed to consume universal fragments.");
          }

          const updatedFragments = addFragment(fresh.fragments || [], card, amount);
          remainingUniversal = ownedUniversal - amount;

          return {
            ...fresh,
            items: updatedItems,
            fragments: updatedFragments,
          };
        },
        message.author.username
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to convert universal fragments.",
        allowedMentions: { repliedUser: false },
      });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle("Universal Fragment Converted")
          .setDescription(
            [
              `**Used:** ${universal.name} x${amount}`,
              `**Received:** ${getCardName(card)} Fragment x${amount}`,
              `**Rarity:** ${rarity}`,
              `**Type:** ${String(card.cardRole || "battle").toUpperCase()}`,
              `**Remaining Universal Fragments:** ${remainingUniversal}`,
            ].join("\n")
          )
          .setFooter({
            text: "One Piece Bot • Convert",
          }),
      ],
      allowedMentions: { repliedUser: false },
    });
  },
};