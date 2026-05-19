const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const weaponsDb = require("../data/weapons");
const { hydrateCard } = require("../utils/evolution");
const { getRarityBadge, getWeaponImage } = require("../config/assetLinks");

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

function scoreNameOnly(query, names) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;
  const qWords = q.split(" ").filter(Boolean);

  for (const raw of names.filter(Boolean)) {
    const n = normalize(raw);
    if (!n) continue;

    if (n === q) best = Math.max(best, 1000 + n.length);
    else if (n.startsWith(q)) best = Math.max(best, 800 + q.length);
    else if (n.includes(q)) best = Math.max(best, 650 + q.length);
    else if (qWords.length && qWords.every((word) => n.includes(word))) {
      best = Math.max(best, 500 + qWords.join("").length);
    }
  }

  return best;
}

function findBestWeaponMatch(query) {
  const scored = weapons
    .map((weapon) => ({
      weapon,
      score: scoreNameOnly(query, [
        weapon.name,
        weapon.code,
        weapon.type,
        ...(Array.isArray(weapon.aliases) ? weapon.aliases : []),
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return normalize(a.weapon.name).length - normalize(b.weapon.name).length;
    });

  return scored.length ? scored[0].weapon : null;
}

function getCardSearchNames(card) {
  const hydrated = hydrateCard(card);

  return [
    hydrated.displayName,
    hydrated.name,
    hydrated.code,
    hydrated.title,
    hydrated.variant,
    hydrated.instanceId,
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

function findOwnedWeaponEntry(ownedWeapons, weaponCode) {
  const q = normalize(weaponCode);

  return (
    (Array.isArray(ownedWeapons) ? ownedWeapons : [])
      .filter(
        (x) =>
          normalize(x.code || x.name) === q &&
          Number(x.amount || 0) > 0
      )
      .sort(
        (a, b) =>
          Number(b.upgradeLevel || 0) - Number(a.upgradeLevel || 0)
      )[0] || null
  );
}

function consumeWeapon(list, weaponCode) {
  const arr = [...(Array.isArray(list) ? list : [])];
  const q = normalize(weaponCode);

  const candidates = arr
    .map((entry, index) => ({ entry, index }))
    .filter(
      ({ entry }) =>
        normalize(entry.code || entry.name) === q &&
        Number(entry.amount || 0) > 0
    )
    .sort(
      (a, b) =>
        Number(b.entry.upgradeLevel || 0) -
        Number(a.entry.upgradeLevel || 0)
    );

  if (!candidates.length) {
    throw new Error("Weapon not owned.");
  }

  const idx = candidates[0].index;

  if (Number(arr[idx].amount || 0) <= 1) {
    arr.splice(idx, 1);
  } else {
    arr[idx] = {
      ...arr[idx],
      amount: Number(arr[idx].amount || 0) - 1,
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
      previewWeaponTemplate.code
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
      updatePlayerAtomic(
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
            weaponTemplate.code
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

          if (
            existingEquipped.some(
              (x) => normalize(x.code || x.name) === normalize(weaponTemplate.code)
            )
          ) {
            throw new Error("That weapon is already equipped on this card.");
          }

          const nextWeapons = consumeWeapon(fresh.weapons || [], weaponTemplate.code);
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
    } catch (error) {
      return message.reply({
        content: error.message || "Failed to equip weapon.",
        allowedMentions: { repliedUser: false },
      });
    }

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
              `**ATK:** ${formatAtkRange(synced.atk)}`,
              `**HP:** ${Number(synced.hp || 0).toLocaleString("en-US")}`,
              `**SPD:** ${Number(synced.speed || 0).toLocaleString("en-US")}`,
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