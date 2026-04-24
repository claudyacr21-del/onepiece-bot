const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
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

    if (candidate === q) best = Math.max(best, 1000 + candidate.length);
    else if (candidate.startsWith(q)) best = Math.max(best, 700 + q.length);
    else if (candidate.includes(q)) best = Math.max(best, 400 + q.length);
    else {
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
    const equipped = Array.isArray(rawCard.equippedWeapons) ? rawCard.equippedWeapons : [];

    for (const weapon of equipped) {
      const template = findWeaponTemplate(weapon.code || weapon.name) || weapon;
      const score = scoreQuery(query, [
        weapon.name,
        weapon.code,
        template.name,
        template.code,
        template.type,
      ]);

      if (score <= 0) continue;

      matches.push({
        score,
        rawCard,
        weapon,
        template,
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
    upgradeLevel: Math.max(Number(list[idx].upgradeLevel || 0), Number(upgradeLevel || 0)),
  };

  return list;
}

function formatEquippedWeaponNames(equippedWeapons = []) {
  if (!equippedWeapons.length) return null;
  return equippedWeapons
    .map((x) => `${x.name}${Number(x.upgradeLevel || 0) > 0 ? ` +${x.upgradeLevel}` : ""}`)
    .join(", ");
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

module.exports = {
  name: "unequip",
  aliases: ["uwp", "removeweapon"],

  async execute(message, args) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("Usage: `op unequip <weapon>`");

    const player = getPlayer(message.author.id, message.author.username);
    const matches = buildEquippedWeaponMatches(player.cards || [], query);

    if (!matches.length) {
      return message.reply("No equipped weapon matched that query.");
    }

    const match = matches[0];
    const template = match.template;
    const equippedWeapon = match.weapon;
    const rawCard = match.rawCard;

    if (Number(player.gems || 0) < UNEQUIP_GEM_COST) {
      return message.reply(
        `You need **${UNEQUIP_GEM_COST} gems** to unequip **${template.name || equippedWeapon.name}**. Current gems: **${Number(player.gems || 0)}**`
      );
    }

    const sent = await message.reply({
      content: `Unequip **${template.name || equippedWeapon.name}** from **${rawCard.displayName || rawCard.name}**?\nCost: **${UNEQUIP_GEM_COST} gems**`,
      components: buildConfirmRows(message.author.id),
    });

    const collector = sent.createMessageComponentCollector({ time: 60_000 });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the command user can use these buttons.",
          ephemeral: true,
        });
      }

      if (interaction.customId === `unequip_cancel_${message.author.id}`) {
        collector.stop("cancelled");
        return interaction.update({
          content: "Unequip cancelled.",
          components: [],
        });
      }

      if (interaction.customId !== `unequip_confirm_${message.author.id}`) return;

      const latestPlayer = getPlayer(message.author.id, message.author.username);

      if (Number(latestPlayer.gems || 0) < UNEQUIP_GEM_COST) {
        collector.stop("nogems");
        return interaction.update({
          content: `You no longer have enough gems. Need **${UNEQUIP_GEM_COST} gems**.`,
          components: [],
        });
      }

      const latestMatches = buildEquippedWeaponMatches(latestPlayer.cards || [], query);
      if (!latestMatches.length) {
        collector.stop("missing");
        return interaction.update({
          content: "That weapon is no longer equipped.",
          components: [],
        });
      }

      const latestMatch = latestMatches[0];
      const latestTemplate = latestMatch.template;
      const latestWeapon = latestMatch.weapon;
      const latestRawCard = latestMatch.rawCard;

      let updatedRawCard = null;

      const updatedCards = (latestPlayer.cards || []).map((card) => {
        if (String(card.instanceId) !== String(latestRawCard.instanceId)) return card;

        const currentEquipped = Array.isArray(card.equippedWeapons) ? card.equippedWeapons : [];
        const nextEquipped = currentEquipped.filter(
          (w) => normalize(w.code || w.name) !== normalize(latestWeapon.code || latestWeapon.name)
        );

        updatedRawCard = {
          ...card,
          equippedWeapons: nextEquipped,
          equippedWeapon: nextEquipped.length ? formatEquippedWeaponNames(nextEquipped) : null,
          equippedWeaponName: nextEquipped.length ? formatEquippedWeaponNames(nextEquipped) : null,
          equippedWeaponCode: nextEquipped.length === 1 ? nextEquipped[0].code : null,
          weaponBonusPercent: { atk: 0, hp: 0, speed: 0 },
        };

        return hydrateCard(updatedRawCard);
      });

      const updatedWeapons = addWeaponBackToInventory(
        latestPlayer.weapons || [],
        latestTemplate,
        latestWeapon.upgradeLevel || 0
      );

      updatePlayer(message.author.id, {
        gems: Number(latestPlayer.gems || 0) - UNEQUIP_GEM_COST,
        cards: updatedCards,
        weapons: updatedWeapons,
      });

      const syncedCard =
        findOwnedCard(updatedCards, updatedRawCard?.code || latestRawCard.code) ||
        hydrateCard(updatedRawCard || latestRawCard);

      collector.stop("confirmed");

      return interaction.update({
        content: "",
        components: [],
        embeds: [
          new EmbedBuilder()
            .setColor(0xe67e22)
            .setTitle("🧰 Weapon Unequipped")
            .setDescription(
              [
                `**Weapon:** ${latestTemplate.name || latestWeapon.name}`,
                `**Removed From:** ${syncedCard.displayName || syncedCard.name}`,
                `**Weapon Level:** +${Number(latestWeapon.upgradeLevel || 0)}`,
                `**Cost:** ${UNEQUIP_GEM_COST} gems`,
                "",
                `**ATK:** ${formatAtkRange(syncedCard.atk)}`,
                `**HP:** ${Number(syncedCard.hp || 0)}`,
                `**SPD:** ${Number(syncedCard.speed || 0)}`,
                "",
                `**Remaining Equipped Weapons:** ${syncedCard.displayWeaponName || "None"}`,
                "Weapon returned to your inventory.",
              ].join("\n")
            )
            .setThumbnail(getRarityBadge(latestTemplate.rarity || "B") || null)
            .setImage(getWeaponImage(latestTemplate.code, latestTemplate.image || "") || null),
        ],
      });
    });

    collector.on("end", async (_collected, reason) => {
      if (["confirmed", "cancelled", "nogems", "missing"].includes(reason)) return;

      try {
        await sent.edit({
          content: "Unequip request expired.",
          components: [],
        });
      } catch {}
    });
  },
};