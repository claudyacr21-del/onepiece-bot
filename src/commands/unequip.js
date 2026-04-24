const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const weaponsDb = require("../data/weapons");
const { getWeaponImage, getRarityBadge } = require("../config/assetLinks");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function findWeaponTemplate(value) {
  const q = normalize(value);
  if (!q) return null;

  return (
    weaponsDb.find((item) => normalize(item.code) === q) ||
    weaponsDb.find((item) => normalize(item.name) === q) ||
    weaponsDb.find((item) => normalize(item.code).includes(q)) ||
    weaponsDb.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

function scoreQuery(query, candidates) {
  const q = normalize(query);
  if (!q) return 0;

  let best = 0;

  for (const raw of candidates) {
    const candidate = normalize(raw);
    if (!candidate) continue;

    if (candidate === q) {
      best = Math.max(best, 1000 + candidate.length);
      continue;
    }

    if (candidate.startsWith(q)) {
      best = Math.max(best, 700 + q.length);
      continue;
    }

    if (candidate.includes(q)) {
      best = Math.max(best, 400 + q.length);
      continue;
    }

    const words = q.split(" ").filter(Boolean);
    if (words.length && words.every((w) => candidate.includes(w))) {
      best = Math.max(best, 250 + words.join("").length);
    }
  }

  return best;
}

function buildEquippedWeaponMatches(cards, query) {
  const matches = [];

  for (const rawCard of Array.isArray(cards) ? cards : []) {
    const equipped = Array.isArray(rawCard.equippedWeapons) ? rawCard.equippedWeapons : [];

    for (const weapon of equipped) {
      const template = findWeaponTemplate(weapon.code || weapon.name) || null;
      const score = scoreQuery(query, [
        weapon.name,
        weapon.code,
        template?.name,
        template?.code,
        template?.type,
      ]);

      if (score <= 0) continue;

      matches.push({
        score,
        rawCard,
        weapon,
        template: template || weapon,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

function addWeaponBackToInventory(weapons, template, upgradeLevel) {
  const list = Array.isArray(weapons) ? [...weapons] : [];
  const idx = list.findIndex((w) => normalize(w.code || w.name) === normalize(template.code));

  if (idx === -1) {
    list.push({
      name: template.name,
      code: template.code,
      rarity: template.rarity,
      type: template.type,
      statPercent: template.statPercent || { atk: 0, hp: 0, speed: 0 },
      baseStatPercent: template.statPercent || { atk: 0, hp: 0, speed: 0 },
      ownerBonusPercent: template.ownerBonusPercent || { atk: 0, hp: 0, speed: 0 },
      upgradeLevel: Number(upgradeLevel || 0),
      image: template.image || "",
      owners: template.owners || [],
      description: template.description || "",
      amount: 1,
    });
    return list;
  }

  list[idx] = {
    ...list[idx],
    amount: Number(list[idx].amount || 0) + 1,
    upgradeLevel: Math.max(
      Number(list[idx].upgradeLevel || 0),
      Number(upgradeLevel || 0)
    ),
  };

  return list;
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

module.exports = {
  name: "unequip",
  aliases: ["uwp", "removeweapon"],

  async execute(message, args) {
    const query = args.join(" ").trim();
    if (!query) {
      return message.reply("Usage: `op unequip <weapon>`");
    }

    const player = getPlayer(message.author.id, message.author.username);
    const cards = Array.isArray(player.cards) ? [...player.cards] : [];
    const matches = buildEquippedWeaponMatches(cards, query);

    if (!matches.length) {
      return message.reply("No equipped weapon matched that query.");
    }

    const match = matches[0];
    const rawCard = match.rawCard;
    const equippedWeapon = match.weapon;
    const template = match.template;

    const updatedCards = cards.map((card) => {
      if (String(card.instanceId) !== String(rawCard.instanceId)) return card;

      const currentEquipped = Array.isArray(card.equippedWeapons) ? card.equippedWeapons : [];
      const nextEquipped = currentEquipped.filter(
        (w) => normalize(w.code || w.name) !== normalize(equippedWeapon.code || equippedWeapon.name)
      );

      return hydrateCard({
        ...card,
        equippedWeapons: nextEquipped,
        equippedWeapon: nextEquipped.length ? formatEquippedWeaponNames(nextEquipped) : null,
        equippedWeaponName: nextEquipped.length ? formatEquippedWeaponNames(nextEquipped) : null,
        equippedWeaponCode: nextEquipped.length === 1 ? nextEquipped[0].code : null,
      });
    });

    const updatedWeapons = addWeaponBackToInventory(
      player.weapons || [],
      template,
      equippedWeapon.upgradeLevel || 0
    );

    updatePlayer(message.author.id, {
      cards: updatedCards,
      weapons: updatedWeapons,
    });

    const syncedCard = updatedCards.find(
      (c) => String(c.instanceId) === String(rawCard.instanceId)
    );

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe67e22)
          .setTitle("🧰 Weapon Unequipped")
          .setDescription(
            [
              `**Weapon:** ${template.name || equippedWeapon.name}`,
              `**Removed From:** ${syncedCard?.displayName || syncedCard?.name || rawCard.displayName || rawCard.name}`,
              `**Weapon Level:** +${Number(equippedWeapon.upgradeLevel || 0)}`,
              "",
              `**ATK:** ${Math.floor(Number(syncedCard?.atk || 0) * 0.85)}-${Math.floor(Number(syncedCard?.atk || 0) * 1.15)}`,
              `**HP:** ${Number(syncedCard?.hp || 0)}`,
              `**SPD:** ${Number(syncedCard?.speed || 0)}`,
              "",
              `**Remaining Equipped Weapons:** ${syncedCard?.displayWeaponName || "None"}`,
              "Weapon returned to your inventory.",
            ].join("\n")
          )
          .setThumbnail(getRarityBadge(template.rarity || "B") || null)
          .setImage(getWeaponImage(template.code, template.image || "") || null),
      ],
    });
  },
};