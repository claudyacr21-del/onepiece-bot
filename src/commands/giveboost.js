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

function toPositiveInt(value, fallback = 1) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
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

function getBoostCurrentPower(template, stage) {
  return (
    Number(template.powerCaps?.[`M${stage}`] || 0) ||
    Number(template.currentPower || 0) ||
    0
  );
}

function makeOwnedBoostCard(template, stage = 1) {
  const finalStage = clampStage(stage);
  const stageKey = `M${finalStage}`;
  const currentTier = getStageTier(template, finalStage);

  const ownedBoost = {
    ...template,
    instanceId: makeInstanceId(template.code),
    image: getStageImage(template, finalStage),
    evolutionStage: finalStage,
    evolutionKey: stageKey,
    currentTier,
    rarity: currentTier,
    variant: getStageName(template, finalStage),
    fragments: 0,
    currentPower: getBoostCurrentPower(template, finalStage),
    equippedWeapon: "None",
    equippedWeaponCode: null,
    equippedWeapons: [],
    equippedDevilFruit: null,
    equippedDevilFruitCode: null,
    weaponBonus: {
      atk: 0,
      hp: 0,
      speed: 0,
    },
  };

  delete ownedBoost.level;
  delete ownedBoost.exp;
  delete ownedBoost.xp;
  delete ownedBoost.kills;
  delete ownedBoost.atk;
  delete ownedBoost.hp;
  delete ownedBoost.speed;

  return ownedBoost;
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
  const finalAmount = toPositiveInt(amount, 1);

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
    existing.amount = Number(existing.amount || 0) + finalAmount;
    existing.name = existing.name || template.displayName || template.name;
    existing.rarity = existing.rarity || template.baseTier || template.rarity || "C";
    existing.category = existing.category || "boost";
    existing.code = existing.code || template.code;
    existing.image = existing.image || template.image || "";
    return fragments;
  }

  fragments.push({
    name: template.displayName || template.name,
    amount: finalAmount,
    rarity: template.baseTier || template.rarity || "C",
    category: "boost",
    code: template.code,
    image: template.image || "",
  });

  return fragments;
}

module.exports = {
  name: "giveboost",
  aliases: [],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const userId = parseUserId(args.shift());
    const query = String(args.shift() || "").trim();
    const amountOrStage = toPositiveInt(args[0], 1);

    if (!userId || !query) {
      return message.reply("Usage: `op giveboost <userId/@user> <boost_code> [amount/stage]`");
    }

    const players = readPlayers();

    if (!players[userId]) {
      return message.reply(`User not found: \`${userId}\``);
    }

    const template = findCardTemplate(query);

    if (!template || template.cardRole !== "boost") {
      return message.reply(
        "Invalid boost card.\nUse exact boost card code or exact boost card name."
      );
    }

    players[userId].cards = ensureArray(players[userId].cards);
    players[userId].fragments = ensureArray(players[userId].fragments);

    if (alreadyOwnsCard(players[userId], template)) {
      players[userId].fragments = addFragment(players[userId], template, amountOrStage);
      writePlayers(players);

      return message.reply(
        `User already owns boost \`${template.displayName || template.name}\` (${template.code}).\n` +
          `Converted admin give into **${amountOrStage} Fragment${amountOrStage > 1 ? "s" : ""}** for \`${userId}\`.`
      );
    }

    const ownedBoost = makeOwnedBoostCard(template, amountOrStage);
    players[userId].cards.push(ownedBoost);

    writePlayers(players);

    return message.reply(
      `Added boost card \`${ownedBoost.displayName || ownedBoost.name}\` (${ownedBoost.code}) to \`${userId}\` • ${ownedBoost.evolutionKey} • ${ownedBoost.currentTier}`
    );
  },
};