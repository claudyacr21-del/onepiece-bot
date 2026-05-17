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

function normalizeCode(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function getFragmentStorageInfo(player, fragments = null) {
  const list = Array.isArray(fragments)
    ? fragments
    : Array.isArray(player?.fragments)
    ? player.fragments
    : [];

  const total = list.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const max = Math.min(
    BASE_FRAGMENT_STORAGE + Number(getFragmentStorageBonus(player) || 0),
    MAX_FRAGMENT_STORAGE
  );

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
    safeCards: Array.isArray(raw.safeCards) ? raw.safeCards : [],
  };
}

function getFragmentName(cardOrFragment) {
  return String(
    cardOrFragment?.displayName ||
      cardOrFragment?.name ||
      cardOrFragment?.cardName ||
      "Unknown Fragment"
  );
}

function getFragmentCode(cardOrFragment) {
  return String(
    cardOrFragment?.code ||
      cardOrFragment?.cardCode ||
      cardOrFragment?.weaponCode ||
      ""
  );
}

function getFragmentRarity(cardOrFragment) {
  return String(
    cardOrFragment?.baseTier ||
      cardOrFragment?.currentTier ||
      cardOrFragment?.rarity ||
      "C"
  ).toUpperCase();
}

function getFragmentCategory(cardOrFragment) {
  const rawCategory = String(cardOrFragment?.category || "").toLowerCase();
  const role = String(cardOrFragment?.cardRole || "").toLowerCase();

  if (rawCategory) return rawCategory;
  if (role === "boost") return "boost";
  if (cardOrFragment?.weaponCode || String(cardOrFragment?.code || "").startsWith("weapon_fragment_")) {
    return "weapon";
  }

  return "battle";
}

function isSameFragmentEntry(entry, cardOrFragment) {
  const entryCode = normalizeCode(entry?.code || entry?.cardCode || entry?.weaponCode || "");
  const entryName = normalize(entry?.name || entry?.displayName || entry?.cardName || "");

  const targetCode = normalizeCode(getFragmentCode(cardOrFragment));
  const targetName = normalize(getFragmentName(cardOrFragment));

  return (
    (entryCode && targetCode && entryCode === targetCode) ||
    (entryName && targetName && entryName === targetName)
  );
}

function isCardAutoSacEnabled(player, cardOrFragment) {
  const settings = getAutoSacSettings(player);
  const rarity = getFragmentRarity(cardOrFragment);

  const isSafeListed = settings.safeCards.some((entry) =>
    isSameFragmentEntry(entry, cardOrFragment)
  );

  if (isSafeListed) return false;

  // Rarity filter now applies to battle, boost, and weapon fragments.
  if (settings.rarities[rarity]) return true;

  return settings.cards.some((entry) => isSameFragmentEntry(entry, cardOrFragment));
}

function addFragmentRaw(fragments, cardOrFragment, amount = 1) {
  const list = Array.isArray(fragments) ? [...fragments] : [];
  const addAmount = Math.max(1, Number(amount || 1));

  const code = getFragmentCode(cardOrFragment);
  const name = getFragmentName(cardOrFragment);
  const rarity = getFragmentRarity(cardOrFragment);
  const category = getFragmentCategory(cardOrFragment);

  const index = list.findIndex((entry) => isSameFragmentEntry(entry, cardOrFragment));

  if (index !== -1) {
    list[index] = {
      ...list[index],
      amount: Number(list[index].amount || 0) + addAmount,
    };

    return list;
  }

  list.push({
    name,
    amount: addAmount,
    rarity,
    category,
    code,
    image: cardOrFragment?.image || "",
    weaponCode: cardOrFragment?.weaponCode || undefined,
    cardCode: cardOrFragment?.cardCode || undefined,
    sourceCode: cardOrFragment?.sourceCode || undefined,
  });

  return list;
}

function removeFragmentAmount(fragments, cardCode, amount = 1) {
  const list = Array.isArray(fragments) ? [...fragments] : [];
  const targetCode = normalizeCode(cardCode);
  const removeAmount = Math.max(1, Number(amount || 1));

  const index = list.findIndex((entry) => {
    const entryCode = normalizeCode(entry?.code || entry?.cardCode || entry?.weaponCode || "");
    return entryCode === targetCode;
  });

  if (index === -1) return list;

  const left = Number(list[index].amount || 0) - removeAmount;

  if (left <= 0) {
    list.splice(index, 1);
  } else {
    list[index] = {
      ...list[index],
      amount: left,
    };
  }

  return list;
}

function addFragmentWithAutoSac(player, fragments, cardOrFragment, amount = 1) {
  const addAmount = Math.max(1, Number(amount || 1));
  const rarity = getFragmentRarity(cardOrFragment);
  const storage = getFragmentStorageInfo(player, fragments);
  const freeSlots = Math.max(0, storage.max - storage.total);
  const shouldAutoSac = isCardAutoSacEnabled(player, cardOrFragment);

  let fragmentAddAmount = addAmount;
  let sacAmount = 0;
  let reason = "";

  if (shouldAutoSac) {
    sacAmount = addAmount;
    fragmentAddAmount = 0;
    reason = `Auto-Sac ${rarity} rarity rule`;
  } else if (freeSlots <= 0) {
    sacAmount = addAmount;
    fragmentAddAmount = 0;
    reason = "Storage Full";
  } else if (fragmentAddAmount > freeSlots) {
    sacAmount = fragmentAddAmount - freeSlots;
    fragmentAddAmount = freeSlots;
    reason = "Storage Full";
  }

  const updatedFragments =
    fragmentAddAmount > 0
      ? addFragmentRaw(fragments, cardOrFragment, fragmentAddAmount)
      : Array.isArray(fragments)
      ? [...fragments]
      : [];

  const berries = getSacBerryValue(rarity, sacAmount);

  return {
    fragments: updatedFragments,
    added: fragmentAddAmount,
    sacrificed: sacAmount,
    berries,
    reason,
    rarity,
    name: getFragmentName(cardOrFragment),
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
      message: "Fragment was not found in your inventory.",
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
      message: "Invalid amount. Use a number or `all`.",
    };
  }

  if (owned < amount) {
    return {
      ok: false,
      message: `You only have **${owned}x ${target.name}**.`,
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