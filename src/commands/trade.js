const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const { getPlayer, updateTwoPlayersAtomic } = require("../playerStore");
const rawCards = require("../data/cards");

const SESSION_MS = 10 * 60 * 1000;
const MAX_ITEMS = 5;

const STORE_LABELS = {
  weapons: "Weapon",
  devilFruits: "Devil Fruit",
  materials: "Material",
  items: "Item",
  boxes: "Box",
  fragments: "Fragment",
  cards: "Card",
  tickets: "Ticket",
};

const CARD_FIRST_QUERIES = new Set([
  "cola",
  "cola_engine",
  "sniper",
  "sniper_king",
]);

const CARD_DISPLAY_NAMES = {
  cola: "Cola Engine",
  cola_engine: "Cola Engine",
  sniper: "Sniper",
  sniper_king: "Sniper",
};

function slug(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/['".]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/['".]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clonePlayerForTrade(player) {
  return {
    ...player,
    cards: [...(player.cards || [])],
    weapons: [...(player.weapons || [])],
    devilFruits: [...(player.devilFruits || [])],
    materials: [...(player.materials || [])],
    items: [...(player.items || [])],
    boxes: [...(player.boxes || [])],
    fragments: [...(player.fragments || [])],
    tickets: [...(player.tickets || [])],
  };
}

function getDisplayName(entry, fallbackCode = "") {
  return (
    entry?.displayName ||
    entry?.name ||
    entry?.title ||
    String(fallbackCode || entry?.code || "Unknown")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())
  );
}

function normalizeTradeAliasCode(value) {
  const code = slug(value);

  const aliases = {
    craid: "common_raid_ticket",
    raid: "raid_ticket",
    graid: "gold_raid_ticket",
    mraid: "mythic_raid_ticket",
    throne: "empty_throne_raid_writ",

    cola_part: "cola_engine_part",
    colapart: "cola_engine_part",
    engine_part: "cola_engine_part",
    enginepart: "cola_engine_part",
    cola_engine_part: "cola_engine_part",
    colaenginepart: "cola_engine_part",

    sniper_king: "sniper",

    reset: "pull_reset_ticket",
    pullreset: "pull_reset_ticket",
    pull_reset: "pull_reset_ticket",
    pull_ticket: "pull_reset_ticket",
    pullresetticket: "pull_reset_ticket",
    prt: "pull_reset_ticket",

    woodenbox: "wooden_material_box",
    wooden_box: "wooden_material_box",
    ironbox: "iron_material_box",
    iron_box: "iron_material_box",
    royalbox: "royal_material_box",
    royal_box: "royal_material_box",

    basicbox: "basic_resource_box",
    basic_box: "basic_resource_box",
    rarebox: "rare_resource_box",
    rare_box: "rare_resource_box",
    elitebox: "elite_resource_box",
    elite_box: "elite_resource_box",
    legendbox: "legend_resource_box",
    legend_box: "legend_resource_box",
    motherflamebox: "mother_flame_treasure_box",
    mother_flame_box: "mother_flame_treasure_box",
  };

  return aliases[code] || code;
}

function isBlockedTradeItemCode(code) {
  const normalizedCode = normalizeTradeAliasCode(code);

  return (
    normalizedCode === "mythic_raid_ticket" ||
    normalizedCode === "empty_throne_raid_writ" ||
    normalizedCode === "pull_reset_ticket" ||
    normalizedCode === "cola_engine_part" ||

    normalizedCode === "wooden_material_box" ||
    normalizedCode === "iron_material_box" ||
    normalizedCode === "royal_material_box" ||
    normalizedCode === "basic_resource_box" ||
    normalizedCode === "rare_resource_box" ||
    normalizedCode === "elite_resource_box" ||
    normalizedCode === "legend_resource_box" ||
    normalizedCode === "mother_flame_treasure_box" ||

    normalizedCode === "universal_c" ||
    normalizedCode === "universal_b" ||
    normalizedCode === "universal_a" ||
    normalizedCode === "universal_s" ||
    normalizedCode.startsWith("universal_")
  );
}

function isBlockedTradeEntry(entry, fallbackCode = "") {
  const code = normalizeTradeAliasCode(entry?.code || fallbackCode);
  const rawCode = slug(entry?.code || fallbackCode);
  const name = normalize(getDisplayName(entry, fallbackCode));
  const type = normalize(entry?.type || entry?.category || entry?.kind || "");

  const isAnyBox =
    type === "box" ||
    type.includes("box") ||
    code.endsWith("_box") ||
    rawCode.endsWith("_box") ||
    name.includes("box");

  return (
    isAnyBox ||
    entry?.untradeable === true ||
    entry?.tradeable === false ||
    isBlockedTradeItemCode(code) ||
    (name.includes("universal") && name.includes("fragment")) ||
    name === "pull reset ticket" ||
    name === "cola engine part"
  );
}

function fmtEntry(entry) {
  if (entry.type === "berries") {
    return `${entry.amount.toLocaleString("en-US")} berries`;
  }

  return `${entry.raw || entry.code}_${entry.amount}`;
}

function fmtResolvedEntry(entry) {
  if (entry.kind === "berries") {
    return `${entry.amount.toLocaleString("en-US")} berries`;
  }

  if (entry.kind === "cardFragment") {
    return `${entry.displayName || "Card Fragment"} x${entry.amount}`;
  }

  return `${entry.displayName || entry.code} x${entry.amount}`;
}

function parseOfferBlock(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];

  const parts = text
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (parts.length > MAX_ITEMS) {
    throw new Error(`Max ${MAX_ITEMS} different entries per side.`);
  }

  return parts.map((part) => {
    if (/^\d+$/.test(part)) {
      return {
        type: "berries",
        code: "berries",
        raw: "berries",
        amount: num(part),
      };
    }

    const match = part.match(/^(.+?)_(\d+)$/);
    if (!match) {
      throw new Error(`Invalid trade entry: ${part}`);
    }

    const rawCode = match[1].trim();
    const amount = num(match[2]);

    if (!amount || amount <= 0) {
      throw new Error(`Invalid amount in trade entry: ${part}`);
    }

    return {
      type: "asset",
      code: normalizeTradeAliasCode(rawCode),
      raw: rawCode,
      amount,
    };
  });
}

function parseTradeContent(content) {
  const match = String(content).match(/<@!?\d+>\s*\(([^)]*)\)\s*\(([^)]*)\)/);

  if (!match) {
    throw new Error("Format: `op trade @mention (your offer) (their offer)`");
  }

  return {
    ownerOffer: parseOfferBlock(match[1]),
    targetOffer: parseOfferBlock(match[2]),
  };
}

function getTeamIds(player) {
  return new Set(Array.isArray(player?.team?.slots) ? player.team.slots.filter(Boolean) : []);
}

function isCardTradable(card, teamIds) {
  if (!card) return false;
  if (teamIds.has(card.instanceId)) return false;
  if (card.slot_locked) return false;
  if (card.equippedWeapon || card.equippedDevilFruit) return false;

  if (Array.isArray(card.equippedWeapons) && card.equippedWeapons.length > 0) {
    return false;
  }

  return true;
}

function scoreQuery(query, fields) {
  const q = normalize(query);
  const qs = slug(query);

  if (!q && !qs) return 0;

  let best = 0;
  const words = q.split(" ").filter(Boolean);

  for (const rawField of fields.filter(Boolean)) {
    const field = normalize(rawField);
    const fieldSlug = slug(rawField);

    if (!field && !fieldSlug) continue;

    if (field === q || fieldSlug === qs) {
      best = Math.max(best, 1000 + field.length);
      continue;
    }

    if (field.startsWith(q) || fieldSlug.startsWith(qs)) {
      best = Math.max(best, 800 + q.length);
      continue;
    }

    if (field.includes(q) || fieldSlug.includes(qs)) {
      best = Math.max(best, 600 + q.length);
      continue;
    }

    if (words.length && words.every((word) => field.includes(word))) {
      best = Math.max(best, 400 + words.join("").length);
    }
  }

  return best;
}

function getCardFields(card) {
  return [
    card?.code,
    card?.characterCode,
    card?.displayName,
    card?.name,
    card?.instanceId,
  ];
}

function getStackFields(entry) {
  return [
    entry?.code,
    entry?.name,
    entry?.displayName,
    entry?.title,
    entry?.type,
    entry?.category,
    entry?.kind,
    entry?.rarity,
    entry?.weaponCode,
    entry?.cardCode,
    entry?.characterCode,
    entry?.boostCode,
    entry?.scrollCode,
    entry?.sourceCode,
    entry?.sourceType,
  ];
}

function isExplicitWeaponFragmentQuery(query) {
  const code = slug(query);
  const text = normalize(query);

  return (
    code.endsWith("_weapon") ||
    code.includes("_weapon_") ||
    text.endsWith(" weapon") ||
    text.includes(" weapon ")
  );
}

function isExplicitScrollFragmentQuery(query) {
  const code = slug(query);
  const text = normalize(query);

  return (
    code.endsWith("_scroll") ||
    code.includes("_scroll_") ||
    code.endsWith("_boost") ||
    code.includes("_boost_") ||
    text.endsWith(" scroll") ||
    text.includes(" scroll ") ||
    text.endsWith(" boost") ||
    text.includes(" boost ") ||
    text.includes(" will")
  );
}

function isExplicitNonCardFragmentQuery(query) {
  return isExplicitWeaponFragmentQuery(query) || isExplicitScrollFragmentQuery(query);
}

function isFragmentLikeTradeQuery(query = "") {
  const code = slug(query);
  const text = normalize(query);

  return (
    text.includes("fragment") ||
    code.includes("fragment") ||
    isExplicitNonCardFragmentQuery(query)
  );
}

function findCardTemplateForFragmentQuery(query) {
  if (isExplicitNonCardFragmentQuery(query)) return null;

  const scored = (Array.isArray(rawCards) ? rawCards : [])
    .map((card) => ({
      card,
      score: scoreQuery(query, [
        card?.code,
        card?.name,
        card?.displayName,
        card?.title,
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].card : null;
}

function isWeaponFragmentEntry(entry) {
  const code = slug(entry?.code || "");
  const name = normalize(entry?.name || entry?.displayName || "");
  const category = normalize(entry?.category || entry?.type || entry?.kind || entry?.sourceType || "");

  return (
    Boolean(entry?.weaponCode || entry?.sourceWeaponCode) ||
    code.startsWith("weapon_fragment_") ||
    code.includes("_weapon_fragment") ||
    name.includes("weapon fragment") ||
    category.includes("weapon")
  );
}

function isScrollFragmentEntry(entry) {
  const code = slug(entry?.code || "");
  const name = normalize(entry?.name || entry?.displayName || "");
  const type = normalize(entry?.type || entry?.category || entry?.kind || entry?.sourceType || "");

  return (
    Boolean(entry?.boostCode || entry?.scrollCode || entry?.sourceBoostCode) ||
    code.includes("scroll") ||
    code.includes("boost") ||
    code.includes("will") ||
    name.includes("scroll") ||
    name.includes("boost") ||
    name.includes("will") ||
    type.includes("scroll") ||
    type.includes("boost")
  );
}

function getCardFragmentMatchKeys(card) {
  const code = slug(card?.code || "");
  const name = normalize(card?.name || "");
  const displayName = normalize(card?.displayName || "");
  const title = normalize(card?.title || "");

  return [code, name, displayName, title].filter(Boolean);
}

function isCardFragmentEntryForTemplate(entry, card) {
  if (!entry || !card) return false;
  if (isWeaponFragmentEntry(entry) || isScrollFragmentEntry(entry)) return false;

  const cardKeys = getCardFragmentMatchKeys(card);
  if (!cardKeys.length) return false;

  const entryCode = slug(entry?.code || "");
  const entryName = normalize(entry?.name || entry?.displayName || entry?.title || "");
  const entryCardCode = slug(
    entry?.cardCode ||
      entry?.sourceCode ||
      entry?.characterCode ||
      entry?.sourceCardCode ||
      entry?.targetCode ||
      ""
  );

  return cardKeys.some((key) => {
    const keySlug = slug(key);
    const keyText = normalize(key);

    return (
      entryCode === keySlug ||
      entryCode === `${keySlug}_fragment` ||
      entryCode === `fragment_${keySlug}` ||
      entryCardCode === keySlug ||
      entryName === keyText ||
      entryName === `${keyText} fragment` ||
      entryName.includes(`${keyText} fragment`) ||
      entryName.includes(keyText)
    );
  });
}

function getCardFragmentMatchesForTrade(fragments, card) {
  return (Array.isArray(fragments) ? fragments : [])
    .map((entry, index) => ({
      entry,
      index,
      amount: getStackAmount(entry),
      score: scoreQuery(card?.displayName || card?.name || card?.code, [
        entry?.code,
        entry?.name,
        entry?.displayName,
        entry?.cardCode,
        entry?.sourceCode,
        entry?.characterCode,
      ]),
    }))
    .filter((hit) => hit.amount > 0 && isCardFragmentEntryForTemplate(hit.entry, card))
    .sort((a, b) => {
      const aExact =
        slug(a.entry?.cardCode || a.entry?.sourceCode || a.entry?.code || "") ===
        slug(card?.code || "");
      const bExact =
        slug(b.entry?.cardCode || b.entry?.sourceCode || b.entry?.code || "") ===
        slug(card?.code || "");

      if (Number(bExact) !== Number(aExact)) return Number(bExact) - Number(aExact);
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    });
}

function getCardFragmentTotalForTrade(fragments, card) {
  return getCardFragmentMatchesForTrade(fragments, card).reduce(
    (total, hit) => total + Number(hit.amount || 0),
    0
  );
}

function removeCardFragmentsForTrade(fragments, card, amount) {
  const arr = Array.isArray(fragments) ? [...fragments] : [];
  let remaining = Number(amount || 0);
  const matches = getCardFragmentMatchesForTrade(arr, card);

  const totalHave = matches.reduce((total, hit) => total + Number(hit.amount || 0), 0);
  if (totalHave < remaining) {
    throw new Error(`Not enough ${getDisplayName(card)} Fragment.`);
  }

  for (const hit of matches) {
    if (remaining <= 0) break;

    const currentIndex = arr.findIndex((entry) => entry === hit.entry);
    if (currentIndex < 0) continue;

    const currentAmount = getStackAmount(arr[currentIndex]);
    const take = Math.min(currentAmount, remaining);
    const left = currentAmount - take;
    remaining -= take;

    if (left <= 0) {
      arr.splice(currentIndex, 1);
    } else {
      arr[currentIndex] = {
        ...arr[currentIndex],
        amount: left,
      };
    }
  }

  return arr;
}

function resolveCardFragmentEntry(player, entry) {
  const rawQuery = entry.raw || entry.code;
  const cardTemplate = findCardTemplateForFragmentQuery(rawQuery);

  if (!cardTemplate) return null;

  const matches = getCardFragmentMatchesForTrade(player.fragments, cardTemplate);
  if (!matches.length) return null;

  const totalHave = getCardFragmentTotalForTrade(player.fragments, cardTemplate);
  const displayName = `${getDisplayName(cardTemplate)} Fragment`;

  if (totalHave < entry.amount) {
    throw new Error(`${player.username} lacks ${displayName} x${entry.amount}.`);
  }

  return {
    kind: "cardFragment",
    store: "fragments",
    amount: entry.amount,
    code: matches[0].entry?.code || `${slug(cardTemplate.code || cardTemplate.name)}_fragment`,
    query: rawQuery,
    displayName,
    cardTemplate,
    sourceEntry: matches[0].entry,
    storeLabel: "Fragment",
  };
}

function normalizeFragmentCategory(value = "") {
  const text = normalize(value);
  if (!text) return "";

  if (text.includes("weapon") || text.includes("sword") || text.includes("blade")) {
    return "weapon";
  }

  if (
    text.includes("boost") ||
    text.includes("scroll") ||
    text.includes("skill") ||
    text.includes("will")
  ) {
    return "boost";
  }

  if (text.includes("battle") || text.includes("card") || text.includes("character")) {
    return "battle";
  }

  return "";
}

function getFragmentCategory(entry) {
  const directCategory =
    normalizeFragmentCategory(entry?.category) ||
    normalizeFragmentCategory(entry?.type) ||
    normalizeFragmentCategory(entry?.kind) ||
    normalizeFragmentCategory(entry?.sourceType);

  if (directCategory) return directCategory;

  const text = normalize(
    [
      entry?.code,
      entry?.name,
      entry?.displayName,
      entry?.title,
      entry?.sourceCode,
      entry?.weaponCode,
      entry?.boostCode,
      entry?.scrollCode,
      entry?.cardCode,
      entry?.characterCode,
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (text.includes("scroll")) return "boost";
  if (text.includes("boost")) return "boost";
  if (text.includes("will")) return "boost";
  if (text.includes("weapon")) return "weapon";
  if (text.includes("sword")) return "weapon";
  if (text.includes("blade")) return "weapon";
  if (entry?.weaponCode) return "weapon";
  if (entry?.boostCode || entry?.scrollCode) return "boost";
  if (entry?.cardCode || entry?.characterCode) return "battle";

  return "";
}

function getFragmentQueryCategory(query = "") {
  const q = normalize(query);

  if (q.includes("weapon") || q.includes("sword") || q.includes("blade")) {
    return "weapon";
  }

  if (
    q.includes("scroll") ||
    q.includes("boost") ||
    q.includes("skill") ||
    q.includes("will")
  ) {
    return "boost";
  }

  if (q.includes("battle") || q.includes("card") || q.includes("character")) {
    return "battle";
  }

  return "";
}

function getFragmentCategoryLabel(category) {
  if (category === "weapon") return "Weapon Fragment";
  if (category === "boost") return "Boost/Scroll Fragment";
  if (category === "battle") return "Battle Card Fragment";
  return "Fragment";
}

function findStackMatches(list, query) {
  return (Array.isArray(list) ? list : [])
    .map((entry, index) => ({
      index,
      entry,
      score: scoreQuery(query, getStackFields(entry)),
    }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      return String(getDisplayName(a.entry)).localeCompare(String(getDisplayName(b.entry)));
    });
}

function getMatchingStackEntries(list, codeOrQuery) {
  const arr = Array.isArray(list) ? list : [];
  const normalizedCode = normalizeTradeAliasCode(codeOrQuery);

  const exactMatches = arr
    .map((entry, index) => ({
      entry,
      index,
      score: 3000,
    }))
    .filter(({ entry }) => {
      return normalizeTradeAliasCode(entry?.code || "") === normalizedCode;
    });

  if (exactMatches.length) return exactMatches;

  return findStackMatches(arr, codeOrQuery);
}

function getMatchingFragmentEntries(list, codeOrQuery, forcedCategory = "") {
  const arr = Array.isArray(list) ? list : [];
  const requestedCategory = forcedCategory || getFragmentQueryCategory(codeOrQuery);
  const normalizedCode = normalizeTradeAliasCode(codeOrQuery);

  const exactMatches = arr
    .map((entry, index) => ({
      entry,
      index,
      score: 3000,
    }))
    .filter(({ entry }) => {
      if (requestedCategory && getFragmentCategory(entry) !== requestedCategory) {
        return false;
      }

      return normalizeTradeAliasCode(entry?.code || "") === normalizedCode;
    });

  let hits = exactMatches.length
    ? exactMatches
    : findStackMatches(arr, codeOrQuery).filter((hit) => {
        if (!requestedCategory) return true;
        return getFragmentCategory(hit.entry) === requestedCategory;
      });

  if (!requestedCategory && hits.length > 1) {
    const query = normalize(codeOrQuery);
    const querySlug = slug(codeOrQuery);

    const exactNameHits = hits.filter((hit) => {
      const entryName = normalize(hit.entry?.name || hit.entry?.displayName || hit.entry?.title || "");
      const entryCode = slug(hit.entry?.code || "");

      return entryName === query || entryCode === querySlug;
    });

    if (exactNameHits.length === 1) {
      return exactNameHits;
    }

    const boostWordHits = hits.filter((hit) => {
      const text = normalize(
        [
          hit.entry?.code,
          hit.entry?.name,
          hit.entry?.displayName,
          hit.entry?.title,
          hit.entry?.boostCode,
          hit.entry?.scrollCode,
        ]
          .filter(Boolean)
          .join(" ")
      );

      return text.includes(query) && getFragmentCategory(hit.entry) === "boost";
    });

    if (boostWordHits.length === 1) {
      return boostWordHits;
    }

    const weaponWordHits = hits.filter((hit) => {
      const text = normalize(
        [
          hit.entry?.code,
          hit.entry?.name,
          hit.entry?.displayName,
          hit.entry?.title,
          hit.entry?.weaponCode,
        ]
          .filter(Boolean)
          .join(" ")
      );

      return text.includes(query) && getFragmentCategory(hit.entry) === "weapon";
    });

    if (weaponWordHits.length === 1) {
      return weaponWordHits;
    }

    const sorted = [...hits].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    });

    const topScore = sorted[0]?.score || 0;
    const topHits = sorted.filter((hit) => hit.score === topScore);

    if (topHits.length === 1) {
      return [topHits[0]];
    }

    hits = sorted;
  }

  return hits;
}

function getFragmentStackTotal(list, codeOrQuery, forcedCategory = "") {
  return getMatchingFragmentEntries(list, codeOrQuery, forcedCategory).reduce(
    (total, hit) => total + getStackAmount(hit.entry),
    0
  );
}

function getStackAmount(entry) {
  return Math.max(0, num(entry?.amount, 1));
}

function getStackTotal(list, codeOrQuery) {
  return getMatchingStackEntries(list, codeOrQuery).reduce(
    (total, hit) => total + getStackAmount(hit.entry),
    0
  );
}

function findExactStackIndexByCode(list, code) {
  const target = normalizeTradeAliasCode(code);
  if (!target) return -1;

  return (Array.isArray(list) ? list : []).findIndex(
    (entry) => normalizeTradeAliasCode(entry?.code || "") === target
  );
}

function findExactStackEntryByCode(list, code) {
  const index = findExactStackIndexByCode(list, code);
  if (index < 0) return null;

  return {
    index,
    entry: list[index],
    score: 3000,
  };
}

function getTradableCardMatches(player, query) {
  const teamIds = getTeamIds(player);
  const q = String(query || "");

  return (Array.isArray(player.cards) ? player.cards : [])
    .filter((card) => isCardTradable(card, teamIds))
    .map((card) => ({
      card,
      score: scoreQuery(q, getCardFields(card)),
    }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      return String(getDisplayName(a.card)).localeCompare(String(getDisplayName(b.card)));
    })
    .map((hit) => hit.card);
}

function getCardFirstDisplayName(query) {
  const code = normalizeTradeAliasCode(query);
  return CARD_DISPLAY_NAMES[code] || getDisplayName(null, query);
}

function resolveTicketEntry(player, query) {
  const normalizedQuery = normalizeTradeAliasCode(query);
  const hit =
    findExactStackEntryByCode(player.tickets, normalizedQuery) ||
    getMatchingStackEntries(player.tickets, normalizedQuery)[0];

  if (!hit) return null;

  const code = normalizeTradeAliasCode(hit.entry?.code || normalizedQuery);

  if (isBlockedTradeEntry(hit.entry, code)) {
    throw new Error(`Ticket item \`${getDisplayName(hit.entry, query)}\` is untradeable.`);
  }

  return {
    kind: "stack",
    store: "tickets",
    amount: null,
    code,
    query,
    displayName: getDisplayName(hit.entry, query),
    sourceEntry: hit.entry,
    storeLabel: "Ticket",
  };
}

function resolveCardEntry(player, entry) {
  const rawQuery = entry.raw || entry.code;

  if (isFragmentLikeTradeQuery(rawQuery)) {
    return null;
  }
  
  const normalizedCode = normalizeTradeAliasCode(rawQuery);
  const isCardFirst = CARD_FIRST_QUERIES.has(normalizedCode);
  const matches = getTradableCardMatches(player, rawQuery);

  if (matches.length >= entry.amount) {
    const firstCard = matches[0];

    return {
      kind: "cards",
      store: "cards",
      amount: entry.amount,
      code: firstCard?.code || entry.code,
      displayName: getDisplayName(firstCard, entry.code),
      cards: matches.slice(0, entry.amount),
    };
  }

  if (isCardFirst) {
    throw new Error(`${player.username} lacks ${getCardFirstDisplayName(rawQuery)} x${entry.amount}.`);
  }

  return null;
}

function resolveEntry(player, entry) {
  if (entry.type === "berries") {
    if (num(player.berries) < entry.amount) {
      throw new Error(`${player.username} does not have enough berries.`);
    }

    return {
      kind: "berries",
      amount: entry.amount,
      code: "berries",
      displayName: "Berries",
    };
  }

  const normalizedCode = normalizeTradeAliasCode(entry.code || entry.raw);

  if (isBlockedTradeItemCode(normalizedCode)) {
    throw new Error(`Item \`${entry.raw || entry.code}\` is untradeable.`);
  }

  const cardFragmentEntry = resolveCardFragmentEntry(player, entry);
  if (cardFragmentEntry) {
    return cardFragmentEntry;
  }

  const ticketEntry = resolveTicketEntry(player, entry.code || entry.raw);
  if (ticketEntry) {
    const totalHave = getStackTotal(player.tickets, entry.code || entry.raw);

    if (totalHave < entry.amount) {
      throw new Error(`${player.username} lacks ${ticketEntry.displayName} x${entry.amount}.`);
    }

    return {
      ...ticketEntry,
      amount: entry.amount,
    };
  }

  const stores = ["fragments", "weapons", "devilFruits", "materials", "items", "boxes"];
  let insufficient = null;

  for (const store of stores) {
    if (store === "boxes") {
      const query = entry.raw || entry.code;
      const boxHits = getMatchingStackEntries(player.boxes, query);

      if (boxHits.length) {
        const boxName = getDisplayName(boxHits[0].entry, entry.code);
        throw new Error(`Box \`${boxName}\` is untradeable.`);
      }

      continue;
    }

    const query = entry.raw || entry.code;
    const hits =
      store === "fragments"
        ? getMatchingFragmentEntries(player[store], query)
        : getMatchingStackEntries(player[store], query);

    if (!hits.length) continue;

    const displayEntry = hits[0].entry;
    const fragmentCategory = store === "fragments" ? getFragmentCategory(displayEntry) : "";
    const totalHave =
      store === "fragments"
        ? getFragmentStackTotal(player[store], query, fragmentCategory)
        : getStackTotal(player[store], query);

    const displayName = getDisplayName(displayEntry, entry.code);

    if (isBlockedTradeEntry(displayEntry, displayEntry?.code || entry.code)) {
      const label = store === "boxes" ? "Box" : STORE_LABELS[store] || store;

      throw new Error(`${label} \`${displayName}\` is untradeable.`);
    }

    if (totalHave < entry.amount) {
      insufficient = {
        displayName:
          store === "fragments" && fragmentCategory
            ? `${displayName} (${getFragmentCategoryLabel(fragmentCategory)})`
            : displayName,
        have: totalHave,
      };
      continue;
    }

    return {
      kind: "stack",
      store,
      amount: entry.amount,
      code: displayEntry?.code || entry.code,
      query,
      displayName,
      sourceEntry: displayEntry,
      storeLabel: STORE_LABELS[store] || store,
      fragmentCategory,
    };
  }

  if (insufficient) {
    throw new Error(`${player.username} lacks ${insufficient.displayName} x${entry.amount}.`);
  }

  if (isFragmentLikeTradeQuery(entry.raw || entry.code)) {
    throw new Error(
      `${player.username} does not own tradable fragment/item ${entry.raw || entry.code}_${entry.amount}.`
    );
  }

  const cardResolved = resolveCardEntry(player, entry);
  if (cardResolved) return cardResolved;

  throw new Error(`${player.username} does not own tradable ${entry.raw || entry.code}_${entry.amount}.`);
}

function removeStack(list, codeOrQuery, amount, options = {}) {
  const arr = Array.isArray(list) ? [...list] : [];
  let remaining = Number(amount || 0);
  const isFragmentStore = options.store === "fragments";
  const forcedCategory = options.fragmentCategory || "";

  const hits = (
    isFragmentStore
      ? getMatchingFragmentEntries(arr, codeOrQuery, forcedCategory)
      : getMatchingStackEntries(arr, codeOrQuery)
  ).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  const totalHave = hits.reduce((total, hit) => total + getStackAmount(hit.entry), 0);

  if (totalHave < remaining) {
    throw new Error(`Not enough ${getDisplayName(hits[0]?.entry, codeOrQuery)}.`);
  }

  for (const hit of hits) {
    if (remaining <= 0) break;

    const currentIndex = arr.findIndex((entry) => entry === hit.entry);
    if (currentIndex === -1) continue;

    const currentAmount = getStackAmount(arr[currentIndex]);
    const take = Math.min(currentAmount, remaining);
    const left = currentAmount - take;
    remaining -= take;

    if (left <= 0) {
      arr.splice(currentIndex, 1);
    } else {
      arr[currentIndex] = {
        ...arr[currentIndex],
        amount: left,
      };
    }
  }

  return arr;
}

function consumeResolvedForValidation(player, resolved) {
  const next = clonePlayerForTrade(player);

  if (resolved.kind === "berries") {
    next.berries = num(next.berries) - resolved.amount;
    return next;
  }

  if (resolved.kind === "cardFragment") {
    next.fragments = removeCardFragmentsForTrade(
      next.fragments,
      resolved.cardTemplate,
      resolved.amount
    );
    return next;
  }

  if (resolved.kind === "stack") {
    next[resolved.store] = removeStack(
      next[resolved.store],
      resolved.query || resolved.code,
      resolved.amount,
      {
        store: resolved.store,
        fragmentCategory: resolved.fragmentCategory || "",
      }
    );
    return next;
  }

  if (resolved.kind === "cards") {
    const movingIds = new Set(
      resolved.cards.map((card) => String(card.instanceId || "")).filter(Boolean)
    );

    next.cards = next.cards.filter((card) => !movingIds.has(String(card.instanceId || "")));
    return next;
  }

  return next;
}

function resolveOffer(player, offer) {
  const resolvedList = [];
  let tempPlayer = clonePlayerForTrade(player);

  for (const entry of offer) {
    const resolved = resolveEntry(tempPlayer, entry);
    resolvedList.push(resolved);
    tempPlayer = consumeResolvedForValidation(tempPlayer, resolved);
  }

  return resolvedList;
}

function addStack(list, incoming, amount) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = normalizeTradeAliasCode(incoming?.code || slug(incoming?.name || ""));
  const exactIndex = findExactStackIndexByCode(arr, code);

  if (exactIndex < 0) {
    arr.push({
      ...incoming,
      code,
      name: incoming?.name || getDisplayName(incoming, code),
      amount,
    });

    return arr;
  }

  arr[exactIndex] = {
    ...arr[exactIndex],
    ...incoming,
    code,
    amount: num(arr[exactIndex]?.amount, 1) + amount,
  };

  return arr;
}

function applyResolvedTrade(from, to, resolved) {
  const fromNext = clonePlayerForTrade(from);
  const toNext = clonePlayerForTrade(to);

  for (const entry of resolved) {
    if (entry.kind === "berries") {
      if (num(fromNext.berries) < entry.amount) {
        throw new Error(`${fromNext.username} does not have enough berries.`);
      }

      fromNext.berries = num(fromNext.berries) - entry.amount;
      toNext.berries = num(toNext.berries) + entry.amount;
      continue;
    }

    if (entry.kind === "cardFragment") {
      const sourceHit = getCardFragmentMatchesForTrade(fromNext.fragments, entry.cardTemplate)[0];

      if (!sourceHit) {
        throw new Error(`Missing ${entry.displayName || entry.code} during trade apply.`);
      }

      const transferPayload = {
        ...sourceHit.entry,
        code: sourceHit.entry?.code || entry.code,
        name: sourceHit.entry?.name || entry.displayName,
        amount: entry.amount,
      };

      fromNext.fragments = removeCardFragmentsForTrade(
        fromNext.fragments,
        entry.cardTemplate,
        entry.amount
      );

      toNext.fragments = addStack(toNext.fragments, transferPayload, entry.amount);
      continue;
    }

    if (entry.kind === "stack") {
      const query = entry.query || entry.code;
      const sourceHit =
        entry.store === "fragments"
          ? getMatchingFragmentEntries(fromNext[entry.store], query, entry.fragmentCategory || "")[0]
          : findExactStackEntryByCode(fromNext[entry.store], entry.code) ||
            getMatchingStackEntries(fromNext[entry.store], query)[0];

      if (!sourceHit) {
        throw new Error(`Missing ${entry.displayName || entry.code} during trade apply.`);
      }

      const transferPayload = {
        ...sourceHit.entry,
        amount: entry.amount,
      };

      fromNext[entry.store] = removeStack(fromNext[entry.store], query, entry.amount, {
        store: entry.store,
        fragmentCategory: entry.fragmentCategory || "",
      });

      toNext[entry.store] = addStack(toNext[entry.store], transferPayload, entry.amount);
      continue;
    }

    if (entry.kind === "cards") {
      const movingIds = new Set(
        entry.cards.map((card) => String(card.instanceId || "")).filter(Boolean)
      );

      const movingCards = fromNext.cards.filter((card) =>
        movingIds.has(String(card.instanceId || ""))
      );

      if (movingCards.length !== entry.amount) {
        throw new Error(`Card move mismatch for ${entry.displayName || entry.code}.`);
      }

      fromNext.cards = fromNext.cards.filter(
        (card) => !movingIds.has(String(card.instanceId || ""))
      );

      toNext.cards = [...toNext.cards, ...movingCards];
    }
  }

  return {
    fromNext,
    toNext,
  };
}

function summaryLines(label, offer, resolved = null) {
  if (!offer.length) return [`**${label}:** nothing`];

  if (Array.isArray(resolved) && resolved.length) {
    return [`**${label}:** ${resolved.map(fmtResolvedEntry).join(", ")}`];
  }

  return [`**${label}:** ${offer.map(fmtEntry).join(", ")}`];
}

function tradeEmbed(owner, target, ownerOffer, targetOffer, status = "pending", resolved = null) {
  const color =
    status === "done" ? 0x2ecc71 : status === "cancelled" ? 0xe74c3c : 0xf1c40f;

  const ownerResolved = resolved?.ownerResolved || null;
  const targetResolved = resolved?.targetResolved || null;

  return new EmbedBuilder()
    .setColor(color)
    .setTitle("Trade Session")
    .setDescription(
      [
        `**${owner.username}** ↔ **${target.username}**`,
        "",
        ...summaryLines(`${owner.username} offers`, ownerOffer, ownerResolved),
        ...summaryLines(`${target.username} offers`, targetOffer, targetResolved),
        "",
        status === "pending"
          ? "Both players must confirm."
          : status === "done"
            ? "Trade completed successfully."
            : "Trade cancelled.",
      ].join("\n")
    );
}

function getTradeLogChannelId() {
  return (
    process.env.TRADE_LOG_CHANNEL_ID ||
    process.env.TRADE_LOGS_CHANNEL_ID ||
    process.env.LOG_TRADE_CHANNEL_ID ||
    ""
  )
    .replace(/[<#>]/g, "")
    .trim();
}

function cleanTradeLogValue(value) {
  return String(value || "")
    .replace(/`/g, "'")
    .trim();
}

function getTradeLogType(entry) {
  if (!entry) return "Unknown";

  if (entry.kind === "berries") return "Berries";
  if (entry.kind === "cards" || entry.store === "cards") return "Card";
  if (entry.kind === "cardFragment") return "Card Fragment";

  if (entry.storeLabel) return entry.storeLabel;

  return (
    STORE_LABELS?.[entry.store] ||
    entry.kind ||
    entry.store ||
    "Asset"
  );
}

function isTradeLogBerries(entry) {
  const kind = String(entry?.kind || "").toLowerCase();
  const type = String(entry?.type || "").toLowerCase();
  const code = String(entry?.code || entry?.raw || entry?.displayName || "")
    .toLowerCase()
    .trim();

  return (
    kind === "berries" ||
    type === "berries" ||
    code === "berries" ||
    code === "berry" ||
    code === "beli" ||
    code === "money"
  );
}

function getTradeLogAmount(entry) {
  const amount = Number(
    entry?.amount ??
      entry?.count ??
      entry?.quantity ??
      entry?.qty ??
      0
  );

  if (Number.isFinite(amount) && amount > 0) return amount;

  const raw = String(entry?.raw || entry?.query || "").trim();
  if (/^\d+$/.test(raw)) return Number(raw);

  return 1;
}

function getTradeLogType(entry) {
  if (!entry) return "Unknown";
  if (isTradeLogBerries(entry)) return "Berries";

  if (entry.kind === "cards" || entry.store === "cards") return "Card";
  if (entry.kind === "cardFragment") return "Card Fragment";
  if (entry.storeLabel) return entry.storeLabel;

  const storeLabels = {
    weapons: "Weapon",
    devilFruits: "Devil Fruit",
    tickets: "Ticket",
    fragments: "Fragment",
    materials: "Material",
    items: "Item",
    cards: "Card",
  };

  return (
    storeLabels[entry.store] ||
    entry.kind ||
    entry.store ||
    entry.type ||
    "Asset"
  );
}

function formatTradeLogEntry(entry) {
  if (!entry) return "Unknown";

  const amount = getTradeLogAmount(entry);

  if (isTradeLogBerries(entry)) {
    return `${amount.toLocaleString("en-US")} Berries`;
  }

  const type = String(getTradeLogType(entry) || "Asset").trim();
  const name = String(
    entry.displayName ||
      entry.name ||
      entry.cardName ||
      entry.itemName ||
      entry.weaponName ||
      entry.fruitName ||
      entry.code ||
      entry.raw ||
      "Unknown"
  )
    .replace(/`/g, "'")
    .trim();

  return `${name}${amount > 1 ? ` x${amount}` : ""} (${type})`;
}

function formatTradeLogEntries(entries) {
  const list = Array.isArray(entries) ? entries : [];

  if (!list.length) return "Nothing";

  return list.map(formatTradeLogEntry).join(", ");
}

async function sendTradeLog(message, ownerUser, targetUser, ownerResolvedEntries, targetResolvedEntries) {
  const channelId = getTradeLogChannelId();
  if (!channelId) return;

  const channel =
    message.client?.channels?.cache?.get(channelId) ||
    (await message.client?.channels?.fetch?.(channelId).catch(() => null));

  if (!channel?.send) return;

  await channel.send({
    content: [
      "🔁 **Trade Log**",
      `**Trader A:** ${ownerUser} gave \`${formatTradeLogEntries(ownerResolvedEntries)}\``,
      `**Trader B:** ${targetUser} gave \`${formatTradeLogEntries(targetResolvedEntries)}\``,
    ].join("\n"),
    allowedMentions: {
      users: [],
      roles: [],
      repliedUser: false,
    },
  }).catch((error) => {
    console.error("[TRADE LOG ERROR]", error?.message || error);
  });
}

module.exports = {
  name: "trade",

  async execute(message) {
    const targetUser = message.mentions.users.first();

    if (!targetUser) {
      return message.reply({
        content: "Usage: `op trade @mention (your offer) (their offer)`",
        allowedMentions: { repliedUser: false },
      });
    }

    if (targetUser.bot) {
      return message.reply({
        content: "You cannot trade with a bot.",
        allowedMentions: { repliedUser: false },
      });
    }

    if (targetUser.id === message.author.id) {
      return message.reply({
        content: "You cannot trade with yourself.",
        allowedMentions: { repliedUser: false },
      });
    }

    let parsed;

    try {
      parsed = parseTradeContent(message.content);
    } catch (error) {
      return message.reply({
        content: error.message,
        allowedMentions: { repliedUser: false },
      });
    }

    if (!parsed.ownerOffer.length && !parsed.targetOffer.length) {
      return message.reply({
        content: "Trade cannot be empty.",
        allowedMentions: { repliedUser: false },
      });
    }

    const owner = getPlayer(message.author.id, message.author.username);
    const target = getPlayer(targetUser.id, targetUser.username);

    let initialResolved;

    try {
      initialResolved = {
        ownerResolved: resolveOffer(owner, parsed.ownerOffer),
        targetResolved: resolveOffer(target, parsed.targetOffer),
      };
    } catch (error) {
      return message.reply({
        content: `Trade validation failed: ${error.message}`,
        allowedMentions: { repliedUser: false },
      });
    }

    const state = {
      ownerConfirmed: false,
      targetConfirmed: false,
      processing: false,
      done: false,
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("trade_owner_confirm")
        .setLabel(`${message.author.username} Confirm`.slice(0, 80))
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("trade_target_confirm")
        .setLabel(`${targetUser.username} Confirm`.slice(0, 80))
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("trade_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
    );

    const sent = await message.reply({
      embeds: [
        tradeEmbed(
          owner,
          target,
          parsed.ownerOffer,
          parsed.targetOffer,
          "pending",
          initialResolved
        ),
      ],
      components: [row],
      allowedMentions: { repliedUser: false },
    });

    const collector = sent.createMessageComponentCollector({
      time: SESSION_MS,
    });

    collector.on("collect", async (interaction) => {
      if (![message.author.id, targetUser.id].includes(interaction.user.id)) {
        return interaction.reply({
          content: "Only the two trade players can use these buttons.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (state.done || state.processing) {
        return interaction.reply({
          content: state.processing
            ? "This trade is already being processed. Please wait."
            : "This trade session is already closed.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.customId === "trade_cancel") {
        state.done = true;

        await interaction.update({
          embeds: [
            tradeEmbed(
              owner,
              target,
              parsed.ownerOffer,
              parsed.targetOffer,
              "cancelled",
              initialResolved
            ),
          ],
          components: [],
        });

        collector.stop("cancelled");
        return;
      }

      if (interaction.customId === "trade_owner_confirm") {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({
            content: "Only the trade owner can press this button.",
            flags: MessageFlags.Ephemeral,
          });
        }

        state.ownerConfirmed = true;
      }

      if (interaction.customId === "trade_target_confirm") {
        if (interaction.user.id !== targetUser.id) {
          return interaction.reply({
            content: "Only the mentioned player can press this button.",
            flags: MessageFlags.Ephemeral,
          });
        }

        state.targetConfirmed = true;
      }

      if (!state.ownerConfirmed || !state.targetConfirmed) {
        const pendingText = [
          state.ownerConfirmed
            ? `✅ ${message.author.username} confirmed`
            : `⌛ ${message.author.username} waiting`,
          state.targetConfirmed
            ? `✅ ${targetUser.username} confirmed`
            : `⌛ ${targetUser.username} waiting`,
        ].join("\n");

        return interaction.update({
          embeds: [
            tradeEmbed(
              owner,
              target,
              parsed.ownerOffer,
              parsed.targetOffer,
              "pending",
              initialResolved
            ).setFooter({
              text: pendingText,
            }),
          ],
          components: [row],
        });
      }

      state.processing = true;

      await interaction.deferUpdate().catch(() => null);

      try {
        let freshOwner = null;
        let freshTarget = null;
        let ownerResolved = null;
        let targetResolved = null;

        const updatedTrade = await updateTwoPlayersAtomic(
          message.author.id,
          targetUser.id,
          (ownerFresh, targetFresh) => {
            freshOwner = ownerFresh;
            freshTarget = targetFresh;

            ownerResolved = resolveOffer(ownerFresh, parsed.ownerOffer);
            targetResolved = resolveOffer(targetFresh, parsed.targetOffer);

            const stepA = applyResolvedTrade(ownerFresh, targetFresh, ownerResolved);
            const stepB = applyResolvedTrade(stepA.toNext, stepA.fromNext, targetResolved);

            return {
              playerA: stepB.toNext,
              playerB: stepB.fromNext,
            };
          },
          message.author.username,
          targetUser.username
        );

        if (!updatedTrade) {
          throw new Error("Trade save failed. No item was moved.");
        }

        freshOwner = updatedTrade.playerA || freshOwner || owner;
        freshTarget = updatedTrade.playerB || freshTarget || target;

        state.done = true;
        state.processing = false;

        await sent.edit({
          embeds: [
            tradeEmbed(
              freshOwner,
              freshTarget,
              parsed.ownerOffer,
              parsed.targetOffer,
              "done",
              {
                ownerResolved,
                targetResolved,
              }
            ),
          ],
          components: [],
        });

        await sendTradeLog(
          message,
          message.author,
          targetUser,
          ownerResolvedEntries,
          targetResolvedEntries
        );

        collector.stop("done");
      } catch (error) {
        state.processing = false;
        state.done = true;

        await sent.edit({
          embeds: [
            tradeEmbed(
              owner,
              target,
              parsed.ownerOffer,
              parsed.targetOffer,
              "cancelled",
              initialResolved
            ).setFooter({
              text: `Failed: ${error.message}`,
            }),
          ],
          components: [],
        });

        collector.stop("failed");
      }
    });

    collector.on("end", async (_collected, reason) => {
      if (state.done) return;

      try {
        await sent.edit({
          embeds: [
            tradeEmbed(
              owner,
              target,
              parsed.ownerOffer,
              parsed.targetOffer,
              "cancelled",
              initialResolved
            ).setFooter({
              text: reason === "time" ? "Trade expired." : "Trade closed.",
            }),
          ],
          components: [],
        });
      } catch {}
    });
  },
};