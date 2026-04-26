const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const { hydrateCard, getWeaponPower } = require("../utils/evolution");
const { buildCardStyleEmbed } = require("../utils/cardView");
const {
  getCardImage,
  getWeaponImage,
  getRarityBadge,
} = require("../config/assetLinks");
const { formatCardLevelLine, getCardExpProgress } = require("../utils/cardExp");
const weaponsDb = require("../data/weapons");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getPower(card) {
  return Number(card.currentPower || 0);
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
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

function buildViewerEmbed(ownerName, card, index, total, label = "Card Collection") {
  const form = getSafeForm(card);
  const stageImage = getStageImage(card);

  const extraLines =
    card.cardRole === "boost"
      ? [
          `Form: ${card.evolutionKey || `M${form.stage}`}`,
          `Tier: ${card.currentTier || card.rarity || "C"}`,
          `Power: ${getPower(card)}`,
          `Effect: ${card.effectText || "No effect text"}`,
          `Target: ${card.boostTarget || "team"}`,
          `Boost Type: ${card.boostType || "unknown"}`,
          `Fragments: ${card.fragments || 0}`,
        ]
      : [
          `Form: ${card.evolutionKey || `M${form.stage}`}`,
          `Tier: ${card.currentTier || card.rarity || "C"}`,
          formatCardLevelLine(card),
          `Power: ${getPower(card)}`,
          `Health: ${card.hp || 0}`,
          `Speed: ${card.speed || 0}`,
          `Attack: ${formatAtkRange(card.atk)}`,
          `Weapons: ${card.displayWeaponName || "None"}`,
          `Devil Fruit: ${card.displayFruitName || "None"}`,
          `Type: ${card.type || card.cardRole || "Unknown"}`,
          `Kills: ${card.kills || 0}`,
          `Fragments: ${card.fragments || 0}`,
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

function buildRows(prevId, nextId, index, total) {
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

function buildCardTextLines(cards) {
  const uniqueCards = dedupeCollection(cards);

  return uniqueCards.map((card, i) => {
    const rarity = String(card.currentTier || card.rarity || "C").toUpperCase();
    const name = card.displayName || card.name || "Unknown Card";
    const stage = card.evolutionKey || `M${card.evolutionStage || 1}`;
    const power = getPower(card);

    if (card.cardRole === "boost") {
      return [
        `${i + 1}. **${name}** | ${stage} | ${power}`,
        `${card.effectText || "No effect text"} | ${rarity}`,
      ].join("\n");
    }

    const currentHp = Number(card.hp || 0);
    const currentSpd = Number(card.speed || 0);
    const atkRange = formatAtkRange(card.atk);
    const expProgress = getCardExpProgress(card);

    return [
      `${i + 1}. **${name}** | ${stage} | ${power} | ${currentHp}/${currentHp} | ${currentSpd} | ${atkRange}`,
      `${rarity} | Lv.${expProgress.level} (${expProgress.exp}/1000)`,
    ].join("\n");
  });
}

function buildTextPageEmbed(ownerName, title, lines, pageIndex, pageSize = 10) {
  const start = pageIndex * pageSize;
  const pageLines = lines.slice(start, start + pageSize);

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`${ownerName}'s ${title}`)
    .setDescription(pageLines.join("\n\n"))
    .setFooter({
      text: `Showing ${start + 1}-${Math.min(start + pageSize, lines.length)} of ${lines.length} unique entries`,
    });
}

function buildTextRows(pageIndex, totalPages, prevId = "mc_text_prev", nextId = "mc_text_next") {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(prevId)
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex <= 0),
      new ButtonBuilder()
        .setCustomId(nextId)
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

function buildWeaponEmbed(ownerName, weapon, index, total) {
  const percent = getWeaponPercentAtLevel(
    weapon.statPercent || weapon.statBonus || { atk: 0, hp: 0, speed: 0 },
    weapon.bestUpgradeLevel || 0
  );

  const equippedText =
    Array.isArray(weapon.equippedOn) && weapon.equippedOn.length
      ? weapon.equippedOn.join(", ")
      : "Not equipped";

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
        `Owned Amount: ${Math.max(0, Number(weapon.amount || 0))}`,
        `Best Upgrade: +${Math.max(0, Number(weapon.bestUpgradeLevel || 0))}`,
        `Equipped On: ${equippedText}`,
        "",
        `${weapon.description || "No description."}`,
      ].join("\n")
    )
    .setThumbnail(getRarityBadge(weapon.rarity || "B") || null)
    .setImage(getWeaponImage(weapon.code, weapon.image || "") || null)
    .setFooter({
      text: `Weapon Collection ${index + 1}/${total} • This weapon belongs to ${ownerName}`,
    });
}

function buildWeaponTextLines(weapons) {
  return weapons.map((weapon, i) => {
    const percent = getWeaponPercentAtLevel(
      weapon.statPercent || weapon.statBonus || { atk: 0, hp: 0, speed: 0 },
      weapon.bestUpgradeLevel || 0
    );

    return [
      `${i + 1}. **${weapon.name}** | ${String(weapon.rarity || "B").toUpperCase()} | ${Number(
        getWeaponPower(weapon, weapon.bestUpgradeLevel || 0) || 0
      )}`,
      `+${Number(percent.atk || 0)}% ATK | +${Number(percent.hp || 0)}% HP | +${Number(
        percent.speed || 0
      )}% SPD | x${Math.max(0, Number(weapon.amount || 0))} | +${Math.max(
        0,
        Number(weapon.bestUpgradeLevel || 0)
      )}`,
    ].join("\n");
  });
}

module.exports = {
  name: "mc",
  aliases: ["mycards"],

  async execute(message, args) {
    const player = getPlayer(message.author.id, message.author.username);
    const cards = (player.cards || []).map(hydrateCard).filter(Boolean);

    const sub1 = String(args?.[0] || "").toLowerCase();
    const sub2 = String(args?.[1] || "").toLowerCase();

    if (sub1 === "weapon") {
      const weapons = buildOwnedWeaponCollection(player);

      if (!weapons.length) {
        return message.reply("You do not own any weapons yet.");
      }

      const wantsText = sub2 === "text";

      if (wantsText) {
        const lines = buildWeaponTextLines(weapons);
        const pageSize = 10;
        const totalPages = Math.max(1, Math.ceil(lines.length / pageSize));
        let pageIndex = 0;

        const sent = await message.reply({
          embeds: [
            buildTextPageEmbed(
              message.author.username,
              "Weapon Collection",
              lines,
              pageIndex,
              pageSize
            ),
          ],
          components: buildTextRows(pageIndex, totalPages, "mc_weapon_text_prev", "mc_weapon_text_next"),
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

          if (i.customId === "mc_weapon_text_prev") pageIndex = Math.max(0, pageIndex - 1);
          if (i.customId === "mc_weapon_text_next")
            pageIndex = Math.min(totalPages - 1, pageIndex + 1);

          return i.update({
            embeds: [
              buildTextPageEmbed(
                message.author.username,
                "Weapon Collection",
                lines,
                pageIndex,
                pageSize
              ),
            ],
            components: buildTextRows(pageIndex, totalPages, "mc_weapon_text_prev", "mc_weapon_text_next"),
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
        embeds: [buildWeaponEmbed(message.author.username, weapons[index], index, weapons.length)],
        components: buildRows("mc_weapon_prev", "mc_weapon_next", index, weapons.length),
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
          embeds: [buildWeaponEmbed(message.author.username, weapons[index], index, weapons.length)],
          components: buildRows("mc_weapon_prev", "mc_weapon_next", index, weapons.length),
        });
      });

      collector.on("end", async () => {
        try {
          await sent.edit({ components: [] });
        } catch {}
      });

      return;
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

    const wantsText = sub1 === "text" || sub2 === "text";

    if (wantsText) {
      const lines = buildCardTextLines(working);
      const pageSize = 10;
      const totalPages = Math.max(1, Math.ceil(lines.length / pageSize));
      let pageIndex = 0;

      const sent = await message.reply({
        embeds: [buildTextPageEmbed(message.author.username, title, lines, pageIndex, pageSize)],
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
          embeds: [buildTextPageEmbed(message.author.username, title, lines, pageIndex, pageSize)],
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
          working[index],
          index,
          working.length,
          title
        ),
      ],
      components: buildRows("mc_prev", "mc_next", index, working.length),
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
            working[index],
            index,
            working.length,
            title
          ),
        ],
        components: buildRows("mc_prev", "mc_next", index, working.length),
      });
    });

    collector.on("end", async () => {
      try {
        await sent.edit({ components: [] });
      } catch {}
    });
  },
};