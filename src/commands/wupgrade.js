const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const { incrementQuestCounter } = require("../utils/questProgress");

function normalize(text) {
  return String(text || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function getStoneCost(nextLevel) {
  const table = {
    1: 25,
    2: 60,
    3: 120,
    4: 220,
    5: 360,
  };
  return table[nextLevel] || null;
}

function getStoneAmount(materials) {
  const found = (Array.isArray(materials) ? materials : []).find((x) => x.code === "enhancement_stone");
  return Number(found?.amount || 0);
}

function consumeStones(materials, amount) {
  const arr = [...(Array.isArray(materials) ? materials : [])];
  const idx = arr.findIndex((x) => x.code === "enhancement_stone");

  if (idx === -1) throw new Error("Enhancement Stone not found.");

  const current = Number(arr[idx].amount || 0);
  if (current < amount) throw new Error(`You need ${amount} Enhancement Stones.`);

  if (current === amount) arr.splice(idx, 1);
  else arr[idx] = { ...arr[idx], amount: current - amount };

  return arr;
}

function getWeaponBonusAtLevel(baseBonus, level) {
  const lv = Math.max(0, Number(level || 0));
  return {
    atk: Number(baseBonus?.atk || 0) + lv * 3,
    hp: Number(baseBonus?.hp || 0) + lv * 8,
    speed: Number(baseBonus?.speed || 0) + lv * 1,
  };
}

function rebuildWeaponBonus(equippedWeapons) {
  return equippedWeapons.reduce(
    (acc, weapon) => {
      const bonus = getWeaponBonusAtLevel(
        weapon.baseStatBonus || weapon.statBonus || {},
        weapon.upgradeLevel || 0
      );
      acc.atk += Number(bonus.atk || 0);
      acc.hp += Number(bonus.hp || 0);
      acc.speed += Number(bonus.speed || 0);
      return acc;
    },
    { atk: 0, hp: 0, speed: 0 }
  );
}

function findEquippedWeaponMatches(cards, weaponName) {
  const q = normalize(weaponName);
  const matches = [];

  for (const rawCard of cards) {
    const card = hydrateCard(rawCard);
    const equippedWeapons = Array.isArray(card.equippedWeapons) ? card.equippedWeapons : [];

    for (const weapon of equippedWeapons) {
      const names = [weapon.name, weapon.code].filter(Boolean).map(normalize);
      if (names.includes(q) || names.some((x) => x.includes(q))) {
        matches.push({
          rawCard,
          card,
          weapon,
        });
      }
    }
  }

  return matches;
}

module.exports = {
  name: "wupgrade",
  aliases: ["weaponupgrade", "upweapon"],
  async execute(message, args) {
    const weaponQuery = args.join(" ").trim();
    if (!weaponQuery) {
      return message.reply("Usage: `op wupgrade <weapon name>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const playerCards = Array.isArray(player.cards) ? player.cards : [];
    const matches = findEquippedWeaponMatches(playerCards, weaponQuery);

    if (!matches.length) {
      return message.reply("That equipped weapon was not found on your cards.");
    }

    if (matches.length > 1) {
      return message.reply(
        [
          "That weapon is equipped on more than one card.",
          "Please make the weapon name more specific.",
          "",
          ...matches.map(
            (entry, index) =>
              `${index + 1}. ${entry.weapon.name} • ${entry.card.displayName || entry.card.name}`
          ),
        ].join("\n")
      );
    }

    const target = matches[0];
    const card = target.card;
    const targetWeapon = target.weapon;

    const currentLevel = Number(targetWeapon.upgradeLevel || 0);
    const nextLevel = currentLevel + 1;
    const stoneCost = getStoneCost(nextLevel);

    if (!stoneCost) {
      return message.reply("This weapon already reached max upgrade level.");
    }

    const currentStone = getStoneAmount(player.materials || []);
    if (currentStone < stoneCost) {
      return message.reply(
        `You need **${stoneCost} Enhancement Stones** to upgrade **${targetWeapon.name}**. Current: **${currentStone}**`
      );
    }

    const updatedMaterials = consumeStones(player.materials || [], stoneCost);

    const updatedCards = playerCards.map((raw) => {
      if (raw.instanceId !== card.instanceId) return raw;

      const nextEquippedWeapons = (Array.isArray(raw.equippedWeapons) ? raw.equippedWeapons : []).map((w) => {
        if (normalize(w.name) !== normalize(targetWeapon.name)) return w;
        return {
          ...w,
          baseStatBonus: w.baseStatBonus || w.statBonus || { atk: 0, hp: 0, speed: 0 },
          upgradeLevel: nextLevel,
        };
      });

      const totalWeaponBonus = rebuildWeaponBonus(nextEquippedWeapons);

      return hydrateCard({
        ...raw,
        equippedWeapons: nextEquippedWeapons,
        equippedWeapon: nextEquippedWeapons
          .map((w) => `${w.name}${Number(w.upgradeLevel || 0) > 0 ? ` +${w.upgradeLevel}` : ""}`)
          .join(", "),
        weaponBonus: totalWeaponBonus,
      });
    });

    const updatedDailyState = incrementQuestCounter(player, "weaponUpgrades", 1);

    updatePlayer(message.author.id, {
      cards: updatedCards,
      materials: updatedMaterials,
      quests: {
        ...(player.quests || {}),
        dailyState: updatedDailyState,
      },
    });

    const syncedCard = updatedCards.find((c) => c.instanceId === card.instanceId);
    const syncedWeapon = (syncedCard.equippedWeapons || []).find(
      (w) => normalize(w.name) === normalize(targetWeapon.name)
    );
    const shownBonus = getWeaponBonusAtLevel(
      syncedWeapon.baseStatBonus || syncedWeapon.statBonus || {},
      syncedWeapon.upgradeLevel || 0
    );

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("🛠️ Weapon Upgrade Success")
          .setDescription(
            [
              `**Weapon:** ${syncedWeapon.name}`,
              `**Owner Card:** ${syncedCard.displayName || syncedCard.name}`,
              `**Weapon Level:** +${Number(syncedWeapon.upgradeLevel || 0)}`,
              `**Cost:** ${stoneCost} Enhancement Stones`,
              "",
              "**Weapon Bonus Now**",
              `ATK: +${shownBonus.atk}`,
              `HP: +${shownBonus.hp}`,
              `SPD: +${shownBonus.speed}`,
            ].join("\n")
          ),
      ],
    });
  },
};