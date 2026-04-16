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

function sameList(a = [], b = []) {
  return JSON.stringify([...a].map(slug).sort()) === JSON.stringify([...b].map(slug).sort());
}

function ensureUniqueRequirementEntry(list = [], fallback) {
  const arr = [...list];
  if (!arr.map(slug).includes(slug(fallback))) arr.push(fallback);
  return arr;
}

function normalizeRequirementPair(card) {
  const next = clone(card);
  const m2 = next?.awakenRequirements?.M2 || null;
  const m3 = next?.awakenRequirements?.M3 || null;

  if (!m2 || !m3) return next;

  const m2Cards = [...(m2.cards || [])];
  const m3Cards = [...(m3.cards || [])];
  const m2Boosts = [...(m2.boosts || [])];
  const m3Boosts = [...(m3.boosts || [])];

  const cardsSame = sameList(m2Cards, m3Cards);
  const boostsSame = sameList(m2Boosts, m3Boosts);

  let patchedM3 = { ...m3 };

  if (cardsSame) {
    patchedM3.cards = ensureUniqueRequirementEntry(
      m3Cards,
      `${next.code}_m3_card`
    );
  }

  if (boostsSame) {
    patchedM3.boosts = ensureUniqueRequirementEntry(
      m3Boosts,
      `${next.code}_m3_boost`
    );
  }

  if (Number(patchedM3.berries || 0) <= Number(m2.berries || 0)) {
    patchedM3.berries = Number(m2.berries || 0) + 15000;
  }

  if (cardsSame || boostsSame) {
    patchedM3.text = `${patchedM3.text || "Advanced path."} Final awaken route is different from M2.`;
  }

  next.awakenRequirements.M3 = patchedM3;

  if (Array.isArray(next.evolutionForms) && next.evolutionForms[2]) {
    next.evolutionForms[2] = {
      ...next.evolutionForms[2],
      require: next.awakenRequirements.M3,
    };
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
    all.find((c) =>
      [c.code, c.name, c.displayName, c.title, c.variant]
        .filter(Boolean)
        .map(slug)
        .includes(q)
    ) ||
    all.find((c) =>
      [c.code, c.name, c.displayName, c.title, c.variant]
        .filter(Boolean)
        .map(slug)
        .some((x) => x.includes(q))
    ) ||
    null
  );
}

function findOwnedCard(playerCards, query) {
  const q = slug(query);
  const all = (playerCards || []).map(hydrateCard).filter(Boolean);
  return (
    all.find((c) =>
      [c.code, c.name, c.displayName, c.title, c.variant]
        .filter(Boolean)
        .map(slug)
        .includes(q)
    ) ||
    all.find((c) =>
      [c.code, c.name, c.displayName, c.title, c.variant]
        .filter(Boolean)
        .map(slug)
        .some((x) => x.includes(q))
    ) ||
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
    const hit = ownedCards.find(
      (c) => c.instanceId !== targetInstanceId && slug(c.code) === slug(code)
    );
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
    const idx = next.findIndex(
      (c) => c.instanceId !== targetInstanceId && slug(c.code) === code
    );
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
          atk: c.baseAtk
            ? Math.floor(Number(c.baseAtk) * (nextStage === 2 ? 1.2 : 1.45)) + Number(c.weaponBonus?.atk || 0)
            : c.atk,
          hp: c.baseHp
            ? Math.floor(Number(c.baseHp) * (nextStage === 2 ? 1.2 : 1.45)) + Number(c.weaponBonus?.hp || 0)
            : c.hp,
          speed: c.baseSpeed
            ? Math.floor(Number(c.baseSpeed) * (nextStage === 2 ? 1.2 : 1.45)) + Number(c.weaponBonus?.speed || 0)
            : c.speed,
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