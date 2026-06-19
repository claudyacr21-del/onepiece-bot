const { updatePlayerAtomic } = require("../playerStore");
const cardsData = require("../data/cards");
const { hydrateCard } = require("../utils/evolution");

function parseEnvIds(...values) {
  return values
    .flatMap((value) => String(value || "").split(","))
    .map((value) =>
      value
        .replace(/[<@&>]/g, "")
        .trim()
    )
    .filter(Boolean);
}

function getAdminUserIds() {
  return parseEnvIds(
    process.env.ADMIN_USER_IDS,
    process.env.DISCORD_OWNER_ID,
    process.env.BOT_OWNER_ID,
    process.env.BOT_OWNER_IDS,
    process.env.OWNER_IDS
  );
}

function getAdminRoleIds() {
  return parseEnvIds(process.env.ADMIN_ROLE_IDS);
}

async function getCommandMember(message) {
  if (!message?.guild || !message?.author?.id) return null;

  return (
    message?.resolvedMember ||
    message?.mainMember ||
    message?.member ||
    message.guild.members.cache.get(message.author.id) ||
    (await message.guild.members.fetch(message.author.id).catch(() => null))
  );
}

async function memberHasAdminRole(message) {
  const roleIds = getAdminRoleIds();

  if (!roleIds.length) return false;

  const member = await getCommandMember(message);

  if (!member?.roles?.cache) return false;

  return roleIds.some((roleId) => member.roles.cache.has(roleId));
}

async function isAdmin(message) {
  const userId = String(message?.author?.id || "");

  return getAdminUserIds().includes(userId) || await memberHasAdminRole(message);
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[<@!>]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
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

function clampStage(stage) {
  const n = Number(stage || 1);

  if (!Number.isFinite(n)) return 1;

  return Math.max(1, Math.min(3, Math.floor(n)));
}

function scoreQuery(query, fields) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;
  const qWords = q.split(" ").filter(Boolean);

  for (const raw of fields.filter(Boolean)) {
    const value = normalize(raw);
    if (!value) continue;

    if (value === q) best = Math.max(best, 1000 + value.length);
    else if (value.startsWith(q)) best = Math.max(best, 800 + q.length);
    else if (value.includes(q)) best = Math.max(best, 650 + q.length);
    else if (qWords.length && qWords.every((word) => value.includes(word))) {
      best = Math.max(best, 450 + qWords.join("").length);
    }
  }

  return best;
}

function findBoostTemplate(query) {
  const scored = ensureArray(cardsData)
    .filter((card) => String(card?.cardRole || "").toLowerCase() === "boost")
    .map((card) => ({
      card,
      score: scoreQuery(query, [
        card.code,
        card.name,
        card.displayName,
        card.variant,
        card.title,
        ...(Array.isArray(card.aliases) ? card.aliases : []),
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.card.displayName || a.card.name || "").localeCompare(
        String(b.card.displayName || b.card.name || "")
      );
    });

  return scored.length ? scored[0].card : null;
}

function makeInstanceId(cardCode) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${cardCode}_${Date.now()}_${rand}`;
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

  return hydrateCard(ownedBoost);
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

function addFragmentToList(fragments, template, amount = 1) {
  const list = ensureArray(fragments).map((entry) => ({ ...entry }));
  const finalAmount = toPositiveInt(amount, 1);
  const targetCode = normalizeCode(template.code);
  const targetName = normalize(template.displayName || template.name);

  const index = list.findIndex((entry) => {
    const code = normalizeCode(entry.code);
    const name = normalize(entry.name || entry.displayName);

    return (
      (targetCode && code === targetCode) ||
      (targetName && name === targetName)
    );
  });

  if (index !== -1) {
    list[index] = {
      ...list[index],
      amount: Number(list[index].amount || 0) + finalAmount,
      name: list[index].name || template.displayName || template.name,
      rarity: list[index].rarity || template.baseTier || template.rarity || "C",
      category: list[index].category || "boost",
      code: list[index].code || template.code,
      image: list[index].image || template.image || "",
    };

    return list;
  }

  list.push({
    name: template.displayName || template.name,
    amount: finalAmount,
    rarity: template.baseTier || template.rarity || "C",
    category: "boost",
    code: template.code,
    image: template.image || "",
  });

  return list;
}

function parseGiveBoostArgs(args, message) {
  const parts = [...args];
  const mentionedUser = message?.mentions?.users?.first?.() || null;
  const firstArg = parts.shift();
  const userId = mentionedUser?.id || parseUserId(firstArg);

  let amountOrStage = 1;

  if (parts.length && /^\d+$/.test(String(parts[parts.length - 1] || ""))) {
    amountOrStage = toPositiveInt(parts.pop(), 1);
  }

  const query = parts.join(" ").trim();

  return {
    userId,
    query,
    amountOrStage,
  };
}

module.exports = {
  name: "giveboost",
  aliases: [],

  async execute(message, args) {
    if (!(await isAdmin(message))) {
      return message.reply({
        content: "Owner only command.",
        allowedMentions: { repliedUser: false },
      });
    }

    const { userId, query, amountOrStage } = parseGiveBoostArgs(args, message);

    if (!userId || !query) {
      return message.reply({
        content:
          "Usage: `op giveboost @user <boost card name> [amount/stage]`\nExample: `op giveboost @user tony tony chopper 1`",
        allowedMentions: { repliedUser: false },
      });
    }

    const template = findBoostTemplate(query);

    if (!template || String(template.cardRole || "").toLowerCase() !== "boost") {
      return message.reply({
        content: "Invalid boost card.\nUse the boost card name or code.",
        allowedMentions: { repliedUser: false },
      });
    }

    let resultText = "";

    try {
      updatePlayerAtomic(
        userId,
        (fresh) => {
          const cards = ensureArray(fresh.cards);
          const fragments = ensureArray(fresh.fragments);

          if (alreadyOwnsCard({ ...fresh, cards }, template)) {
            const updatedFragments = addFragmentToList(
              fragments,
              template,
              amountOrStage
            );

            resultText =
              `User already owns boost \`${template.displayName || template.name}\` (${template.code}).\n` +
              `Converted admin give into **${amountOrStage} Fragment${amountOrStage > 1 ? "s" : ""}** for \`${userId}\`.`;

            return {
              ...fresh,
              cards,
              fragments: updatedFragments,
            };
          }

          const ownedBoost = makeOwnedBoostCard(template, amountOrStage);

          resultText =
            `Added boost card \`${ownedBoost.displayName || ownedBoost.name}\` (${ownedBoost.code}) to \`${userId}\` • ${ownedBoost.evolutionKey} • ${ownedBoost.currentTier}`;

          return {
            ...fresh,
            cards: [...cards, ownedBoost],
            fragments,
          };
        },
        `User ${userId}`
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to give boost card.",
        allowedMentions: { repliedUser: false },
      });
    }

    return message.reply({
      content: resultText,
      allowedMentions: { repliedUser: false },
    });
  },
};