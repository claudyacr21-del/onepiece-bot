const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const weapons = require("../data/weapons");
const { findOwnedCard, hydrateCard } = require("../utils/evolution");
const { getRarityBadge, getWeaponImage } = require("../config/assetLinks");

const normalize = (s = "") => String(s).toLowerCase().trim().replace(/\s+/g, " ");

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

function addBackWeapon(list, weaponCode) {
  if (!weaponCode) return list;
  const weapon = weapons.find((w) => w.code === weaponCode || w.name === weaponCode);
  if (!weapon) return list;

  const arr = [...(list || [])];
  const idx = arr.findIndex((x) => x.code === weapon.code);

  if (idx === -1) arr.push({ ...weapon, amount: 1 });
  else arr[idx] = { ...arr[idx], amount: Number(arr[idx].amount || 0) + 1 };

  return arr;
}

function consumeWeapon(list, weaponCode) {
  const arr = [...(list || [])];
  const idx = arr.findIndex((x) => x.code === weaponCode);

  if (idx === -1 || Number(arr[idx].amount || 0) <= 0) throw new Error("Weapon not owned.");

  if (Number(arr[idx].amount || 0) === 1) arr.splice(idx, 1);
  else arr[idx] = { ...arr[idx], amount: Number(arr[idx].amount || 0) - 1 };

  return arr;
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

    let nextWeapons = consumeWeapon(player.weapons || [], weapon.code);
    nextWeapons = addBackWeapon(nextWeapons, card.equippedWeaponCode || null);

    const bonus = {
      atk: Number(weapon?.statBonus?.atk || 0),
      hp: Number(weapon?.statBonus?.hp || 0),
      speed: Number(weapon?.statBonus?.speed || 0),
    };

    const updatedCards = (player.cards || []).map((raw) => {
      if (raw.instanceId !== card.instanceId) return raw;

      const stage = Number(raw.evolutionStage || 1);
      const mult = stage === 1 ? 1 : stage === 2 ? 1.2 : 1.45;

      return hydrateCard({
        ...raw,
        equippedWeapon: weapon.name,
        equippedWeaponCode: weapon.code,
        weaponBonus: bonus,
        atk: Math.floor(Number(raw.baseAtk || raw.atk || 0) * mult) + bonus.atk,
        hp: Math.floor(Number(raw.baseHp || raw.hp || 0) * mult) + bonus.hp,
        speed: Math.floor(Number(raw.baseSpeed || raw.speed || 0) * mult) + bonus.speed,
      });
    });

    updatePlayer(message.author.id, {
      cards: updatedCards,
      weapons: nextWeapons,
    });

    const synced = updatedCards.find((c) => c.instanceId === card.instanceId);
    const weaponBadge = getRarityBadge(weapon.rarity || "B");
    const weaponImage = getWeaponImage(weapon.code, weapon.image || "");

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle("🗡️ Weapon Equipped")
          .setDescription(
            [
              `**Card:** ${synced.displayName || synced.name}`,
              `**Weapon:** ${weapon.name}`,
              `**Weapon Rarity:** ${String(weapon.rarity || "B").toUpperCase()}`,
              `**Inventory Sync:** 1 copy consumed`,
              "",
              `**ATK:** ${synced.atk}`,
              `**HP:** ${synced.hp}`,
              `**SPD:** ${synced.speed}`,
              "",
              `Bonus: +${bonus.atk} ATK / +${bonus.hp} HP / +${bonus.speed} SPD`,
            ].join("\n")
          )
          .setThumbnail(weaponBadge || null)
          .setImage(weaponImage || synced.image || null),
      ],
    });
  },
};