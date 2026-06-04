const MERGE_SOURCE_CODES = ["luffy_straw_hat", "zoro_pirate_hunter", "sanji_black_leg"];
const MERGE_RATIO = 0.5;

function normalize(value) {
 return String(value || "").toLowerCase().trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function isLzsCard(card) {
 const code = normalize(card?.code).replace(/\s+/g, "_");
 const name = normalize(card?.displayName || card?.name || card?.title);
 return code === "lzs" || name === "monster trio";
}

function getStage(card) {
 const stage = Number(card?.evolutionStage || 0);
 if (stage >= 1) return Math.max(1, Math.min(3, Math.floor(stage)));
 const key = String(card?.evolutionKey || card?.form || card?.stage || "").toUpperCase();
 const matched = key.match(/M([123])/);
 return matched ? Number(matched[1]) : 1;
}

function findSourceCard(cards, code) {
 const target = normalize(code);
 return (Array.isArray(cards) ? cards : []).find((card) => normalize(card?.code) === target) || null;
}

function getNumber(card, keys) {
 for (const key of keys) {
  const value = Number(card?.[key]);
  if (Number.isFinite(value) && value > 0) return value;
 }
 return 0;
}

function getAtk(card) {
 return getNumber(card, ["finalAtk", "currentAtk", "totalAtk", "battleAtk", "atk"]);
}

function getHp(card) {
 return getNumber(card, ["finalHp", "currentHp", "totalHp", "battleHp", "maxHp", "hp"]);
}

function getSpeed(card) {
 return getNumber(card, ["finalSpeed", "currentSpeed", "totalSpeed", "battleSpeed", "speed", "spd"]);
}

function getPower(card) {
 return getNumber(card, ["finalPower", "currentPower", "totalPower", "battlePower", "basePower", "power"]);
}

function cleanValue(value) {
 const text = String(value || "").trim();
 if (!text || text.toLowerCase() === "none") return "";
 return text;
}

function uniqueJoin(values) {
 const seen = new Set();
 const out = [];

 for (const value of values) {
  const text = cleanValue(value);
  if (!text) continue;

  for (const part of text.split(/\s*[,/]\s*/).map((x) => x.trim()).filter(Boolean)) {
   const key = normalize(part);
   if (!key || key === "none" || seen.has(key)) continue;
   seen.add(key);
   out.push(part);
  }
 }

 return out.length ? out.join(", ") : "None";
}

function buildMergedLzsCard(player, ownedLzsCard) {
 const cards = Array.isArray(player?.cards) ? player.cards : [];
 const sources = MERGE_SOURCE_CODES.map((code) => findSourceCard(cards, code)).filter(Boolean);

 if (!isLzsCard(ownedLzsCard) || sources.length < 3) {
  return ownedLzsCard;
 }

 const atk = Math.floor(sources.reduce((sum, card) => sum + getAtk(card) * MERGE_RATIO, 0));
 const hp = Math.floor(sources.reduce((sum, card) => sum + getHp(card) * MERGE_RATIO, 0));
 const speed = Math.floor(sources.reduce((sum, card) => sum + getSpeed(card) * MERGE_RATIO, 0));
 const basePower = Math.floor(sources.reduce((sum, card) => sum + getPower(card) * MERGE_RATIO, 0));

 const weapon = uniqueJoin(sources.map((card) => card.equippedWeapon || card.weapon));
 const devilFruit = uniqueJoin(sources.map((card) => card.equippedDevilFruitName || card.equippedDevilFruit || card.devilFruit));

 const equipType =
  weapon !== "None" && devilFruit !== "None"
   ? "Devil Fruit / Weapon"
   : devilFruit !== "None"
    ? "Devil Fruit"
    : weapon !== "None"
     ? "Weapon"
     : "None";

 const stage = getStage(ownedLzsCard);

 return {
  ...ownedLzsCard,
  code: "lzs",
  name: "Monster Trio",
  displayName: "Monster Trio",
  title: "Monster Trio",
  rarity: "M",
  baseTier: "M",
  currentTier: "M",
  tier: "M",
  evolutionStage: stage,
  evolutionKey: "M" + stage,
  canPull: false,
  canPA: false,
  summonOnly: true,
  mergeOnly: true,
  mergeSourceCodes: MERGE_SOURCE_CODES,
  mergeStatRatio: MERGE_RATIO,
  atk,
  hp,
  speed,
  spd: speed,
  basePower,
  currentPower: basePower,
  weapon,
  devilFruit,
  equipType,
  syncedFrom: MERGE_SOURCE_CODES,
  syncNote: "50% Monkey D. Luffy + 50% Roronoa Zoro + 50% Sanji",
 };
}

function syncMergedCardsInPlayer(player) {
 if (!player || typeof player !== "object") return player;
 const cards = Array.isArray(player.cards) ? player.cards : [];
 if (!cards.some(isLzsCard)) return player;

 const basePlayer = { ...player, cards };
 const syncedCards = cards.map((card) => (isLzsCard(card) ? buildMergedLzsCard(basePlayer, card) : card));

 return {
  ...player,
  cards: syncedCards,
 };
}

module.exports = {
 isLzsCard,
 buildMergedLzsCard,
 syncMergedCardsInPlayer,
};
