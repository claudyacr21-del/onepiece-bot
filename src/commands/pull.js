const { EmbedBuilder } = require("discord.js");
const { getPlayer, updatePlayer, readPlayers, writePlayers } = require("../playerStore");
const { createOwnedCard } = require("../utils/evolution");
const rawCards = require("../data/cards");
const rawWeapons = require("../data/weapons");
const rawDevilFruits = require("../data/devilFruits");
const { applyGlobalPullReset } = require("../utils/pullReset");
const { applyAutoLevelForDuplicate } = require("../utils/autoLevel");
const {
  addFragmentWithAutoSac,
} = require("../utils/autoSac");
const {
  getNextAvailablePullKey,
  consumePullSlot,
  getTotalPullUsage,
  buildPullAccessSnapshot,
} = require("../utils/pullSlots");
const {
  rollStandardBaseTier,
  rollStandardContentType,
  rollStandardDevilFruitTier,
  rollPremiumBaseTier,
  rollPremiumContentType,
  rollPremiumDevilFruitTier,
  rollVivreBaseTier,
  rollVivreContentType,
  rollVivreDevilFruitTier,
} = require("../utils/pullRates");

const { getPremiumTier } = require("../utils/premiumAccess");
const { incrementQuestCounter } = require("../utils/questProgress");
const {
  getCardImage,
  getWeaponImage,
  getDevilFruitImage,
  getRarityBadge,
} = require("../config/assetLinks");

const PREMIUM_PITY_TARGET = 100;
const VIVRE_PITY_TARGET = 125;
const NORMAL_PITY_TARGET = 150;

function getSharedPity(player) {
  const pity = player?.pity || {};
  return Number(
    pity.pullPity ??
      Math.max(Number(pity.normalSPity || 0), Number(pity.premiumSPity || 0)) ??
      0
  );
}

function getPityLimit(tier) {
  if (tier === "motherFlame") return PREMIUM_PITY_TARGET;
  if (tier === "vivreCard") return VIVRE_PITY_TARGET;
  return NORMAL_PITY_TARGET;
}

function getPityGuarantee(tier) {
  return tier === "none" || tier === "normal" ? "A" : "S";
}

function getEffectivePullTierForSlot(roleTier, pullKey) {
  if (roleTier === "motherFlame") return "motherFlame";

  // Vivre Card rate only applies when the consumed slot is the Vivre Card slot.
  // Other slots stay normal, so Vivre cannot be spammed after its slot is used.
  if (roleTier === "vivreCard") {
    return pullKey === "vivreCard" ? "vivreCard" : "normal";
  }

  return "normal";
}

function syncPremiumSnapshot(snapshot, premiumTier) {
  if (premiumTier === "motherFlame") {
    return {
      ...snapshot,
      patreon: true,
      vivreCard: false,
      litePremium: false,
    };
  }

  if (premiumTier === "vivreCard") {
    return {
      ...snapshot,
      patreon: false,
      vivreCard: true,
      litePremium: true,
    };
  }

  return {
    ...snapshot,
    patreon: false,
    vivreCard: false,
    litePremium: false,
  };
}

function pickContentType(tier) {
  if (tier === "motherFlame") return rollPremiumContentType();
  if (tier === "vivreCard") return rollVivreContentType();
  return rollStandardContentType();
}

function pickBaseTier(tier, contentType, triggeredPity) {
  if (contentType === "devilFruit") {
    if (tier === "motherFlame") return rollPremiumDevilFruitTier();
    if (tier === "vivreCard") return rollVivreDevilFruitTier();
    return rollStandardDevilFruitTier();
  }

  if (triggeredPity) return getPityGuarantee(tier);

  if (tier === "motherFlame") return rollPremiumBaseTier();
  if (tier === "vivreCard") return rollVivreBaseTier();
  return rollStandardBaseTier();
}

function prettySlotName(key) {
  const map = {
    base: "Base Pull",
    supportMember: "Main Server Member Pull",
    booster: "Main Server Booster Pull",
    owner: "Server Owner Pull",
    patreon: "Mother Flame Pull",
    vivreCard: "Vivre Card Pull",
    baccaratCard: "Baccarat Card Pull",
    baccaratFruit: "Baccarat Fruit Pull",
  };
  return map[key] || key;
}

function getTicketPool() {
  return [
    {
      code: "common_raid_ticket",
      name: "Common Raid Ticket",
      rarity: "B",
      type: "Ticket",
      weight: 60,
      image:
        "https://cdn.discordapp.com/attachments/1493204525975076944/1503019862086254712/content.png?ex=6a01d3d3&is=6a008253&hm=3adddcd707caa59db48cd9489b6eed6f5012b7a1725d7458a1c51ff1406b6621&",
    },
    {
      code: "raid_ticket",
      name: "Raid Ticket",
      rarity: "A",
      type: "Ticket",
      weight: 29,
      image:
        "https://cdn.discordapp.com/attachments/1493204525975076944/1503019862694301907/content.png?ex=6a01d3d4&is=6a008254&hm=c46ef6d8f72ef586dc9817d629edbe23f8895613eeef5216ab80d026820e9ce2&",
    },
    {
      code: "gold_raid_ticket",
      name: "Gold Raid Ticket",
      rarity: "S",
      type: "Ticket",
      weight: 8,
      image:
        "https://cdn.discordapp.com/attachments/1493204525975076944/1503019863172448387/content.png?ex=6a01d3d4&is=6a008254&hm=cc387565f21d590a67bd120924c42e5b296f2acc7b12c1aa24f1d5713232f72e&",
    },
    {
      code: "empty_throne_raid_writ",
      name: "Empty Throne Raid Writ",
      rarity: "S",
      type: "Ticket",
      weight: 3,
      image:
        "https://cdn.discordapp.com/attachments/1493204525975076944/1503039261551624302/content.png?ex=6a01e5e5&is=6a009465&hm=d1c5a4e761f84b982572f211b9d5cbb202129e75226665b278ff6608fe94ea41",
    },
  ];
}

function pickWeightedTicket() {
  const pool = getTicketPool();
  const total = pool.reduce((sum, item) => sum + Number(item.weight || 0), 0);

  let roll = Math.random() * total;

  for (const item of pool) {
    roll -= Number(item.weight || 0);
    if (roll <= 0) return item;
  }

  return pool[0];
}

function getRewardPool(contentType) {
  if (contentType === "ticket") return getTicketPool();

  if (contentType === "battleCard") {
    return rawCards.filter(
      (card) =>
        card.cardRole === "battle" &&
        String(card.code || "").toLowerCase() !== "imu"
    );
  }

  if (contentType === "boostCard") {
    return rawCards.filter((card) => card.cardRole === "boost");
  }

  if (contentType === "weapon") return rawWeapons;

  return rawDevilFruits;
}

function pickRandomByRarity(pool, rarity) {
  const list = Array.isArray(pool) ? pool : [];
  if (!list.length) return null;

  const filtered = list.filter(
    (entry) =>
      String(entry.baseTier || entry.rarity || "").toUpperCase() ===
      String(rarity || "").toUpperCase()
  );

  const source = filtered.length ? filtered : list;
  return source[Math.floor(Math.random() * source.length)] || null;
}

function addFragment(list, card) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = card.code;
  const index = arr.findIndex((x) => x.code === code);

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 0) + 1,
    };
    return arr;
  }

  arr.push({
    name: card.displayName || card.name,
    amount: 1,
    rarity: card.baseTier || card.rarity || "C",
    category: card.cardRole === "boost" ? "boost" : "battle",
    code: card.code,
    image: card.image || "",
  });

  return arr;
}

function hasNamedItemByCode(list, code) {
  return (Array.isArray(list) ? list : []).some(
    (entry) =>
      String(entry.code || "").toLowerCase() === String(code || "").toLowerCase()
  );
}

function addWeaponFragment(list, weapon, amount = 1) {
  const arr = Array.isArray(list) ? [...list] : [];
  const fragmentCode = `weapon_fragment_${weapon.code}`;
  const index = arr.findIndex(
    (entry) => String(entry.code || "").toLowerCase() === fragmentCode.toLowerCase()
  );

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 0) + Number(amount || 1),
    };
    return arr;
  }

  arr.push({
    name: `${weapon.name} Fragment`,
    amount: Number(amount || 1),
    rarity: weapon.rarity || "C",
    category: "weapon",
    code: fragmentCode,
    image: weapon.image || "",
    weaponCode: weapon.code,
  });

  return arr;
}

function addNamedItem(list, reward) {
  const arr = Array.isArray(list) ? [...list] : [];
  const code = String(reward.code || "");
  const index = arr.findIndex((entry) => String(entry.code || "") === code);

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 1) + 1,
      upgradeLevel: Math.max(
        Number(arr[index].upgradeLevel || 0),
        Number(reward.upgradeLevel || 0)
      ),
    };
    return arr;
  }

  arr.push({
    name: reward.name,
    amount: 1,
    rarity: reward.rarity,
    code: reward.code,
    image: reward.image || "",
    type: reward.type,
    statPercent: reward.statPercent || {
      atk: 0,
      hp: 0,
      speed: 0,
    },
    ownerBonusPercent: reward.ownerBonusPercent || {
      atk: 0,
      hp: 0,
      speed: 0,
    },
    owners: reward.owners || [],
    boostBonus: reward.boostBonus,
    description: reward.description || "",
    power: reward.power || undefined,
    upgradeLevel: Number(reward.upgradeLevel || 0),
  });

  return arr;
}

function addTicket(list, ticket) {
  const arr = Array.isArray(list) ? [...list] : [];
  const idx = arr.findIndex((x) => String(x.code) === String(ticket.code));

  if (idx === -1) {
    arr.push({
      code: ticket.code,
      name: ticket.name,
      amount: 1,
      rarity: ticket.rarity,
      type: "Ticket",
    });
  } else {
    arr[idx] = {
      ...arr[idx],
      amount: Number(arr[idx].amount || 0) + 1,
    };
  }

  return arr;
}

function getTypeLabel(contentType) {
  if (contentType === "battleCard") return "Battle Card";
  if (contentType === "boostCard") return "Boost Card";
  if (contentType === "weapon") return "Weapon";
  if (contentType === "devilFruit") return "Devil Fruit";
  return "Ticket";
}

function getRewardImage(contentType, reward, ownedCard = null) {
  if (contentType === "ticket") {
    return reward?.image || reward?.imageUrl || null;
  }

  if (contentType === "battleCard" || contentType === "boostCard") {
    return (
      ownedCard?.evolutionForms?.[0]?.image ||
      ownedCard?.stageImages?.M1 ||
      ownedCard?.image ||
      reward?.evolutionForms?.[0]?.image ||
      reward?.stageImages?.M1 ||
      getCardImage(reward?.code, "M1", reward?.image || "") ||
      reward?.image ||
      null
    );
  }

  if (contentType === "weapon") {
    return getWeaponImage(reward?.code, reward?.image || "") || reward?.image || null;
  }

  return getDevilFruitImage(reward?.code, reward?.image || "") || reward?.image || null;
}

function getRewardBadge(contentType, reward, ownedCard = null) {
  const rarity =
    ownedCard?.currentTier ||
    ownedCard?.rarity ||
    reward?.baseTier ||
    reward?.rarity ||
    "C";

  if (contentType === "battleCard" || contentType === "boostCard") {
    return (
      ownedCard?.evolutionForms?.[0]?.badgeImage ||
      ownedCard?.badgeImage ||
      getRarityBadge(rarity) ||
      null
    );
  }

  return getRarityBadge(rarity) || null;
}

function normalizeBoostTypeLabel(value) {
  const type = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]+/g, "");

  if (type === "attack" || type === "atk" || type === "atkboost" || type === "attackboost") {
    return "ATK";
  }

  if (type === "health" || type === "hp" || type === "hpboost" || type === "healthboost") {
    return "HP";
  }

  if (type === "speed" || type === "spd" || type === "spdboost" || type === "speedboost") {
    return "SPD";
  }

  if (type === "damage" || type === "dmg" || type === "dmgboost" || type === "damageboost") {
    return "DMG";
  }

  if (
    type === "experience" ||
    type === "exp" ||
    type === "expboost" ||
    type === "experienceboost"
  ) {
    return "EXP";
  }

  if (
    type === "daily" ||
    type === "dailyboost" ||
    type === "dailyreward" ||
    type === "dailyrewardboost"
  ) {
    return "Daily Reward";
  }

  if (type === "pullchance" || type === "pullboost" || type === "pullrate" || type === "pitydrop") {
    return "Pity Drop";
  }

  if (
    type === "fragmentstorage" ||
    type === "fragmentstorageboost" ||
    type === "fragstorage" ||
    type === "storage"
  ) {
    return "Fragment Storage";
  }

  return value ? String(value) : "Boost";
}

function buildBoostEffectText(reward) {
  const boost = reward.boostBonus || {};
  const effects = [];
  const atk = Number(boost.atk || 0);
  const hp = Number(boost.hp || 0);
  const spd = Number(boost.spd || boost.speed || 0);
  const dmg = Number(boost.dmg || boost.damage || 0);
  const exp = Number(boost.exp || 0);
  const daily = Number(boost.daily || 0);
  const pullChance = Number(boost.pullChance || boost.pull || boost.pityDrop || 0);
  const fragmentStorage = Number(boost.fragmentStorage || boost.storage || 0);

  if (atk) effects.push(`+${atk}% ATK`);
  if (hp) effects.push(`+${hp}% HP`);
  if (spd) effects.push(`+${spd}% SPD`);
  if (dmg) effects.push(`+${dmg}% DMG`);
  if (exp) effects.push(`+${exp}% EXP`);
  if (daily) effects.push(`+${daily} Daily Reward`);
  if (pullChance) effects.push(`+${pullChance} Pity Drop`);
  if (fragmentStorage) effects.push(`+${fragmentStorage} Fragment Storage`);

  const boostType = normalizeBoostTypeLabel(reward.boostType || reward.boostTarget);
  const boostValue = Number(reward.boostValue ?? reward.value ?? 0);

  if (boostValue) {
    const suffix = ["ATK", "HP", "SPD", "DMG", "EXP"].includes(boostType) ? "%" : "";
    effects.push(`+${boostValue}${suffix} ${boostType}`);
  }

  if (effects.length) {
    return [`**Effect:** ${effects.join(" / ")}`];
  }

  if (reward.boostDescription) {
    return [`**Effect:** ${reward.boostDescription}`];
  }

  if (reward.description) {
    return [`**Description:** ${reward.description}`];
  }

  return ["**Effect:** No effect data"];
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function buildRewardStatsText(contentType, reward) {
  if (contentType === "ticket") {
    return [
      `**Item:** ${reward.name}`,
      `**Use:** ${
        reward.code === "empty_throne_raid_writ"
          ? "Imu Raid only"
          : reward.code === "gold_raid_ticket"
          ? "S Gold Raid"
          : reward.code === "raid_ticket"
          ? "A Raid"
          : "C/B Common Raid"
      }`,
    ];
  }

  if (contentType === "battleCard") {
    return [
      `**Attack:** ${formatAtkRange(reward.atk)}`,
      `**HP:** ${reward.hp ?? 0}`,
      `**SPD:** ${reward.speed ?? 0}`,
    ];
  }

  if (contentType === "boostCard") {
    return buildBoostEffectText(reward);
  }

  const stat = reward.statPercent || {
    atk: 0,
    hp: 0,
    speed: 0,
  };

  return [
    `**ATK Bonus:** ${Number(stat.atk || 0)}%`,
    `**HP Bonus:** ${Number(stat.hp || 0)}%`,
    `**SPD Bonus:** ${Number(stat.speed || 0)}%`,
  ];
}

function savePullResultFresh(userId, payload) {
  const players = readPlayers();
  const existing = players[String(userId)] || {};

  players[String(userId)] = {
    ...existing,
    cards: payload.cards,
    weapons: payload.weapons,
    devilFruits: payload.devilFruits,
    fragments: payload.fragments,
    tickets: payload.tickets,
    berries: Number(existing.berries || 0) + Number(payload.addBerries || 0),
    pulls: payload.pulls,
    pity: payload.pity,
    stats: {
      ...(existing.stats || {}),
      ...(payload.stats || {}),
    },
    quests: {
      ...(existing.quests || {}),
      ...(payload.quests || {}),
    },
  };

  writePlayers(players);

  return players[String(userId)];
}

module.exports = {
  name: "pull",
  aliases: ["gacha"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const resetState = applyGlobalPullReset(player);
    if (resetState?.wasReset) {
      updatePlayer(message.author.id, {
        pulls: resetState.pulls,
      });
      player.pulls = resetState.pulls;
    }

    const roleTier = await getPremiumTier(message);
    const snapshot = syncPremiumSnapshot(
      buildPullAccessSnapshot(player, message),
      roleTier
    );

    updatePlayer(message.author.id, {
      pullAccessSnapshot: snapshot,
    });

    player.pullAccessSnapshot = snapshot;

    const { totalUsed, totalMax } = getTotalPullUsage(player, message);
    const available = Math.max(0, totalMax - totalUsed);

    if (available <= 0) {
      return message.reply(
        "You do not have any available pulls right now.\nUse `op pullinfo` to check your slots."
      );
    }

    const pullKey = getNextAvailablePullKey(player, message);
    if (!pullKey) {
      return message.reply("No pull slot is currently available.");
    }

    const premiumTier = getEffectivePullTierForSlot(roleTier, pullKey);
    const pityLimit = getPityLimit(premiumTier);
    const pityGuarantee = getPityGuarantee(premiumTier);

    let pityCounter = getSharedPity(player) + 1;
    const triggeredPity = pityCounter >= pityLimit;

    const contentType = pickContentType(premiumTier);
    const baseTier = pickBaseTier(premiumTier, contentType, triggeredPity);

    const pool = getRewardPool(contentType);
    const picked =
      contentType === "ticket" ? pickWeightedTicket() : pickRandomByRarity(pool, baseTier);

    if (!picked) {
      return message.reply(`Pull pool is empty for ${contentType} ${baseTier}.`);
    }

    const updatedPulls = consumePullSlot(player, pullKey);
    player.pulls = updatedPulls;
    const updatedDailyState = incrementQuestCounter(player, "pullsUsed", 1);

    let updatedTickets = [...(player.tickets || [])];
    let updatedCards = [...(player.cards || [])];
    let updatedWeapons = [...(player.weapons || [])];
    let updatedDevilFruits = [...(player.devilFruits || [])];
    let updatedFragments = [...(player.fragments || [])];
    let ownedCard = null;
    let duplicateLine = null;
    let autoSacBerries = 0;

    if (contentType === "ticket") {
      updatedTickets = addTicket(updatedTickets, picked);
    } else if (contentType === "battleCard" || contentType === "boostCard") {
      const alreadyOwned = updatedCards.some(
        (card) =>
          String(card.code || "").toLowerCase() ===
          String(picked.code || "").toLowerCase()
      );

      if (alreadyOwned) {
        const autoLevelResult = applyAutoLevelForDuplicate({
          cards: updatedCards,
          fragments: updatedFragments,
          autoLevel: player.autoLevel,
          pulledCard: picked,
          amount: 1,
        });

        updatedCards = autoLevelResult.cards;
        updatedFragments = autoLevelResult.fragments;

        if (autoLevelResult.levelGained > 0) {
          duplicateLine = `You already own **${
            picked.displayName || picked.name
          }**.\nAuto-level used **1 Fragment** → **+${
            autoLevelResult.levelGained
          } Level**.`;
        } else {
          const sacResult = addFragmentWithAutoSac(player, autoLevelResult.fragments, picked, 1);
          updatedFragments = sacResult.fragments;
          autoSacBerries += sacResult.berries;

          if (sacResult.sacrificed > 0) {
            duplicateLine = `You already own **${
              picked.displayName || picked.name
            }**.\n${sacResult.reason}: **${
              sacResult.sacrificed
            } Fragment** → **+${sacResult.berries.toLocaleString("en-US")} berries**.`;
          } else {
            duplicateLine = `You already own **${
              picked.displayName || picked.name
            }**.\nConverted into **1 Fragment** instead.`;
          }
        }
      } else {
        ownedCard = createOwnedCard(picked);
        updatedCards.push(ownedCard);
      }
    } else if (contentType === "weapon") {
      const alreadyOwnedWeapon = hasNamedItemByCode(updatedWeapons, picked.code);

      if (alreadyOwnedWeapon) {
        updatedFragments = addWeaponFragment(updatedFragments, picked, 1);
        duplicateLine = `You already own **${picked.name}**.\nConverted into **1 ${picked.name} Fragment** instead.`;
      } else {
        updatedWeapons = addNamedItem(updatedWeapons, picked);
      }
    } else {
      updatedDevilFruits = addNamedItem(updatedDevilFruits, picked);
    }

    if (triggeredPity) {
      pityCounter = 0;
    }

    const updatedPity = {
      ...(player.pity || {}),
      pullPity: pityCounter,
      normalAPity: pityCounter,
      normalSPity: pityCounter,
      premiumSPity: pityCounter,
    };

    savePullResultFresh(message.author.id, {
      cards: updatedCards,
      weapons: updatedWeapons,
      devilFruits: updatedDevilFruits,
      fragments: updatedFragments,
      tickets: updatedTickets,
      addBerries: autoSacBerries,
      pulls: updatedPulls,
      pity: updatedPity,
      stats: {
        cardsPulled:
          Number(player?.stats?.cardsPulled || 0) +
          (contentType === "battleCard" || contentType === "boostCard" ? 1 : 0),
      },
      quests: {
        dailyState: updatedDailyState,
      },
    });

    const rewardName = picked.displayName || picked.name || "Unknown";
    const rewardRarity = String(picked.baseTier || picked.rarity || "C").toUpperCase();

    const pityText = triggeredPity
      ? `Pity triggered: **${pityGuarantee} Guarantee**`
      : `Pity: ${updatedPity.pullPity}/${pityLimit}`;

    const image = getRewardImage(contentType, picked, ownedCard);
    const badge = getRewardBadge(contentType, picked, ownedCard);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(" Pull Result")
      .setDescription(
        [
          `**Slot Used:** ${prettySlotName(pullKey)}`,
          `**Remaining Pulls:** ${available - 1}/${totalMax}`,
          `**${pityText}**`,
          "",
          duplicateLine || `**${rewardName}**`,
          duplicateLine ? null : `**Type:** ${getTypeLabel(contentType)}`,
          duplicateLine ? null : `**Rarity:** ${rewardRarity}`,
          duplicateLine || contentType === "weapon" || contentType === "devilFruit"
            ? picked.type
              ? `**Category:** ${picked.type}`
              : null
            : contentType === "ticket"
            ? `**Category:** Ticket`
            : `**Current Form:** ${ownedCard?.evolutionKey || "M1"}`,
          "",
          contentType === "battleCard" || contentType === "boostCard"
            ? buildRewardStatsText(contentType, ownedCard || picked).join("\n")
            : duplicateLine
            ? null
            : buildRewardStatsText(contentType, ownedCard || picked).join("\n"),
        ]
          .filter(Boolean)
          .join("\n")
      )
      .setFooter({
        text: `One Piece Bot • Pull • ${prettySlotName(pullKey)}`,
      });

    if (badge) embed.setThumbnail(badge);
    if (image) embed.setImage(image);

    return message.reply({
      embeds: [embed],
    });
  },
};