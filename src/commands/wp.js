const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const weapons = require("../data/weapons");
const { findOwnedCard, hydrateCard } = require("../utils/evolution");
const { getRarityBadge, getWeaponImage } = require("../config/assetLinks");

const normalize = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function getWeaponSlotLimit(card) {
  const code = String(card?.code || "");
  if (code === "zoro_pirate_hunter") return 3;
  if (code === "oden") return 2;
  return 1;
}

function splitCardAndWeaponInput(rawArgs) {
  if (!rawArgs.length) return null;
  const joined = rawArgs.join(" ").trim();
  const weaponCandidates = [...weapons].sort(
    (a, b) => normalize(b.name).length - normalize(a.name).length
  );

  for (const weapon of weaponCandidates) {
    if (!normalize(joined).endsWith(normalize(weapon.name))) continue;
    const cardName = joined.slice(0, joined.length - weapon.name.length).trim();
    if (!cardName) continue;
    return { cardName, weaponName: weapon.name };
  }

  return null;
}

function findWeaponTemplate(query) {
  const q = normalize(query);
  return (
    weapons.find((w) =>
      [w.name, w.code, w.type].filter(Boolean).map(normalize).includes(q)
    ) ||
    weapons.find((w) =>
      [w.name, w.code, w.type]
        .filter(Boolean)
        .map(normalize)
        .some((x) => x.includes(q))
    ) ||
    null
  );
}

function findOwnedWeaponEntry(ownedWeapons, weaponCode) {
  const q = normalize(weaponCode);
  return (Array.isArray(ownedWeapons) ? ownedWeapons : []).find(
    (x) => normalize(x.code || x.name) === q
  );
}

function consumeWeapon(list, weaponCode) {
  const arr = [...(list || [])];
  const idx = arr.findIndex((x) => normalize(x.code) === normalize(weaponCode));

  if (idx === -1 || Number(arr[idx].amount || 0) <= 0) {
    throw new Error("Weapon not owned.");
  }

  if (Number(arr[idx].amount || 0) === 1) arr.splice(idx, 1);
  else arr[idx] = { ...arr[idx], amount: Number(arr[idx].amount || 0) - 1 };

  return arr;
}

function formatEquippedWeaponNames(equippedWeapons = []) {
  if (!equippedWeapons.length) return null;
  return equippedWeapons
    .map(
      (x) =>
        `${x.name}${Number(x.upgradeLevel || 0) > 0 ? ` +${x.upgradeLevel}` : ""}`
    )
    .join(", ");
}

function getWeaponPercentAtLevel(basePercent, level) {
  const lv = Math.max(0, Number(level || 0));
  return {
    atk: Number(basePercent?.atk || 0) + lv * 1,
    hp: Number(basePercent?.hp || 0) + lv * 1,
    speed: Number(basePercent?.speed || 0),
  };
}

function sumWeaponPercents(equippedWeapons = []) {
  return equippedWeapons.reduce(
    (acc, item) => {
      const percent = getWeaponPercentAtLevel(
        item.baseStatPercent || item.statPercent || { atk: 0, hp: 0, speed: 0 },
        item.upgradeLevel || 0
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
    if (!split) return message.reply("Usage: `op wp <card name> <weapon name>`");

    const player = getPlayer(message.author.id, message.author.username);
    const card = findOwnedCard(player.cards || [], split.cardName);
    if (!card) {
      return message.reply(`No owned card found matching \`${split.cardName}\`.`);
    }

    const weaponTemplate = findWeaponTemplate(split.weaponName);
    if (!weaponTemplate) {
      return message.reply(`No weapon found matching \`${split.weaponName}\`.`);
    }

    const ownedEntry = findOwnedWeaponEntry(player.weapons || [], weaponTemplate.code);
    if (!ownedEntry || Number(ownedEntry.amount || 0) <= 0) {
      return message.reply(`You do not own \`${weaponTemplate.name}\`.`);
    }

    const allowedOwners = Array.isArray(weaponTemplate.owners)
      ? weaponTemplate.owners
      : [];
    if (allowedOwners.length && !allowedOwners.includes(card.code)) {
      return message.reply(
        `\`${weaponTemplate.name}\` cannot be equipped to \`${card.displayName || card.name}\`.`
      );
    }

    const existingEquipped = Array.isArray(card.equippedWeapons)
      ? [...card.equippedWeapons]
      : [];

    const slotLimit = getWeaponSlotLimit(card);

    if (existingEquipped.length >= slotLimit) {
      return message.reply(
        `This card already reached its weapon limit (${slotLimit}).`
      );
    }

    if (
      existingEquipped.some(
        (x) => normalize(x.code || x.name) === normalize(weaponTemplate.code)
      )
    ) {
      return message.reply("That weapon is already equipped on this card.");
    }

    const nextWeapons = consumeWeapon(player.weapons || [], weaponTemplate.code);

    const inheritedLevel = Math.max(0, Number(ownedEntry.upgradeLevel || 0));

    const nextEquipped = [
      ...existingEquipped,
      {
        name: weaponTemplate.name,
        code: weaponTemplate.code,
        rarity: weaponTemplate.rarity,
        type: weaponTemplate.type,
        statPercent: weaponTemplate.statPercent || { atk: 0, hp: 0, speed: 0 },
        baseStatPercent: weaponTemplate.statPercent || { atk: 0, hp: 0, speed: 0 },
        upgradeLevel: inheritedLevel,
        image: weaponTemplate.image || "",
        owners: weaponTemplate.owners || [],
        description: weaponTemplate.description || "",
      },
    ];

    const totalWeaponPercent = sumWeaponPercents(nextEquipped);
    const equippedWeaponName = formatEquippedWeaponNames(nextEquipped);

    const updatedCards = (player.cards || []).map((raw) => {
      if (raw.instanceId !== card.instanceId) return raw;

      return hydrateCard({
        ...raw,
        equippedWeapons: nextEquipped,
        equippedWeapon: equippedWeaponName,
        equippedWeaponName,
        equippedWeaponCode: nextEquipped.length === 1 ? nextEquipped[0].code : null,
        weaponBonusPercent: totalWeaponPercent,
      });
    });

    updatePlayer(message.author.id, {
      cards: updatedCards,
      weapons: nextWeapons,
    });

    const synced = updatedCards.find((c) => c.instanceId === card.instanceId);
    const weaponBadge = getRarityBadge(weaponTemplate.rarity || "B");
    const weaponImage = getWeaponImage(weaponTemplate.code, weaponTemplate.image || "");
    const slotText = `${nextEquipped.length}/${slotLimit}`;
    const shownPercent = getWeaponPercentAtLevel(
      weaponTemplate.statPercent || { atk: 0, hp: 0, speed: 0 },
      inheritedLevel
    );

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle("🗡️ Weapon Equipped")
          .setDescription(
            [
              `**Card:** ${synced.displayName || synced.name}`,
              `**Added Weapon:** ${weaponTemplate.name}`,
              `**Weapon Rarity:** ${String(weaponTemplate.rarity || "B").toUpperCase()}`,
              `**Weapon Level:** +${inheritedLevel}`,
              `**Weapon Slots:** ${slotText}`,
              `**Equipped Weapons:** ${equippedWeaponName || weaponTemplate.name}`,
              "",
              `**ATK:** ${formatAtkRange(synced.atk)}`,
              `**HP:** ${synced.hp}`,
              `**SPD:** ${synced.speed}`,
              "",
              `Weapon Bonus Applied: +${shownPercent.atk}% ATK / +${shownPercent.hp}% HP / +${shownPercent.speed}% SPD`,
              `Total Weapon Bonus: +${totalWeaponPercent.atk}% ATK / +${totalWeaponPercent.hp}% HP / +${totalWeaponPercent.speed}% SPD`,
              "",
              "Weapons stay permanently equipped.",
            ].join("\n")
          )
          .setThumbnail(weaponBadge || null)
          .setImage(weaponImage || synced.image || null),
      ],
    });
  },
};