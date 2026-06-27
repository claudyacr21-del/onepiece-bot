const { getFragmentStorageBonus } = require("./passiveBoosts");
const { getPirateFragmentStorageBonus } = require("./pirateBoosts");
const BASE_FRAGMENT_STORAGE = 200;
const MAX_FRAGMENT_STORAGE = 5000;

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
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getFragmentStorageInfo(player, fragments = []) {
  const list = Array.isArray(fragments) ? fragments : [];

  const total = list.reduce((sum, item) => {
    return sum + Math.max(0, Math.floor(Number(item?.amount || 0)));
  }, 0);

  const BASE_FRAGMENT_STORAGE = 200;
  const MAX_FRAGMENT_STORAGE = 5000;

  const passiveBoosts =
    player?.passiveBoosts && typeof player.passiveBoosts === "object"
      ? player.passiveBoosts
      : {};

  const passiveSummary =
    player?.passiveBoostSummary && typeof player.passiveBoostSummary === "object"
      ? player.passiveBoostSummary
      : {};

  const passiveBonus = Math.max(
    0,
    Math.floor(
      Number(
        passiveSummary.fragmentStorageBonus ??
          passiveBoosts.fragmentStorageBonus ??
          player?.fragmentStorageBonus ??
          0
      )
    )
  );

  const userId = String(
    player?.id ||
      player?.userId ||
      player?.discordId ||
      player?.ownerId ||
      ""
  ).trim();

  const pirateBonus = Math.max(
    0,
    Math.floor(Number(getPirateFragmentStorageBonus(userId) || 0))
  );

  const bonus = passiveBonus + pirateBonus;
  const max = Math.min(MAX_FRAGMENT_STORAGE, BASE_FRAGMENT_STORAGE + bonus);

  return {
    total,
    max,
    bonus,
    passiveBonus,
    pirateBonus,
  };
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
  const code = String(cardOrFragment?.code || "").toLowerCase();

  if (rawCategory) return rawCategory;
  if (role === "boost") return "boost";
  if (cardOrFragment?.weaponCode || code.startsWith("weapon_fragment_")) {
    return "weapon";
  }

  return "battle";
}

function getCompareKeys(cardOrFragment) {
  const code = getFragmentCode(cardOrFragment);
  const name = getFragmentName(cardOrFragment);
  const weaponCode = cardOrFragment?.weaponCode;
  const cardCode = cardOrFragment?.cardCode;
  const sourceCode = cardOrFragment?.sourceCode;

  const cleanName = String(name || "")
    .replace(/\s+fragment$/i, "")
    .trim();

  // IMPORTANT:
  // Do not strip "weapon_fragment_" here.
  // weapon_fragment_soul_solid must stay different from soul_solid.
  return [
    code,
    name,
    cleanName,
    weaponCode,
    cardCode,
    sourceCode,
  ]
    .flatMap((value) => [normalize(value), normalizeCode(value)])
    .filter(Boolean);
}

function isSameFragmentEntry(entry, cardOrFragment) {
  const entryKeys = getCompareKeys(entry);
  const targetKeys = getCompareKeys(cardOrFragment);

  return entryKeys.some((key) => targetKeys.includes(key));
}

function isAutoSacSafeListed(player, cardOrFragment) {
  const settings = getAutoSacSettings(player);

  return settings.safeCards.some((entry) => isSameFragmentEntry(entry, cardOrFragment));
}

function getSpecificAutoSacEntry(player, cardOrFragment) {
  const settings = getAutoSacSettings(player);

  return (
    settings.cards.find((entry) => isSameFragmentEntry(entry, cardOrFragment)) ||
    null
  );
}

function isCardAutoSacEnabled(player, cardOrFragment) {
  const settings = getAutoSacSettings(player);
  const rarity = getFragmentRarity(cardOrFragment);

  if (isAutoSacSafeListed(player, cardOrFragment)) return false;

  if (getSpecificAutoSacEntry(player, cardOrFragment)) return true;

  // Rarity auto-sac covers battle, boost, and weapon fragments.
  return Boolean(settings.rarities[rarity]);
}

function addFragmentRaw(fragments, cardOrFragment, amount = 1) {
  const list = Array.isArray(fragments) ? [...fragments] : [];
  const addAmount = Math.max(1, Number(amount || 1));
  const index = list.findIndex((entry) => isSameFragmentEntry(entry, cardOrFragment));

  if (index !== -1) {
    list[index] = {
      ...list[index],
      amount: Number(list[index].amount || 0) + addAmount,
    };

    return list;
  }

  list.push({
    name: getFragmentName(cardOrFragment),
    amount: addAmount,
    rarity: getFragmentRarity(cardOrFragment),
    category: getFragmentCategory(cardOrFragment),
    code: getFragmentCode(cardOrFragment),
    image: cardOrFragment?.image || "",
    weaponCode: cardOrFragment?.weaponCode || undefined,
    cardCode: cardOrFragment?.cardCode || undefined,
    sourceCode: cardOrFragment?.sourceCode || undefined,
  });

  return list;
}

function removeFragmentAmount(fragments, cardOrFragment, amount = 1) {
  const list = Array.isArray(fragments) ? [...fragments] : [];
  const removeAmount = Math.max(1, Number(amount || 1));
  const index = list.findIndex((entry) => isSameFragmentEntry(entry, cardOrFragment));

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
  const specificEntry = getSpecificAutoSacEntry(player, cardOrFragment);
  const shouldAutoSac = isCardAutoSacEnabled(player, cardOrFragment);

  let fragmentAddAmount = addAmount;
  let sacAmount = 0;
  let reason = "";

  if (shouldAutoSac) {
    sacAmount = addAmount;
    fragmentAddAmount = 0;
    reason = specificEntry
      ? "Auto-Sac card rule"
      : `Auto-Sac ${rarity} rarity rule`;
  } else if (freeSlots <= 0) {
    sacAmount = addAmount;
    fragmentAddAmount = 0;
    reason = "Fragment Storage Full";
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
  const qc = normalizeCode(query);

  if (!q && !qc) return null;

  const list = Array.isArray(fragments) ? fragments : [];

  // 1) Exact raw code first.
  // This keeps weapon_fragment_soul_solid different from soul_solid.
  const exactCode = list.filter((item) => normalizeCode(item.code) === qc);
  if (exactCode.length === 1) return exactCode[0];

  // 2) Exact name second.
  const exactName = list.filter((item) => normalize(item.name) === q);
  if (exactName.length === 1) return exactName[0];

  // 3) Fuzzy name only after exact checks fail.
  const fuzzyName = list.filter((item) => normalize(item.name).includes(q));
  if (fuzzyName.length === 1) return fuzzyName[0];

  return null;
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

  const updatedFragments = removeFragmentAmount(fragments, target, amount);
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
  MAX_FRAGMENT_STORAGE,
  SAC_BERRY_VALUE,
  normalize,
  normalizeCode,
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