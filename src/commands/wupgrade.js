const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const { incrementQuestCounter } = require("../utils/questProgress");
const weaponsDb = require("../data/weapons");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
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
  const found = (Array.isArray(materials) ? materials : []).find(
    (x) => x.code === "enhancement_stone"
  );
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

function findWeaponTemplate(query) {
  const q = normalize(query);
  if (!q) return null;

  return (
    weaponsDb.find((item) => normalize(item.code) === q) ||
    weaponsDb.find((item) => normalize(item.name) === q) ||
    weaponsDb.find((item) => normalize(item.code).includes(q)) ||
    weaponsDb.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

function findOwnedWeaponEntry(weapons, query) {
  const q = normalize(query);
  const list = Array.isArray(weapons) ? weapons : [];

  const scored = list
    .map((entry) => {
      const template = findWeaponTemplate(entry.code || entry.name);
      const fields = [
        entry.code,
        entry.name,
        template?.code,
        template?.name,
        template?.type,
      ].filter(Boolean);

      let score = 0;
      for (const field of fields) {
        const f = normalize(field);
        if (!f) continue;

        if (f === q) {
          score = Math.max(score, 1000 + f.length);
          continue;
        }

        if (f.startsWith(q)) {
          score = Math.max(score, 700 + q.length);
          continue;
        }

        if (f.includes(q)) {
          score = Math.max(score, 400 + q.length);
          continue;
        }

        const words = q.split(" ").filter(Boolean);
        if (words.length && words.every((w) => f.includes(w))) {
          score = Math.max(score, 250 + words.join("").length);
        }
      }

      return { entry, template, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0] : null;
}

function getWeaponPercentAtLevel(basePercent, level) {
  const lv = Math.max(0, Number(level || 0));
  return {
    atk: Number(basePercent?.atk || 0) + lv * 1,
    hp: Number(basePercent?.hp || 0) + lv * 1,
    speed: Number(basePercent?.speed || 0),
  };
}

function syncEquippedWeaponLevels(cards, weaponCode, newLevel) {
  return (Array.isArray(cards) ? cards : []).map((raw) => {
    const equipped = Array.isArray(raw.equippedWeapons) ? raw.equippedWeapons : [];
    let touched = false;

    const nextEquipped = equipped.map((w) => {
      if (normalize(w.code) !== normalize(weaponCode)) return w;
      touched = true;
      return {
        ...w,
        upgradeLevel: newLevel,
        baseStatPercent: w.baseStatPercent || w.statPercent || { atk: 0, hp: 0, speed: 0 },
      };
    });

    if (!touched) return raw;

    return hydrateCard({
      ...raw,
      equippedWeapons: nextEquipped,
      equippedWeapon: nextEquipped
        .map((w) => `${w.name}${Number(w.upgradeLevel || 0) > 0 ? ` +${w.upgradeLevel}` : ""}`)
        .join(", "),
      equippedWeaponName: nextEquipped
        .map((w) => `${w.name}${Number(w.upgradeLevel || 0) > 0 ? ` +${w.upgradeLevel}` : ""}`)
        .join(", "),
    });
  });
}

function getEquippedOwners(cards, weaponCode) {
  const owners = [];

  for (const raw of Array.isArray(cards) ? cards : []) {
    const equipped = Array.isArray(raw.equippedWeapons) ? raw.equippedWeapons : [];
    const hasWeapon = equipped.some((w) => normalize(w.code) === normalize(weaponCode));
    if (hasWeapon) {
      owners.push(raw.displayName || raw.name || raw.code || "Unknown");
    }
  }

  return owners;
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
    const ownedWeapons = Array.isArray(player.weapons) ? [...player.weapons] : [];
    const match = findOwnedWeaponEntry(ownedWeapons, weaponQuery);

    if (!match) {
      return message.reply("That weapon was not found in your inventory.");
    }

    const { entry, template } = match;
    if (!template) {
      return message.reply("Weapon template not found.");
    }

    const currentLevel = Math.max(0, Number(entry.upgradeLevel || 0));
    const nextLevel = currentLevel + 1;
    const stoneCost = getStoneCost(nextLevel);

    if (!stoneCost) {
      return message.reply("This weapon already reached max upgrade level.");
    }

    const currentStone = getStoneAmount(player.materials || []);
    if (currentStone < stoneCost) {
      return message.reply(
        `You need **${stoneCost} Enhancement Stones** to upgrade **${template.name}**. Current: **${currentStone}**`
      );
    }

    const updatedMaterials = consumeStones(player.materials || [], stoneCost);

    const updatedWeapons = ownedWeapons.map((w) => {
      if (normalize(w.code) !== normalize(template.code)) return w;

      return {
        ...w,
        name: template.name,
        code: template.code,
        rarity: template.rarity,
        type: template.type,
        statPercent: template.statPercent || { atk: 0, hp: 0, speed: 0 },
        baseStatPercent: template.statPercent || { atk: 0, hp: 0, speed: 0 },
        upgradeLevel: nextLevel,
        image: template.image || w.image || "",
        owners: template.owners || w.owners || [],
        description: template.description || w.description || "",
      };
    });

    const updatedCards = syncEquippedWeaponLevels(
      player.cards || [],
      template.code,
      nextLevel
    );

    const updatedDailyState = incrementQuestCounter(player, "weaponUpgrades", 1);

    updatePlayer(message.author.id, {
      weapons: updatedWeapons,
      cards: updatedCards,
      materials: updatedMaterials,
      quests: {
        ...(player.quests || {}),
        dailyState: updatedDailyState,
      },
    });

    const shownPercent = getWeaponPercentAtLevel(
      template.statPercent || { atk: 0, hp: 0, speed: 0 },
      nextLevel
    );

    const equippedOwners = getEquippedOwners(updatedCards, template.code);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("🛠️ Weapon Upgrade Success")
          .setDescription(
            [
              `**Weapon:** ${template.name}`,
              `**Weapon Level:** +${nextLevel}`,
              `**Cost:** ${stoneCost} Enhancement Stones`,
              "",
              "**Weapon Percent Now**",
              `ATK: +${shownPercent.atk}%`,
              `HP: +${shownPercent.hp}%`,
              `SPD: +${shownPercent.speed}%`,
              "",
              `**Equipped On:** ${
                equippedOwners.length ? equippedOwners.join(", ") : "Not equipped"
              }`,
            ].join("\n")
          ),
      ],
    });
  },
};