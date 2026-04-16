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
  };

  const targetM2Counts = minReqCounts(baseTier, 2);
  if (reqM2.cards.length < targetM2Counts.cards) {
    reqM2.cards = uniq([...reqM2.cards, ...pickExtra(poolCards, reqM2.cards, targetM2Counts.cards - reqM2.cards.length)]);
  }
  if (reqM2.boosts.length < targetM2Counts.boosts) {
    reqM2.boosts = uniq([...reqM2.boosts, ...pickExtra(poolBoosts, reqM2.boosts, targetM2Counts.boosts - reqM2.boosts.length)]);
  }

  let reqM3 = {
    ...m3,
    berries: Math.max(Number(m3.berries || 0), getBerryScale(baseTier, 3)),
    cards: withoutOverlap(reqM2.cards, uniq(m3.cards || [])),
    boosts: withoutOverlap(reqM2.boosts, uniq(m3.boosts || [])),
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

  if (baseTier !== "C") {
    reqM3.berries = Math.max(reqM3.berries, reqM2.berries + Math.ceil(reqM2.berries * 0.5));
    if (reqM3.cards.length <= reqM2.cards.length) {
      reqM3.cards = uniq([
        ...reqM3.cards,
        ...pickExtra(poolCards, [...reqM2.cards, ...reqM3.cards], reqM2.cards.length + 1 - reqM3.cards.length),
      ]);
    }
    if (reqM3.boosts.length < reqM2.boosts.length) {
      reqM3.boosts = uniq([
        ...reqM3.boosts,
        ...pickExtra(poolBoosts, [...reqM2.boosts, ...reqM3.boosts], reqM2.boosts.length - reqM3.boosts.length),
      ]);
    }
  }

  reqM2.text = reqM2.text || "Canon-linked awaken path.";
  reqM3.text = reqM3.text || "Final awaken path with harder canon requirements.";

  next.awakenRequirements.M2 = reqM2;
  next.awakenRequirements.M3 = reqM3;

  if (Array.isArray(next.evolutionForms)) {
    if (next.evolutionForms[1]) next.evolutionForms[1] = { ...next.evolutionForms[1], require: reqM2 };
    if (next.evolutionForms[2]) next.evolutionForms[2] = { ...next.evolutionForms[2], require: reqM3 };
  }

  return next;
}

function hydrateCard(card) {
  if (!card) return null;
  const next = normalizeRequirementPair(clone(card));
  next.image = getCardImage(next.code, next.image || "");
  next.badgeImage = getRarityBadge(next.currentTier || next.rarity || "");
  next.evolutionForms = (next.evolutionForms || []).map((form) => ({
    ...form,
    badgeImage: getRarityBadge(form.tier),
  }));
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
  return {
    ...card,
    instanceId: `${Date.now()}_${Math.floor(Math.random() * 999999)}`,
    level: Number(card.level || 1),
    exp: Number(card.exp || 0),
    kills: Number(card.kills || 0),
    equippedWeapon: null,
    equippedWeaponCode: null,
    weaponBonus: { atk: 0, hp: 0, speed: 0 },
  };
}

function verifyRequirementOwnership(player, targetInstanceId, req) {
  const ownedCards = (player.cards || []).map(hydrateCard).filter(Boolean);
  for (const code of [...(req.cards || []), ...(req.boosts || [])]) {
    const hit = ownedCards.find((c) => c.instanceId !== targetInstanceId && slug(c.code) === slug(code));
    if (!hit) return { ok: false, reason: `Missing required card/boost: ${code}` };
  }
  if (Number(player.berries || 0) < Number(req.berries || 0)) {
    return { ok: false, reason: "Not enough berries." };
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

  const verify = verifyRequirementOwnership(player, target.instanceId, req);
  if (!verify.ok) throw new Error(verify.reason);

  const cardsAfterConsume = consumeReqCards(player, target.instanceId, req);
  const updatedCards = cardsAfterConsume.map((c) =>
    c.instanceId === target.instanceId
      ? hydrateCard({
          ...c,
          evolutionStage: nextStage,
          evolutionKey: `M${nextStage}`,
          currentTier: c.evolutionForms?.[nextStage - 1]?.tier || c.currentTier,
          rarity: c.evolutionForms?.[nextStage - 1]?.tier || c.rarity,
          atk: c.baseAtk ? Math.floor(Number(c.baseAtk) * (nextStage === 2 ? 1.2 : 1.45)) + Number(c.weaponBonus?.atk || 0) : c.atk,
          hp: c.baseHp ? Math.floor(Number(c.baseHp) * (nextStage === 2 ? 1.2 : 1.45)) + Number(c.weaponBonus?.hp || 0) : c.hp,
          speed: c.baseSpeed ? Math.floor(Number(c.baseSpeed) * (nextStage === 2 ? 1.2 : 1.45)) + Number(c.weaponBonus?.speed || 0) : c.speed,
        })
      : hydrateCard(c)
  );

  return {
    updatedCards,
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
};