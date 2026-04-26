const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const {
  hydrateCard,
  findCardTemplate,
  getWeaponPower,
  getFruitPower,
} = require("../utils/evolution");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const { buildCardStyleEmbed } = require("../utils/cardView");
const {
  getCardImage,
  getWeaponImage,
  getDevilFruitImage,
  getRarityBadge,
} = require("../config/assetLinks");
const weaponsDb = require("../data/weapons");
const devilFruitsDb = require("../data/devilFruits");

const FLAT_EXP_CAP = 1000;

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/^model:\s*/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getPower(card) {
  return Number(card.currentPower || 0);
}

function getFlatExp(card) {
  return Math.max(0, Math.min(FLAT_EXP_CAP, Number(card?.exp ?? card?.xp ?? 0)));
}

function formatLevelExpLine(card) {
  return `Level: ${Number(card.level || 1)} (${getFlatExp(card)}/${FLAT_EXP_CAP})`;
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function applyBoostedDisplayStats(card, boosts = {}) {
  if (!card || String(card.cardRole || "").toLowerCase() === "boost") return card;

  return {
    ...card,
    atk: Math.floor(Number(card.atk || 0) * (1 + Number(boosts.atk || 0) / 100)),
    hp: Math.floor(Number(card.hp || 0) * (1 + Number(boosts.hp || 0) / 100)),
    speed: Math.floor(Number(card.speed || 0) * (1 + Number(boosts.spd || 0) / 100)),
  };
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
      const qWords = q.split(" ").filter(Boolean);

      if (qWords.length && qWords.every((word) => candidate.includes(word))) {
        best = Math.max(best, 250 + qWords.join("").length);
      }
    }
  }

  return best;
}

function getSafeForm(card) {
  const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
  const form = card.evolutionForms?.[stage - 1] || null;

  return {
    stage,
    name: form?.name || card.variant || card.displayName || card.name || "Unknown Card",
    badgeImage: form?.badgeImage || card.badgeImage || "",
    tier: form?.tier || card.currentTier || card.rarity || "C",
  };
}

function getStageImage(card) {
  const stage = Math.max(1, Math.min(3, Number(card.evolutionStage || 1)));
  const stageKey = `M${stage}`;

  return (
    card.evolutionForms?.[stage - 1]?.image ||
    card.stageImages?.[stageKey] ||
    getCardImage(card.code, stageKey, card.image) ||
    card.image ||
    ""
  );
}

function mergeOwnedCardWithLatestTemplate(rawCard) {
  const template = findCardTemplate(rawCard.code || rawCard.name || "");

  if (!template) return hydrateCard(rawCard);

  return hydrateCard({
    ...template,
    instanceId: rawCard.instanceId,
    ownerId: rawCard.ownerId,
    level: rawCard.level,
    xp: rawCard.xp,
    exp: rawCard.exp,
    kills: rawCard.kills,
    fragments: rawCard.fragments,
    evolutionStage: rawCard.evolutionStage,
    evolutionKey: rawCard.evolutionKey,
    currentTier: rawCard.currentTier || template.currentTier,
    rarity: rawCard.rarity || template.rarity,
    equippedWeapons: Array.isArray(rawCard.equippedWeapons)
      ? rawCard.equippedWeapons
      : [],
    equippedWeapon: rawCard.equippedWeapon || null,
    equippedWeaponName: rawCard.equippedWeaponName || null,
    equippedWeaponCode: rawCard.equippedWeaponCode || null,
    equippedWeaponLevel: rawCard.equippedWeaponLevel || 0,
    equippedDevilFruit: rawCard.equippedDevilFruit || null,
    equippedDevilFruitName: rawCard.equippedDevilFruitName || null,
    cardRole: rawCard.cardRole || template.cardRole,
  });
}

function getFragmentAmount(player, target) {
  const code = normalize(target?.code);
  const name = normalize(target?.displayName || target?.name);
  const fragments = Array.isArray(player?.fragments) ? player.fragments : [];

  const found = fragments.find((entry) => {
    const entryCode = normalize(entry.code);
    const entryName = normalize(entry.name || entry.displayName);

    return (
      (code && entryCode && entryCode === code) ||
      (name && entryName && entryName === name) ||
      (code && entryName && entryName === code) ||
      (name && entryCode && entryCode === name)
    );
  });

  return Math.max(0, Number(found?.amount || 0));
}

function getOwnerSignature(item) {
  const owners = Array.isArray(item?.owners) ? item.owners.filter(Boolean) : [];

  if (owners.length) return owners.join(", ");
  if (item?.ownerSignature) return String(item.ownerSignature);
  if (item?.signature) return String(item.signature);
  if (item?.owner) return String(item.owner);

  return "None";
}

function buildViewerEmbed(ownerName, player, card, index, total, label = "Collection") {
  const form = getSafeForm(card);
  const stageImage = getStageImage(card);
  const atkRange = formatAtkRange(card.atk);
  const syncedFragments = getFragmentAmount(player, card);

  const extraLines =
    card.cardRole === "boost"
      ? [
          `Form: ${card.evolutionKey || `M${form.stage}`}`,
          `Tier: ${card.currentTier || card.rarity || "C"}`,
          `Power: ${getPower(card)}`,
          `Effect: ${card.effectText || "No effect text"}`,
          `Target: ${card.boostTarget || "team"}`,
          `Boost Type: ${card.boostType || "unknown"}`,
          `Fragments: ${syncedFragments}`,
        ]
      : [
          `Form: ${card.evolutionKey || `M${form.stage}`}`,
          `Tier: ${card.currentTier || card.rarity || "C"}`,
          formatLevelExpLine(card),
          `Power: ${getPower(card)}`,
          `Health: ${card.hp || 0}`,
          `Speed: ${card.speed || 0}`,
          `Attack: ${atkRange}`,
          `Weapons: ${card.displayWeaponName || "None"}`,
          `Devil Fruit: ${card.displayFruitName || "None"}`,
          `Type: ${card.type || card.cardRole || "Unknown"}`,
          `Kills: ${card.kills || 0}`,
          `Fragments: ${syncedFragments}`,
        ];

  return buildCardStyleEmbed({
    color: card.cardRole === "boost" ? 0x9b59b6 : 0x3498db,
    ownerName,
    card,
    badgeImage: form.badgeImage,
    image: stageImage,
    formName: form.name,
    tier: form.tier,
    footerText: `${label} ${index + 1}/${total} • This card belongs to ${ownerName}`,
    extraLines,
  });
}

function buildRows(index, total, prevId = "mc_prev", nextId = "mc_next") {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(prevId)
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index <= 0),
      new ButtonBuilder()
        .setCustomId(nextId)
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index >= total - 1)
    ),
  ];
}

function dedupeCollection(cards) {
  const map = new Map();

  for (const card of cards) {
    const key = String(card.code || "").toLowerCase();
    if (!key) continue;

    const existing = map.get(key);

    if (!existing) {
      map.set(key, card);
      continue;
    }

    if (getPower(card) > getPower(existing)) {
      map.set(key, card);
      continue;
    }

    if (
      getPower(card) === getPower(existing) &&
      Number(card.evolutionStage || 1) > Number(existing.evolutionStage || 1)
    ) {
      map.set(key, card);
    }
  }

  return [...map.values()];
}

function buildTextLines(cards) {
  const uniqueCards = dedupeCollection(cards);

  return uniqueCards.map((card, i) => {
    const rarity = String(card.currentTier || card.rarity || "C").toUpperCase();
    const name = card.displayName || card.name || "Unknown Card";
    const stage = card.evolutionKey || `M${card.evolutionStage || 1}`;
    const power = getPower(card);
    const level = Number(card.level || 1);
    const exp = getFlatExp(card);

    if (card.cardRole === "boost") {
      return [
        `${i + 1}. **${name}** | ${stage} | ${power}`,
        `${card.effectText || "No effect text"} | ${rarity}`,
      ].join("\n");
    }

    const currentHp = Number(card.hp || 0);
    const currentSpd = Number(card.speed || 0);
    const atkRange = formatAtkRange(card.atk);

    return [
      `${i + 1}. **${name}** | ${stage} | ${power} | ${currentHp}/${currentHp} | ${currentSpd} | ${atkRange}`,
      `${rarity} | Lv.${level} (${exp}/${FLAT_EXP_CAP})`,
    ].join("\n");
  });
}

function buildTextPageEmbed(ownerName, lines, pageIndex, pageSize = 10) {
  const start = pageIndex * pageSize;
  const pageLines = lines.slice(start, start + pageSize);

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`${ownerName}'s Card Collection`)
    .setDescription(pageLines.join("\n\n"))
    .setFooter({
      text: `Showing ${start + 1}-${Math.min(start + pageSize, lines.length)} of ${lines.length} unique entries`,
    });
}

function buildTextRows(pageIndex, totalPages) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("mc_text_prev")
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex <= 0),
      new ButtonBuilder()
        .setCustomId("mc_text_next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex >= totalPages - 1)
    ),
  ];
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

function findFruitTemplate(value) {
  const q = normalize(value);
  if (!q) return null;

  return (
    devilFruitsDb.find((item) => normalize(item.code) === q) ||
    devilFruitsDb.find((item) => normalize(item.name) === q) ||
    devilFruitsDb.find((item) => normalize(item.code).includes(q)) ||
    devilFruitsDb.find((item) => normalize(item.name).includes(q)) ||
    null
  );
}

function getWeaponPercentAtLevel(basePercent, level) {
  const lv = Math.max(0, Number(level || 0));

  return {
    atk: Number(basePercent?.atk || 0) + lv * 1,
    hp: Number(basePercent?.hp || 0) + lv * 1,
    speed: Number(basePercent?.speed || 0),
  };
}

function buildOwnedWeaponCollection(player) {
  const pool = new Map();

  for (const entry of Array.isArray(player.weapons) ? player.weapons : []) {
    const template = findWeaponTemplate(entry.code || entry.name);
    if (!template) continue;

    const key = String(template.code);
    const existing =
      pool.get(key) || {
        ...template,
        amount: 0,
        equippedOn: [],
        bestUpgradeLevel: 0,
      };

    existing.amount += Math.max(1, Number(entry.amount || 1));
    existing.bestUpgradeLevel = Math.max(
      existing.bestUpgradeLevel,
      Number(entry.upgradeLevel || 0)
    );

    pool.set(key, existing);
  }

  for (const rawCard of Array.isArray(player.cards) ? player.cards : []) {
    const equipped = Array.isArray(rawCard.equippedWeapons)
      ? rawCard.equippedWeapons
      : [];

    for (const entry of equipped) {
      const template = findWeaponTemplate(entry.code || entry.name);
      if (!template) continue;

      const key = String(template.code);
      const existing =
        pool.get(key) || {
          ...template,
          amount: 0,
          equippedOn: [],
          bestUpgradeLevel: 0,
        };

      existing.equippedOn.push(rawCard.displayName || rawCard.name || rawCard.code);
      existing.bestUpgradeLevel = Math.max(
        existing.bestUpgradeLevel,
        Number(entry.upgradeLevel || 0)
      );

      pool.set(key, existing);
    }
  }

  return [...pool.values()].sort((a, b) => {
    const powerDiff =
      Number(getWeaponPower(b, b.bestUpgradeLevel || 0) || 0) -
      Number(getWeaponPower(a, a.bestUpgradeLevel || 0) || 0);

    if (powerDiff !== 0) return powerDiff;

    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function buildOwnedFruitCollection(player) {
  const pool = new Map();

  for (const entry of Array.isArray(player.devilFruits) ? player.devilFruits : []) {
    const template = findFruitTemplate(entry.code || entry.name);
    if (!template) continue;

    const key = String(template.code);
    const existing = pool.get(key) || {
      ...template,
      amount: 0,
      equippedOn: [],
    };

    existing.amount += Math.max(1, Number(entry.amount || 1));

    pool.set(key, existing);
  }

  for (const rawCard of Array.isArray(player.cards) ? player.cards : []) {
    if (!rawCard.equippedDevilFruit) continue;

    const template = findFruitTemplate(
      rawCard.equippedDevilFruitName || rawCard.equippedDevilFruit
    );

    if (!template) continue;

    const key = String(template.code);
    const existing = pool.get(key) || {
      ...template,
      amount: 0,
      equippedOn: [],
    };

    existing.equippedOn.push(rawCard.displayName || rawCard.name || rawCard.code);

    pool.set(key, existing);
  }

  return [...pool.values()].sort((a, b) => {
    const powerDiff = Number(getFruitPower(b) || 0) - Number(getFruitPower(a) || 0);
    if (powerDiff !== 0) return powerDiff;

    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function findOwnedWeapon(player, query) {
  const pool = buildOwnedWeaponCollection(player);
  const scored = pool
    .map((weapon) => ({
      weapon,
      score: scoreQuery(query, [weapon.name, weapon.code, weapon.type]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].weapon : null;
}

function findOwnedFruit(player, query) {
  const pool = buildOwnedFruitCollection(player);
  const scored = pool
    .map((fruit) => ({
      fruit,
      score: scoreQuery(query, [fruit.name, fruit.code, fruit.type]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].fruit : null;
}

function findOwnedCardByQuery(cards, query) {
  const scored = cards
    .map((card) => ({
      card,
      score: scoreQuery(query, [
        card.name,
        card.displayName,
        card.code,
        card.variant,
        card.type,
      ]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].card : null;
}

function buildWeaponEmbed(ownerName, player, weapon, index = 0, total = 1) {
  const percent = getWeaponPercentAtLevel(
    weapon.statPercent || weapon.statBonus || { atk: 0, hp: 0, speed: 0 },
    weapon.bestUpgradeLevel || 0
  );

  const equippedText =
    Array.isArray(weapon.equippedOn) && weapon.equippedOn.length
      ? weapon.equippedOn.join(", ")
      : "Not equipped";

  const fragments = getFragmentAmount(player, weapon);

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`${ownerName}'s Weapon`)
    .setDescription(
      [
        `**${weapon.name}**`,
        `${weapon.type || "Weapon"}`,
        "",
        `Rarity: ${String(weapon.rarity || "B").toUpperCase()}`,
        `Power: ${Number(getWeaponPower(weapon, weapon.bestUpgradeLevel || 0) || 0)}`,
        `ATK: +${Number(percent.atk || 0)}%`,
        `HP: +${Number(percent.hp || 0)}%`,
        `SPD: +${Number(percent.speed || 0)}%`,
        `Owner Signature: ${getOwnerSignature(weapon)}`,
        `Best Upgrade: +${Math.max(0, Number(weapon.bestUpgradeLevel || 0))}`,
        `Equipped On: ${equippedText}`,
        "",
        `${weapon.description || "No description."}`,
        "",
        `Fragment: ${fragments}`,
      ].join("\n")
    )
    .setThumbnail(getRarityBadge(weapon.rarity || "B") || null)
    .setImage(getWeaponImage(weapon.code, weapon.image || "") || null)
    .setFooter({
      text: `Weapon Collection ${index + 1}/${total} • This weapon belongs to ${ownerName}`,
    });
}

function buildFruitEmbed(ownerName, player, fruit) {
  const percent = fruit.statPercent || fruit.statBonus || {
    atk: 0,
    hp: 0,
    speed: 0,
  };

  const equippedText =
    Array.isArray(fruit.equippedOn) && fruit.equippedOn.length
      ? fruit.equippedOn.join(", ")
      : "Not equipped";

  const fragments = getFragmentAmount(player, fruit);

  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`${ownerName}'s Devil Fruit`)
    .setDescription(
      [
        `**${fruit.name}**`,
        `${fruit.type || "Devil Fruit"}`,
        "",
        `Rarity: ${String(fruit.rarity || "B").toUpperCase()}`,
        `Power: ${Number(getFruitPower(fruit) || 0)}`,
        `ATK: +${Number(percent.atk || 0)}%`,
        `HP: +${Number(percent.hp || 0)}%`,
        `SPD: +${Number(percent.speed || 0)}%`,
        `Owner Signature: ${getOwnerSignature(fruit)}`,
        `Equipped On: ${equippedText}`,
        "",
        `${fruit.description || "No description."}`,
        "",
        `Fragment: ${fragments}`,
      ].join("\n")
    )
    .setThumbnail(getRarityBadge(fruit.rarity || "B") || null)
    .setImage(getDevilFruitImage(fruit.code, fruit.image || "") || null)
    .setFooter({
      text: `Devil Fruit Info • This fruit belongs to ${ownerName}`,
    });
}

module.exports = {
  name: "mc",
  aliases: ["mycards"],

  async execute(message, args) {
    const player = getPlayer(message.author.id, message.author.username);
    const boosts = getPassiveBoostSummary(player);
    const sub1 = String(args?.[0] || "").toLowerCase();
    const query = args.join(" ").trim();

    const cards = (player.cards || [])
      .map(mergeOwnedCardWithLatestTemplate)
      .filter(Boolean)
      .map((card) => applyBoostedDisplayStats(card, boosts));

    if (sub1 === "weapon") {
      const weapons = buildOwnedWeaponCollection(player);

      if (!weapons.length) {
        return message.reply("You do not own any weapons yet.");
      }

      let index = 0;

      const sent = await message.reply({
        embeds: [buildWeaponEmbed(message.author.username, player, weapons[index], index, weapons.length)],
        components: buildRows(index, weapons.length, "mc_weapon_prev", "mc_weapon_next"),
      });

      const collector = sent.createMessageComponentCollector({
        time: 10 * 60 * 1000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== message.author.id) {
          return i.reply({
            content: "Only you can control this weapon viewer.",
            ephemeral: true,
          });
        }

        if (i.customId === "mc_weapon_prev") index = Math.max(0, index - 1);
        if (i.customId === "mc_weapon_next") index = Math.min(weapons.length - 1, index + 1);

        return i.update({
          embeds: [buildWeaponEmbed(message.author.username, player, weapons[index], index, weapons.length)],
          components: buildRows(index, weapons.length, "mc_weapon_prev", "mc_weapon_next"),
        });
      });

      collector.on("end", async () => {
        try {
          await sent.edit({ components: [] });
        } catch {}
      });

      return;
    }

    if (query && sub1 !== "text" && sub1 !== "boost") {
      const ownedWeapon = findOwnedWeapon(player, query);

      if (ownedWeapon) {
        return message.reply({
          embeds: [buildWeaponEmbed(message.author.username, player, ownedWeapon)],
        });
      }

      const ownedFruit = findOwnedFruit(player, query);

      if (ownedFruit) {
        return message.reply({
          embeds: [buildFruitEmbed(message.author.username, player, ownedFruit)],
        });
      }

      const ownedCard = findOwnedCardByQuery(cards, query);

      if (ownedCard) {
        return message.reply({
          embeds: [buildViewerEmbed(message.author.username, player, ownedCard, 0, 1, "Card Info")],
        });
      }

      return message.reply("You do not own that card, devil fruit, or weapon.");
    }

    if (!cards.length) {
      return message.reply("You do not own any cards yet.");
    }

    let working = [...cards];
    let title = "Card Collection";

    if (sub1 === "boost") {
      working = working.filter((card) => card.cardRole === "boost");
      title = "Boost Collection";
    } else {
      working = working.filter((card) => card.cardRole !== "boost");
      title = "Card Collection";
    }

    if (!working.length) {
      return message.reply(
        sub1 === "boost" ? "You do not own any boost cards yet." : "You do not own any cards yet."
      );
    }

    working.sort((a, b) => {
      const powerDiff = getPower(b) - getPower(a);
      if (powerDiff !== 0) return powerDiff;

      return String(a.displayName || a.name).localeCompare(
        String(b.displayName || b.name)
      );
    });

    if (sub1 === "text") {
      const lines = buildTextLines(working);
      const pageSize = 10;
      const totalPages = Math.max(1, Math.ceil(lines.length / pageSize));
      let pageIndex = 0;

      const sent = await message.reply({
        embeds: [buildTextPageEmbed(message.author.username, lines, pageIndex, pageSize)],
        components: buildTextRows(pageIndex, totalPages),
      });

      const collector = sent.createMessageComponentCollector({
        time: 10 * 60 * 1000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== message.author.id) {
          return i.reply({
            content: "Only you can control this text viewer.",
            ephemeral: true,
          });
        }

        if (i.customId === "mc_text_prev") pageIndex = Math.max(0, pageIndex - 1);
        if (i.customId === "mc_text_next") pageIndex = Math.min(totalPages - 1, pageIndex + 1);

        return i.update({
          embeds: [buildTextPageEmbed(message.author.username, lines, pageIndex, pageSize)],
          components: buildTextRows(pageIndex, totalPages),
        });
      });

      collector.on("end", async () => {
        try {
          await sent.edit({ components: [] });
        } catch {}
      });

      return;
    }

    let index = 0;

    const sent = await message.reply({
      embeds: [
        buildViewerEmbed(
          message.author.username,
          player,
          working[index],
          index,
          working.length,
          title
        ),
      ],
      components: buildRows(index, working.length),
    });

    const collector = sent.createMessageComponentCollector({
      time: 10 * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({
          content: "Only you can control this card viewer.",
          ephemeral: true,
        });
      }

      if (i.customId === "mc_prev") index = Math.max(0, index - 1);
      if (i.customId === "mc_next") index = Math.min(working.length - 1, index + 1);

      return i.update({
        embeds: [
          buildViewerEmbed(
            message.author.username,
            player,
            working[index],
            index,
            working.length,
            title
          ),
        ],
        components: buildRows(index, working.length),
      });
    });

    collector.on("end", async () => {
      try {
        await sent.edit({ components: [] });
      } catch {}
    });
  },
};