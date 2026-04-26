const { readPlayers, writePlayers } = require("../playerStore");
const cardsData = require("../data/cards");

function getAdminIds() {
  return String(
    process.env.ADMIN_USER_IDS ||
      process.env.DISCORD_OWNER_ID ||
      process.env.BOT_OWNER_ID ||
      ""
  )
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function isAdmin(userId) {
  return getAdminIds().includes(String(userId));
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[<@!>]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeCode(value) {
  return String(value || "").trim().toLowerCase();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseUserId(value) {
  return String(value || "").replace(/[<@!>]/g, "").trim();
}

function buildCardIndex(cards) {
  const map = new Map();

  for (const card of cards) {
    const keys = [
      card?.code,
      card?.name,
      card?.displayName,
      card?.variant,
      `${card?.name || ""} ${card?.title || ""}`.trim(),
    ].filter(Boolean);

    for (const key of keys) {
      map.set(normalize(key), card);
      map.set(normalizeCode(key), card);
    }
  }

  return map;
}

const cardIndex = buildCardIndex(cardsData);

function findCardTemplate(query) {
  const q = normalize(query);
  const qc = normalizeCode(query);

  return cardIndex.get(q) || cardIndex.get(qc) || null;
}

function makeInstanceId(cardCode) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${cardCode}_${Date.now()}_${rand}`;
}

function clampStage(stage) {
  const n = Number(stage || 1);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(3, Math.floor(n)));
}

function clampLevel(level) {
  const n = Number(level || 1);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

function getStageTier(template, stage) {
  return (
    template.evolutionForms?.[stage - 1]?.tier ||
    template.currentTier ||
    template.baseTier ||
    template.rarity ||
    "C"
  );
}

function getStageName(template, stage) {
  return (
    template.evolutionForms?.[stage - 1]?.name ||
    template.variant ||
    template.displayName ||
    template.name
  );
}

function getStageImage(template, stage) {
  const stageKey = `M${stage}`;

  return (
    template.evolutionForms?.[stage - 1]?.image ||
    template.stageImages?.[stageKey] ||
    template.image ||
    ""
  );
}

function getStageMultiplier(template, stage) {
  if (template.code === "luffy_straw_hat") {
    if (stage === 1) return 1;
    if (stage === 2) return 1.75;
    return 2.35;
  }

  if (stage === 1) return 1;
  if (stage === 2) return 1.2;
  return 1.45;
}

function scaleStat(base, stageMultiplier, level) {
  const lvlBonus = Math.max(0, level - 1) * 2;
  return Math.floor(Number(base || 0) * stageMultiplier) + lvlBonus;
}

function computePower(atk, hp, speed, template, stage) {
  return (
    Number(template.powerCaps?.[`M${stage}`] || 0) ||
    Math.floor(Number(atk) * 1.4 + Number(hp) * 0.22 + Number(speed) * 9)
  );
}

function makeOwnedBattleCard(template, level = 1, stage = 1) {
  const finalStage = clampStage(stage);
  const finalLevel = clampLevel(level);
  const stageKey = `M${finalStage}`;
  const currentTier = getStageTier(template, finalStage);
  const stageMultiplier = getStageMultiplier(template, finalStage);

  const baseAtk = Number(template.baseAtk ?? template.atk ?? 0);
  const baseHp = Number(template.baseHp ?? template.hp ?? 0);
  const baseSpeed = Number(template.baseSpeed ?? template.speed ?? 0);

  const atk = scaleStat(baseAtk, stageMultiplier, finalLevel);
  const hp = scaleStat(baseHp, stageMultiplier, finalLevel);
  const speed = scaleStat(baseSpeed, stageMultiplier, finalLevel);

  return {
    ...template,
    instanceId: makeInstanceId(template.code),
    image: getStageImage(template, finalStage),
    evolutionStage: finalStage,
    evolutionKey: stageKey,
    currentTier,
    rarity: currentTier,
    variant: getStageName(template, finalStage),
    level: finalLevel,
    exp: 0,
    xp: 0,
    kills: 0,
    fragments: 0,
    equippedWeapon: "None",
    equippedWeaponCode: null,
    equippedWeapons: [],
    equippedDevilFruit: null,
    equippedDevilFruitCode: null,
    equippedDevilFruitName: null,
    weaponBonus: {
      atk: 0,
      hp: 0,
      speed: 0,
    },
    atk,
    hp,
    speed,
    currentPower: computePower(atk, hp, speed, template, finalStage),
  };
}

function alreadyOwnsCard(player, template) {
  const targetCode = normalizeCode(template.code);
  const targetName = normalize(template.displayName || template.name);

  return ensureArray(player.cards).some((card) => {
    const code = normalizeCode(card.code);
    const name = normalize(card.displayName || card.name);

    return (
      (targetCode && code === targetCode) ||
      (targetName && name === targetName)
    );
  });
}

function addFragment(player, template, amount = 1) {
  const fragments = ensureArray(player.fragments);
  const targetCode = normalizeCode(template.code);
  const targetName = normalize(template.displayName || template.name);

  const existing = fragments.find((entry) => {
    const code = normalizeCode(entry.code);
    const name = normalize(entry.name || entry.displayName);

    return (
      (targetCode && code === targetCode) ||
      (targetName && name === targetName)
    );
  });

  if (existing) {
    existing.amount = Number(existing.amount || 0) + Number(amount || 1);
    existing.name = existing.name || template.displayName || template.name;
    existing.rarity = existing.rarity || template.baseTier || template.rarity || "C";
    existing.category = existing.category || template.cardRole || "battle";
    existing.code = existing.code || template.code;
    existing.image = existing.image || template.image || "";
    return fragments;
  }

  fragments.push({
    name: template.displayName || template.name,
    amount: Number(amount || 1),
    rarity: template.baseTier || template.rarity || "C",
    category: template.cardRole || "battle",
    code: template.code,
    image: template.image || "",
  });

  return fragments;
}

module.exports = {
  name: "givecard",
  aliases: [],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const userId = parseUserId(args.shift());
    const query = String(args.shift() || "").trim();
    const level = args[0] ? Number(args[0]) : 1;
    const stage = args[1] ? Number(args[1]) : 1;

    if (!userId || !query) {
      return message.reply("Usage: `op givecard <userId/@user> <cardCode/cardName> [level] [stage]`");
    }

    const players = readPlayers();

    if (!players[userId]) {
      return message.reply(`User not found: \`${userId}\``);
    }

    const template = findCardTemplate(query);

    if (!template || template.cardRole !== "battle") {
      return message.reply("Invalid battle card.\nUse exact battle card code or exact battle card name.");
    }

    players[userId].cards = ensureArray(players[userId].cards);
    players[userId].fragments = ensureArray(players[userId].fragments);

    if (alreadyOwnsCard(players[userId], template)) {
      players[userId].fragments = addFragment(players[userId], template, 1);
      writePlayers(players);

      return message.reply(
        `User already owns \`${template.displayName || template.name}\` (${template.code}). Converted admin give into **1 Fragment** for \`${userId}\`.`
      );
    }

    const ownedCard = makeOwnedBattleCard(template, level, stage);
    players[userId].cards.push(ownedCard);

    writePlayers(players);

    return message.reply(
      `Added battle card \`${ownedCard.displayName || ownedCard.name}\` (${ownedCard.code}) to \`${userId}\` • Level ${ownedCard.level} • ${ownedCard.evolutionKey} • ${ownedCard.currentTier}`
    );
  },
};