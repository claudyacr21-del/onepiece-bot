const { updatePlayerAtomic } = require("../playerStore");
const cardsData = require("../data/cards");

function parseEnvIds(...values) {
  return values
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.replace(/[<@&>]/g, "").trim())
    .filter(Boolean);
}

function getAdminUserIds() {
  return parseEnvIds(
    process.env.ADMIN_USER_IDS,
    process.env.DISCORD_OWNER_ID,
    process.env.BOT_OWNER_ID,
  );
}

function getAdminRoleIds() {
  return parseEnvIds(process.env.ADMIN_ROLE_IDS);
}

function memberHasAdminRole(message) {
  const roleIds = getAdminRoleIds();
  if (!roleIds.length) return false;

  const member = message?.resolvedMember || message?.mainMember || message?.member || null;
  if (!member?.roles?.cache) return false;

  return roleIds.some((roleId) => member.roles.cache.has(roleId));
}

function isAdmin(message) {
  const userId = String(message?.author?.id || "");
  return getAdminUserIds().includes(userId) || memberHasAdminRole(message);
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseUserId(value) {
  return String(value || "").replace(/[<@!>]/g, "").trim();
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function toPositiveInt(value, fallback = 1) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function isPositiveNumberText(value) {
  const text = String(value || "").trim();
  if (!/^\d+$/.test(text)) return false;
  return Number(text) > 0;
}

function parseGiveArgs(args, message = null) {
  const parts = [...args];
  const mentionedUser = message?.mentions?.users?.first?.() || null;
  const firstArg = parts.shift();
  const userId = mentionedUser?.id || parseUserId(firstArg);

  let stage = 1;
  let levelOrAmount = 1;

  if (parts.length && isPositiveNumberText(parts[parts.length - 1])) {
    const last = Number(parts[parts.length - 1]);

    if (parts.length >= 2 && last >= 1 && last <= 3) {
      stage = toPositiveInt(parts.pop(), 1);
    }
  }

  if (parts.length && isPositiveNumberText(parts[parts.length - 1])) {
    levelOrAmount = toPositiveInt(parts.pop(), 1);
  }

  const query = parts.join(" ").trim();

  return {
    userId,
    query,
    levelOrAmount,
    stage: Math.max(1, Math.min(3, stage)),
  };
}

function scoreNameOnly(query, names) {
  const q = normalizeName(query);
  if (!q) return 0;

  let best = 0;

  for (const raw of names) {
    const name = normalizeName(raw);
    if (!name) continue;

    if (name === q) {
      best = Math.max(best, 1000 + name.length);
      continue;
    }

    if (name.startsWith(q)) {
      best = Math.max(best, 750 + q.length);
      continue;
    }

    if (name.includes(q)) {
      best = Math.max(best, 500 + q.length);
      continue;
    }

    const words = q.split(" ").filter(Boolean);

    if (words.length && words.every((word) => name.includes(word))) {
      best = Math.max(best, 300 + words.join("").length);
    }
  }

  return best;
}

function scoreCodeOnly(query, code) {
  const q = normalizeCode(query);
  const cardCode = normalizeCode(code);

  if (!q || !cardCode) return 0;

  if (cardCode === q) return 2000 + cardCode.length;
  if (cardCode.startsWith(q)) return 1500 + q.length;
  if (cardCode.includes(q)) return 1000 + q.length;

  return 0;
}

function isMergeCard(template) {
  return (
    String(template?.cardRole || "").toLowerCase() === "mergecard" ||
    template?.mergeOnly === true ||
    String(template?.pullTier || "").toUpperCase() === "MERGE" ||
    String(template?.type || "").toLowerCase() === "merge"
  );
}

function getGiveCardTemplates() {
  return ensureArray(cardsData).filter((card) => {
    const role = String(card?.cardRole || "").toLowerCase();
    return role === "battle" || role === "mergecard";
  });
}

function findGiveCardTemplate(query) {
  const scored = getGiveCardTemplates()
    .map((card) => {
      const nameScore = scoreNameOnly(query, [
        card.displayName,
        card.name,
      ]);

      const codeScore = isMergeCard(card)
        ? scoreCodeOnly(query, card.code)
        : 0;

      return {
        card,
        score: Math.max(nameScore, codeScore),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const aName = normalizeName(a.card.displayName || a.card.name || a.card.code);
      const bName = normalizeName(b.card.displayName || b.card.name || b.card.code);

      return aName.length - bName.length;
    });

  return scored.length ? scored[0].card : null;
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
  const targetName = normalizeName(template.displayName || template.name);

  return ensureArray(player.cards).some((card) => {
    const cardCode = normalizeCode(card.code);
    const cardName = normalizeName(card.displayName || card.name);

    if (targetCode && cardCode && cardCode === targetCode) return true;
    return targetName && cardName === targetName;
  });
}

function addFragment(player, template, amount = 1) {
  const fragments = ensureArray(player.fragments);
  const finalAmount = toPositiveInt(amount, 1);
  const targetCode = normalizeCode(template.code);
  const targetName = normalizeName(template.displayName || template.name);

  const existing = fragments.find((entry) => {
    const code = normalizeCode(entry.code);
    const name = normalizeName(entry.name || entry.displayName);

    if (targetCode && code && code === targetCode) return true;
    return targetName && name === targetName;
  });

  if (existing) {
    existing.amount = Number(existing.amount || 0) + finalAmount;
    existing.name = existing.name || template.displayName || template.name;
    existing.rarity = existing.rarity || template.baseTier || template.rarity || "C";
    existing.category = existing.category || template.cardRole || "battle";
    existing.code = existing.code || template.code;
    existing.image = existing.image || template.image || "";
    return fragments;
  }

  fragments.push({
    name: template.displayName || template.name,
    amount: finalAmount,
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
    if (!isAdmin(message)) {
      return message.reply({
        content: "Owner only command.",
        allowedMentions: { repliedUser: false },
      });
    }

    const { userId, query, levelOrAmount, stage } = parseGiveArgs(args, message);

    if (!userId || !query) {
      return message.reply({
        content:
          "Usage: `op givecard <@user/userId> <card name/code> [level/fragment amount] [stage]`\n" +
          "Example: `op givecard 697763966650417193 saturn 1`\n" +
          "Merge card code example: `op givecard 697763966650417193 lzs 1`, `op givecard 697763966650417193 gvl 1`, `op givecard 697763966650417193 tfb 1`, `op givecard 697763966650417193 wgd 1`",
        allowedMentions: { repliedUser: false },
      });
    }

    const template = findGiveCardTemplate(query);

    if (!template) {
      return message.reply({
        content:
          `Invalid card: \`${query}\`\n` +
          "Battle cards use the battle card display name.\n" +
          "Merge cards can use display name or code.\n" +
          "Example: `saturn`, `luffy`, `zoro`, `lzs`, `gvl`, `tfb`, `wgd`.",
        allowedMentions: { repliedUser: false },
      });
    }

    let addedCard = null;
    let convertedToFragment = false;

    updatePlayerAtomic(
      userId,
      (fresh) => {
        const cards = ensureArray(fresh.cards).map((card) => ({ ...card }));
        const fragments = ensureArray(fresh.fragments).map((frag) => ({ ...frag }));

        const draft = {
          ...fresh,
          cards,
          fragments,
        };

        if (alreadyOwnsCard(draft, template)) {
          convertedToFragment = true;

          return {
            ...draft,
            fragments: addFragment(draft, template, levelOrAmount),
          };
        }

        addedCard = makeOwnedBattleCard(template, levelOrAmount, stage);

        return {
          ...draft,
          cards: [...cards, addedCard],
        };
      },
      message.mentions.users.first()?.username || "Unknown"
    );

    if (convertedToFragment) {
      return message.reply({
        content:
          `User already owns \`${template.displayName || template.name}\`.\n` +
          `Converted admin give into **${levelOrAmount} Fragment${levelOrAmount > 1 ? "s" : ""}** for \`${userId}\`.`,
        allowedMentions: { repliedUser: false },
      });
    }

    return message.reply({
      content:
        `Added ${isMergeCard(addedCard) ? "merge" : (addedCard.cardRole || "battle")} card \`${addedCard.displayName || addedCard.name}\` to \`${userId}\`` +
        ` • Level ${addedCard.level} • ${addedCard.evolutionKey} • ${addedCard.currentTier}`,
      allowedMentions: { repliedUser: false },
    });
  },
};