const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const { incrementQuestPayload } = require("../utils/questProgress");
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

  if (current < amount) {
    throw new Error(`You need ${amount} Enhancement Stones.`);
  }

  if (current === amount) {
    arr.splice(idx, 1);
  } else {
    arr[idx] = {
      ...arr[idx],
      amount: current - amount,
    };
  }

  return arr;
}

function findWeaponTemplate(query) {
  const q = normalize(query);
  if (!q) return null;

  return (
    weaponsDb.find((item) => normalize(item.code) === q) ||
    weaponsDb.find((item) => normalize(item.name) === q) ||
    weaponsDb.find((item) => normalize(item.type) === q) ||
    weaponsDb.find((item) => normalize(item.code).includes(q)) ||
    weaponsDb.find((item) => normalize(item.name).includes(q)) ||
    weaponsDb.find((item) => normalize(item.type).includes(q)) ||
    null
  );
}

function scoreWeaponQuery(query, fields) {
  const q = normalize(query);
  if (!q) return 0;

  let score = 0;

  for (const field of fields.filter(Boolean)) {
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

  return score;
}

function getInventoryWeaponMatches(player, query) {
  const list = Array.isArray(player.weapons) ? player.weapons : [];

  return list
    .map((entry, index) => {
      const template = findWeaponTemplate(entry.code || entry.name || query);

      const score = scoreWeaponQuery(query, [
        entry.code,
        entry.name,
        entry.type,
        template?.code,
        template?.name,
        template?.type,
      ]);

      return {
        source: "inventory",
        index,
        entry,
        template,
        upgradeLevel: Number(entry.upgradeLevel || 0),
        score,
      };
    })
    .filter((x) => x.score > 0);
}

function getEquippedWeaponMatches(player, query) {
  const cards = Array.isArray(player.cards) ? player.cards : [];
  const matches = [];

  cards.forEach((card, cardIndex) => {
    const equipped = Array.isArray(card.equippedWeapons) ? card.equippedWeapons : [];

    equipped.forEach((entry, weaponIndex) => {
      const template = findWeaponTemplate(entry.code || entry.name || query);

      const score = scoreWeaponQuery(query, [
        entry.code,
        entry.name,
        entry.type,
        card.equippedWeapon,
        card.equippedWeaponName,
        template?.code,
        template?.name,
        template?.type,
      ]);

      if (score <= 0) return;

      matches.push({
        source: "equipped",
        cardIndex,
        weaponIndex,
        cardName: card.displayName || card.name || card.code || "Unknown Card",
        entry,
        template,
        upgradeLevel: Number(entry.upgradeLevel || card.equippedWeaponLevel || 0),
        score,
      });
    });

    const hasLegacySingle =
      (!equipped.length && (card.equippedWeapon || card.equippedWeaponCode)) ||
      false;

    if (hasLegacySingle) {
      const template = findWeaponTemplate(
        card.equippedWeaponCode || card.equippedWeaponName || card.equippedWeapon || query
      );

      const score = scoreWeaponQuery(query, [
        card.equippedWeaponCode,
        card.equippedWeaponName,
        card.equippedWeapon,
        template?.code,
        template?.name,
        template?.type,
      ]);

      if (score > 0) {
        matches.push({
          source: "legacy_equipped",
          cardIndex,
          weaponIndex: 0,
          cardName: card.displayName || card.name || card.code || "Unknown Card",
          entry: {
            code: card.equippedWeaponCode || template?.code,
            name: card.equippedWeaponName || card.equippedWeapon || template?.name,
            upgradeLevel: Number(card.equippedWeaponLevel || 0),
          },
          template,
          upgradeLevel: Number(card.equippedWeaponLevel || 0),
          score,
        });
      }
    }
  });

  return matches;
}

function findOwnedOrEquippedWeapon(player, query) {
  const inventoryMatches = getInventoryWeaponMatches(player, query);
  const equippedMatches = getEquippedWeaponMatches(player, query);

  const allMatches = [...inventoryMatches, ...equippedMatches]
    .filter((x) => x.template)
    .sort((a, b) => b.score - a.score);

  if (!allMatches.length) return null;

  const best = allMatches[0];
  const weaponCode = best.template.code;

  const inventoryEntry = inventoryMatches.find(
    (match) => normalize(match.template?.code) === normalize(weaponCode)
  );

  const equippedEntries = equippedMatches.filter(
    (match) => normalize(match.template?.code) === normalize(weaponCode)
  );

  const currentLevel = Math.max(
    0,
    Number(inventoryEntry?.upgradeLevel || 0),
    ...equippedEntries.map((entry) => Number(entry.upgradeLevel || 0))
  );

  return {
    template: best.template,
    inventoryEntry,
    equippedEntries,
    currentLevel,
  };
}

function getWeaponPercentAtLevel(basePercent, level) {
  const lv = Math.max(0, Number(level || 0));

  return {
    atk: Number(basePercent?.atk || 0) + lv * 1,
    hp: Number(basePercent?.hp || 0) + lv * 1,
    speed: Number(basePercent?.speed || 0),
  };
}

function getWeaponDisplayName(template, level) {
  return `${template.name}${Number(level || 0) > 0 ? ` +${level}` : ""}`;
}

function updateInventoryWeaponLevels(weapons, template, newLevel) {
  return (Array.isArray(weapons) ? weapons : []).map((entry) => {
    const entryTemplate = findWeaponTemplate(entry.code || entry.name);

    if (normalize(entryTemplate?.code || entry.code) !== normalize(template.code)) {
      return entry;
    }

    return {
      ...entry,
      name: template.name,
      code: template.code,
      rarity: template.rarity,
      type: template.type,
      statPercent: template.statPercent || {
        atk: 0,
        hp: 0,
        speed: 0,
      },
      baseStatPercent: template.statPercent || {
        atk: 0,
        hp: 0,
        speed: 0,
      },
      upgradeLevel: newLevel,
      image: template.image || entry.image || "",
      owners: template.owners || entry.owners || [],
      description: template.description || entry.description || "",
    };
  });
}

function syncEquippedWeaponLevels(cards, template, newLevel) {
  return (Array.isArray(cards) ? cards : []).map((raw) => {
    const equipped = Array.isArray(raw.equippedWeapons) ? raw.equippedWeapons : [];
    let touched = false;

    let nextEquipped = equipped.map((weapon) => {
      const weaponTemplate = findWeaponTemplate(weapon.code || weapon.name);

      if (normalize(weaponTemplate?.code || weapon.code) !== normalize(template.code)) {
        return weapon;
      }

      touched = true;

      return {
        ...weapon,
        code: template.code,
        name: template.name,
        rarity: template.rarity,
        type: template.type,
        statPercent: template.statPercent || weapon.statPercent || {
          atk: 0,
          hp: 0,
          speed: 0,
        },
        baseStatPercent: template.statPercent || weapon.baseStatPercent || {
          atk: 0,
          hp: 0,
          speed: 0,
        },
        upgradeLevel: newLevel,
        image: template.image || weapon.image || "",
        owners: template.owners || weapon.owners || [],
        description: template.description || weapon.description || "",
      };
    });

    if (!nextEquipped.length && (raw.equippedWeapon || raw.equippedWeaponCode)) {
      const legacyTemplate = findWeaponTemplate(
        raw.equippedWeaponCode || raw.equippedWeaponName || raw.equippedWeapon
      );

      if (normalize(legacyTemplate?.code) === normalize(template.code)) {
        touched = true;

        nextEquipped = [
          {
            code: template.code,
            name: template.name,
            rarity: template.rarity,
            type: template.type,
            statPercent: template.statPercent || {
              atk: 0,
              hp: 0,
              speed: 0,
            },
            baseStatPercent: template.statPercent || {
              atk: 0,
              hp: 0,
              speed: 0,
            },
            upgradeLevel: newLevel,
            image: template.image || "",
            owners: template.owners || [],
            description: template.description || "",
          },
        ];
      }
    }

    if (!touched) return raw;

    const equippedName = nextEquipped
      .map((weapon) => getWeaponDisplayName(weapon, weapon.upgradeLevel))
      .join(", ");

    return hydrateCard({
      ...raw,
      equippedWeapons: nextEquipped,
      equippedWeapon: equippedName,
      equippedWeaponName: equippedName,
      equippedWeaponCode: nextEquipped.length === 1 ? nextEquipped[0].code : raw.equippedWeaponCode || null,
      equippedWeaponLevel: nextEquipped.length === 1 ? newLevel : raw.equippedWeaponLevel || 0,
    });
  });
}

function getEquippedOwners(cards, weaponCode) {
  const owners = [];

  for (const raw of Array.isArray(cards) ? cards : []) {
    const equipped = Array.isArray(raw.equippedWeapons) ? raw.equippedWeapons : [];

    const hasWeapon = equipped.some((weapon) => {
      const template = findWeaponTemplate(weapon.code || weapon.name);
      return normalize(template?.code || weapon.code) === normalize(weaponCode);
    });

    const legacyCodeOrName = raw.equippedWeaponCode || raw.equippedWeaponName || raw.equippedWeapon;
    const legacyTemplate = findWeaponTemplate(legacyCodeOrName);

    const hasLegacy =
      !equipped.length &&
      normalize(legacyTemplate?.code || legacyCodeOrName) === normalize(weaponCode);

    if (hasWeapon || hasLegacy) {
      owners.push(raw.displayName || raw.name || raw.code || "Unknown");
    }
  }

  return [...new Set(owners)];
}

module.exports = {
  name: "wupgrade",
  aliases: ["weaponupgrade", "upweapon"],

  async execute(message, args) {
    const weaponQuery = args.join(" ").trim();

    if (!weaponQuery) {
      return message.reply("Usage: `op wupgrade <weapon>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const match = findOwnedOrEquippedWeapon(player, weaponQuery);

    if (!match) {
      return message.reply("That weapon was not found in your inventory or equipped cards.");
    }

    const { template, currentLevel } = match;

    if (!template) {
      return message.reply("Weapon template not found.");
    }

    const nextLevel = currentLevel + 1;
    const stoneCost = getStoneCost(nextLevel);

    if (!stoneCost) {
      return message.reply("This weapon already reached max upgrade level.");
    }

    const currentStone = getStoneAmount(player.materials || []);

    if (currentStone < stoneCost) {
      return message.reply(
        `You need **${stoneCost} Enhancement Stones** to upgrade **${template.name}**.\nCurrent: **${currentStone}**`
      );
    }

    const updatedMaterials = consumeStones(player.materials || [], stoneCost);
    const updatedWeapons = updateInventoryWeaponLevels(player.weapons || [], template, nextLevel);
    const updatedCards = syncEquippedWeaponLevels(player.cards || [], template, nextLevel);
    const updatedQuests = incrementQuestPayload(player, "weaponUpgrades", 1);

    updatePlayer(message.author.id, {
      weapons: updatedWeapons,
      cards: updatedCards,
      materials: updatedMaterials,
      quests: updatedQuests,
    });

    const shownPercent = getWeaponPercentAtLevel(
      template.statPercent || {
        atk: 0,
        hp: 0,
        speed: 0,
      },
      nextLevel
    );

    const equippedOwners = getEquippedOwners(updatedCards, template.code);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("🗡️ Weapon Upgrade Success")
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
              `**Equipped On:** ${equippedOwners.length ? equippedOwners.join(", ") : "Not equipped"}`,
            ].join("\n")
          ),
      ],
    });
  },
};