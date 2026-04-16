const cardsDb = require("../data/cards");

const TIER_PATHS = {
  C: ["C", "B", "A"],
  B: ["B", "A", "S"],
  A: ["A", "S", "SS"],
  S: ["S", "SS", "UR"],
};

const SPECIAL_FORMS = {
  luffy: ["The Beginning", "Revival Arc", "Gear 5"],
};

const SPECIAL_REQ = {
  luffy: [
    null,
    {
      berries: 25000,
      cards: ["zoro_pirate_hunter", "nami_cat_burglar"],
      boosts: [],
      text: "Needs Zoro and Nami support to reach the Revival Arc.",
    },
    {
      berries: 100000,
      cards: ["sanji_black_leg", "jinbe", "momonosuke"],
      boosts: ["vegapunk_stella"],
      text: "Needs key allies and Vegapunk support to unlock Gear 5.",
    },
  ],
};

const slug = (s = "") =>
  String(s).toLowerCase().trim().replace(/['".]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

function cleanRarity(rarity, role) {
  const r = String(rarity || "C").toUpperCase();
  if (["C", "B", "A", "S"].includes(r)) return r;
  if (r === "SS") return "A";
  if (r === "UR") return role === "boost" ? "A" : "S";
  return "C";
}

function isJoyboy(card) {
  const fields = [card?.code, card?.name, card?.title, card?.variant].map(slug);
  return fields.some((x) => x.includes("joy_boy") || x.includes("joyboy"));
}

function getBaseKey(card) {
  const code = slug(card?.code || card?.name);
  if (code.includes("luffy")) return "luffy";
  return code;
}

function getForms(card) {
  const key = getBaseKey(card);
  const baseVariant = card?.variant || "Base";
  const forms = SPECIAL_FORMS[key] || [baseVariant || "Base", `${baseVariant || "Base"} Awakened`, `${baseVariant || "Base"} Final`];
  return [forms[0], forms[1], forms[2]];
}

function getDefaultReq(card, stage) {
  const role = card?.cardRole || "battle";
  const baseTier = cleanRarity(card?.baseTier || card?.rarity, role);

  if (stage === 1) return null;

  if (baseTier === "C") {
    return {
      berries: stage === 2 ? 6000 : 14000,
      cards: [],
      boosts: [],
      text: "Berry-only awaken path.",
    };
  }

  if (baseTier === "B") {
    return {
      berries: stage === 2 ? 15000 : 32000,
      cards: stage === 2 ? [] : [],
      boosts: [],
      text: "Standard berry-focused awaken path.",
    };
  }

  if (baseTier === "A") {
    return {
      berries: stage === 2 ? 30000 : 70000,
      cards: [],
      boosts: stage === 3 && role === "battle" ? [] : [],
      text: "Advanced awaken path.",
    };
  }

  return {
    berries: stage === 2 ? 50000 : 120000,
    cards: [],
    boosts: [],
    text: "High-tier awaken path.",
  };
}

function getReq(card, stage) {
  const key = getBaseKey(card);
  const special = SPECIAL_REQ[key]?.[stage - 1];
  return special || getDefaultReq(card, stage);
}

function statMulti(stage) {
  if (stage === 1) return 1;
  if (stage === 2) return 1.2;
  return 1.45;
}

function evolvedTier(baseTier, stage) {
  return TIER_PATHS[baseTier][stage - 1];
}

function hydrateCard(card) {
  if (!card || isJoyboy(card)) return null;

  const role = card.cardRole || (card.boostType ? "boost" : "battle");
  const baseTier = cleanRarity(card.baseTier || card.rarity, role);
  const stage = Math.min(3, Math.max(1, Number(card.evolutionStage || 1)));
  const forms = getForms(card);
  const tier = evolvedTier(baseTier, stage);

  const baseAtk = Number(card.baseAtk ?? card.atk ?? 0);
  const baseHp = Number(card.baseHp ?? card.hp ?? 0);
  const baseSpeed = Number(card.baseSpeed ?? card.speed ?? 0);
  const mult = statMulti(stage);

  const evolved = {
    ...card,
    cardRole: role,
    baseTier,
    rarity: tier,
    currentTier: tier,
    evolutionStage: stage,
    evolutionKey: `M${stage}`,
    evolutionForms: [
      { stage: 1, key: "M1", tier: evolvedTier(baseTier, 1), name: forms[0], require: getReq(card, 1) },
      { stage: 2, key: "M2", tier: evolvedTier(baseTier, 2), name: forms[1], require: getReq(card, 2) },
      { stage: 3, key: "M3", tier: evolvedTier(baseTier, 3), name: forms[2], require: getReq(card, 3) },
    ],
    baseAtk,
    baseHp,
    baseSpeed,
    atk: Math.floor(baseAtk * mult) + Number(card.weaponBonus?.atk || 0),
    hp: Math.floor(baseHp * mult) + Number(card.weaponBonus?.hp || 0),
    speed: Math.floor(baseSpeed * mult) + Number(card.weaponBonus?.speed || 0),
  };

  return evolved;
}

function getAllPullableCards() {
  return cardsDb.map(hydrateCard).filter(Boolean);
}

function findCardByQueryFromOwned(cards, query) {
  const q = slug(query);
  const hydrated = cards.map(hydrateCard).filter(Boolean);
  return (
    hydrated.find((c) => [c.code, c.name, c.displayName, c.title, c.variant].filter(Boolean).map(slug).includes(q)) ||
    hydrated.find((c) => [c.code, c.name, c.displayName, c.title, c.variant].filter(Boolean).map(slug).some((x) => x.includes(q))) ||
    null
  );
}

function findCardTemplate(query) {
  const q = slug(query);
  const cards = getAllPullableCards();
  return (
    cards.find((c) => [c.code, c.name, c.displayName, c.title, c.variant].filter(Boolean).map(slug).includes(q)) ||
    cards.find((c) => [c.code, c.name, c.displayName, c.title, c.variant].filter(Boolean).map(slug).some((x) => x.includes(q))) ||
    null
  );
}

function rollBaseTier() {
  const roll = Math.random() * 100;
  if (roll < 45) return "C";
  if (roll < 75) return "B";
  if (roll < 93) return "A";
  return "S";
}

function createOwnedCardFromTemplate(template) {
  const base = hydrateCard({ ...template, evolutionStage: 1, weaponBonus: { atk: 0, hp: 0, speed: 0 } });
  return {
    ...base,
    instanceId: `${Date.now()}_${Math.floor(Math.random() * 999999)}`,
    level: Number(base.level || 1),
    exp: Number(base.exp || 0),
    kills: Number(base.kills || 0),
    equippedWeapon: null,
    weaponBonus: { atk: 0, hp: 0, speed: 0 },
  };
}

function consumeRequirementCards(player, targetInstanceId, req) {
  const cards = [...(player.cards || [])];
  const consumeCodes = [...(req.cards || []), ...(req.boosts || [])];

  for (const code of consumeCodes) {
    const idx = cards.findIndex((c) => c.instanceId !== targetInstanceId && slug(c.code) === slug(code));
    if (idx === -1) throw new Error(`Missing required card/boost: ${code}`);
    cards.splice(idx, 1);
  }

  return cards;
}

function canAffordAwaken(player, targetCard, nextStage) {
  const hydrated = hydrateCard(targetCard);
  const req = hydrated?.evolutionForms?.find((x) => x.stage === nextStage)?.require;
  if (!req) return { ok: false, reason: "No next awaken stage." };
  if (Number(player.berries || 0) < Number(req.berries || 0)) return { ok: false, reason: "Not enough berries." };

  for (const code of [...(req.cards || []), ...(req.boosts || [])]) {
    const hit = (player.cards || []).find((c) => c.instanceId !== targetCard.instanceId && slug(c.code) === slug(code));
    if (!hit) return { ok: false, reason: `Missing ${code}.` };
  }

  return { ok: true, req };
}

function awakenOwnedCard(player, query) {
  const cards = [...(player.cards || [])];
  const target = findCardByQueryFromOwned(cards, query);
  if (!target) throw new Error("Card not found.");
  if (target.evolutionStage >= 3) throw new Error("This card is already at M3.");

  const nextStage = Number(target.evolutionStage || 1) + 1;
  const check = canAffordAwaken(player, target, nextStage);
  if (!check.ok) throw new Error(check.reason);

  const req = check.req;
  const cardsAfterConsume = consumeRequirementCards(player, target.instanceId, req);

  const updatedCards = cardsAfterConsume.map((c) => {
    if (c.instanceId !== target.instanceId) return c;
    return hydrateCard({
      ...c,
      evolutionStage: nextStage,
    });
  });

  return {
    updatedCards,
    berries: Number(player.berries || 0) - Number(req.berries || 0),
    target: hydrateCard({ ...target, evolutionStage: nextStage }),
    req,
  };
}

module.exports = {
  slug,
  hydrateCard,
  getAllPullableCards,
  findCardTemplate,
  findCardByQueryFromOwned,
  createOwnedCardFromTemplate,
  rollBaseTier,
  awakenOwnedCard,
  canAffordAwaken,
};