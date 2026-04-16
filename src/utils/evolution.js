const cardsDb = require("../data/cards");

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

function hydrateCard(card) {
  if (!card) return null;
  return clone(card);
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
    if (!hit) {
      return { ok: false, reason: `Missing required card/boost: ${code}` };
    }
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
  if (Number(target.evolutionStage || 1) >= 3) {
    throw new Error("This card is already at M3.");
  }

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