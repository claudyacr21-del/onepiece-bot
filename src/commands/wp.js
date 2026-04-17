const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const weapons = require("../data/weapons");
const { findOwnedCard, hydrateCard } = require("../utils/evolution");
const { getRarityBadge, getWeaponImage } = require("../config/assetLinks");

const normalize = (s = "") => String(s).toLowerCase().trim().replace(/\s+/g, " ");

function getWeaponSlotLimit(card) {
  const code = String(card?.code || "");
  if (code === "zoro_pirate_hunter") return 3;
  if (code === "oden") return 2;
  if (code === "hatchan_six_sword_style") return 6;
  return 1;
}

function splitCardAndWeaponInput(rawArgs) {
  if (!rawArgs.length) return null;
  const joined = rawArgs.join(" ").trim();
  const weaponCandidates = [...weapons].sort((a, b) => normalize(b.name).length - normalize(a.name).length);

  for (const weapon of weaponCandidates) {
    if (!normalize(joined).endsWith(normalize(weapon.name))) continue;
    const cardName = joined.slice(0, joined.length - weapon.name.length).trim();
    if (!cardName) continue;
    return { cardName, weaponName: weapon.name };
  }

  return null;
}

function findWeapon(query) {
  const q = normalize(query);
  return (
    weapons.find((w) => [w.name, w.code, w.type].filter(Boolean).map(normalize).includes(q)) ||
    weapons.find((w) => [w.name, w.code, w.type].filter(Boolean).map(normalize).some((x) => x.includes(q))) ||
    null
  );
}

function consumeWeapon(list, weaponCode) {
  const arr = [...(list || [])];
  const idx = arr.findIndex((x) => x.code === weaponCode);

  if (idx === -1 || Number(arr[idx].amount || 0) <= 0) {
    throw new Error("Weapon not owned.");
  }

  if (Number(arr[idx].amount || 0) === 1) arr.splice(idx, 1);
  else arr[idx] = { ...arr[idx], amount: Number(arr[idx].amount || 0) - 1 };

  return arr;
}

function sumWeaponBonuses(equippedWeapons = []) {
  return equippedWeapons.reduce(
    (acc, item) => {
      acc.atk += Number(item?.statBonus?.atk || 0);
      acc.hp += Number(item?.statBonus?.hp || 0);
      acc.speed += Number(item?.statBonus?.speed || 0);
      return acc;
    },
    { atk: 0, hp: 0, speed: 0 }
  );
}

function formatEquippedWeaponNames(equippedWeapons = []) {
  if (!equippedWeapons.length) return null;
  return equippedWeapons.map((x) => x.name).join(", ");
}

module.exports = {
  name: "wp",
  aliases: ["weapon", "equipweapon"],
  async execute(message, args) {
    const split = splitCardAndWeaponInput(args || []);
    if (!split) return message.reply("Usage: `op wp <card name> <weapon name>`");

    const player = getPlayer(message.author.id, message.author.username);
    const card = findOwnedCard(player.cards || [], split.cardName);
    if (!card) return message.reply(`No owned card found matching \`${split.cardName}\`.`);

    const weapon = findWeapon(split.weaponName);
    if (!weapon) return message.reply(`No weapon found matching \`${split.weaponName}\`.`);

    const owned = (player.weapons || []).find((x) => x.code === weapon.code && Number(x.amount || 0) > 0);
    if (!owned) return message.reply(`You do not own \`${weapon.name}\`.`);

    const allowedOwners = Array.isArray(weapon.owners) ? weapon.owners : [];
    if (allowedOwners.length && !allowedOwners.includes(card.code)) {
      return message.reply(`\`${weapon.name}\` cannot be equipped to \`${card.displayName || card.name}\`.`);
    }

    const existingEquipped = Array.isArray(card.equippedWeapons)
      ? [...card.equippedWeapons]
      : card.equippedWeapon && card.equippedWeaponCode
        ? [{ name: card.equippedWeapon, code: card.equippedWeaponCode, statBonus: card.weaponBonus || {} }]
        : [];

    const slotLimit = getWeaponSlotLimit(card);

    if (existingEquipped.length >= slotLimit) {
      return message.reply(`This card already reached its weapon limit (${slotLimit}).`);
    }

    if (existingEquipped.some((x) => x.code === weapon.code)) {
      return message.reply("That weapon is already equipped on this card.");
    }

    const nextWeapons = consumeWeapon(player.weapons || [], weapon.code);
    const nextEquipped = [...existingEquipped, { name: weapon.name, code: weapon.code, statBonus: weapon.statBonus || {} }];
    const totalWeaponBonus = sumWeaponBonuses(nextEquipped);

    const updatedCards = (player.cards || []).map((raw) => {
      if (raw.instanceId !== card.instanceId) return raw;

      const stage = Number(raw.evolutionStage || 1);
      const mult =
        raw.code === "luffy_straw_hat"
          ? stage === 1 ? 1 : stage === 2 ? 1.75 : 2.35
          : stage === 1 ? 1 : stage === 2 ? 1.2 : 1.45;

      const fruitBonus = {
        atk: Number(raw?.fruitBonus?.atk || 0),
        hp: Number(raw?.fruitBonus?.hp || 0),
        speed: Number(raw?.fruitBonus?.speed || 0),
      };

      return hydrateCard({
        ...raw,
        equippedWeapons: nextEquipped,
        equippedWeapon: formatEquippedWeaponNames(nextEquipped),
        equippedWeaponCode: nextEquipped.length === 1 ? nextEquipped[0].code : null,
        weaponBonus: totalWeaponBonus,
        atk: Math.floor(Number(raw.baseAtk || raw.atk || 0) * mult) + totalWeaponBonus.atk + fruitBonus.atk,
        hp: Math.floor(Number(raw.baseHp || raw.hp || 0) * mult) + totalWeaponBonus.hp + fruitBonus.hp,
        speed: Math.floor(Number(raw.baseSpeed || raw.speed || 0) * mult) + totalWeaponBonus.speed + fruitBonus.speed,
      });
    });

    updatePlayer(message.author.id, {
      cards: updatedCards,
      weapons: nextWeapons,
    });

    const synced = updatedCards.find((c) => c.instanceId === card.instanceId);
    const weaponBadge = getRarityBadge(weapon.rarity || "B");
    const weaponImage = getWeaponImage(weapon.code, weapon.image || "");
    const slotText = `${nextEquipped.length}/${slotLimit}`;

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle("🗡️ Weapon Equipped")
          .setDescription(
            [
              `**Card:** ${synced.displayName || synced.name}`,
              `**Added Weapon:** ${weapon.name}`,
              `**Weapon Rarity:** ${String(weapon.rarity || "B").toUpperCase()}`,
              `**Weapon Slots:** ${slotText}`,
              `**Equipped Weapons:** ${synced.equippedWeapon || weapon.name}`,
              "",
              `**ATK:** ${synced.atk}`,
              `**HP:** ${synced.hp}`,
              `**SPD:** ${synced.speed}`,
              "",
              `Total Weapon Bonus: +${totalWeaponBonus.atk} ATK / +${totalWeaponBonus.hp} HP / +${totalWeaponBonus.speed} SPD`,
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