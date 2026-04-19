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

function clampLevel(level) {
  const n = Number(level || 1);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
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
    kills: 0,
    fragments: 0,
    equippedWeapon: "None",
    equippedWeaponCode: null,
    equippedWeapons: [],
    equippedDevilFruit: null,
    equippedDevilFruitCode: null,
    weaponBonus: { atk: 0, hp: 0, speed: 0 },
    atk,
    hp,
    speed,
    currentPower: computePower(atk, hp, speed, template, finalStage),
  };
}

module.exports = {
  name: "givecard",
  aliases: [],

  async execute(message, args) {
    if (!isAdmin(message.author.id)) {
      return message.reply("Owner only command.");
    }

    const userId = String(args.shift() || "").trim();
    const query = String(args.shift() || "").trim();
    const level = args[0] ? Number(args[0]) : 1;
    const stage = args[1] ? Number(args[1]) : 1;

    if (!userId || !query) {
      return message.reply(
        "Usage: `op givecard <userId> <battle card code or exact name> [level] [stage]`"
      );
    }

    const players = readPlayers();

    if (!players[userId]) {
      return message.reply(`User not found: \`${userId}\``);
    }

    const template = cardIndex.get(normalize(query));

    if (!template || template.cardRole !== "battle") {
      return message.reply(
        "Invalid battle card. Use exact battle card code or exact battle card name."
      );
    }

    const ownedCard = makeOwnedBattleCard(template, level, stage);

    players[userId].cards = ensureArray(players[userId].cards);
    players[userId].cards.push(ownedCard);

    writePlayers(players);

    return message.reply(
      `Added battle card \`${ownedCard.displayName || ownedCard.name}\` (${ownedCard.code}) to \`${userId}\` • Level ${ownedCard.level} • ${ownedCard.evolutionKey} • ${ownedCard.currentTier}`
    );
  },
};