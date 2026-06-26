const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const {
  isMergeCard,
  buildMergedCard,
  syncMergedCardsInPlayer,
} = require("../utils/mergeCards");
const { getPlayer } = require("../playerStore");
const {
  hydrateCard,
  findCardTemplate,
  getWeaponPower,
  getFruitPower,
} = require("../utils/evolution");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { buildCardStyleEmbed } = require("../utils/cardView");
const {
  applyCustomSkinToCard,
  findSkinSetByQuery,
  normalizeCode: normalizeSkinCode,
  normalizeName: normalizeSkinName,
} = require("../utils/customSkins");
const {
  getCardImage,
  getWeaponImage,
  getDevilFruitImage,
  getRarityBadge,
} = require("../config/assetLinks");

const weaponsDb = require("../data/weapons");
const devilFruitsDb = require("../data/devilFruits");
const cardsData = require("../data/cards");

const FLAT_EXP_CAP = 1000;

function cleanEmoji(value, fallback) {
  const raw = String(value || "").trim();

  if (!raw) return fallback;

  return raw
    .replace(/^["']+/, "")
    .replace(/["']+$/, "")
    .trim();
}

const RARITY_EMOJIS = {
  C: cleanEmoji(process.env.RARITY_EMOJI_C, "C"),
  B: cleanEmoji(process.env.RARITY_EMOJI_B, "B"),
  A: cleanEmoji(process.env.RARITY_EMOJI_A, "A"),
  S: cleanEmoji(process.env.RARITY_EMOJI_S, "S"),
  SS: cleanEmoji(process.env.RARITY_EMOJI_SS, "SS"),
  UR: cleanEmoji(process.env.RARITY_EMOJI_UR, "UR"),
  M: cleanEmoji(process.env.RARITY_EMOJI_M, "M"),
};

async function safeComponentReply(interaction, content) {
  try {
    if (!interaction || interaction.replied || interaction.deferred) return null;

    return await interaction.reply({
      content,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    const code = Number(error?.code || error?.rawError?.code || 0);
    const message = String(error?.message || "");

    if (code !== 10062 && code !== 40060 && !message.includes("Unknown interaction")) {
      console.error("[MC COMPONENT REPLY ERROR]", error);
    }

    return null;
  }
}

async function safeComponentUpdate(interaction, payload) {
  try {
    if (!interaction || interaction.replied) return null;

    if (interaction.deferred) {
      return await interaction.editReply(payload);
    }

    return await interaction.update(payload);
  } catch (error) {
    const code = Number(error?.code || error?.rawError?.code || 0);
    const message = String(error?.message || "");

    if (code !== 10062 && code !== 40060 && !message.includes("Unknown interaction")) {
      console.error("[MC COMPONENT UPDATE ERROR]", error);
    }

    return null;
  }
}

function isDiscordEmojiValue(value) {
  const raw = String(value || "").trim();

  if (!raw) return false;

  // Custom Discord emoji format:
  // <:name:id> or <a:name:id>
  if (/^<a?:[a-zA-Z0-9_~]+:\d{15,25}>$/.test(raw)) return true;

  // Unicode emoji fallback.
  // This keeps normal emoji usable, but rejects plain text like :M_Rarity:.
  return /\p{Extended_Pictographic}/u.test(raw);
}

function getRarityEmoji(rarity) {
  const tier = String(rarity || "C").toUpperCase();

  const badge = getRarityBadge(tier);
  if (isDiscordEmojiValue(badge)) return badge;

  const envEmoji = RARITY_EMOJIS[tier];
  if (isDiscordEmojiValue(envEmoji)) return envEmoji;

  return tier;
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/^model:\s*/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getPower(card) {
  return Number(card.currentPower || 0);
}

function getFlatExp(card) {
  return Math.max(0, Math.min(FLAT_EXP_CAP, Number(card?.exp ?? card?.xp ?? 0)));
}

function formatLevelExpLine(card) {
  return `Level: ${Number(card.level || 1)} (${getFlatExp(card)}/${FLAT_EXP_CAP})`;
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

function firstPositiveNumber(...values) {
  for (const value of values) {
    const n = Number(value || 0);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function resolveCurrentStageBaseStats(card) {
  const stage = Math.max(1, Math.min(3, Number(card?.evolutionStage || 1)));
  const stageKey = `M${stage}`;
  const form = card?.evolutionForms?.[stage - 1] || {};
  const stageStats =
    card?.stageStats?.[stageKey] ||
    card?.stats?.[stageKey] ||
    card?.masteryStats?.[stageKey] ||
    {};

  return {
    atk: firstPositiveNumber(
      card?.atk,
      card?.displayAtk,
      card?.combatAtk,
      form.atk,
      form.baseAtk,
      stageStats.atk,
      stageStats.baseAtk
    ),
    hp: firstPositiveNumber(
      card?.hp,
      card?.displayHp,
      card?.combatHp,
      form.hp,
      form.baseHp,
      stageStats.hp,
      stageStats.baseHp
    ),
    speed: firstPositiveNumber(
      card?.speed,
      card?.spd,
      card?.displaySpeed,
      card?.combatSpeed,
      form.speed,
      form.spd,
      form.baseSpeed,
      stageStats.speed,
      stageStats.spd,
      stageStats.baseSpeed
    ),
    power: firstPositiveNumber(
      card?.currentPower,
      form.currentPower,
      form.power,
      stageStats.currentPower,
      stageStats.power,
      card?.powerCaps?.[stageKey]
    ),
  };
}

function applyBoostedDisplayStats(card, boosts = {}) {
  if (!card || String(card.cardRole || "").toLowerCase() === "boost") return card;

  const base = resolveCurrentStageBaseStats(card);
  const boostedAtk = Math.floor(base.atk * (1 + Number(boosts.atk || 0) / 100));
  const boostedHp = Math.floor(base.hp * (1 + Number(boosts.hp || 0) / 100));
  const boostedSpeed = Math.floor(base.speed * (1 + Number(boosts.spd || 0) / 100));

  return {
    ...card,
    atk: boostedAtk,
    hp: boostedHp,
    speed: boostedSpeed,
    displayAtk: boostedAtk,
    displayHp: boostedHp,
    displaySpeed: boostedSpeed,
    combatAtk: boostedAtk,
    combatHp: boostedHp,
    combatSpeed: boostedSpeed,
    currentPower: Math.max(Number(card.currentPower || 0), Number(base.power || 0)),
  };
}

function scoreQuery(query, candidates) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;

  for (const raw of candidates) {
    const candidate = normalize(raw);
    if (!candidate) continue;

    if (candidate === q) {
      best = Math.max(best, 1000 + candidate.length);
    } else if (candidate.startsWith(q)) {
      best = Math.max(best, 700 + q.length);
    } else if (candidate.includes(q)) {
      best = Math.max(best, 400 + q.length);
    } else {
      const qWords = q.split(" ").filter(Boolean);

      if (qWords.length && qWords.every((word) => candidate.includes(word))) {
        best = Math.max(best, 250 + qWords.join("").length);
      }
    }
  }

  return best;
}

function getSafeForm(card) {
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
const form = card.evolutionForms?.[stage - 1] || null;

  return {
    stage,
    name: form?.name || card.variant || card.displayName || card.name || "Unknown Card",
    badgeImage: form?.badgeImage || card.badgeImage || "",
    tier: form?.tier || card.currentTier || card.rarity || "C",
  };
}

function getStageImage(card) {
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

function mergeOwnedCardWithLatestTemplate(rawCard, sourceIndex = null, player = null) {
  const card = hydrateCard(rawCard);
  if (!card) return null;

  const merged = {
    ...card,
    sourceIndex: Number.isInteger(sourceIndex) ? sourceIndex : null,
  };

  if (isMergeCard(merged) && player) {
    return buildMergedCard(player, merged);
  }

  return merged;
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

function buildViewerEmbed(ownerName, player, card, index, total, label = "Collection") {
  const displayCard = applyCustomSkinToCard(player, card);

  const form = getSafeForm(card);

  const stageImage = displayCard.hasCustomSkin && displayCard.skinImage
    ? displayCard.skinImage
    : getStageImage(card);

  const atkRange = formatAtkRange(card.atk);
  const syncedFragments = getFragmentAmount(player, card);

  const extraLines = card.cardRole === "boost" ? [
    `Form: ${card.evolutionKey || `M${form.stage}`}`,
    `Tier: ${card.currentTier || card.rarity || "C"}`,
    `Power: ${getPower(card)}`,
    `Effect: ${getRoadPoneglyphDisplayEffect(card, form.stage || card?.evolutionStage || 1, card.effectText || "No effect text")}`,
    `Target: ${card.boostTarget || "team"}`,
    `Boost Type: ${card.boostType || "unknown"}`,
    `Devil Fruit: ${card.displayFruitName || "None"}`,
    `Fragments: ${syncedFragments}`,
  ] : [
    `Form: ${card.evolutionKey || `M${form.stage}`}`,
    `Tier: ${card.currentTier || card.rarity || "C"}`,
    formatLevelExpLine(card),
    `Power: ${getPower(card)}`,
    `Health: ${card.hp || 0}`,
    `Speed: ${card.speed || 0}`,
    `Attack: ${atkRange}`,
    `Weapons: ${card.displayWeaponName || card.weaponSet || card.weapon || "None"}`,
    `Devil Fruit: ${card.displayFruitName || card.devilFruit || "None"}`,
    `Type: ${card.type || card.cardRole || "Unknown"}`,
    `Kills: ${card.kills || 0}`,
    `Fragments: ${syncedFragments}`,
  ];

  return buildCardStyleEmbed({
    color: card.cardRole === "boost" ? 0x9b59b6 : 0x3498db,
    ownerName,
    card: displayCard,
    badgeImage: form.badgeImage,
    image: stageImage,
    formName: displayCard.hasCustomSkin ? displayCard.skinTitle : form.name,
    tier: form.tier,
    footerText: `${label} ${index + 1}/${total} • This card belongs to ${ownerName}`,
    extraLines,
  });
}

function buildRows(index, total, prevId = "mc_prev", nextId = "mc_next") {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(prevId)
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index <= 0),
      new ButtonBuilder()
        .setCustomId(nextId)
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index >= total - 1)
    ),
  ];
}

function getTierRank(tier) {
  const order = {
    C: 1,
    B: 2,
    A: 3,
    S: 4,
    SS: 5,
    UR: 6,
    M: 7,
  };

  return order[String(tier || "C").toUpperCase()] || 0;
}

function getCardUniqueKey(card) {
  const role = String(card?.cardRole || "battle").toLowerCase();
  const code = String(card?.code || card?.name || card?.displayName || "")
    .toLowerCase()
    .trim();

  return `${role}:${code}`;
}

function isBetterDuplicateCard(candidate, current) {
  if (!current) return true;

  const candidateStage = Number(candidate?.evolutionStage || 1);
  const currentStage = Number(current?.evolutionStage || 1);

  if (candidateStage !== currentStage) {
    return candidateStage > currentStage;
  }

  const candidateTier = getTierRank(candidate?.currentTier || candidate?.rarity);
  const currentTier = getTierRank(current?.currentTier || current?.rarity);

  if (candidateTier !== currentTier) {
    return candidateTier > currentTier;
  }

  const candidatePower = Number(candidate?.currentPower || 0);
  const currentPower = Number(current?.currentPower || 0);

  if (candidatePower !== currentPower) {
    return candidatePower > currentPower;
  }

  const candidateLevel = Number(candidate?.level || 1);
  const currentLevel = Number(current?.level || 1);

  if (candidateLevel !== currentLevel) {
    return candidateLevel > currentLevel;
  }

  const candidateKills = Number(candidate?.kills || 0);
  const currentKills = Number(current?.kills || 0);

  if (candidateKills !== currentKills) {
    return candidateKills > currentKills;
  }

  return false;
}

function dedupeCollection(cards) {
  const map = new Map();

  for (const card of Array.isArray(cards) ? cards : []) {
    if (!card) continue;

    const key = getCardUniqueKey(card);
    if (!key || key === "battle:") continue;

    const existing = map.get(key);

    if (isBetterDuplicateCard(card, existing)) {
      map.set(key, card);
    }
  }

  return [...map.values()];
}

function buildTextLines(cards) {
  const uniqueCards = dedupeCollection(cards);

  return uniqueCards.map((card, i) => {
    const rarity = String(card.currentTier || card.rarity || "C").toUpperCase();
    const rarityIcon = getRarityEmoji(rarity);
    const name = card.displayName || card.name || "Unknown Card";
    const stage = card.evolutionKey || `M${card.evolutionStage || 1}`;
    const power = getPower(card);
    const level = Number(card.level || 1);

    if (card.cardRole === "boost") {
      const effect = card.effectText || "No effect text";

      return `${i + 1}. ${rarityIcon} **${name}** | ${stage} | 🔥 ${power} | ✨ ${effect}`;
    }

    const exp = getFlatExp(card);
    const currentHp = Number(card.hp || 0);
    const currentSpd = Number(card.speed || 0);
    const atkRange = formatAtkRange(card.atk);

    return `${i + 1}. ${rarityIcon} **${name}** | ${stage} | 🔥 ${power} | ❤️ ${currentHp}/${currentHp} | 💨 ${currentSpd} | ⚔️ ${atkRange} | Lv.${level} (${exp}/${FLAT_EXP_CAP})`;
  });
}

function buildTextPageEmbed(ownerName, lines, pageIndex, pageSize = 7) {
  const start = pageIndex * pageSize;
  const pageLines = lines.slice(start, start + pageSize);

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`${ownerName}'s Card Collection`)
    .setDescription(pageLines.join("\n"))
    .setFooter({
      text: `Showing ${start + 1}-${Math.min(
        start + pageSize,
        lines.length
      )} of ${lines.length} unique entries`,
    });
}

function buildTextRows(pageIndex, totalPages) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("mc_text_prev")
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex <= 0),
      new ButtonBuilder()
        .setCustomId("mc_text_next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex >= totalPages - 1)
    ),
  ];
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

function getWeaponPercentAtLevel(basePercent, level) {
  const lv = Math.max(0, Number(level || 0));

  return {
    atk: Number(basePercent?.atk || 0) + lv * 1,
    hp: Number(basePercent?.hp || 0) + lv * 1,
    speed: Number(basePercent?.speed || 0),
  };
}

function dedupeTextList(list) {
  return [
    ...new Set(
      (Array.isArray(list) ? list : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    ),
  ];
}

function addWeaponToPool(pool, template, options = {}) {
  if (!template) return;

  const key = String(template.code || template.name || "").trim();
  if (!key) return;

  const existing = pool.get(key) || {
    ...template,
    amount: 0,
    equippedOn: [],
    bestUpgradeLevel: 0,
  };

  existing.amount += Math.max(0, Number(options.amount || 0));

  if (options.equippedOn) {
    pushUnique(existing.equippedOn, options.equippedOn);
  }

  existing.equippedOn = dedupeTextList(existing.equippedOn);

  existing.bestUpgradeLevel = Math.max(
    Number(existing.bestUpgradeLevel || 0),
    Number(options.upgradeLevel || 0)
  );

  pool.set(key, existing);
}

function splitEquippedWeaponNames(value) {
  return String(value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.replace(/\s+\+\d+$/i, "").trim())
    .filter(Boolean);
}

function buildOwnedWeaponCollection(player) {
  const pool = new Map();

  for (const entry of Array.isArray(player.weapons) ? player.weapons : []) {
    const template = findWeaponTemplate(entry.code || entry.name);
    if (!template) continue;

    addWeaponToPool(pool, template, {
      amount: Math.max(1, Number(entry.amount || 1)),
      upgradeLevel: Number(entry.upgradeLevel || 0),
    });
  }

  for (const entry of Array.isArray(player.items) ? player.items : []) {
    const template = findWeaponTemplate(entry.code || entry.name);
    if (!template) continue;

    const looksLikeWeapon =
      String(entry.type || "").toLowerCase().includes("weapon") ||
      normalize(entry.code) === normalize(template.code) ||
      normalize(entry.name) === normalize(template.name);

    if (!looksLikeWeapon) continue;

    addWeaponToPool(pool, template, {
      amount: Math.max(1, Number(entry.amount || 1)),
      upgradeLevel: Number(entry.upgradeLevel || 0),
    });
  }

  for (const rawCard of Array.isArray(player.cards) ? player.cards : []) {
    const cardName = rawCard.displayName || rawCard.name || rawCard.code || "Unknown";

    const equipped = Array.isArray(rawCard.equippedWeapons)
      ? rawCard.equippedWeapons
      : [];

    for (const entry of equipped) {
      const template = findWeaponTemplate(entry.code || entry.name);
      if (!template) continue;

      addWeaponToPool(pool, template, {
        amount: 0,
        equippedOn: cardName,
        upgradeLevel: Number(entry.upgradeLevel || 0),
      });
    }

    const legacyCodes = [
      rawCard.equippedWeaponCode,
      rawCard.weaponCode,
    ].filter(Boolean);

    for (const code of legacyCodes) {
      const template = findWeaponTemplate(code);
      if (!template) continue;

      addWeaponToPool(pool, template, {
        amount: 0,
        equippedOn: cardName,
        upgradeLevel: Number(rawCard.weaponUpgradeLevel || rawCard.upgradeLevel || 0),
      });
    }

    const legacyNames = [
      ...splitEquippedWeaponNames(rawCard.equippedWeapon),
      ...splitEquippedWeaponNames(rawCard.equippedWeaponName),
      ...splitEquippedWeaponNames(rawCard.displayWeaponName),
    ];

    for (const name of legacyNames) {
      const template = findWeaponTemplate(name);
      if (!template) continue;

      addWeaponToPool(pool, template, {
        amount: 0,
        equippedOn: cardName,
        upgradeLevel: Number(rawCard.weaponUpgradeLevel || rawCard.upgradeLevel || 0),
      });
    }
  }

  return [...pool.values()].sort((a, b) => {
    const powerDiff =
      Number(getWeaponPower(b, b.bestUpgradeLevel || 0) || 0) -
      Number(getWeaponPower(a, a.bestUpgradeLevel || 0) || 0);

    if (powerDiff !== 0) return powerDiff;

    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function buildOwnedFruitCollection(player) {
  const pool = new Map();

  for (const entry of Array.isArray(player.devilFruits) ? player.devilFruits : []) {
    const template = findFruitTemplate(entry.code || entry.name);
    if (!template) continue;

    const key = String(template.code);

    const existing = pool.get(key) || {
      ...template,
      amount: 0,
      equippedOn: [],
    };

    existing.amount += Math.max(1, Number(entry.amount || 1));
    pool.set(key, existing);
  }

  for (const rawCard of Array.isArray(player.cards) ? player.cards : []) {
    if (!rawCard.equippedDevilFruit) continue;

    const template = findFruitTemplate(
      rawCard.equippedDevilFruitName || rawCard.equippedDevilFruit
    );

    if (!template) continue;

    const key = String(template.code);

    const existing = pool.get(key) || {
      ...template,
      amount: 0,
      equippedOn: [],
    };

    pushUnique(existing.equippedOn, rawCard.displayName || rawCard.name || rawCard.code);
    pool.set(key, existing);
  }

  return [...pool.values()].sort((a, b) => {
    const powerDiff =
      Number(getFruitPower(b) || 0) - Number(getFruitPower(a) || 0);

    if (powerDiff !== 0) return powerDiff;

    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function findOwnedWeapon(player, query) {
  const pool = buildOwnedWeaponCollection(player);

  const scored = pool
    .map((weapon) => ({
      weapon,
      score: scoreQuery(query, [weapon.name]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].weapon : null;
}

function findOwnedFruit(player, query) {
  const pool = buildOwnedFruitCollection(player);

  const scored = pool
    .map((fruit) => ({
      fruit,
      score: scoreQuery(query, [fruit.name]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].fruit : null;
}

function findOwnedCardByQuery(cards, query) {
  const q = normalize(query);
  if (!q) return null;

  const direct = (Array.isArray(cards) ? cards : []).find((card) => {
    const code = normalize(card?.code);
    const name = normalize(card?.name);
    const displayName = normalize(card?.displayName);
    const title = normalize(card?.title);

    return (
      code === q ||
      name === q ||
      displayName === q ||
      title === q ||
      name.includes(q) ||
      displayName.includes(q) ||
      title.includes(q)
    );
  });

  if (direct) return direct;

  const scored = cards
    .map((card) => ({
      card,
      score: scoreQuery(query, [
        card.code,
        card.name,
        card.displayName,
        card.title,
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].card : null;
}

function findOwnedCardBySkinQuery(player, cards, query) {
  const foundSkin = findSkinSetByQuery(player, query);

  if (!foundSkin) return null;

  const targetCode = normalizeSkinCode(
    foundSkin.skinSet?.cardCode || foundSkin.key || ""
  );

  const targetOriginalName = normalizeSkinName(
    foundSkin.skinSet?.originalName || ""
  );

  return (
    (Array.isArray(cards) ? cards : []).find((card) => {
      const code = normalizeSkinCode(card?.code || "");
      const name = normalizeSkinName(card?.name || "");
      const displayName = normalizeSkinName(card?.displayName || "");

      return (
        (targetCode && code === targetCode) ||
        (targetOriginalName &&
          (name === targetOriginalName || displayName === targetOriginalName))
      );
    }) || null
  );
}

function findOwnedCardOrSkinByQuery(player, cards, query) {
  return (
    findOwnedCardByQuery(cards, query) ||
    findOwnedCardBySkinQuery(player, cards, query)
  );
}

function buildWeaponEmbed(ownerName, player, weapon, index = 0, total = 1) {
  const percent = getWeaponPercentAtLevel(
    weapon.statPercent || weapon.statBonus || { atk: 0, hp: 0, speed: 0 },
    weapon.bestUpgradeLevel || 0
  );

  const equippedNames = dedupeTextList(weapon.equippedOn);
  const equippedText = equippedNames.length ? equippedNames.join(", ") : "Not equipped";

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
      text: `Weapon Collection ${index + 1}/${total} • This weapon belongs to ${ownerName}`,
    });
}

function buildFruitEmbed(ownerName, player, fruit) {
  const percent = fruit.statPercent || fruit.statBonus || {
    atk: 0,
    hp: 0,
    speed: 0,
  };

  const equippedNames = dedupeTextList(fruit.equippedOn);
  const equippedText = equippedNames.length ? equippedNames.join(", ") : "Not equipped";

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
        `Fragment: ${fragments}`,
      ].join("\n")
    )
    .setThumbnail(getRarityBadge(fruit.rarity || "B") || null)
    .setImage(getDevilFruitImage(fruit.code, fruit.image || "") || null)
    .setFooter({
      text: `Devil Fruit Info • This fruit belongs to ${ownerName}`,
    });
}

module.exports = {
  name: "mc",
  aliases: ["mycards"],

  async execute(message, args) {
    const player = syncMergedCardsInPlayer(
      getPlayer(message.author.id, message.author.username)
    );

    const boosts = getPassiveBoostSummary(player);
    const rawQuery = args.join(" ").trim();
    let sub1 = String(args?.[0] || "").toLowerCase();
    let query = rawQuery;

    const allowedSubCommands = ["text", "boost", "weapon", "m1", "m2", "m3"];

    if (rawQuery && !allowedSubCommands.includes(sub1)) {
      sub1 = "search";
      query = rawQuery;
    }

    const cards = dedupeCollection(
      (player.cards || [])
        .map((card, index) => mergeOwnedCardWithLatestTemplate(card, index, player))
        .filter(Boolean)
        .map((card) => applyBoostedDisplayStats(card, boosts))
    );

    if (sub1 === "weapon") {
      const weaponQuery = args.slice(1).join(" ").trim();
      const weapons = buildOwnedWeaponCollection(player);

      if (!weapons.length) {
        return message.reply("You do not own any weapons yet.");
      }

      if (weaponQuery) {
        const foundWeapon = findOwnedWeapon(player, weaponQuery);

        if (!foundWeapon) {
          return message.reply(`Weapon not found by name: \`${weaponQuery}\`.`);
        }

        return message.reply({
          embeds: [
            buildWeaponEmbed(
              message.author.username,
              player,
              foundWeapon,
              0,
              1
            ),
          ],
        });
      }

      let index = 0;

      const sent = await message.reply({
        embeds: [
          buildWeaponEmbed(
            message.author.username,
            player,
            weapons[index],
            index,
            weapons.length
          ),
        ],
        components: buildRows(index, weapons.length, "mc_weapon_prev", "mc_weapon_next"),
      });

      const collector = sent.createMessageComponentCollector({
        time: 10 * 60 * 1000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== message.author.id) {
          return safeComponentReply(i, "Only you can control this weapon viewer.");
        }

        if (i.customId === "mc_weapon_prev") index = Math.max(0, index - 1);
        if (i.customId === "mc_weapon_next") {
          index = Math.min(weapons.length - 1, index + 1);
        }

        return safeComponentUpdate(i, {
          embeds: [
            buildWeaponEmbed(
              message.author.username,
              player,
              weapons[index],
              index,
              weapons.length
            ),
          ],
          components: buildRows(
            index,
            weapons.length,
            "mc_weapon_prev",
            "mc_weapon_next"
          ),
        });
      });

      collector.on("end", async () => {
        try {
          await sent.edit({ components: [] });
        } catch {}
      });

      return;
    }

    if (!cards.length) {
      return message.reply("You do not own any cards yet.");
    }

    let working = [...cards];
    let title = "Card Collection";

    if (sub1 === "search") {
      const foundCard = findOwnedCardOrSkinByQuery(player, cards, query);

      if (!foundCard) {
        return message.reply(`Card not found in your collection: \`${query}\`.`);
      }

      working = [foundCard];
      title = "Card Search";
    } else if (sub1 === "boost") {
      working = working.filter((card) => card.cardRole === "boost");
      title = "Boost Collection";
    } else if (sub1 === "text") {
      working = [...cards];
      title = "Card Collection";
    } else if (["m1", "m2", "m3"].includes(sub1)) {
      const targetStage = Number(sub1.replace("m", ""));

      working = working.filter((card) => {
        const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
        return stage === targetStage;
      });

      title = `Mastery ${targetStage} Collection`;
    } else {
      working = working.filter((card) => card.cardRole !== "boost");
      title = "Card Collection";
    }

    if (!working.length) {
      if (sub1 === "boost") {
        return message.reply("You do not own any boost cards yet.");
      }

      if (["m1", "m2", "m3"].includes(sub1)) {
        return message.reply(`You do not own any ${sub1.toUpperCase()} cards yet.`);
      }

      return message.reply("You do not own any cards yet.");
    }

    working.sort((a, b) => {
      const powerDiff = getPower(b) - getPower(a);
      if (powerDiff !== 0) return powerDiff;

      return String(a.displayName || a.name).localeCompare(
        String(b.displayName || b.name)
      );
    });

    if (sub1 === "text") {
      const lines = buildTextLines(working);
      const pageSize = 7;
      const totalPages = Math.max(1, Math.ceil(lines.length / pageSize));
      let pageIndex = 0;

      const sent = await message.reply({
        embeds: [buildTextPageEmbed(message.author.username, lines, pageIndex, pageSize)],
        components: buildTextRows(pageIndex, totalPages),
      });

      const collector = sent.createMessageComponentCollector({
        time: 10 * 60 * 1000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== message.author.id) {
          return safeComponentReply(i, "Only you can control this text viewer.");
        }

        if (i.customId === "mc_text_prev") pageIndex = Math.max(0, pageIndex - 1);
        if (i.customId === "mc_text_next") {
          pageIndex = Math.min(totalPages - 1, pageIndex + 1);
        }

        return safeComponentUpdate(i, {
          embeds: [
            buildTextPageEmbed(message.author.username, lines, pageIndex, pageSize),
          ],
          components: buildTextRows(pageIndex, totalPages),
        });
      });

      collector.on("end", async () => {
        try {
          await sent.edit({ components: [] });
        } catch {}
      });

      return;
    }

    let index = 0;

    const sent = await message.reply({
      embeds: [
        buildViewerEmbed(
          message.author.username,
          player,
          working[index],
          index,
          working.length,
          title
        ),
      ],
      components: buildRows(index, working.length),
    });

    const collector = sent.createMessageComponentCollector({
      time: 10 * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return safeComponentReply(i, "Only you can control this card viewer.");
      }

      if (i.customId === "mc_prev") index = Math.max(0, index - 1);
      if (i.customId === "mc_next") index = Math.min(working.length - 1, index + 1);

      return safeComponentUpdate(i, {
        embeds: [
          buildViewerEmbed(
            message.author.username,
            player,
            working[index],
            index,
            working.length,
            title
          ),
        ],
        components: buildRows(index, working.length),
      });
    });

    collector.on("end", async () => {
      try {
        await sent.edit({ components: [] });
      } catch {}
    });
  },
};