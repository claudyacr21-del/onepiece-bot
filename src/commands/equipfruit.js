const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const devilFruits = require("../data/devilFruits");
const { hydrateCard } = require("../utils/evolution");
const {
  getEffectiveBoostValue,
  findBoostFruitByCode,
  getPassiveBoostSummary,
} = require("../utils/passiveBoosts");

let assetLinks = {};
try {
  assetLinks = require("../config/assetLinks") || {};
} catch (_) {
  assetLinks = {};
}

function normalizeCompare(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^model:\s*/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCode(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^model:\s*/i, "")
    .replace(/[^a-z0-9\s_-]+/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCompact(value) {
  return normalizeCompare(value).replace(/\s+/g, "");
}

function normalizeAssetKey(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^model:\s*/i, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function pushKey(keys, value) {
  const raw = String(value || "").trim();
  if (!raw) return;

  keys.push(raw);
  keys.push(normalizeCode(raw));
  keys.push(normalizeCompare(raw));
  keys.push(normalizeCompact(raw));
  keys.push(normalizeAssetKey(raw));
}

function getCurrentForm(card) {
  const stage = Math.max(1, Math.min(3, Number(card?.evolutionStage || 1)));
  return Array.isArray(card?.evolutionForms) ? card.evolutionForms[stage - 1] : null;
}

function getCardOwnerKeys(card) {
  const hydrated = hydrateCard(card) || card || {};
  const form = getCurrentForm(hydrated);
  const keys = [];

  [
    hydrated.code,
    hydrated.id,
    hydrated.baseCode,
    hydrated.cardCode,
    hydrated.characterCode,
    hydrated.templateCode,
    hydrated.name,
    hydrated.displayName,
    hydrated.title,
    hydrated.variant,
    hydrated.evolutionKey,
    hydrated.specialForm,
    hydrated.formName,
    hydrated.currentForm,
    form?.name,
    form?.title,
    form?.code,
    form?.evolutionKey,
  ].forEach((value) => pushKey(keys, value));

  const joined = keys.map(normalizeCompare).filter(Boolean).join(" ");
  const compactJoined = keys.map(normalizeCompact).filter(Boolean).join(" ");

  const isLuffyLike =
    joined.includes("luffy") ||
    joined.includes("monkey d luffy") ||
    joined.includes("nika") ||
    joined.includes("gear 5") ||
    joined.includes("gear fifth") ||
    compactJoined.includes("monkeydluffy") ||
    compactJoined.includes("gear5") ||
    compactJoined.includes("gearfifth");

  if (isLuffyLike) {
    [
      "luffy_straw_hat",
      "monkey_d_luffy",
      "monkey d luffy",
      "luffy",
      "luffy_nika",
      "gear_5_luffy",
      "gear 5 luffy",
      "gear fifth luffy",
      "sun god nika",
      "nika",
      "joy boy",
    ].forEach((value) => pushKey(keys, value));
  }

  return new Set(keys.map(String).filter(Boolean));
}

function getFruitOwnerKeys(fruit) {
  const keys = [];
  const owners = Array.isArray(fruit?.owners) ? fruit.owners : [];

  owners.forEach((owner) => pushKey(keys, owner));

  return new Set(keys.map(String).filter(Boolean));
}

function findFruitTemplate(value) {
  const queryCode = normalizeCode(value);
  const queryText = normalizeCompare(value);
  const queryCompact = normalizeCompact(value);

  if (!queryCode && !queryText && !queryCompact) return null;

  return (
    devilFruits.find((fruit) => normalizeCode(fruit.code) === queryCode) ||
    devilFruits.find((fruit) => normalizeCompare(fruit.name) === queryText) ||
    devilFruits.find((fruit) => normalizeCompact(fruit.name) === queryCompact) ||
    devilFruits.find(
      (fruit) => queryCode && normalizeCode(fruit.code).includes(queryCode)
    ) ||
    devilFruits.find(
      (fruit) => queryText && normalizeCompare(fruit.name).includes(queryText)
    ) ||
    devilFruits.find(
      (fruit) => queryCompact && normalizeCompact(fruit.name).includes(queryCompact)
    ) ||
    null
  );
}

function isUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function getFruitAssetKeys(fruit) {
  const keys = new Set();

  const add = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return;

    keys.add(raw);
    keys.add(normalizeAssetKey(raw));
    keys.add(normalizeCode(raw));
    keys.add(normalizeCompare(raw));
    keys.add(normalizeCompact(raw));
  };

  add(fruit?.code);
  add(fruit?.name);
  add(fruit?.displayName);
  add(fruit?.id);
  add(fruit?.key);
  add(fruit?.assetKey);
  add(fruit?.imageKey);

  const name = String(fruit?.name || "");

  if (name.includes(",")) {
    name
      .split(",")
      .map((x) => x.trim())
      .forEach(add);
  }

  const modelMatch = name.match(/model:\s*(.+)$/i);
  if (modelMatch?.[1]) add(modelMatch[1]);

  const noMiMatch = name.match(/^(.+?)\s+no\s+mi/i);
  if (noMiMatch?.[1]) add(noMiMatch[1]);

  const codeParts = String(fruit?.code || "").split("_").filter(Boolean);
  if (codeParts.length) {
    add(codeParts[codeParts.length - 1]);
    add(codeParts.slice(-2).join("_"));
    add(codeParts.slice(-2).join(" "));
  }

  return [...keys].filter(Boolean);
}

function pickImageFromValue(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return isUrl(value) ? value.trim() : "";
  }

  if (typeof value !== "object") return "";

  return (
    pickImageFromValue(value.image) ||
    pickImageFromValue(value.imageUrl) ||
    pickImageFromValue(value.img) ||
    pickImageFromValue(value.icon) ||
    pickImageFromValue(value.thumbnail) ||
    pickImageFromValue(value.asset) ||
    pickImageFromValue(value.url) ||
    pickImageFromValue(value.poster) ||
    pickImageFromValue(value.card) ||
    pickImageFromValue(value.full) ||
    ""
  );
}

function findFruitImageInAssetLinks(fruit) {
  if (!fruit || !assetLinks) return "";

  const keys = getFruitAssetKeys(fruit);
  const normalizedKeys = new Set(keys.map(normalizeAssetKey).filter(Boolean));

  const directBuckets = [
    assetLinks?.devilFruits,
    assetLinks?.DEVIL_FRUITS,
    assetLinks?.devilFruitImages,
    assetLinks?.DEVIL_FRUIT_IMAGES,
    assetLinks?.fruitImages,
    assetLinks?.FRUIT_IMAGES,
    assetLinks?.fruits,
    assetLinks?.FRUITS,
    assetLinks?.fruit,
    assetLinks?.FRUIT,
    assetLinks?.assets?.devilFruits,
    assetLinks?.assets?.fruits,
    assetLinks?.images?.devilFruits,
    assetLinks?.images?.fruits,
    assetLinks?.links?.devilFruits,
    assetLinks?.links?.fruits,
  ].filter(Boolean);

  for (const bucket of directBuckets) {
    if (Array.isArray(bucket)) {
      const found = bucket.find((entry) => {
        const entryKeys = getFruitAssetKeys(entry).map(normalizeAssetKey);
        return entryKeys.some((key) => normalizedKeys.has(key));
      });

      const image = pickImageFromValue(found);
      if (image) return image;
    }

    if (bucket && typeof bucket === "object") {
      for (const key of keys) {
        const value =
          bucket[key] ||
          bucket[normalizeAssetKey(key)] ||
          bucket[normalizeCode(key)] ||
          bucket[normalizeCompare(key)] ||
          bucket[normalizeCompact(key)];

        const image = pickImageFromValue(value);
        if (image) return image;
      }
    }
  }

  const visited = new Set();

  function deepSearch(node) {
    if (!node || typeof node !== "object" || visited.has(node)) return "";

    visited.add(node);

    for (const [key, value] of Object.entries(node)) {
      const normalizedKey = normalizeAssetKey(key);

      if (normalizedKeys.has(normalizedKey)) {
        const image = pickImageFromValue(value);
        if (image) return image;
      }

      if (value && typeof value === "object") {
        const valueKey = normalizeAssetKey(
          value.code ||
            value.id ||
            value.key ||
            value.assetKey ||
            value.imageKey ||
            value.name ||
            value.displayName ||
            ""
        );

        if (normalizedKeys.has(valueKey)) {
          const image = pickImageFromValue(value);
          if (image) return image;
        }

        const nested = deepSearch(value);
        if (nested) return nested;
      }
    }

    return "";
  }

  return deepSearch(assetLinks);
}

function getFruitImage(fruit) {
  return pickImageFromValue(fruit) || findFruitImageInAssetLinks(fruit) || "";
}

function resolveFruitData(ownedFruit) {
  const template = findFruitTemplate(ownedFruit?.code || ownedFruit?.name);

  const resolved = {
    ...(template || {}),
    ...(ownedFruit || {}),
    owners:
      Array.isArray(template?.owners) && template.owners.length
        ? template.owners
        : Array.isArray(ownedFruit?.owners)
          ? ownedFruit.owners
          : [],
    statPercent:
      template?.statPercent ||
      ownedFruit?.statPercent ||
      ownedFruit?.statBonus ||
      {
        atk: 0,
        hp: 0,
        speed: 0,
      },
    name: template?.name || ownedFruit?.name || "Unknown Devil Fruit",
    code: template?.code || ownedFruit?.code || "",
    type: template?.type || ownedFruit?.type || "Devil Fruit",
    rarity: template?.rarity || ownedFruit?.rarity || "B",
    description: template?.description || ownedFruit?.description || "",
  };

  resolved.image = getFruitImage(template) || getFruitImage(ownedFruit) || "";

  return resolved;
}

function canCardUseDevilFruit(card, fruit) {
  const resolvedFruit = resolveFruitData(fruit);

  if (!Array.isArray(resolvedFruit.owners) || resolvedFruit.owners.length === 0) {
    return true;
  }

  const cardKeys = getCardOwnerKeys(card);
  const fruitOwnerKeys = getFruitOwnerKeys(resolvedFruit);

  for (const key of cardKeys) {
    if (fruitOwnerKeys.has(key)) return true;
  }

  return false;
}

function normalize(text) {
  return normalizeCompare(text);
}

function getCardSearchStrings(card) {
  const hydrated = hydrateCard(card) || card || {};
  const form = getCurrentForm(hydrated);

  return [
    hydrated.displayName,
    hydrated.name,
    hydrated.title,
    hydrated.variant,
    hydrated.code,
    hydrated.baseCode,
    hydrated.evolutionKey,
    form?.name,
    form?.title,
    `${hydrated.name || ""} ${hydrated.title || ""}`.trim(),
    `${hydrated.displayName || ""} ${form?.name || ""}`.trim(),
  ]
    .filter(Boolean)
    .map(normalize);
}

function getFruitSearchStrings(fruit) {
  const resolved = resolveFruitData(fruit);

  return [
    resolved.name,
    resolved.code,
    resolved.type,
    String(resolved.name || "").replace(/^Hito Hito no Mi,\s*/i, ""),
    String(resolved.name || "").replace(/^.*Model:\s*/i, ""),
  ]
    .filter(Boolean)
    .map(normalize);
}

function scoreMatch(query, candidates) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (candidate === q) {
      best = Math.max(best, 1000 + candidate.length);
      continue;
    }

    if (candidate.startsWith(q)) {
      best = Math.max(best, 700 + q.length);
      continue;
    }

    if (candidate.includes(q)) {
      best = Math.max(best, 400 + q.length);
      continue;
    }

    const qWords = q.split(" ").filter(Boolean);

    if (qWords.length && qWords.every((word) => candidate.includes(word))) {
      best = Math.max(best, 250 + qWords.join("").length);
    }
  }

  return best;
}

function findCardCandidates(cards, query) {
  return cards
    .map((card) => ({
      card: hydrateCard(card) || card,
      score: scoreMatch(query, getCardSearchStrings(card)),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

function findFruitCandidates(fruits, query) {
  return fruits
    .map((fruit) => {
      const resolved = resolveFruitData(fruit);

      return {
        fruit: resolved,
        score: scoreMatch(query, getFruitSearchStrings(resolved)),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

function splitIntoAllPairs(rawArgs) {
  const parts = rawArgs.map((x) => String(x).trim()).filter(Boolean);
  const pairs = [];

  for (let i = 1; i < parts.length; i++) {
    pairs.push({
      cardQuery: parts.slice(0, i).join(" "),
      fruitQuery: parts.slice(i).join(" "),
    });
  }

  return pairs;
}

function parseCardAndFruit(cards, fruits, rawArgs) {
  const joined = normalize(rawArgs.join(" "));

  if (!joined) {
    return {
      card: null,
      fruit: null,
      ambiguous: false,
      cardOptions: [],
      fruitOptions: [],
    };
  }

  const pairs = splitIntoAllPairs(rawArgs);
  let bestPair = null;

  for (const pair of pairs) {
    const cardCandidates = findCardCandidates(cards, pair.cardQuery);
    const fruitCandidates = findFruitCandidates(fruits, pair.fruitQuery);

    if (!cardCandidates.length || !fruitCandidates.length) continue;

    const cardTop = cardCandidates[0];
    const fruitTop = fruitCandidates[0];
    const pairScore = cardTop.score + fruitTop.score;

    if (!bestPair || pairScore > bestPair.score) {
      bestPair = {
        score: pairScore,
        card: cardTop.card,
        fruit: fruitTop.fruit,
      };
    }
  }

  if (bestPair) {
    return {
      card: bestPair.card,
      fruit: bestPair.fruit,
      ambiguous: false,
      cardOptions: [],
      fruitOptions: [],
    };
  }

  const cardCandidates = findCardCandidates(cards, joined).slice(0, 10);
  const fruitCandidates = findFruitCandidates(fruits, joined).slice(0, 10);

  return {
    card: cardCandidates.length === 1 ? cardCandidates[0].card : null,
    fruit: fruitCandidates.length === 1 ? fruitCandidates[0].fruit : null,
    ambiguous: cardCandidates.length > 1 || fruitCandidates.length > 1,
    cardOptions: cardCandidates.map((entry) => entry.card),
    fruitOptions: fruitCandidates.map((entry) => entry.fruit),
  };
}

function buildChoiceEmbed(type, options) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(type === "card" ? "Choose a Card" : "Choose a Devil Fruit")
    .setDescription(
      options.length
        ? options
            .map((item, index) =>
              type === "card"
                ? `${index + 1}. ${item.displayName || item.name}`
                : `${index + 1}. ${item.name}`
            )
            .join("\n")
        : "No options found."
    );
}

function buildChoiceMenu(type, roomId, options) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`equipfruit_pick_${type}_${roomId}`)
      .setPlaceholder(type === "card" ? "Select a card" : "Select a devil fruit")
      .addOptions(
        options.slice(0, 25).map((item, index) => ({
          label:
            type === "card"
              ? String(item.displayName || item.name || `Card ${index + 1}`).slice(0, 100)
              : String(item.name || `Fruit ${index + 1}`).slice(0, 100),
          value: type === "card" ? String(item.instanceId) : String(item.code),
          description: `Code: ${String(item.code || "-").slice(0, 100)}`,
        }))
      )
  );
}

async function safeUpdateInteraction(interaction, payload) {
  try {
    if (!interaction.deferred && !interaction.replied) {
      return await interaction.update(payload);
    }

    if (interaction.message) {
      return await interaction.message.edit(payload);
    }

    return null;
  } catch (error) {
    console.error("[EQUIP FRUIT INTERACTION ERROR]", error);
    return null;
  }
}

function getBoostedDisplayStats(card, boosts = {}) {
  const hydrated = hydrateCard(card) || card || {};

  if (String(hydrated.cardRole || "").toLowerCase() === "boost") {
    return hydrated;
  }

  return {
    ...hydrated,
    atk: Math.floor(Number(hydrated.atk || 0) * (1 + Number(boosts.atk || 0) / 100)),
    hp: Math.floor(Number(hydrated.hp || 0) * (1 + Number(boosts.hp || 0) / 100)),
    speed: Math.floor(Number(hydrated.speed || 0) * (1 + Number(boosts.spd || 0) / 100)),
  };
}

function getFinalDisplayStats(card, boosts = {}) {
  const boosted = getBoostedDisplayStats(card, boosts);

  const atk = Number(boosted.atk || 0);
  const hp = Number(boosted.hp || 0);
  const speed = Number(boosted.speed || 0);

  return {
    atk,
    hp,
    speed,
    atkMin: Math.floor(atk * 0.85),
    atkMax: Math.floor(atk * 1.15),
  };
}

async function equipFruitToCard(message, player, card, fruit) {
  let syncedCard = null;
  let resolvedFruitData = null;

  try {
    updatePlayerAtomic(
      message.author.id,
      (freshPlayer) => {
        const cards = [...(freshPlayer.cards || [])];
        const ownedFruits = [...(freshPlayer.devilFruits || [])];

        const cardIndex = cards.findIndex(
          (item) => String(item.instanceId) === String(card.instanceId)
        );

        if (cardIndex === -1) {
          throw new Error("You do not own that card.");
        }

        const hydratedCard = hydrateCard(cards[cardIndex]) || cards[cardIndex];

        if (hydratedCard.equippedDevilFruit || cards[cardIndex].equippedDevilFruit) {
          throw new Error("This card already has a devil fruit equipped, and it cannot be removed.");
        }

        const fruitIndex = ownedFruits.findIndex(
          (item) =>
            normalizeCode(item.code) === normalizeCode(fruit.code) ||
            normalizeCompare(item.name) === normalizeCompare(fruit.name)
        );

        if (fruitIndex === -1) {
          throw new Error("You do not own that devil fruit.");
        }

        const fruitForValidation = resolveFruitData(ownedFruits[fruitIndex]);

        if (
          Array.isArray(fruitForValidation.owners) &&
          fruitForValidation.owners.length &&
          !canCardUseDevilFruit(hydratedCard, fruitForValidation)
        ) {
          throw new Error(
            [
              "That devil fruit cannot be used by this card.",
              "",
              `Card: ${hydratedCard.displayName || hydratedCard.name || hydratedCard.code}`,
              `Fruit: ${fruitForValidation.name}`,
              `Owner Signature: ${fruitForValidation.owners.join(", ")}`,
            ].join("\n")
          );
        }

        cards[cardIndex] = hydrateCard({
          ...cards[cardIndex],
          equippedDevilFruit: fruitForValidation.code,
          equippedDevilFruitName: fruitForValidation.name,
        });

        syncedCard = hydrateCard(cards[cardIndex]) || cards[cardIndex];

        const currentAmount = Number(ownedFruits[fruitIndex].amount || 1);

        if (currentAmount <= 1) {
          ownedFruits.splice(fruitIndex, 1);
        } else {
          ownedFruits[fruitIndex] = {
            ...ownedFruits[fruitIndex],
            amount: currentAmount - 1,
          };
        }

        return {
          ...freshPlayer,
          cards,
          devilFruits: ownedFruits,
        };
      },
      message.author.username
    );
  } catch (error) {
    return message.reply({
      content: error.message || "Failed to equip Devil Fruit.",
      allowedMentions: {
        repliedUser: false,
      },
    });
  }

  const fruitTemplate = findFruitTemplate(fruit?.code || fruit?.name);
  const boostFruitData = findBoostFruitByCode(fruit?.code);

  resolvedFruitData = {
    ...(fruitTemplate || {}),
    ...(fruit || {}),
    ...(syncedCard.equippedDevilFruitData || {}),
  };

  resolvedFruitData.image =
    getFruitImage(syncedCard.equippedDevilFruitData) ||
    getFruitImage(fruitTemplate) ||
    getFruitImage(fruit) ||
    "";

  const latestPlayer = getPlayer(message.author.id, message.author.username);
  const accountBoosts = getPassiveBoostSummary(latestPlayer);

  const isBoost = syncedCard.cardRole === "boost";
  const effectiveValue = isBoost ? getEffectiveBoostValue(syncedCard) : null;
  const finalStats = getFinalDisplayStats(syncedCard, accountBoosts);

  const suffix =
    isBoost && ["atk", "hp", "spd", "exp", "dmg"].includes(syncedCard.boostType)
      ? "%"
      : "";

  const percent = resolvedFruitData?.statPercent || {
    atk: 0,
    hp: 0,
    speed: 0,
  };

  const fruitImage = getFruitImage(resolvedFruitData);

  const embed = new EmbedBuilder()
    .setColor(isBoost ? 0x9b59b6 : 0x2ecc71)
    .setTitle("🍎 Devil Fruit Equipped")
    .setDescription(
      [
        `**Card:** ${syncedCard.displayName || syncedCard.name}`,
        `**Fruit:** ${resolvedFruitData?.name || fruit.name}`,
        !isBoost ? `**ATK:** ${finalStats.atkMin}-${finalStats.atkMax}` : null,
        !isBoost ? `**HP:** ${finalStats.hp}` : null,
        !isBoost ? `**SPD:** ${finalStats.speed}` : null,
        !isBoost
          ? `**Fruit Bonus:** +${Number(percent.atk || 0)}% ATK / +${Number(
              percent.hp || 0
            )}% HP / +${Number(percent.speed || 0)}% SPD`
          : null,
        isBoost ? `**Boost Type:** \`${syncedCard.boostType}\`` : null,
        isBoost ? `**Final Boost Value:** \`${effectiveValue}${suffix}\`` : null,
        isBoost && boostFruitData?.boostBonus
          ? `**Fruit Bonus Applied:** \`${Number(
              boostFruitData.boostBonus[syncedCard.boostType] || 0
            )}${suffix}\``
          : null,
        "",
        "This equip is permanent and cannot be removed.",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Devil Fruit Equip",
    });

  if (fruitImage) {
    embed.setImage(fruitImage);
  }

  return message.reply({
    embeds: [embed],
    allowedMentions: {
      repliedUser: false,
    },
  });
}

module.exports = {
  name: "equipfruit",
  aliases: ["fruit", "df", "eatfruit"],

  async execute(message, args) {
    if (!args.length) {
      return message.reply({
        content: "Usage: `op df <card name> <devil fruit name>`",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const player = getPlayer(message.author.id, message.author.username);
    const cards = [...(player.cards || [])];
    const ownedFruits = [...(player.devilFruits || [])];

    if (!cards.length) {
      return message.reply({
        content: "You do not own any cards.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    if (!ownedFruits.length) {
      return message.reply({
        content: "You do not own any devil fruits.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    const parsed = parseCardAndFruit(cards, ownedFruits, args);

    if (parsed.card && parsed.fruit) {
      return equipFruitToCard(message, player, parsed.card, parsed.fruit);
    }

    if (parsed.ambiguous && parsed.cardOptions.length > 1 && !parsed.fruit) {
      const roomId = `${Date.now()}_${message.author.id}`;

      const sent = await message.reply({
        embeds: [buildChoiceEmbed("card", parsed.cardOptions)],
        components: [buildChoiceMenu("card", roomId, parsed.cardOptions)],
        allowedMentions: {
          repliedUser: false,
        },
      });

      try {
        const interaction = await sent.awaitMessageComponent({
          time: 60_000,
          filter: (i) =>
            i.user.id === message.author.id &&
            i.customId === `equipfruit_pick_card_${roomId}`,
        });

        const pickedCard = cards.find(
          (card) => String(card.instanceId) === String(interaction.values[0])
        );

        if (!pickedCard) {
          return safeUpdateInteraction(interaction, {
            content: "Selected card not found.",
            embeds: [],
            components: [],
          });
        }

        return safeUpdateInteraction(interaction, {
          content: `Now run: \`op df ${pickedCard.displayName || pickedCard.name} <fruit name>\``,
          embeds: [],
          components: [],
        });
      } catch {
        return null;
      }
    }

    if (parsed.ambiguous && parsed.fruitOptions.length > 1 && !parsed.card) {
      const roomId = `${Date.now()}_${message.author.id}`;

      const sent = await message.reply({
        embeds: [buildChoiceEmbed("fruit", parsed.fruitOptions)],
        components: [buildChoiceMenu("fruit", roomId, parsed.fruitOptions)],
        allowedMentions: {
          repliedUser: false,
        },
      });

      try {
        const interaction = await sent.awaitMessageComponent({
          time: 60_000,
          filter: (i) =>
            i.user.id === message.author.id &&
            i.customId === `equipfruit_pick_fruit_${roomId}`,
        });

        const pickedFruit = ownedFruits.find(
          (fruit) => String(fruit.code) === String(interaction.values[0])
        );

        if (!pickedFruit) {
          return safeUpdateInteraction(interaction, {
            content: "Selected fruit not found.",
            embeds: [],
            components: [],
          });
        }

        const resolvedFruit = resolveFruitData(pickedFruit);

        return safeUpdateInteraction(interaction, {
          content: `Now run: \`op df <card name> ${resolvedFruit.name}\``,
          embeds: [],
          components: [],
        });
      } catch {
        return null;
      }
    }

    return message.reply({
      content:
        "Could not match that card and fruit.\nUse: `op df <card name> <devil fruit name>`\nExample: `op df luffy nika`.",
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
};