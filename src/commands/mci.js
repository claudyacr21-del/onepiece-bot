const { EmbedBuilder } = require("discord.js");
const { getPlayer } = require("../playerStore");
const {
  hydrateCard,
  getWeaponPower,
  getFruitPower,
} = require("../utils/evolution");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { buildCardStyleEmbed } = require("../utils/cardView");
const {
  getCardImage,
  getDevilFruitImage,
  getWeaponImage,
  getRarityBadge,
} = require("../config/assetLinks");
const { formatCardLevelLine } = require("../utils/cardExp");

const devilFruitsDb = require("../data/devilFruits");
const weaponsDb = require("../data/weapons");
const cardsData = require("../data/cards");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/^model:\s*/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}


function isRoadPoneglyphCard(card) {
  const code = String(card?.code || "").toLowerCase().trim();
  const name = String(card?.displayName || card?.name || card?.title || "")
    .toLowerCase()
    .trim();

  return code === "road_poneglyph" || name === "road poneglyph";
}

function getRoadPoneglyphEffect(stage) {
  const n = Math.max(1, Math.min(3, Number(stage || 1)));

  if (n === 1) return "Allows you to summon Merged cards!";
  if (n === 2) return "Allows you to evolve Merged cards to Mastery 2!";
  return "Allows you to evolve Merged cards to Mastery 3!";
}

function getRoadPoneglyphDisplayEffect(card, stage, fallback = "No effect text") {
  if (isRoadPoneglyphCard(card)) {
    return getRoadPoneglyphEffect(stage);
  }

  return fallback;
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function applyBoostedDisplayStats(card, boosts = {}) {
  if (!card || String(card.cardRole || "").toLowerCase() === "boost") return card;

  return {
    ...card,
    atk: Math.floor(Number(card.atk || 0) * (1 + Number(boosts.atk || 0) / 100)),
    hp: Math.floor(Number(card.hp || 0) * (1 + Number(boosts.hp || 0) / 100)),
    speed: Math.floor(Number(card.speed || 0) * (1 + Number(boosts.spd || 0) / 100)),
  };
}

function getCurrentForm(card) {
  const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
  
  if (isRoadPoneglyphCard(card)) {
    const roadEffect = getRoadPoneglyphEffect(stage);
    card.effectText = roadEffect;
    card.boostDescription = roadEffect;
    card.description = roadEffect;
    if (Array.isArray(card.evolutionForms) && card.evolutionForms[stage - 1]) {
      card.evolutionForms[stage - 1].effectText = roadEffect;
      card.evolutionForms[stage - 1].boostDescription = roadEffect;
      card.evolutionForms[stage - 1].description = roadEffect;
    }
  }
return card.evolutionForms?.[stage - 1] || null;
}

function getCurrentStageImage(card) {
  const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
  const stageKey = `M${stage}`;

  return (
    card.evolutionForms?.[stage - 1]?.image ||
    card.stageImages?.[stageKey] ||
    getCardImage(card.code, stageKey, card.image) ||
    card.image ||
    ""
  );
}

function scoreQuery(query, candidates) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;

  for (const raw of candidates) {
    const candidate = normalize(raw);
    if (!candidate) continue;

    if (candidate === q) best = Math.max(best, 1000 + candidate.length);
    else if (candidate.startsWith(q)) best = Math.max(best, 700 + q.length);
    else if (candidate.includes(q)) best = Math.max(best, 400 + q.length);
    else {
      const qWords = q.split(" ").filter(Boolean);

      if (qWords.length && qWords.every((word) => candidate.includes(word))) {
        best = Math.max(best, 250 + qWords.join("").length);
      }
    }
  }

  return best;
}

function getOwnedCards(player) {
  return (Array.isArray(player.cards) ? player.cards : [])
    .map((rawCard, sourceIndex) => {
      const card = hydrateCard(rawCard);
      if (!card) return null;

      return {
        ...card,
        sourceIndex,
      };
    })
    .filter(Boolean);
}

function findOwnedCardByNameOnly(player, query) {
  const cards = getOwnedCards(player);

  const scored = cards
    .map((card) => ({
      card,
      score: scoreQuery(query, [
        card.name,
        card.displayName,
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].card : null;
}

function findFruitTemplate(value) {
  const q = normalize(value);
  if (!q) return null;

  return (
    devilFruitsDb.find((item) => normalize(item.code) === q) ||
    devilFruitsDb.find((item) => normalize(item.name) === q) ||
    devilFruitsDb.find((item) => normalize(item.code).includes(q)) ||
    devilFruitsDb.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

function findWeaponTemplate(value) {
  const q = normalize(value);
  if (!q) return null;

  return (
    weaponsDb.find((item) => normalize(item.code) === q) ||
    weaponsDb.find((item) => normalize(item.name) === q) ||
    weaponsDb.find((item) => normalize(item.code).includes(q)) ||
    weaponsDb.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

function getFragmentAmount(player, target) {
  const code = normalize(target?.code);
  const name = normalize(target?.displayName || target?.name);
  const fragments = Array.isArray(player?.fragments) ? player.fragments : [];

  const possibleCodes = [
    code,
    code ? `weapon_fragment_${code}` : null,
    code ? `weapon fragment ${code}` : null,
  ]
    .filter(Boolean)
    .map(normalize);

  const found = fragments.find((entry) => {
    const entryCode = normalize(entry.code);
    const entryName = normalize(entry.name || entry.displayName);

    return (
      possibleCodes.includes(entryCode) ||
      possibleCodes.includes(entryName) ||
      (name && entryName === name) ||
      (name && entryCode === name)
    );
  });

  return Math.max(0, Number(found?.amount || 0));
}

function pushUnique(list, value) {
  const clean = String(value || "").trim();
  if (!clean) return list;

  if (!list.some((entry) => normalize(entry) === normalize(clean))) {
    list.push(clean);
  }

  return list;
}

function findCardDisplayNameByOwnerCode(value) {
  const target = normalize(value);
  if (!target) return null;

  const found = (Array.isArray(cardsData) ? cardsData : []).find((card) => {
    const code = normalize(card?.code);
    const name = normalize(card?.name);
    const displayName = normalize(card?.displayName);

    return code === target || name === target || displayName === target;
  });

  return found?.displayName || found?.name || null;
}

function formatOwnerSignatureValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  return findCardDisplayNameByOwnerCode(raw) || raw;
}

function getOwnerSignature(item) {
  const owners = Array.isArray(item?.owners) ? item.owners.filter(Boolean) : [];

  if (owners.length) {
    return owners
      .map(formatOwnerSignatureValue)
      .filter(Boolean)
      .join(", ");
  }

  if (item?.ownerSignature) return formatOwnerSignatureValue(item.ownerSignature);
  if (item?.signature) return formatOwnerSignatureValue(item.signature);
  if (item?.owner) return formatOwnerSignatureValue(item.owner);

  return "None";
}

function getWeaponPercentAtLevel(basePercent, level) {
  const lv = Math.max(0, Number(level || 0));

  return {
    atk: Number(basePercent?.atk || 0) + lv * 1,
    hp: Number(basePercent?.hp || 0) + lv * 1,
    speed: Number(basePercent?.speed || 0),
  };
}

function buildOwnedFruitPool(player) {
  const fruits = new Map();

  for (const entry of Array.isArray(player.devilFruits) ? player.devilFruits : []) {
    const template = findFruitTemplate(entry.code || entry.name);
    if (!template) continue;

    const key = String(template.code);
    const existing = fruits.get(key) || {
      ...template,
      amount: 0,
      equippedOn: [],
    };

    existing.amount += Math.max(1, Number(entry.amount || 1));
    fruits.set(key, existing);
  }

  for (const rawCard of Array.isArray(player.cards) ? player.cards : []) {
    if (!rawCard.equippedDevilFruit) continue;

    const template = findFruitTemplate(
      rawCard.equippedDevilFruitName || rawCard.equippedDevilFruit
    );

    if (!template) continue;

    const key = String(template.code);
    const existing = fruits.get(key) || {
      ...template,
      amount: 0,
      equippedOn: [],
    };

    pushUnique(existing.equippedOn, rawCard.displayName || rawCard.name || rawCard.code);
    fruits.set(key, existing);
  }

  return [...fruits.values()];
}

function buildOwnedWeaponPool(player) {
  const pool = new Map();

  for (const entry of Array.isArray(player.weapons) ? player.weapons : []) {
    const template = findWeaponTemplate(entry.code || entry.name);
    if (!template) continue;

    const key = String(template.code);
    const existing =
      pool.get(key) || {
        ...template,
        amount: 0,
        equippedOn: [],
        bestUpgradeLevel: 0,
      };

    existing.amount += Math.max(1, Number(entry.amount || 1));
    existing.bestUpgradeLevel = Math.max(
      existing.bestUpgradeLevel,
      Number(entry.upgradeLevel || 0)
    );

    pool.set(key, existing);
  }

  for (const rawCard of Array.isArray(player.cards) ? player.cards : []) {
    const equipped = Array.isArray(rawCard.equippedWeapons)
      ? rawCard.equippedWeapons
      : [];

    for (const entry of equipped) {
      const template = findWeaponTemplate(entry.code || entry.name);
      if (!template) continue;

      const key = String(template.code);
      const existing =
        pool.get(key) || {
          ...template,
          amount: 0,
          equippedOn: [],
          bestUpgradeLevel: 0,
        };

      pushUnique(existing.equippedOn, rawCard.displayName || rawCard.name || rawCard.code);
      existing.bestUpgradeLevel = Math.max(
        existing.bestUpgradeLevel,
        Number(entry.upgradeLevel || 0)
      );

      pool.set(key, existing);
    }
  }

  return [...pool.values()];
}

function findOwnedFruit(player, query) {
  const pool = buildOwnedFruitPool(player);

  const scored = pool
    .map((fruit) => ({
      fruit,
      score: scoreQuery(query, [fruit.name, fruit.code, fruit.type]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].fruit : null;
}

function findOwnedWeapon(player, query) {
  const pool = buildOwnedWeaponPool(player);

  const scored = pool
    .map((weapon) => ({
      weapon,
      score: scoreQuery(query, [weapon.name, weapon.code, weapon.type]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].weapon : null;
}

function findOwnedWeaponByExactNameOnly(player, query) {
  const q = normalize(query);
  if (!q) return null;

  const pool = buildOwnedWeaponPool(player);

  return (
    pool.find((weapon) => normalize(weapon.name) === q) ||
    pool.find((weapon) => normalize(weapon.displayName) === q) ||
    null
  );
}

function buildOwnedFruitEmbed(ownerName, player, fruit) {
  const percent = fruit.statPercent || fruit.statBonus || {
    atk: 0,
    hp: 0,
    speed: 0,
  };

  const equippedText =
    Array.isArray(fruit.equippedOn) && fruit.equippedOn.length
      ? fruit.equippedOn.join(", ")
      : "Not equipped";

  const fragments = getFragmentAmount(player, fruit);

  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`${ownerName}'s Devil Fruit`)
    .setDescription(
      [
        `**${fruit.name}**`,
        `${fruit.type || "Devil Fruit"}`,
        "",
        `Rarity: ${String(fruit.rarity || "B").toUpperCase()}`,
        `Power: ${Number(getFruitPower(fruit) || 0)}`,
        `ATK: +${Number(percent.atk || 0)}%`,
        `HP: +${Number(percent.hp || 0)}%`,
        `SPD: +${Number(percent.speed || 0)}%`,
        `Owner Signature: ${getOwnerSignature(fruit)}`,
        `Equipped On: ${equippedText}`,
        "",
        `${fruit.description || "No description."}`,
        "",
      ].join("\n")
    )
    .setThumbnail(getRarityBadge(fruit.rarity || "B") || null)
    .setImage(getDevilFruitImage(fruit.code, fruit.image || "") || null)
    .setFooter({
      text: `Owned devil fruit info • ${ownerName}`,
    });
}

function buildOwnedWeaponEmbed(ownerName, player, weapon) {
  const percent = getWeaponPercentAtLevel(
    weapon.statPercent || weapon.statBonus || {
      atk: 0,
      hp: 0,
      speed: 0,
    },
    weapon.bestUpgradeLevel || 0
  );

  const equippedText =
    Array.isArray(weapon.equippedOn) && weapon.equippedOn.length
      ? [...new Set(weapon.equippedOn.map((x) => String(x).trim()).filter(Boolean))].join(", ")
      : "Not equipped";

  const fragments = getFragmentAmount(player, weapon);

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`${ownerName}'s Weapon`)
    .setDescription(
      [
        `**${weapon.name}**`,
        `${weapon.type || "Weapon"}`,
        "",
        `Rarity: ${String(weapon.rarity || "B").toUpperCase()}`,
        `Power: ${Number(getWeaponPower(weapon, weapon.bestUpgradeLevel || 0) || 0)}`,
        `ATK: +${Number(percent.atk || 0)}%`,
        `HP: +${Number(percent.hp || 0)}%`,
        `SPD: +${Number(percent.speed || 0)}%`,
        `Owner Signature: ${getOwnerSignature(weapon)}`,
        `Best Upgrade: +${Math.max(0, Number(weapon.bestUpgradeLevel || 0))}`,
        `Equipped On: ${equippedText}`,
        "",
        `${weapon.description || "No description."}`,
        "",
        `Fragment: ${fragments}`,
      ].join("\n")
    )
    .setThumbnail(getRarityBadge(weapon.rarity || "B") || null)
    .setImage(getWeaponImage(weapon.code, weapon.image || "") || null)
    .setFooter({
      text: `Owned weapon info • ${ownerName}`,
    });
}






function buildOwnedCardEmbed(ownerName, player, card) {
  const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
  const form = getCurrentForm(card);
  const stageImage = getCurrentStageImage(card);
  const atkRange = formatAtkRange(card.atk);
  const syncedFragments = getFragmentAmount(player, card);

  const extraLines = card.cardRole === "boost" ? [
    `Form: ${card.evolutionKey || `M${stage}`}`,
    `Tier: ${card.currentTier || card.rarity}`,
    `Power: ${Number(card.currentPower || 0)}`,
    `Effect: ${getRoadPoneglyphDisplayEffect(card || stageCard || form, stage || card?.evolutionStage || 1, card.effectText || "No effect text")}`,
    `Target: ${card.boostTarget || "team"}`,
    `Boost Type: ${card.boostType || "unknown"}`,
    `Devil Fruit: ${card.displayFruitName || "None"}`,
    `Fragments: ${syncedFragments}`,
  ] : [
          `Form: ${card.evolutionKey || `M${stage}`}`,
          `Tier: ${card.currentTier || card.rarity}`,
          formatCardLevelLine(card),
          `Raid Prestige: ${Math.max(0, Math.min(200, Number(card.raidPrestige || 0)))}/200`,
          `Power: ${Number(card.currentPower || 0)}`,
          `Health: ${Number(card.hp || 0)}`,
          `Speed: ${Number(card.speed || 0)}`,
          `Attack: ${atkRange}`,
          `Weapons: ${card.displayWeaponName || "None"}`,
          `Devil Fruit: ${card.displayFruitName || "None"}`,
          `Type: ${card.type || card.cardRole}`,
          `Kills: ${Number(card.kills || 0)}`,
          `Fragments: ${syncedFragments}`,
        ];

  return buildCardStyleEmbed({
    color: 0x1abc9c,
    ownerName,
    card,
    image: stageImage,
    badgeImage: form?.badgeImage || card.badgeImage || "",
    formName: form?.name || card.variant || "Unknown Form",
    tier: card.currentTier || card.rarity,
    footerText: `Owned card info • ${ownerName}`,
    extraLines,
  });
}

module.exports = {
  name: "mci",
  aliases: ["mycardinfo"],

  async execute(message, args) {
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply("Usage: `op mci <card/weapon/fruit name>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const boosts = getPassiveBoostSummary(player);

    const exactWeapon = findOwnedWeaponByExactNameOnly(player, query);
    if (exactWeapon) {
      return message.reply({
        embeds: [buildOwnedWeaponEmbed(message.author.username, player, exactWeapon)],
      });
    }

    const ownedCard = findOwnedCardByNameOnly(player, query);
    const card = applyBoostedDisplayStats(ownedCard, boosts);

    if (card) {
      return message.reply({
        embeds: [buildOwnedCardEmbed(message.author.username, player, card)],
      });
    }

    const ownedFruit = findOwnedFruit(player, query);
    if (ownedFruit) {
      return message.reply({
        embeds: [buildOwnedFruitEmbed(message.author.username, player, ownedFruit)],
      });
    }

    const ownedWeapon = findOwnedWeapon(player, query);
    if (ownedWeapon) {
      return message.reply({
        embeds: [buildOwnedWeaponEmbed(message.author.username, player, ownedWeapon)],
      });
    }

    return message.reply("You do not own that card, devil fruit, or weapon.");
  },
};