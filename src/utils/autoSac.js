const { getFragmentStorageBonus } = require("./passiveBoosts");

const BASE_FRAGMENT_STORAGE = 200;
const MAX_FRAGMENT_STORAGE = 500;

const SAC_BERRY_VALUE = {
  C: 500,
  B: 1000,
  A: 2500,
  S: 6000,
  SS: 12000,
  UR: 25000,
};

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getFragmentStorageInfo(player, fragments = null) {
  const list = Array.isArray(fragments) ? fragments : Array.isArray(player?.fragments) ? player.fragments : [];
  const total = list.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const max = Math.min(BASE_FRAGMENT_STORAGE + getFragmentStorageBonus(player), MAX_FRAGMENT_STORAGE);
  return { total, max };
}

function getSacBerryValue(rarity, amount = 1) {
  const key = String(rarity || "C").toUpperCase();
  return (SAC_BERRY_VALUE[key] || SAC_BERRY_VALUE.C) * Number(amount || 1);
}

function getAutoSacSettings(player) {
  const raw = player?.autoSac || {};
  return {
    rarities: {
      C: Boolean(raw.rarities?.C),
      B: Boolean(raw.rarities?.B),
      A: Boolean(raw.rarities?.A),
      S: Boolean(raw.rarities?.S),
      SS: Boolean(raw.rarities?.SS),
      UR: Boolean(raw.rarities?.UR),
    },
    cards: Array.isArray(raw.cards) ? raw.cards : [],
  };
}

function isCardAutoSacEnabled(player, cardOrFragment) {
  const settings = getAutoSacSettings(player);
  const rarity = String(cardOrFragment?.baseTier || cardOrFragment?.rarity || "C").toUpperCase();
  if (settings.rarities[rarity]) return true;

  const code = normalize(cardOrFragment?.code);
  const name = normalize(cardOrFragment?.displayName || cardOrFragment?.name);

  return settings.cards.some((entry) => {
    const entryCode = normalize(entry.code);
    const entryName = normalize(entry.name);
    return (code && entryCode && code === entryCode) || (name && entryName && name === entryName);
  });
}

function addFragmentRaw(fragments, card, amount = 1) {
  const list = Array.isArray(fragments) ? [...fragments] : [];
  const code = String(card.code || "");
  const index = list.findIndex((entry) => String(entry.code || "") === code);

  if (index !== -1) {
    list[index] = {
      ...list[index],
      amount: Number(list[index].amount || 0) + Number(amount || 1),
    };
    return list;
  }

  list.push({
    name: card.displayName || card.name,
    amount: Number(amount || 1),
    rarity: card.baseTier || card.rarity || "C",
    category: card.cardRole === "boost" ? "boost" : "battle",
    code: card.code,
    image: card.image || "",
  });

  return list;
}

function removeFragmentAmount(fragments, cardCode, amount = 1) {
  const list = Array.isArray(fragments) ? [...fragments] : [];
  const index = list.findIndex((entry) => String(entry.code || "") === String(cardCode || ""));
  if (index === -1) return list;

  const left = Number(list[index].amount || 0) - Number(amount || 1);
  if (left <= 0) {
    list.splice(index, 1);
  } else {
    list[index] = { ...list[index], amount: left };
  }

  return list;
}

function addFragmentWithAutoSac(player, fragments, card, amount = 1) {
  const rarity = String(card?.baseTier || card?.rarity || "C").toUpperCase();
  const storage = getFragmentStorageInfo(player, fragments);
  const freeSlots = Math.max(0, storage.max - storage.total);
  const shouldAutoSac = isCardAutoSacEnabled(player, card);

  let addAmount = Number(amount || 1);
  let sacAmount = 0;
  let reason = "";

  if (shouldAutoSac) {
    sacAmount = addAmount;
    addAmount = 0;
    reason = "Auto-Sac";
  } else if (freeSlots <= 0) {
    sacAmount = addAmount;
    addAmount = 0;
    reason = "Storage Full";
  } else if (addAmount > freeSlots) {
    sacAmount = addAmount - freeSlots;
    addAmount = freeSlots;
    reason = "Storage Full";
  }

  const updatedFragments = addAmount > 0 ? addFragmentRaw(fragments, card, addAmount) : fragments;
  const berries = getSacBerryValue(rarity, sacAmount);

  return {
    fragments: updatedFragments,
    added: addAmount,
    sacrificed: sacAmount,
    berries,
    reason,
    rarity,
    name: card?.displayName || card?.name || "Unknown",
  };
}

function findFragmentByName(fragments, query) {
  const q = normalize(query);
  if (!q) return null;

  const list = Array.isArray(fragments) ? fragments : [];
  return (
    list.find((item) => normalize(item.code) === q) ||
    list.find((item) => normalize(item.name) === q) ||
    list.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

function sacrificeFragment(player, query, amountText) {
  const fragments = Array.isArray(player.fragments) ? [...player.fragments] : [];
  const target = findFragmentByName(fragments, query);

  if (!target) {
    return {
      ok: false,
      message: "Fragment card tidak ditemukan di inventory.",
    };
  }

  const owned = Number(target.amount || 0);
  const amount =
    String(amountText || "").toLowerCase() === "all"
      ? owned
      : Math.max(1, Math.floor(Number(amountText || 1)));

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      message: "Amount tidak valid. Pakai angka atau `all`.",
    };
  }

  if (owned < amount) {
    return {
      ok: false,
      message: `Fragment **${target.name}** cuma ada ${owned}.`,
    };
  }

  const updatedFragments = removeFragmentAmount(fragments, target.code, amount);
  const berries = getSacBerryValue(target.rarity, amount);

  return {
    ok: true,
    fragments: updatedFragments,
    berries,
    amount,
    name: target.name,
    rarity: String(target.rarity || "C").toUpperCase(),
  };
}

module.exports = {
  BASE_FRAGMENT_STORAGE,
  SAC_BERRY_VALUE,
  normalize,
  getFragmentStorageInfo,
  getSacBerryValue,
  getAutoSacSettings,
  isCardAutoSacEnabled,
  addFragmentWithAutoSac,
  addFragmentRaw,
  removeFragmentAmount,
  findFragmentByName,
  sacrificeFragment,
};