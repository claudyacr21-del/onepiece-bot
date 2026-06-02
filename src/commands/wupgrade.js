const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const { getPlayer, updatePlayerAtomic } = require("../playerStore");
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

function getWeaponFragmentCost(nextLevel) {
  const table = {
    1: 5,
    2: 10,
    3: 15,
    4: 20,
    5: 25,
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

function getWeaponFragmentCode(template) {
  return `weapon_fragment_${String(template?.code || "").toLowerCase()}`;
}

function getWeaponFragmentAmount(fragments, template) {
  const fragmentCode = normalize(getWeaponFragmentCode(template));
  const weaponCode = normalize(template?.code);
  const weaponName = normalize(template?.name);

  const found = (Array.isArray(fragments) ? fragments : []).find((entry) => {
    const entryCode = normalize(entry.code);
    const entryName = normalize(entry.name || entry.displayName);
    const entryWeaponCode = normalize(entry.weaponCode);

    return (
      entryCode === fragmentCode ||
      entryWeaponCode === weaponCode ||
      entryName === normalize(`${template.name} Fragment`) ||
      entryName === weaponName
    );
  });

  return Math.max(0, Number(found?.amount || 0));
}

function consumeWeaponFragments(fragments, template, amount) {
  const arr = [...(Array.isArray(fragments) ? fragments : [])];
  const fragmentCode = normalize(getWeaponFragmentCode(template));
  const weaponCode = normalize(template?.code);
  const weaponName = normalize(template?.name);

  const idx = arr.findIndex((entry) => {
    const entryCode = normalize(entry.code);
    const entryName = normalize(entry.name || entry.displayName);
    const entryWeaponCode = normalize(entry.weaponCode);

    return (
      entryCode === fragmentCode ||
      entryWeaponCode === weaponCode ||
      entryName === normalize(`${template.name} Fragment`) ||
      entryName === weaponName
    );
  });

  if (idx === -1) {
    throw new Error(`${template.name} Fragment not found.`);
  }

  const current = Number(arr[idx].amount || 0);

  if (current < amount) {
    throw new Error(`You need ${amount} ${template.name} Fragment.`);
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

function buildUpgradeConfirmRows(userId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`wupgrade_confirm_${userId}`)
        .setLabel("Upgrade")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`wupgrade_cancel_${userId}`)
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

function buildUpgradeConfirmEmbed({
  template,
  currentLevel,
  nextLevel,
  stoneCost,
  fragmentCost,
  currentStone,
  currentFragment,
  shownPercent,
  equippedOwners,
}) {
  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("⚒️ Confirm Weapon Upgrade")
    .setDescription(
      [
        `**Weapon:** ${template.name}`,
        `**Current Level:** +${currentLevel}`,
        `**Next Level:** +${nextLevel}`,
        `**Cost:** ${stoneCost} Enhancement Stones + ${fragmentCost} ${template.name} Fragment`,
        `**Your Stones:** ${currentStone}`,
        `**Your Fragments:** ${currentFragment}`,
        "",
        "**Weapon Percent After Upgrade**",
        `ATK: +${shownPercent.atk}%`,
        `HP: +${shownPercent.hp}%`,
        `SPD: +${shownPercent.speed}%`,
        "",
        `**Equipped On:** ${equippedOwners.length ? equippedOwners.join(", ") : "Not equipped"}`,
        "",
        "Press **Upgrade** to confirm or **Cancel** to stop.",
      ].join("\n")
    );
}

module.exports = {
  name: "wupgrade",
  aliases: ["weaponupgrade", "upweapon"],

  async execute(message, args) {
    const weaponQuery = args.join(" ").trim();

    if (!weaponQuery) {
      return message.reply({
        content: "Usage: `op wupgrade <weapon>`",
        allowedMentions: { repliedUser: false },
      });
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
    const fragmentCost = getWeaponFragmentCost(nextLevel);

    if (!stoneCost || !fragmentCost) {
      return message.reply("This weapon already reached max upgrade level.");
    }

    const currentStone = getStoneAmount(player.materials || []);
    const currentFragment = getWeaponFragmentAmount(player.fragments || [], template);

    if (currentStone < stoneCost || currentFragment < fragmentCost) {
      return message.reply(
        [
          `You need these materials to upgrade **${template.name}** to **+${nextLevel}**:`,
          `• Enhancement Stone: **${currentStone}/${stoneCost}**`,
          `• ${template.name} Fragment: **${currentFragment}/${fragmentCost}**`,
        ].join("\n")
      );
    }

    const shownPercent = getWeaponPercentAtLevel(
      template.statPercent || {
        atk: 0,
        hp: 0,
        speed: 0,
      },
      nextLevel
    );

    const equippedOwners = getEquippedOwners(player.cards || [], template.code);

    const confirmMessage = await message.reply({
      embeds: [
        buildUpgradeConfirmEmbed({
          template,
          currentLevel,
          nextLevel,
          stoneCost,
          fragmentCost,
          currentStone,
          currentFragment,
          shownPercent,
          equippedOwners,
        }),
      ],
      components: buildUpgradeConfirmRows(message.author.id),
    });

    const collector = confirmMessage.createMessageComponentCollector({
      time: 60_000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the command user can confirm this weapon upgrade.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.customId === `wupgrade_cancel_${message.author.id}`) {
        collector.stop("cancelled");

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x95a5a6)
              .setTitle("Weapon Upgrade Cancelled")
              .setDescription("No Enhancement Stones were consumed."),
          ],
          components: [],
        });
      }

      if (interaction.customId !== `wupgrade_confirm_${message.author.id}`) return;

      let freshTemplate = null;
      let freshNextLevel = 0;
      let freshStoneCost = 0;
      let freshFragmentCost = 0;
      let updatedCards = [];
      let freshShownPercent = null;
      let freshEquippedOwners = [];

      try {
        updatePlayerAtomic(
          message.author.id,
          (fresh) => {
            const freshMatch = findOwnedOrEquippedWeapon(fresh, weaponQuery);

            if (!freshMatch || !freshMatch.template) {
              throw new Error("That weapon was no longer found in your inventory or equipped cards.");
            }

            freshTemplate = freshMatch.template;

            const freshCurrentLevel = Number(freshMatch.currentLevel || 0);
            freshNextLevel = freshCurrentLevel + 1;
            freshStoneCost = getStoneCost(freshNextLevel);
            freshFragmentCost = getWeaponFragmentCost(freshNextLevel);

            if (!freshStoneCost || !freshFragmentCost) {
              throw new Error("This weapon already reached max upgrade level.");
            }

            const freshStone = getStoneAmount(fresh.materials || []);
            const freshFragment = getWeaponFragmentAmount(fresh.fragments || [], freshTemplate);

            if (freshStone < freshStoneCost || freshFragment < freshFragmentCost) {
              throw new Error(
                [
                  `You need these materials to upgrade **${freshTemplate.name}** to **+${freshNextLevel}**:`,
                  `• Enhancement Stone: **${freshStone}/${freshStoneCost}**`,
                  `• ${freshTemplate.name} Fragment: **${freshFragment}/${freshFragmentCost}**`,
                ].join("\n")
              );
            }

            const updatedMaterials = consumeStones(fresh.materials || [], freshStoneCost);
            const updatedFragments = consumeWeaponFragments(
              fresh.fragments || [],
              freshTemplate,
              freshFragmentCost
            );
            const updatedWeapons = updateInventoryWeaponLevels(
              fresh.weapons || [],
              freshTemplate,
              freshNextLevel
            );

            updatedCards = syncEquippedWeaponLevels(
              fresh.cards || [],
              freshTemplate,
              freshNextLevel
            );

            const updatedQuests = incrementQuestPayload(fresh, "weaponUpgrades", 1);

            freshShownPercent = getWeaponPercentAtLevel(
              freshTemplate.statPercent || { atk: 0, hp: 0, speed: 0 },
              freshNextLevel
            );

            freshEquippedOwners = getEquippedOwners(updatedCards, freshTemplate.code);

            return {
              ...fresh,
              weapons: updatedWeapons,
              cards: updatedCards,
              materials: updatedMaterials,
              fragments: updatedFragments,
              quests: updatedQuests,
            };
          },
          message.author.username
        );
      } catch (error) {
        collector.stop("failed");

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("Weapon Upgrade Failed")
              .setDescription(error.message || "Weapon upgrade failed."),
          ],
          components: [],
        });
      }

      collector.stop("confirmed");

      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("🗡️ Weapon Upgrade Success")
            .setDescription(
              [
                `**Weapon:** ${freshTemplate.name}`,
                `**Weapon Level:** +${freshNextLevel}`,
                `**Cost:** ${freshStoneCost} Enhancement Stones + ${freshFragmentCost} ${freshTemplate.name} Fragment`,
                "",
                "**Weapon Percent Now**",
                `ATK: +${freshShownPercent.atk}%`,
                `HP: +${freshShownPercent.hp}%`,
                `SPD: +${freshShownPercent.speed}%`,
                "",
                `**Equipped On:** ${
                  freshEquippedOwners.length
                    ? freshEquippedOwners.join(", ")
                    : "Not equipped"
                }`,
              ].join("\n")
            ),
        ],
        components: [],
      });
    });

    collector.on("end", async (_collected, reason) => {
      if (["confirmed", "cancelled", "missing", "max", "nostone", "failed"].includes(reason)) {
        return;
      }

      try {
        await confirmMessage.edit({
          embeds: [
            new EmbedBuilder()
              .setColor(0x95a5a6)
              .setTitle("Weapon Upgrade Expired")
              .setDescription("No materials were consumed."),
          ],
          components: [],
        });
      } catch {}
    });
  },
};