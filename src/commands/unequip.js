const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const { getPlayer, updatePlayerAtomic } = require("../playerStore");
const { hydrateCard, findOwnedCard } = require("../utils/evolution");
const weaponsDb = require("../data/weapons");
const { getWeaponImage, getRarityBadge } = require("../config/assetLinks");

const UNEQUIP_GEM_COST = 200;

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
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
    } else if (candidate.startsWith(q)) {
      best = Math.max(best, 700 + q.length);
    } else if (candidate.includes(q)) {
      best = Math.max(best, 400 + q.length);
    } else {
      const words = q.split(" ").filter(Boolean);

      if (words.length && words.every((w) => candidate.includes(w))) {
        best = Math.max(best, 250 + words.join("").length);
      }
    }
  }

  return best;
}

function buildEquippedWeaponMatches(cards, query) {
  const matches = [];

  for (const rawCard of Array.isArray(cards) ? cards : []) {
    const equipped = Array.isArray(rawCard.equippedWeapons)
      ? rawCard.equippedWeapons
      : [];

    for (const weapon of equipped) {
      const template = findWeaponTemplate(weapon.code || weapon.name) || weapon;

      const score = scoreQuery(query, [
        weapon.name,
        weapon.code,
        template.name,
        template.code,
        template.type,
        rawCard.displayName,
        rawCard.name,
        rawCard.code,
      ]);

      if (score <= 0) continue;

      matches.push({
        score,
        rawCard,
        weapon,
        template,
      });
    }

    const hasLegacy =
      !equipped.length && (rawCard.equippedWeapon || rawCard.equippedWeaponCode);

    if (hasLegacy) {
      const template =
        findWeaponTemplate(
          rawCard.equippedWeaponCode ||
            rawCard.equippedWeaponName ||
            rawCard.equippedWeapon
        ) || {
          code: rawCard.equippedWeaponCode,
          name: rawCard.equippedWeaponName || rawCard.equippedWeapon,
          rarity: "B",
          type: "Weapon",
          statPercent: { atk: 0, hp: 0, speed: 0 },
          ownerBonusPercent: { atk: 0, hp: 0, speed: 0 },
          image: "",
          owners: [],
          description: "",
        };

      const score = scoreQuery(query, [
        template.name,
        template.code,
        template.type,
        rawCard.equippedWeapon,
        rawCard.equippedWeaponName,
        rawCard.equippedWeaponCode,
        rawCard.displayName,
        rawCard.name,
        rawCard.code,
      ]);

      if (score > 0) {
        matches.push({
          score,
          rawCard,
          weapon: {
            code: template.code || rawCard.equippedWeaponCode,
            name: template.name || rawCard.equippedWeaponName || rawCard.equippedWeapon,
            rarity: template.rarity || "B",
            type: template.type || "Weapon",
            statPercent: template.statPercent || { atk: 0, hp: 0, speed: 0 },
            baseStatPercent:
              template.baseStatPercent ||
              template.statPercent || { atk: 0, hp: 0, speed: 0 },
            ownerBonusPercent:
              template.ownerBonusPercent || { atk: 0, hp: 0, speed: 0 },
            upgradeLevel: Number(rawCard.equippedWeaponLevel || 0),
            image: template.image || "",
            owners: template.owners || [],
            description: template.description || "",
          },
          template,
        });
      }
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

function getInventoryWeaponLevel(player, weaponCode) {
  const found = (Array.isArray(player.weapons) ? player.weapons : []).find((weapon) => {
    const template = findWeaponTemplate(weapon.code || weapon.name) || weapon;

    return (
      normalize(template.code || weapon.code || weapon.name) === normalize(weaponCode)
    );
  });

  return Number(found?.upgradeLevel || 0);
}

function getEquippedWeaponLevelFromAllCards(player, weaponCode) {
  let best = 0;

  for (const card of Array.isArray(player.cards) ? player.cards : []) {
    const equipped = Array.isArray(card.equippedWeapons) ? card.equippedWeapons : [];

    for (const weapon of equipped) {
      const template = findWeaponTemplate(weapon.code || weapon.name) || weapon;

      if (
        normalize(template.code || weapon.code || weapon.name) === normalize(weaponCode)
      ) {
        best = Math.max(best, Number(weapon.upgradeLevel || 0));
      }
    }

    const legacyTemplate = findWeaponTemplate(
      card.equippedWeaponCode || card.equippedWeaponName || card.equippedWeapon
    );

    if (
      normalize(legacyTemplate?.code || card.equippedWeaponCode || card.equippedWeapon) ===
      normalize(weaponCode)
    ) {
      best = Math.max(best, Number(card.equippedWeaponLevel || 0));
    }
  }

  return best;
}

function getUnequipWeaponLevel(player, rawCard, weapon, template) {
  const weaponCode = template?.code || weapon?.code || weapon?.name;

  return Math.max(
    Number(weapon?.upgradeLevel || 0),
    Number(rawCard?.equippedWeaponLevel || 0),
    getInventoryWeaponLevel(player, weaponCode),
    getEquippedWeaponLevelFromAllCards(player, weaponCode)
  );
}

function addWeaponBackToInventory(weapons, template, upgradeLevel) {
  const list = Array.isArray(weapons) ? [...weapons] : [];
  const idx = list.findIndex(
    (w) => normalize(w.code || w.name) === normalize(template.code || template.name)
  );

  const payload = {
    name: template.name,
    code: template.code,
    rarity: template.rarity || "B",
    type: template.type || "Weapon",
    statPercent: template.statPercent || { atk: 0, hp: 0, speed: 0 },
    baseStatPercent:
      template.baseStatPercent ||
      template.statPercent || { atk: 0, hp: 0, speed: 0 },
    ownerBonusPercent:
      template.ownerBonusPercent || { atk: 0, hp: 0, speed: 0 },
    upgradeLevel: Number(upgradeLevel || 0),
    image: template.image || "",
    owners: template.owners || [],
    description: template.description || "",
    amount: 1,
  };

  if (idx === -1) {
    list.push(payload);
    return list;
  }

  list[idx] = {
    ...list[idx],
    ...payload,
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
    .map((x) => `${x.name}${Number(x.upgradeLevel || 0) > 0 ? ` +${x.upgradeLevel}` : ""}`)
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

function sumWeaponPercents(equippedWeapons = [], cardCode = "") {
  return equippedWeapons.reduce(
    (acc, item) => {
      const ownerActive =
        Array.isArray(item.owners) && item.owners.includes(cardCode);

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

function buildConfirmRows(hostId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`unequip_confirm_${hostId}`)
        .setLabel("Unequip")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`unequip_cancel_${hostId}`)
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Success)
    ),
  ];
}

function getCardDisplayWeaponName(card) {
  return (
    card.displayWeaponName ||
    card.equippedWeaponName ||
    card.equippedWeapon ||
    formatEquippedWeaponNames(card.equippedWeapons || []) ||
    "None"
  );
}

module.exports = {
  name: "unequip",
  aliases: ["uwp", "removeweapon"],

  async execute(message, args) {
    const query = args.join(" ").trim();

    if (!query) {
      return message.reply({
        content: "Usage: `op unequip <weapon name>`",
        allowedMentions: { repliedUser: false },
      });
    }

    const player = getPlayer(message.author.id, message.author.username);
    const matches = buildEquippedWeaponMatches(player.cards || [], query);

    if (!matches.length) {
      return message.reply({
        content: "No equipped weapon matched that query.",
        allowedMentions: { repliedUser: false },
      });
    }

    const match = matches[0];
    const template = match.template;
    const equippedWeapon = match.weapon;
    const rawCard = match.rawCard;

    if (Number(player.gems || 0) < UNEQUIP_GEM_COST) {
      return message.reply({
        content: `You need **${UNEQUIP_GEM_COST} gems** to unequip **${template.name || equippedWeapon.name}**.\nCurrent gems: **${Number(player.gems || 0)}**`,
        allowedMentions: { repliedUser: false },
      });
    }

    const sent = await message.reply({
      content: `Unequip **${template.name || equippedWeapon.name}** from **${rawCard.displayName || rawCard.name}**?\nCost: **${UNEQUIP_GEM_COST} gems**`,
      components: buildConfirmRows(message.author.id),
      allowedMentions: { repliedUser: false },
    });

    const collector = sent.createMessageComponentCollector({
      time: 60_000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the command user can use these buttons.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.customId === `unequip_cancel_${message.author.id}`) {
        collector.stop("cancelled");

        return interaction.update({
          content: "Unequip cancelled.",
          embeds: [],
          components: [],
        });
      }

      if (interaction.customId !== `unequip_confirm_${message.author.id}`) return;

      let latestTemplate = null;
      let latestWeapon = null;
      let latestRawCard = null;
      let returnWeaponLevel = 0;
      let syncedCard = null;

      try {
        updatePlayerAtomic(
          message.author.id,
          (fresh) => {
            if (Number(fresh.gems || 0) < UNEQUIP_GEM_COST) {
              throw new Error(`You no longer have enough gems.\nNeed **${UNEQUIP_GEM_COST} gems**.`);
            }

            const latestMatches = buildEquippedWeaponMatches(fresh.cards || [], query);

            if (!latestMatches.length) {
              throw new Error("That weapon is no longer equipped.");
            }

            const latestMatch = latestMatches[0];
            latestTemplate = latestMatch.template;
            latestWeapon = latestMatch.weapon;
            latestRawCard = latestMatch.rawCard;

            returnWeaponLevel = getUnequipWeaponLevel(
              fresh,
              latestRawCard,
              latestWeapon,
              latestTemplate
            );

            let updatedRawCard = null;

            const updatedCards = (fresh.cards || []).map((card) => {
              if (String(card.instanceId) !== String(latestRawCard.instanceId)) {
                return card;
              }

              const currentEquipped = Array.isArray(card.equippedWeapons)
                ? card.equippedWeapons
                : [];

              const nextEquipped = currentEquipped.filter(
                (w) =>
                  normalize(w.code || w.name) !==
                  normalize(latestWeapon.code || latestWeapon.name)
              );

              const totalWeaponPercent = sumWeaponPercents(nextEquipped, card.code);
              const equippedWeaponName = formatEquippedWeaponNames(nextEquipped);

              updatedRawCard = {
                ...card,
                equippedWeapons: nextEquipped,
                equippedWeapon: equippedWeaponName,
                equippedWeaponName,
                equippedWeaponCode:
                  nextEquipped.length === 1 ? nextEquipped[0].code : null,
                equippedWeaponLevel:
                  nextEquipped.length === 1
                    ? Number(nextEquipped[0].upgradeLevel || 0)
                    : 0,
                weaponBonus: { atk: 0, hp: 0, speed: 0 },
                weaponBonusPercent: totalWeaponPercent,
              };

              return hydrateCard(updatedRawCard);
            });

            const updatedWeapons = addWeaponBackToInventory(
              fresh.weapons || [],
              latestTemplate,
              returnWeaponLevel
            );

            syncedCard =
              findOwnedCard(updatedCards, updatedRawCard?.code || latestRawCard.code) ||
              hydrateCard(updatedRawCard || latestRawCard);

            return {
              ...fresh,
              gems: Number(fresh.gems || 0) - UNEQUIP_GEM_COST,
              cards: updatedCards,
              weapons: updatedWeapons,
            };
          },
          message.author.username
        );
      } catch (error) {
        collector.stop("failed");

        return interaction.update({
          content: error.message || "Weapon unequip failed.",
          embeds: [],
          components: [],
        });
      }

      collector.stop("confirmed");

      return interaction.update({
        content: "",
        components: [],
        embeds: [
          new EmbedBuilder()
            .setColor(0xe67e22)
            .setTitle("⚔️ Weapon Unequipped")
            .setDescription(
              [
                `**Weapon:** ${latestTemplate.name || latestWeapon.name}`,
                `**Removed From:** ${syncedCard.displayName || syncedCard.name}`,
                `**Weapon Level:** +${returnWeaponLevel}`,
                `**Cost:** ${UNEQUIP_GEM_COST} gems`,
                "",
                `**ATK:** ${formatAtkRange(syncedCard.atk)}`,
                `**HP:** ${Number(syncedCard.hp || 0)}`,
                `**SPD:** ${Number(syncedCard.speed || 0)}`,
                "",
                `**Remaining Equipped Weapons:** ${getCardDisplayWeaponName(syncedCard)}`,
                "Weapon returned to your inventory.",
              ].join("\n")
            )
            .setThumbnail(getRarityBadge(latestTemplate.rarity || "B") || null)
            .setImage(getWeaponImage(latestTemplate.code, latestTemplate.image || "") || null),
        ],
      });
    });

    collector.on("end", async (_collected, reason) => {
      if (["confirmed", "cancelled", "nogems", "missing", "failed"].includes(reason)) {
        return;
      }

      try {
        await sent.edit({
          content: "Unequip request expired.",
          embeds: [],
          components: [],
        });
      } catch {}
    });
  },
};