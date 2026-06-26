const { EmbedBuilder } = require("discord.js");
const {
  getPlayer,
  updatePlayerAtomic,
  flushPlayerNow,
} = require("../playerStore");
const weaponsDb = require("../data/weapons");
const { hydrateCard } = require("../utils/evolution");
const { getRarityBadge, getWeaponImage } = require("../config/assetLinks");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");

function flattenDb(db) {
  if (Array.isArray(db)) return db;

  if (db && typeof db === "object") {
    return Object.values(db).flatMap((entry) => {
      if (Array.isArray(entry)) return entry;
      if (entry && typeof entry === "object") return [entry];
      return [];
    });
  }

  return [];
}

const weapons = flattenDb(weaponsDb);

const normalize = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");

function normalizeWeaponLookup(value = "") {
  return normalize(value)
    .replace(/\bsolidd\b/g, "solid")
    .replace(/\bsoul\s+solidd\b/g, "soul solid")
    .trim();
}

function getWeaponAmount(entry) {
  const amount = Number(
    entry?.amount ??
      entry?.count ??
      entry?.quantity ??
      entry?.qty ??
      1
  );

  return Number.isFinite(amount) ? amount : 1;
}

function getWeaponSearchNames(weapon) {
  return [
    weapon?.name,
  ]
    .map(normalizeWeaponLookup)
    .filter(Boolean);
}

function doesWeaponMatchTemplate(entry, weaponTemplate) {
  const templateKeys = getWeaponSearchNames(weaponTemplate);
  const entryKeys = [
    entry?.code,
    entry?.name,
    entry?.displayName,
    entry?.title,
    entry?.weaponCode,
  ]
    .map(normalizeWeaponLookup)
    .filter(Boolean);

  if (!templateKeys.length || !entryKeys.length) return false;

  return templateKeys.some((templateKey) =>
    entryKeys.some((entryKey) => entryKey === templateKey)
  );
}

function getWeaponIdentityKeys(weapon) {
  return [
    weapon?.code,
    weapon?.weaponCode,
    weapon?.name,
  ]
    .map(normalizeWeaponLookup)
    .filter(Boolean);
}

function isSameWeaponEntry(entry, weaponTemplate) {
  const entryKeys = getWeaponIdentityKeys(entry);
  const templateKeys = getWeaponIdentityKeys(weaponTemplate);

  if (!entryKeys.length || !templateKeys.length) return false;

  return entryKeys.some((entryKey) => templateKeys.includes(entryKey));
}

function getWeaponNameOnly(weapon) {
  return String(weapon?.name || "").trim();
}

function getSearchWords(value) {
  return normalizeWeaponLookup(value)
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);
}

function scoreNameOnly(query, names) {
  const q = normalizeWeaponLookup(query);
  if (!q) return 0;

  const queryWords = getSearchWords(q);
  if (!queryWords.length) return 0;

  let best = 0;

  for (const raw of names.filter(Boolean)) {
    const n = normalizeWeaponLookup(raw);
    if (!n) continue;

    const nameWords = getSearchWords(n);
    if (!nameWords.length) continue;

    // Exact full name match.
    if (n === q) {
      best = Math.max(best, 1000 + n.length);
      continue;
    }

    // Single word must match a full word only.
    // Example: "hat" will not match "hatchan".
    if (queryWords.length === 1) {
      if (nameWords.includes(queryWords[0])) {
        best = Math.max(best, 850 + queryWords[0].length);
      }

      continue;
    }

    // Multiple words must exist as full words.
    const allWordsExist = queryWords.every((word) => nameWords.includes(word));

    if (allWordsExist) {
      best = Math.max(best, 700 + queryWords.join("").length);
    }
  }

  return best;
}

function findBestWeaponMatch(query) {
  const scored = weapons
    .map((weapon) => {
      const weaponName = getWeaponNameOnly(weapon);
      const searchNames = getWeaponSearchNames(weapon);

      return {
        weapon,
        weaponName,
        score: scoreNameOnly(query, searchNames),
      };
    })
    .filter((entry) => entry.weaponName)
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return normalizeWeaponLookup(a.weaponName).length - normalizeWeaponLookup(b.weaponName).length;
    });

  return scored.length ? scored[0].weapon : null;
}

function getCardSearchNames(card) {
  const hydrated = hydrateCard(card);

  return [
    hydrated.displayName,
    hydrated.name,
  ]
    .map(normalize)
    .filter(Boolean);
}

function findOwnedCardByName(cardsOwned, query) {
  const q = normalize(query);
  const cards = Array.isArray(cardsOwned) ? cardsOwned : [];
  let best = null;

  for (const raw of cards) {
    const hydrated = hydrateCard(raw);

    if (String(hydrated.cardRole || "").toLowerCase() === "boost") continue;

    const names = getCardSearchNames(hydrated);
    const score = scoreNameOnly(q, names);

    if (score && (!best || score > best.score)) {
      best = {
        score,
        card: hydrated,
      };
    }
  }

  return best?.card || null;
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function getBoostedDisplayStats(card, boosts = {}) {
  const hydrated = hydrateCard(card) || card || {};

  if (String(hydrated.cardRole || "").toLowerCase() === "boost") {
    return hydrated;
  }

  return {
    ...hydrated,
    atk: Math.floor(Number(hydrated.atk || 0) * (1 + Number(boosts.atk || 0) / 100)),
    hp: Math.floor(Number(hydrated.hp || 0) * (1 + Number(boosts.hp || 0) / 100)),
    speed: Math.floor(Number(hydrated.speed || 0) * (1 + Number(boosts.spd || 0) / 100)),
  };
}

function getFinalDisplayStats(card, boosts = {}) {
  const boosted = getBoostedDisplayStats(card, boosts);
  const atk = Number(boosted.atk || 0);
  const hp = Number(boosted.hp || 0);
  const speed = Number(boosted.speed || 0);

  return {
    atk,
    hp,
    speed,
    atkMin: Math.floor(atk * 0.85),
    atkMax: Math.floor(atk * 1.15),
  };
}

function getWeaponSlotLimit(card) {
  const code = String(card?.code || "").toLowerCase();

  if (code === "zoro_pirate_hunter" || code.includes("zoro")) return 3;
  if (code === "oden" || code.includes("oden")) return 2;

  return 1;
}

function splitCardAndWeaponInput(rawArgs) {
  if (!rawArgs.length) return null;

  const parts = rawArgs.map((x) => String(x || "").trim()).filter(Boolean);

  for (let i = 1; i < parts.length; i++) {
    const cardName = parts.slice(0, i).join(" ").trim();
    const weaponQuery = parts.slice(i).join(" ").trim();

    if (!cardName || !weaponQuery) continue;

    const weapon = findBestWeaponMatch(weaponQuery);
    if (!weapon) continue;

    return {
      cardName,
      weaponName: weapon.name,
      weaponQuery,
    };
  }

  return null;
}

function findOwnedWeaponEntry(ownedWeapons, weaponTemplate) {
  return (
    (Array.isArray(ownedWeapons) ? ownedWeapons : [])
      .filter((entry) => {
        if (getWeaponAmount(entry) <= 0) return false;
        return doesWeaponMatchTemplate(entry, weaponTemplate);
      })
      .sort(
        (a, b) => Number(b.upgradeLevel || 0) - Number(a.upgradeLevel || 0)
      )[0] || null
  );
}

function consumeWeapon(list, weaponTemplate) {
  const arr = [...(Array.isArray(list) ? list : [])];

  const candidates = arr
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => {
      if (getWeaponAmount(entry) <= 0) return false;
      return doesWeaponMatchTemplate(entry, weaponTemplate);
    })
    .sort(
      (a, b) => Number(b.entry.upgradeLevel || 0) - Number(a.entry.upgradeLevel || 0)
    );

  if (!candidates.length) {
    throw new Error("Weapon not owned.");
  }

  const idx = candidates[0].index;
  const currentAmount = getWeaponAmount(arr[idx]);

  if (currentAmount <= 1) {
    arr.splice(idx, 1);
  } else {
    arr[idx] = {
      ...arr[idx],
      amount: currentAmount - 1,
    };
  }

  return arr;
}

function getRawOwnedCard(player, instanceId) {
  return (Array.isArray(player.cards) ? player.cards : []).find(
    (raw) => String(raw.instanceId) === String(instanceId)
  );
}

function getCleanEquippedWeapons(rawCard) {
  const list = Array.isArray(rawCard?.equippedWeapons)
    ? rawCard.equippedWeapons
    : [];

  return list.filter((w) => {
    if (!w) return false;

    const codeOrName = normalize(w.code || w.name);

    if (!codeOrName) return false;
    if (codeOrName === "none") return false;

    return true;
  });
}

function formatEquippedWeaponNames(equippedWeapons = []) {
  if (!equippedWeapons.length) return null;

  return equippedWeapons
    .map((x) => {
      const level = Number(x.upgradeLevel || 0);
      return `${x.name}${level > 0 ? ` +${level}` : ""}`;
    })
    .join(", ");
}

function getWeaponPercentAtLevel(basePercent, level, ownerBonusPercent, ownerActive) {
  const lv = Math.max(0, Number(level || 0));

  return {
    atk:
      Number(basePercent?.atk || 0) +
      lv +
      (ownerActive ? Number(ownerBonusPercent?.atk || 0) : 0),
    hp:
      Number(basePercent?.hp || 0) +
      lv +
      (ownerActive ? Number(ownerBonusPercent?.hp || 0) : 0),
    speed:
      Number(basePercent?.speed || 0) +
      (ownerActive ? Number(ownerBonusPercent?.speed || 0) : 0),
  };
}

function isOwnerActive(weapon, cardCode, card = null) {
  const owners = Array.isArray(weapon?.owners) ? weapon.owners : [];
  const possibleCardKeys = [
    cardCode,
    card?.code,
    card?.baseCode,
    card?.characterCode,
    card?.name,
    card?.displayName,
  ]
    .map(normalize)
    .filter(Boolean);

  return owners.some((owner) => {
    const normalizedOwner = normalize(owner);

    return possibleCardKeys.some((key) => {
      return (
        normalizedOwner === key ||
        normalizedOwner.includes(key) ||
        key.includes(normalizedOwner)
      );
    });
  });
}

function sumWeaponPercents(equippedWeapons = [], cardCode = "", card = null) {
  return equippedWeapons.reduce(
    (acc, item) => {
      const ownerActive = isOwnerActive(item, cardCode, card);

      const percent = getWeaponPercentAtLevel(
        item.baseStatPercent || item.statPercent || { atk: 0, hp: 0, speed: 0 },
        item.upgradeLevel || 0,
        item.ownerBonusPercent || { atk: 0, hp: 0, speed: 0 },
        ownerActive
      );

      acc.atk += Number(percent.atk || 0);
      acc.hp += Number(percent.hp || 0);
      acc.speed += Number(percent.speed || 0);

      return acc;
    },
    { atk: 0, hp: 0, speed: 0 }
  );
}

module.exports = {
  name: "wp",
  aliases: ["weapon", "equipweapon"],

  async execute(message, args) {
    const split = splitCardAndWeaponInput(args || []);

    if (!split) {
      return message.reply({
        content: "Usage: `op wp <card name> <weapon name>`",
        allowedMentions: { repliedUser: false },
      });
    }

    const previewPlayer = getPlayer(message.author.id, message.author.username);
    const previewCard = findOwnedCardByName(
      previewPlayer.cards || [],
      split.cardName
    );

    if (!previewCard) {
      return message.reply({
        content: `No owned card found matching \`${split.cardName}\`.`,
        allowedMentions: { repliedUser: false },
      });
    }

    const previewWeaponTemplate = findBestWeaponMatch(split.weaponName);

    if (!previewWeaponTemplate) {
      return message.reply({
        content: `No weapon found matching \`${split.weaponName}\`.`,
        allowedMentions: { repliedUser: false },
      });
    }

    const previewOwnedEntry = findOwnedWeaponEntry(
      previewPlayer.weapons || [],
      previewWeaponTemplate
    );

    if (!previewOwnedEntry) {
      return message.reply({
        content: `You do not own \`${previewWeaponTemplate.name}\`.`,
        allowedMentions: { repliedUser: false },
      });
    }

    let synced = null;
    let weaponTemplate = previewWeaponTemplate;
    let inheritedLevel = 0;
    let nextEquipped = [];
    let slotLimit = 1;
    let equippedWeaponName = null;
    let totalWeaponPercent = { atk: 0, hp: 0, speed: 0 };
    let ownerActive = false;
    let shownPercent = { atk: 0, hp: 0, speed: 0 };

    try {
      await updatePlayerAtomic(
        message.author.id,
        (fresh) => {
          const card = findOwnedCardByName(fresh.cards || [], split.cardName);

          if (!card) {
            throw new Error(`No owned card found matching \`${split.cardName}\`.`);
          }

          const rawOwnedCard = getRawOwnedCard(fresh, card.instanceId);

          if (!rawOwnedCard) {
            throw new Error("Owned card data was not found. Please try again.");
          }

          weaponTemplate = findBestWeaponMatch(split.weaponName);

          if (!weaponTemplate) {
            throw new Error(`No weapon found matching \`${split.weaponName}\`.`);
          }

          const ownedEntry = findOwnedWeaponEntry(
            fresh.weapons || [],
            weaponTemplate
          );

          if (!ownedEntry) {
            throw new Error(`You do not own \`${weaponTemplate.name}\`.`);
          }

          const existingEquipped = getCleanEquippedWeapons(rawOwnedCard);
          slotLimit = getWeaponSlotLimit(card);

          if (existingEquipped.length >= slotLimit) {
            throw new Error(
              `This card already reached its weapon limit (${slotLimit}).`
            );
          }

          if (existingEquipped.some((x) => isSameWeaponEntry(x, weaponTemplate))) {
            throw new Error("That weapon is already equipped on this card.");
          }

          const nextWeapons = consumeWeapon(fresh.weapons || [], weaponTemplate);
          inheritedLevel = Math.max(0, Number(ownedEntry.upgradeLevel || 0));

          const equippedPayload = {
            name: weaponTemplate.name,
            code: weaponTemplate.code,
            rarity: weaponTemplate.rarity || "C",
            type: weaponTemplate.type || "Weapon",
            statPercent: weaponTemplate.statPercent || {
              atk: 0,
              hp: 0,
              speed: 0,
            },
            baseStatPercent:
              weaponTemplate.baseStatPercent ||
              weaponTemplate.statPercent || {
                atk: 0,
                hp: 0,
                speed: 0,
              },
            ownerBonusPercent: weaponTemplate.ownerBonusPercent || {
              atk: 0,
              hp: 0,
              speed: 0,
            },
            upgradeLevel: inheritedLevel,
            image: weaponTemplate.image || "",
            owners: Array.isArray(weaponTemplate.owners)
              ? weaponTemplate.owners
              : [],
            description: weaponTemplate.description || "",
          };

          nextEquipped = [...existingEquipped, equippedPayload];

          totalWeaponPercent = sumWeaponPercents(nextEquipped, card.code, card);
          equippedWeaponName = formatEquippedWeaponNames(nextEquipped);

          const updatedCards = (Array.isArray(fresh.cards) ? fresh.cards : []).map(
            (raw) => {
              if (String(raw.instanceId) !== String(card.instanceId)) return raw;

              return hydrateCard({
                ...raw,
                equippedWeapons: nextEquipped,
                equippedWeapon: equippedWeaponName,
                equippedWeaponName,
                equippedWeaponCode:
                  nextEquipped.length === 1 ? nextEquipped[0].code : null,
                equippedWeaponLevel:
                  nextEquipped.length === 1
                    ? Number(nextEquipped[0].upgradeLevel || 0)
                    : 0,
                weaponBonusPercent: totalWeaponPercent,
              });
            }
          );

          synced =
            updatedCards.find(
              (c) => String(c.instanceId) === String(card.instanceId)
            ) || hydrateCard(rawOwnedCard);

          ownerActive = isOwnerActive(weaponTemplate, card.code, card);

          shownPercent = getWeaponPercentAtLevel(
            weaponTemplate.baseStatPercent ||
              weaponTemplate.statPercent || {
                atk: 0,
                hp: 0,
                speed: 0,
              },
            inheritedLevel,
            weaponTemplate.ownerBonusPercent || {
              atk: 0,
              hp: 0,
              speed: 0,
            },
            ownerActive
          );

          return {
            ...fresh,
            cards: updatedCards,
            weapons: nextWeapons,
          };
        },
        message.author.username
      );

      await flushPlayerNow(
        message.author.id,
        Number(process.env.PLAYER_DB_COMMAND_FLUSH_MS || 8000)
      );
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to equip weapon.",
        allowedMentions: { repliedUser: false },
      });
    }

    const latestPlayer = getPlayer(message.author.id, message.author.username);
    const accountBoosts = getPassiveBoostSummary(latestPlayer);
    const finalStats = getFinalDisplayStats(synced, accountBoosts);
    const weaponBadge = getRarityBadge(weaponTemplate.rarity || "B");
    const weaponImage = getWeaponImage(
      weaponTemplate.code,
      weaponTemplate.image || ""
    );
    const slotText = `${nextEquipped.length}/${slotLimit}`;

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle("⚔️ Weapon Equipped")
          .setDescription(
            [
              `**Card:** ${synced.displayName || synced.name}`,
              `**Added Weapon:** ${weaponTemplate.name}`,
              `**Weapon Rarity:** ${String(
                weaponTemplate.rarity || "B"
              ).toUpperCase()}`,
              `**Weapon Level:** +${inheritedLevel}`,
              `**Weapon Slots:** ${slotText}`,
              `**Equipped Weapons:** ${equippedWeaponName || weaponTemplate.name}`,
              `**Owner Bonus Active:** ${ownerActive ? "Yes" : "No"}`,
              "",
              `**ATK:** ${finalStats.atkMin}-${finalStats.atkMax}`,
              `**HP:** ${Number(finalStats.hp || 0).toLocaleString("en-US")}`,
              `**SPD:** ${Number(finalStats.speed || 0).toLocaleString("en-US")}`,
              "",
              `Weapon Bonus Applied: +${shownPercent.atk}% ATK / +${shownPercent.hp}% HP / +${shownPercent.speed}% SPD`,
              `Total Weapon Bonus: +${totalWeaponPercent.atk}% ATK / +${totalWeaponPercent.hp}% HP / +${totalWeaponPercent.speed}% SPD`,
            ].join("\n")
          )
          .setThumbnail(weaponBadge || null)
          .setImage(weaponImage || null)
          .setFooter({
            text: "One Piece Bot • Weapon Equip",
          }),
      ],
      allowedMentions: { repliedUser: false },
    });
  },
};