const cardsDb = require("../data/cards");
const { getRarityBadge, getCardImage } = require("../config/assetLinks");

const slug = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/['".]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function withoutOverlap(m2List = [], m3List = []) {
  const m2Set = new Set(m2List.map(slug));
  return m3List.filter((x) => !m2Set.has(slug(x)));
}

function uniq(list = []) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = slug(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function pickExtra(source = [], used = [], count = 1) {
  const usedSet = new Set(used.map(slug));
  return uniq(source).filter((x) => !usedSet.has(slug(x))).slice(0, count);
}

function getBerryScale(baseTier, stage) {
  if (baseTier === "C") return stage === 2 ? 6000 : 15000;
  if (baseTier === "B") return stage === 2 ? 180000 : 420000;
  if (baseTier === "A") return stage === 2 ? 350000 : 850000;
  return stage === 2 ? 600000 : 1500000;
}

function minReqCounts(baseTier, stage) {
  if (baseTier === "C") return { cards: 0, boosts: 0 };
  if (baseTier === "B") return stage === 2 ? { cards: 1, boosts: 1 } : { cards: 2, boosts: 1 };
  if (baseTier === "A") return stage === 2 ? { cards: 2, boosts: 1 } : { cards: 3, boosts: 2 };
  return stage === 2 ? { cards: 2, boosts: 1 } : { cards: 4, boosts: 2 };
}

function getLuffySpecialPath(card) {
  if (card.code !== "luffy_straw_hat") return null;
  return {
    forms: [
      { stage: 1, key: "M1", tier: "A", name: "The Beginning" },
      { stage: 2, key: "M2", tier: "SS", name: "Revival Arc" },
      { stage: 3, key: "M3", tier: "UR", name: "Gear 5" },
    ],
    mults: { 1: 1, 2: 1.75, 3: 2.5 },
  };
}

function getStageMultiplier(card, stage) {
  const special = getLuffySpecialPath(card);
  if (special) return special.mults[stage] || 1;
  if (stage === 1) return 1;
  if (stage === 2) return 1.2;
  return 1.45;
}

function computeBattleBasePower(card) {
  return Math.floor(
    Number(card.baseAtk ?? card.atk ?? 0) * 1.4 +
      Number(card.baseHp ?? card.hp ?? 0) * 0.22 +
      Number(card.baseSpeed ?? card.speed ?? 0) * 9
  );
}

function computeBoostBasePower(card) {
  const rarityWeight =
    { C: 180, B: 260, A: 360, S: 520, SS: 700, UR: 950 }[
      String(card.baseTier || card.rarity || "C").toUpperCase()
    ] || 180;

  const value = Number(card.boostValue || 0);
  const typeWeight =
    {
      atk: 38,
      hp: 30,
      spd: 42,
      dmg: 44,
      exp: 24,
      daily: 26,
      fragmentStorage: 3,
      pullChance: 75,
    }[String(card.boostType || "").toLowerCase()] || 20;

  return Math.floor(rarityWeight + value * typeWeight);
}

function getBasePower(card) {
  return card.cardRole === "boost" ? computeBoostBasePower(card) : computeBattleBasePower(card);
}

function getPowerCaps(card) {
  const base = getBasePower(card);
  return {
    M1: base,
    M2: Math.floor(base * getStageMultiplier(card, 2)),
    M3: Math.floor(base * getStageMultiplier(card, 3)),
  };
}

function getCurrentPower(card) {
  const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
  const caps = getPowerCaps(card);
  return caps[`M${stage}`] || caps.M1;
}

function getBoostStageValue(card, stage) {
  const base = Number(card.boostValue || 0);
  const type = String(card.boostType || "").toLowerCase();

  if (type === "fragmentStorage") {
    if (base <= 18) return stage === 1 ? 18 : stage === 2 ? 36 : 55;
    if (base <= 36) return stage === 1 ? 36 : stage === 2 ? 73 : 110;
    if (base <= 55) return stage === 1 ? 55 : stage === 2 ? 110 : 165;
    if (base <= 73) return stage === 1 ? 73 : stage === 2 ? 146 : 220;
    return stage === 1 ? base : stage === 2 ? Math.floor(base * 2) : Math.floor(base * 3.25);
  }

  if (type === "daily") {
    return stage === 1 ? base : stage === 2 ? base + 1 : base + 2;
  }

  if (type === "pullChance") {
    return stage === 1 ? base : stage === 2 ? base + 1 : base + 2;
  }

  if (type === "exp") {
    return stage === 1 ? base : stage === 2 ? base + 3 : base + 6;
  }

  if (type === "atk" || type === "hp" || type === "spd" || type === "dmg") {
    return stage === 1 ? base : stage === 2 ? base + 3 : base + 6;
  }

  return stage === 1 ? base : stage === 2 ? base + 1 : base + 2;
}

function getBoostEffectText(card, stage = Number(card.evolutionStage || 1)) {
  if (card.cardRole !== "boost") return "";
  const target = card.boostTarget || "team";
  const value = getBoostStageValue(card, stage);
  const type = String(card.boostType || "").toLowerCase();

  const labels = {
    atk: `Increase ${target} ATK by ${value}%`,
    hp: `Increase ${target} HP by ${value}%`,
    spd: `Increase ${target} SPD by ${value}%`,
    dmg: `Increase ${target} damage by ${value}%`,
    exp: `Increase ${target} EXP gain by ${value}%`,
    daily: `Increase daily reward quality by ${value}`,
    fragmentStorage: `Increase fragment storage by ${value}`,
    pullChance: `Increase pull chance by ${value}`,
  };

  return labels[type] || `Boost effect: ${type || "unknown"} ${value}`;
}

function normalizeRequirementPair(card) {
  const next = clone(card);
  const m2 = next?.awakenRequirements?.M2 || null;
  const m3 = next?.awakenRequirements?.M3 || null;
  if (!m2 || !m3) return next;

  const baseTier = String(next.baseTier || next.rarity || "C").toUpperCase();
  const links = next.canonLinks || {};
  const poolCards = uniq([
    ...(next.relatedCards || []),
    ...(next.awakenPool?.cards || []),
    ...(links.cards || []),
  ]);
  const poolBoosts = uniq([
    ...(next.relatedBoosts || []),
    ...(next.awakenPool?.boosts || []),
    ...(links.boosts || []),
  ]);

  const reqM2 = {
    ...m2,
    berries: Math.max(Number(m2.berries || 0), getBerryScale(baseTier, 2)),
    cards: uniq(m2.cards || []),
    boosts: uniq(m2.boosts || []),
    selfFragments: 25,
    minLevel: next.cardRole === "battle" ? 35 : 0,
  };

  const targetM2Counts = minReqCounts(baseTier, 2);
  if (reqM2.cards.length < targetM2Counts.cards) {
    reqM2.cards = uniq([
      ...reqM2.cards,
      ...pickExtra(poolCards, reqM2.cards, targetM2Counts.cards - reqM2.cards.length),
    ]);
  }
  if (reqM2.boosts.length < targetM2Counts.boosts) {
    reqM2.boosts = uniq([
      ...reqM2.boosts,
      ...pickExtra(poolBoosts, reqM2.boosts, targetM2Counts.boosts - reqM2.boosts.length),
    ]);
  }

  let reqM3 = {
    ...m3,
    berries: Math.max(Number(m3.berries || 0), getBerryScale(baseTier, 3)),
    cards: withoutOverlap(reqM2.cards, m3.cards || []),
    boosts: withoutOverlap(reqM2.boosts, m3.boosts || []),
    selfFragments: 35,
    minLevel: next.cardRole === "battle" ? 75 : 0,
  };

  const targetM3Counts = minReqCounts(baseTier, 3);
  if (reqM3.cards.length < targetM3Counts.cards) {
    reqM3.cards = uniq([
      ...reqM3.cards,
      ...pickExtra(poolCards, [...reqM2.cards, ...reqM3.cards], targetM3Counts.cards - reqM3.cards.length),
    ]);
  }
  if (reqM3.boosts.length < targetM3Counts.boosts) {
    reqM3.boosts = uniq([
      ...reqM3.boosts,
      ...pickExtra(poolBoosts, [...reqM2.boosts, ...reqM3.boosts], targetM3Counts.boosts - reqM3.boosts.length),
    ]);
  }

  if (next.cardRole === "boost") {
    reqM3.cards = uniq([
      ...reqM3.cards,
      ...pickExtra(poolCards, [...reqM2.cards, ...reqM3.cards], Math.max(2, 2 - reqM3.cards.length)),
    ]);
    reqM3.boosts = [];
  }

  if (baseTier !== "C") {
    reqM3.berries = Math.max(reqM3.berries, reqM2.berries + Math.ceil(reqM2.berries * 0.5));
    if (reqM3.cards.length <= reqM2.cards.length) {
      reqM3.cards = uniq([
        ...reqM3.cards,
        ...pickExtra(poolCards, [...reqM2.cards, ...reqM3.cards], reqM2.cards.length + 1 - reqM3.cards.length),
      ]);
    }
    if (next.cardRole !== "boost" && reqM3.boosts.length < reqM2.boosts.length) {
      reqM3.boosts = uniq([
        ...reqM3.boosts,
        ...pickExtra(poolBoosts, [...reqM2.boosts, ...reqM3.boosts], reqM2.boosts.length - reqM3.boosts.length),
      ]);
    }
  }

  reqM2.text = reqM2.text || "Canon-linked awaken path.";
  reqM3.text =
    next.cardRole === "boost"
      ? reqM3.text || "Final boost awaken path requiring battle cards."
      : reqM3.text || "Final awaken path with harder canon requirements.";

  next.awakenRequirements.M2 = reqM2;
  next.awakenRequirements.M3 = reqM3;
  return next;
}

function hydrateCard(card) {
  if (!card) return null;

  let next = normalizeRequirementPair(clone(card));
  next.image = getCardImage(next.code, next.image || "");

  const special = getLuffySpecialPath(next);
  const stage = Math.max(1, Math.min(3, Number(next.evolutionStage || 1)));
  const weaponBonus = {
    atk: Number(next?.weaponBonus?.atk || 0),
    hp: Number(next?.weaponBonus?.hp || 0),
    speed: Number(next?.weaponBonus?.speed || 0),
  };
  const fruitBonus = {
    atk: Number(next?.fruitBonus?.atk || 0),
    hp: Number(next?.fruitBonus?.hp || 0),
    speed: Number(next?.fruitBonus?.speed || 0),
  };

  if (special) {
    const mult = special.mults[stage];
    next.evolutionForms = [
      { ...special.forms[0], require: null, badgeImage: getRarityBadge(special.forms[0].tier) },
      { ...special.forms[1], require: next.awakenRequirements?.M2 || null, badgeImage: getRarityBadge(special.forms[1].tier) },
      { ...special.forms[2], require: next.awakenRequirements?.M3 || null, badgeImage: getRarityBadge(special.forms[2].tier) },
    ];
    next.baseTier = "A";
    next.evolutionStage = stage;
    next.evolutionKey = `M${stage}`;
    next.currentTier = special.forms[stage - 1].tier;
    next.rarity = special.forms[stage - 1].tier;
    next.baseAtk = Number(next.baseAtk ?? next.atk ?? 0);
    next.baseHp = Number(next.baseHp ?? next.hp ?? 0);
    next.baseSpeed = Number(next.baseSpeed ?? next.speed ?? 0);
    next.atk = Math.floor(next.baseAtk * mult) + weaponBonus.atk + fruitBonus.atk;
    next.hp = Math.floor(next.baseHp * mult) + weaponBonus.hp + fruitBonus.hp;
    next.speed = Math.floor(next.baseSpeed * mult) + weaponBonus.speed + fruitBonus.speed;
  }

  next.badgeImage = getRarityBadge(next.currentTier || next.rarity || "");
  next.evolutionForms = (next.evolutionForms || []).map((form, index) => ({
    ...form,
    badgeImage: getRarityBadge(form.tier),
    effectText: next.cardRole === "boost" ? getBoostEffectText(next, index + 1) : "",
  }));
  next.basePower = getBasePower(next);
  next.powerCaps = getPowerCaps(next);
  next.currentPower = getCurrentPower(next);
  next.effectText = next.cardRole === "boost" ? getBoostEffectText(next, stage) : "";

  return next;
}

function getAllCards() {
  return cardsDb.map(hydrateCard).filter(Boolean);
}

function findCardTemplate(query) {
  const q = slug(query);
  const all = getAllCards();
  return (
    all.find((c) => [c.code, c.name, c.displayName, c.title, c.variant].filter(Boolean).map(slug).includes(q)) ||
    all.find((c) => [c.code, c.name, c.displayName, c.title, c.variant].filter(Boolean).map(slug).some((x) => x.includes(q))) ||
    null
  );
}

function findOwnedCard(playerCards, query) {
  const q = slug(query);
  const all = (playerCards || []).map(hydrateCard).filter(Boolean);
  return (
    all.find((c) => [c.code, c.name, c.displayName, c.title, c.variant].filter(Boolean).map(slug).includes(q)) ||
    all.find((c) => [c.code, c.name, c.displayName, c.title, c.variant].filter(Boolean).map(slug).some((x) => x.includes(q))) ||
    null
  );
}

function rollBaseTier() {
  const r = Math.random() * 100;
  if (r < 45) return "C";
  if (r < 75) return "B";
  if (r < 93) return "A";
  return "S";
}

function createOwnedCard(template) {
  const card = hydrateCard(template);
  const owned = {
    ...card,
    instanceId: `${Date.now()}_${Math.floor(Math.random() * 999999)}`,
    equippedWeapon: null,
    equippedWeaponCode: null,
    equippedDevilFruit: null,
    equippedDevilFruitCode: null,
    weaponBonus: { atk: 0, hp: 0, speed: 0 },
    fruitBonus: { atk: 0, hp: 0, speed: 0 },
    fragments: Number(card.fragments || 0),
  };

  if (card.cardRole === "boost") {
    delete owned.level;
    delete owned.exp;
    delete owned.kills;
    delete owned.atk;
    delete owned.hp;
    delete owned.speed;
    return owned;
  }

  owned.level = Number(card.level || 1);
  owned.exp = Number(card.exp || 0);
  owned.kills = Number(card.kills || 0);
  return owned;
}

function getOwnedFragmentAmount(player, cardCode) {
  const entry = (player.fragments || []).find((x) => slug(x.code) === slug(cardCode));
  return Number(entry?.amount || 0);
}

function consumeSelfFragments(player, cardCode, amount) {
  const next = [...(player.fragments || [])];
  const idx = next.findIndex((x) => slug(x.code) === slug(cardCode));
  if (idx === -1) throw new Error(`Missing ${amount} self fragments.`);
  const current = Number(next[idx].amount || 0);
  if (current < amount) throw new Error(`Missing ${amount} self fragments.`);
  if (current === amount) next.splice(idx, 1);
  else next[idx] = { ...next[idx], amount: current - amount };
  return next;
}

function verifyRequirementOwnership(player, targetInstanceId, targetCard, req) {
  const ownedCards = (player.cards || []).map(hydrateCard).filter(Boolean);

  for (const code of [...(req.cards || []), ...(req.boosts || [])]) {
    const hit = ownedCards.find((c) => c.instanceId !== targetInstanceId && slug(c.code) === slug(code));
    if (!hit) return { ok: false, reason: `Missing required card/boost: ${code}` };
  }

  if (Number(player.berries || 0) < Number(req.berries || 0)) {
    return { ok: false, reason: "Not enough berries." };
  }

  if (Number(req.selfFragments || 0) > 0) {
    const amount = getOwnedFragmentAmount(player, targetCard.code);
    if (amount < Number(req.selfFragments)) {
      return { ok: false, reason: `Need ${req.selfFragments} fragments of ${targetCard.displayName || targetCard.name}.` };
    }
  }

  if (targetCard.cardRole === "battle" && Number(req.minLevel || 0) > 0) {
    if (Number(targetCard.level || 1) < Number(req.minLevel)) {
      return { ok: false, reason: `Need minimum level ${req.minLevel}.` };
    }
  }

  return { ok: true };
}

function consumeReqCards(player, targetInstanceId, req) {
  const needed = [...(req.cards || []), ...(req.boosts || [])].map(slug);
  const next = [...(player.cards || [])];

  for (const code of needed) {
    const idx = next.findIndex((c) => c.instanceId !== targetInstanceId && slug(c.code) === code);
    if (idx === -1) throw new Error(`Missing required card/boost: ${code}`);
    next.splice(idx, 1);
  }

  return next;
}

function awakenOwnedCard(player, query) {
  const target = findOwnedCard(player.cards || [], query);
  if (!target) throw new Error("Card not found.");
  if (Number(target.evolutionStage || 1) >= 3) throw new Error("This card is already at M3.");

  const nextStage = Number(target.evolutionStage || 1) + 1;
  const req = target.awakenRequirements?.[`M${nextStage}`];
  if (!req) throw new Error("No requirement found for next stage.");

  const verify = verifyRequirementOwnership(player, target.instanceId, target, req);
  if (!verify.ok) throw new Error(verify.reason);

  const cardsAfterConsume = consumeReqCards(player, target.instanceId, req);
  const fragmentsAfterConsume =
    Number(req.selfFragments || 0) > 0
      ? consumeSelfFragments(player, target.code, Number(req.selfFragments))
      : [...(player.fragments || [])];

  const updatedCards = cardsAfterConsume.map((c) =>
    c.instanceId === target.instanceId
      ? hydrateCard({ ...c, evolutionStage: nextStage, evolutionKey: `M${nextStage}` })
      : hydrateCard(c)
  );

  return {
    updatedCards,
    updatedFragments: fragmentsAfterConsume,
    berries: Number(player.berries || 0) - Number(req.berries || 0),
    target: updatedCards.find((c) => c.instanceId === target.instanceId),
    req,
  };
}

module.exports = {
  slug,
  hydrateCard,
  getAllCards,
  findCardTemplate,
  findOwnedCard,
  rollBaseTier,
  createOwnedCard,
  awakenOwnedCard,
  getBoostEffectText,
  getBoostStageValue,
  getBasePower,
  getPowerCaps,
  getCurrentPower,
};