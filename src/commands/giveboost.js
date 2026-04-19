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
  return String(value || "").trim().toLowerCase();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildCardIndex(cards) {
  const map = new Map();

  for (const card of cards) {
    const keys = [
      card?.code,
      card?.name,
      card?.displayName,
      `${card?.name || ""} ${card?.title || ""}`.trim(),
    ].filter(Boolean);

    for (const key of keys) {
      map.set(normalize(key), card);
    }
  }

  return map;
}

const cardIndex = buildCardIndex(cardsData);

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

  return {
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
    weaponBonus: { atk: 0, hp: 0, speed: 0 },
  };
}

module.exports = {
  name: "giveboost",
  aliases: [],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const userId = String(args.shift() || "").trim();
    const query = String(args.shift() || "").trim();
    const stage = args[0] ? Number(args[0]) : 1;

    if (!userId || !query) {
      return message.reply(
        "Usage: `op giveboost <userId> <boost card code or exact name> [stage]`"
      );
    }

    const players = readPlayers();

    if (!players[userId]) {
      return message.reply(`User not found: \`${userId}\``);
    }

    const template = cardIndex.get(normalize(query));

    if (!template || template.cardRole !== "boost") {
      return message.reply(
        "Invalid boost card. Use exact boost card code or exact boost card name."
      );
    }

    const ownedBoost = makeOwnedBoostCard(template, stage);

    delete ownedBoost.level;
    delete ownedBoost.exp;
    delete ownedBoost.kills;
    delete ownedBoost.atk;
    delete ownedBoost.hp;
    delete ownedBoost.speed;

    players[userId].cards = ensureArray(players[userId].cards);
    players[userId].cards.push(ownedBoost);

    writePlayers(players);

    return message.reply(
      `Added boost card \`${ownedBoost.displayName || ownedBoost.name}\` (${ownedBoost.code}) to \`${userId}\` • ${ownedBoost.evolutionKey} • ${ownedBoost.currentTier}`
    );
  },
};