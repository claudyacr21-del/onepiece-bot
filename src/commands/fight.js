const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer, updatePlayer, updatePlayerAtomic } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const { incrementQuestCounter } = require("../utils/questProgress");
const { ITEMS, cloneItem } = require("../data/items");
const { getCurrentIsland, getIslandByCode } = require("../data/islands");
const { getPremiumTier } = require("../utils/premiumAccess");
const {
  getPlayerCombatBoosts,
  applyDamageBoost,
  applyExpBoost,
} = require("../utils/combatStats");
const {
  getCardExp,
  getCardLevelCap,
  applyExpToCard,
} = require("../utils/cardExp");

const NORMAL_FIGHT_COOLDOWN_MS = 8 * 60 * 1000;
const MOTHER_FLAME_FIGHT_COOLDOWN_MS = 5 * 60 * 1000;
const VIVRE_CARD_FIGHT_COOLDOWN_MS = 6.5 * 60 * 1000;
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

async function safeDeferUpdate(interaction) {
  if (!interaction || interaction.deferred || interaction.replied) return;
  try {
    await interaction.deferUpdate();
  } catch (error) {
    console.error("[FIGHT DEFER UPDATE ERROR]", error);
  }
}

async function safeEditInteractionMessage(interaction, payload) {
  try {
    if (interaction?.message) {
      return await interaction.message.edit(payload);
    }
    return null;
  } catch (error) {
    console.error("[FIGHT MESSAGE EDIT ERROR]", error);
    return null;
  }
}

async function safeEphemeralReply(interaction, content) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.followUp({
        content,
        ephemeral: true,
      });
    }

    return await interaction.reply({
      content,
      ephemeral: true,
    });
  } catch (error) {
    console.error("[FIGHT REPLY ERROR]", error);
    return null;
  }
}

function formatExpResults(playerTeam, expResults) {
  return expResults
    .map((entry) => {
      const unit =
        playerTeam.find(
          (card) =>
            Number.isInteger(entry.sourceIndex) &&
            Number.isInteger(card.sourceIndex) &&
            card.sourceIndex === entry.sourceIndex
        ) ||
        playerTeam.find((card) => card.instanceId === entry.instanceId);

      if (!unit) return null;

      if (entry.locked) {
        if (
          Number(entry.level || 0) >= Number(entry.cap || 0) &&
          Number(entry.cap || 0) >= 100
        ) {
          return `🔒 ${unit.name} is already MAX LEVEL (**${entry.level}/${entry.cap}**).`;
        }

        return `🔒 ${unit.name} is level locked at **${entry.level}/${entry.cap}**. Awaken to continue.`;
      }

      const levelUpText =
        Number(entry.leveledUp || 0) > 0
          ? ` • Level Up +${Number(entry.leveledUp || 0)}`
          : "";

      return `✨ ${unit.name} gained **${entry.expGain} EXP**${levelUpText}.`;
    })
    .filter(Boolean);
}

function addOrIncrease(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const index = arr.findIndex((entry) => entry.code === item.code);

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 1) + Number(item.amount || 1),
    };
    return arr;
  }

  arr.push({
    ...item,
    amount: Number(item.amount || 1),
  });

  return arr;
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function applyBoostToNumber(value, percent) {
  return Math.floor(Number(value || 0) * (1 + Number(percent || 0) / 100));
}

function mergeOwnedCardWithLatestTemplate(rawCard) {
  return hydrateCard(rawCard);
}

function toBattleUnit(card, slotIndex, combatBoosts = {}) {
  const displayAtk = Number(card.atk || 0);
  const displayHp = Number(card.hp || 0);
  const displaySpeed = Number(card.speed || 0);

  const battleAtk = applyBoostToNumber(displayAtk, combatBoosts.atk);
  const battleMaxHp = applyBoostToNumber(displayHp, combatBoosts.hp);
  const battleSpeed = applyBoostToNumber(displaySpeed, combatBoosts.spd);

  return {
    slot: slotIndex + 1,
    sourceIndex: Number.isInteger(card.sourceIndex) ? card.sourceIndex : null,
    instanceId: card.instanceId,
    name: card.displayName || card.name || "Unknown",
    rarity: card.currentTier || card.rarity || "C",

    atk: displayAtk,
    hp: displayHp,
    maxHp: displayHp,
    speed: displaySpeed,

    battleAtk,
    battleHp: battleMaxHp,
    battleMaxHp,
    battleSpeed,

    level: Number(card.level || 1),
    levelCap: getCardLevelCap(card),
    exp: getCardExp(card),
    kills: Number(card.kills || 0),
    image: card.image || "",

    passiveBoostsApplied: {
      atk: Number(combatBoosts.atk || 0),
      hp: Number(combatBoosts.hp || 0),
      spd: Number(combatBoosts.spd || 0),
      dmg: Number(combatBoosts.dmg || 0),
      exp: Number(combatBoosts.exp || 0),
    },
  };
}

function createEnemy(name, rarity, atk, hp, speed, level = 1) {
  return {
    name,
    rarity,
    level: Math.max(1, Math.min(100, Number(level || 1))),
    atk,
    hp,
    maxHp: hp,
    speed,
    battleAtk: atk,
    battleHp: hp,
    battleMaxHp: hp,
    battleSpeed: speed,
  };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getPlayerFightIsland(player) {
  const code =
    player?.travel?.currentIslandCode ||
    player?.currentIslandCode ||
    player?.ship?.currentIslandCode ||
    null;

  const byCode = code ? getIslandByCode(code) : null;
  if (byCode) return byCode;

  return getCurrentIsland(player);
}

function getIslandEnemyRarities(order) {
  const safeOrder = Number(order || 0);

  if (safeOrder >= 28) return ["A", "S", "S"];
  if (safeOrder >= 22) return ["A", "A", "S"];
  if (safeOrder >= 15) return ["B", "A", "A"];
  if (safeOrder >= 7) return ["C", "B", "A"];

  return ["C", "C", "B"];
}

function scaleByIsland(value, island, roleMultiplier = 1) {
  const order = Number(island?.order || 0);
  const shipTier = Math.max(1, Number(island?.requiredShipTier || 1));
  const shipTierMultiplier = 1 + (shipTier - 1) * 0.08;

  return Math.floor(Number(value || 0) * shipTierMultiplier * roleMultiplier + order);
}

function getIslandBossName(island) {
  if (
    island?.boss &&
    island.boss !== "Egghead Boss Route" &&
    island.boss !== "Elbaf Boss Route"
  ) {
    return island.boss;
  }

  if (Array.isArray(island?.bossPhases) && island.bossPhases.length) {
    return island.bossPhases[0]?.name || `${island.name} Boss`;
  }

  return `${island?.name || "Island"} Captain`;
}

function createIslandEnemyTemplates(island) {
  const order = Number(island?.order || 0);
  const rarities = getIslandEnemyRarities(order);
  const islandName = island?.name || "Unknown Island";

  // Regular island fight mobs.
  // Increased slightly, but still below true island boss difficulty.
  const scoutAtk = 78 + order * 14;
  const scoutHp = 620 + order * 110;
  const scoutSpeed = 64 + order * 3.4;

  const eliteAtk = 100 + order * 17;
  const eliteHp = 840 + order * 142;
  const eliteSpeed = 73 + order * 3.9;

  const captainAtk = 122 + order * 20.5;
  const captainHp = 1080 + order * 174;
  const captainSpeed = 82 + order * 4.4;

  return [
    createEnemy(
      `${islandName} Scout`,
      rarities[0],
      scaleByIsland(scoutAtk, island, 0.92),
      scaleByIsland(scoutHp, island, 0.9),
      scaleByIsland(scoutSpeed, island, 0.95)
    ),

    createEnemy(
      `${islandName} Elite`,
      rarities[1],
      scaleByIsland(eliteAtk, island, 0.96),
      scaleByIsland(eliteHp, island, 0.95),
      scaleByIsland(eliteSpeed, island, 0.98)
    ),

    createEnemy(
      `${islandName} Captain`,
      rarities[2],
      scaleByIsland(captainAtk, island, 1),
      scaleByIsland(captainHp, island, 1),
      scaleByIsland(captainSpeed, island, 1)
    ),
  ];
}

function getAveragePlayerLevel(playerTeam) {
  if (!Array.isArray(playerTeam) || !playerTeam.length) return 1;

  const total = playerTeam.reduce((sum, unit) => sum + Math.max(1, Number(unit.level || 1)), 0);
  return Math.max(1, Math.round(total / playerTeam.length));
}

function getEnemyLevelForSlot(baseLevel, slotIndex) {
  const slotOffset = slotIndex === 0 ? -1 : slotIndex === 1 ? 0 : 2;
  const randomOffset = randomInt(-3, 3);
  return Math.max(1, Math.min(100, baseLevel + slotOffset + randomOffset));
}

function scaleEnemy(enemy, playerAverageLevel, slotIndex) {
  const level = getEnemyLevelForSlot(playerAverageLevel, slotIndex);

  // Slightly stronger level scaling, still smooth for late islands.
  const levelMultiplier = 1 + (level - 1) * 0.009;

  const atkMult = (randomInt(94, 106) / 100) * levelMultiplier;
  const hpMult = (randomInt(96, 109) / 100) * levelMultiplier;
  const speedMult = (randomInt(97, 107) / 100) * (1 + (level - 1) * 0.0035);

  return createEnemy(
    enemy.name,
    enemy.rarity,
    Math.floor(enemy.atk * atkMult),
    Math.floor(enemy.hp * hpMult),
    Math.floor(enemy.speed * speedMult),
    level
  );
}

function generateEnemyTeam(island, playerTeam) {
  const pool = createIslandEnemyTemplates(island);
  const avgLevel = getAveragePlayerLevel(playerTeam);

  return pool.map((enemy, index) => ({
    ...scaleEnemy(enemy, avgLevel, index),
    instanceId: `enemy-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
  }));
}

function getAliveUnits(units) {
  return units.filter((unit) => Number(unit.battleHp ?? unit.hp) > 0);
}

function getFirstAlive(units) {
  return units.find((unit) => Number(unit.battleHp ?? unit.hp) > 0) || null;
}

function clampHp(value) {
  return Math.max(0, Math.floor(value));
}

function syncDisplayHp(unit) {
  const currentBattleHp = clampHp(Number(unit.battleHp ?? unit.hp ?? 0));
  const maxBattleHp = Math.max(1, Number(unit.battleMaxHp ?? unit.maxHp ?? 1));

  unit.battleHp = Math.max(0, Math.min(currentBattleHp, maxBattleHp));

  if (Number.isFinite(Number(unit.hp))) {
    unit.hp = unit.battleHp;
  }

  if (!Number.isFinite(Number(unit.maxHp)) || Number(unit.maxHp) <= 0) {
    unit.maxHp = maxBattleHp;
  }
}

function performAttack(attacker, defender, boosts = {}) {
  const atk = Number(attacker.battleAtk || attacker.atk || 0);
  const defSpeed = Number(defender.battleSpeed || defender.speed || 0);
  const rolledAtk = Math.floor(atk * (0.85 + Math.random() * 0.3));
  const rawDamage = Math.max(1, rolledAtk - Math.floor(defSpeed * 0.15));
  const isPlayerUnit = !String(attacker.instanceId || "").startsWith("enemy-");
  const finalDamage = isPlayerUnit ? applyDamageBoost(rawDamage, boosts) : rawDamage;

  const currentHp = Number(defender.battleHp ?? defender.hp ?? 0);
  defender.battleHp = clampHp(currentHp - finalDamage);

  syncDisplayHp(defender);

  return finalDamage;
}

function resolveTurnOrder(playerUnit, enemyUnit) {
  const playerSpeed = Number(playerUnit?.battleSpeed || playerUnit?.speed || 0);
  const enemySpeed = Number(enemyUnit?.battleSpeed || enemyUnit?.speed || 0);

  if (enemySpeed > playerSpeed) {
    return [
      { actor: enemyUnit, target: playerUnit, isPlayer: false },
      { actor: playerUnit, target: enemyUnit, isPlayer: true },
    ];
  }

  return [
    { actor: playerUnit, target: enemyUnit, isPlayer: true },
    { actor: enemyUnit, target: playerUnit, isPlayer: false },
  ];
}

function renderHpBar(hp, maxHp, size = 10) {
  const current = Math.max(0, Number(hp || 0));
  const max = Math.max(1, Number(maxHp || 1));
  const filled = Math.round((current / max) * size);
  const safeFilled = Math.max(0, Math.min(size, filled));

  return `${"█".repeat(safeFilled)}${"░".repeat(size - safeFilled)} ${current}/${max}`;
}

function buildFightDescription(playerTeam, enemyTeam, logs, streak, premiumMode, island) {
  const makeUnitLine = (unit, index, isEnemy = false) => {
    const slot = isEnemy ? index + 1 : unit.slot;
    const levelText = isEnemy
      ? `ATK \`${formatAtkRange(unit.atk)}\` • SPD \`${unit.speed}\``
      : `ATK \`${formatAtkRange(unit.battleAtk)}\` • SPD \`${unit.battleSpeed}\``;

    const hp = isEnemy
      ? renderHpBar(unit.hp, unit.maxHp)
      : renderHpBar(unit.battleHp, unit.battleMaxHp);

    return `**${slot}. ${unit.name}** — ${levelText}\n${hp}`;
  };

  const enemyLines = enemyTeam.map((unit, index) => makeUnitLine(unit, index, true));
  const playerLines = playerTeam.map((unit, index) => makeUnitLine(unit, index, false));
  const recentLogs = logs.slice(-6);

  return [
    `**Current Island:** \`${island?.name || "Unknown Island"}\``,
    `**Island Difficulty:** \`Order ${Number(island?.order || 0)}\``,
    `**Current Win Streak:** \`${streak}\``,
    `**Mode:** \`${premiumMode || "Normal Fight"}\``,
    "",
    "## Battle Log",
    ...(recentLogs.length ? recentLogs : ["No actions yet. Choose your first attacker."]),
    "",
    "## Enemy Team",
    enemyLines.join("\n"),
    "",
    "## Your Team",
    playerLines.join("\n"),
  ].join("\n");
}

function buildActionRows(playerTeam, battleEnded, confirmingRunAway = false) {
  if (confirmingRunAway && !battleEnded) {
    const confirmButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("fight_run_confirm")
        .setLabel("Confirm Run Away")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("fight_run_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary)
    );

    return [confirmButtons];
  }

  const attackButtons = new ActionRowBuilder();

  for (let i = 0; i < 3; i++) {
    const unit = playerTeam[i];

    attackButtons.addComponents(
      new ButtonBuilder()
        .setCustomId(`fight_attack_${i}`)
        .setLabel(unit ? unit.name.slice(0, 20) : `Slot ${i + 1}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(battleEnded || !unit || Number(unit.battleHp ?? unit.hp) <= 0)
    );
  }

  const miscButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("fight_run")
      .setLabel("Run Away")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(battleEnded)
  );

  return [attackButtons, miscButtons];
}

function buildFightEmbed(
  playerName,
  playerTeam,
  enemyTeam,
  logs,
  streak,
  battleEnded,
  premiumMode,
  island
) {
  return new EmbedBuilder()
    .setColor(battleEnded ? 0x2ecc71 : 0xc0392b)
    .setTitle(`⚔️ ${playerName}'s Fight`)
    .setDescription(
      buildFightDescription(playerTeam, enemyTeam, logs, streak, premiumMode, island)
    )
    .setFooter({
      text: premiumMode
        ? `One Piece Bot • ${premiumMode}`
        : "One Piece Bot • Manual Fight",
    });
}

function buildFightResultEmbed({ title, color, result, rewardLines = [], expLines = [], logs = [] }) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(
      [
        `**Result:** ${result}`,
        "",
        "## Final Log",
        ...(logs.length ? logs.slice(-8) : ["No final log."]),
        "",
        rewardLines.length ? "## Rewards" : null,
        ...rewardLines,
        rewardLines.length ? "" : null,
        expLines.length ? "## EXP" : null,
        ...expLines,
      ]
        .filter(Boolean)
        .join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Fight Result",
    });
}

function calculateWinReward(streakAfterWin, premiumTier, island) {
  const order = Math.max(1, Number(island?.order || 1));
  const tier = Math.max(1, Number(island?.requiredShipTier || 1));

  const islandBerries = 900 + order * 180 + tier * 250;
  const islandGems = 3 + Math.floor(order / 4) + Math.floor(tier / 2);

  const rewardMultiplier = getFightRewardMultiplier(premiumTier);

  const reward = {
    berries: Math.floor(islandBerries * rewardMultiplier),
    gems: Math.floor(islandGems * rewardMultiplier),
    boxes: [],
  };

  if (order >= 8 && streakAfterWin % 10 === 0) {
    reward.boxes.push(cloneItem(ITEMS.basicResourceBox, 1));
  }

  if (order >= 18 && streakAfterWin % 15 === 0) {
    reward.boxes.push(cloneItem(ITEMS.rareResourceBox, 1));
  }

  if (streakAfterWin % 10 === 0) {
    reward.berries += Math.floor((2500 + order * 220) * rewardMultiplier);
    reward.gems += Math.floor((8 + Math.floor(order / 3)) * rewardMultiplier);
  }

  return reward;
}

function formatFightRewardLines(reward) {
  const lines = [
    `💰 +${Number(reward.berries || 0).toLocaleString("en-US")} berries`,
    `💎 +${Number(reward.gems || 0)} gems`,
  ];

  for (const box of reward.boxes || []) {
    lines.push(`🎁 ${box.name || "Resource Box"} x${Number(box.amount || 1)}`);
  }

  return lines;
}

function calculateFightExp(playerTeam, won) {
  const BASE_WIN_EXP = 150;
  const BASE_LOSE_EXP = 95;

  return playerTeam.map((unit) => {
    const level = Number(unit.level || 1);
    const cap = Number(unit.levelCap || 50);

    if (level >= cap) {
      return {
        sourceIndex: Number.isInteger(unit.sourceIndex) ? unit.sourceIndex : null,
        instanceId: unit.instanceId,
        expGain: 0,
        locked: true,
        level,
        cap,
        leveledUp: 0,
      };
    }

    const baseExp = won ? BASE_WIN_EXP : BASE_LOSE_EXP;

    return {
      sourceIndex: Number.isInteger(unit.sourceIndex) ? unit.sourceIndex : null,
      instanceId: unit.instanceId,
      expGain: applyExpBoost(baseExp, unit.passiveBoostsApplied || {}),
      locked: false,
      level,
      cap,
      leveledUp: 0,
    };
  });
}

function applyFightExpToFreshCards(freshPlayer, playerTeam, expResults) {
  return [...(freshPlayer.cards || [])].map((card, index) => {
    const expEntry =
      expResults.find(
        (entry) =>
          Number.isInteger(entry.sourceIndex) && entry.sourceIndex === index
      ) || expResults.find((entry) => entry.instanceId === card.instanceId);

    const unit =
      playerTeam.find(
        (entry) =>
          Number.isInteger(entry.sourceIndex) && entry.sourceIndex === index
      ) || playerTeam.find((entry) => entry.instanceId === card.instanceId);

    if (!expEntry || !unit) return card;

    const nextCard = applyExpToCard(
      {
        ...card,
        kills: Number(unit.kills || 0),
        level: Number(card.level || 1),
        exp: getCardExp(card),
        xp: getCardExp(card),
      },
      expEntry.expGain
    );

    expEntry.leveledUp = Number(nextCard.leveledUp || 0);

    return {
      ...nextCard,
      kills: Number(unit.kills || 0),
    };
  });
}

function formatRemaining(ms) {
  const safeMs = Math.max(0, Number(ms || 0));
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) return `${seconds}s`;

  return `${minutes}m ${seconds}s`;
}

async function getFightPremiumTier(message, player) {
  const liveTier = await getPremiumTier(message);
  if (liveTier !== "none") return liveTier;

  if (Number(player?.boosts?.motherFlameFight || 0) > 0) return "motherFlame";
  if (Number(player?.boosts?.vivreCardFight || 0) > 0) return "vivreCard";

  return "none";
}

function getFightCooldownForTier(tier) {
  if (tier === "motherFlame") return MOTHER_FLAME_FIGHT_COOLDOWN_MS;
  if (tier === "vivreCard") return VIVRE_CARD_FIGHT_COOLDOWN_MS;
  return NORMAL_FIGHT_COOLDOWN_MS;
}

function getFightCooldownKey(tier) {
  if (tier === "motherFlame") return "fightMotherFlame";
  if (tier === "vivreCard") return "fightVivreCard";
  return "fight";
}

function getFightModeLabel(tier) {
  if (tier === "motherFlame") return "Mother Flame Premium";
  if (tier === "vivreCard") return "Vivre Card Lite Premium";
  return "Normal Fight";
}

function getFightRewardMultiplier(tier) {
  if (tier === "motherFlame") return 1.45;
  if (tier === "vivreCard") return 1.225;
  return 1;
}

function applyFightLoss(message, player, playerTeam) {
  const expResults = calculateFightExp(playerTeam, false);

  updatePlayerAtomic(
    message.author.id,
    (fresh) => {
      const updatedDailyState = incrementQuestCounter(fresh, "fightsPlayed", 1);

      return {
        ...fresh,
        cards: applyFightExpToFreshCards(fresh, playerTeam, expResults),
        fightStreak: 0,
        quests: {
          ...(fresh.quests || {}),
          dailyState: updatedDailyState,
        },
      };
    },
    message.author.username
  );

  return expResults;
}

module.exports = {
  name: "fight",
  aliases: ["f"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const premiumTier = await getFightPremiumTier(message, player);
    const premiumMode = getFightModeLabel(premiumTier);
    const currentIsland = getPlayerFightIsland(player);
    const cooldownKey = getFightCooldownKey(premiumTier);
    const cooldownMs = getFightCooldownForTier(premiumTier);
    const cooldownUntil = Number(player?.cooldowns?.[cooldownKey] || 0);

    if (cooldownUntil > Date.now()) {
      return message.reply(
        `You must wait **${formatRemaining(
          cooldownUntil - Date.now()
        )}** before using \`op fight\` again.`
      );
    }

    const combatBoosts = getPlayerCombatBoosts(player);
    const rawCards = Array.isArray(player.cards) ? player.cards : [];

    const cards = rawCards
      .map((rawCard, sourceIndex) => {
        const merged = mergeOwnedCardWithLatestTemplate(rawCard);
        if (!merged) return null;

        return {
          ...merged,
          sourceIndex,
        };
      })
      .filter(Boolean);

    const teamSlots = Array.isArray(player?.team?.slots)
      ? player.team.slots
      : [null, null, null];

    const teamCards = teamSlots
      .slice(0, 3)
      .map((instanceId, index) => {
        if (!instanceId) return null;

        const found = cards.find(
          (card) =>
            String(card.instanceId) === String(instanceId) &&
            String(card.cardRole || "").toLowerCase() !== "boost"
        );

        return found ? toBattleUnit(found, index, combatBoosts) : null;
      })
      .filter(Boolean);

    if (teamCards.length < 3) {
      return message.reply({
        content:
          "You need **3 battle cards** in your team before using `op fight`.\nUse `op team` / `op setteam` to fill all 3 battle card slots.",
        allowedMentions: {
          repliedUser: false,
        },
      });
    }

    updatePlayer(message.author.id, {
      cooldowns: {
        ...(player.cooldowns || {}),
        [cooldownKey]: Date.now() + cooldownMs,
      },
    });

    const playerTeam = [...teamCards].sort((a, b) => a.slot - b.slot);
    const enemyTeam = generateEnemyTeam(currentIsland, playerTeam);
    const logs = [];
    let battleEnded = false;
    let confirmingRunAway = false;
    let currentStreak = Number(player.fightStreak || 0);

    const reply = await message.reply({
      embeds: [
        buildFightEmbed(
          player.username || message.author.username,
          playerTeam,
          enemyTeam,
          logs,
          currentStreak,
          battleEnded,
          premiumMode,
          currentIsland
        ),
      ],
      components: buildActionRows(playerTeam, battleEnded),
    });

    const collector = reply.createMessageComponentCollector({
      time: SESSION_TIMEOUT_MS,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the command user can control this fight.",
          ephemeral: true,
        });
      }

      if (battleEnded) {
        return safeEphemeralReply(interaction, "This fight has already ended.");
      }

      await safeDeferUpdate(interaction);

if (interaction.customId === "fight_run") {
  confirmingRunAway = true;
  logs.length = 0;
  logs.push("⚠️ Run away confirmation requested.");
  logs.push("Choose **Confirm Run Away** to leave the fight, or **Cancel** to continue.");

  await safeEditInteractionMessage(interaction, {
    embeds: [
      buildFightEmbed(
        player.username || message.author.username,
        playerTeam,
        enemyTeam,
        logs,
        currentStreak,
        false,
        premiumMode,
        currentIsland
      ),
    ],
    components: buildActionRows(playerTeam, false, true),
  });

  return;
}

if (interaction.customId === "fight_run_cancel") {
  confirmingRunAway = false;
  logs.length = 0;
  logs.push("✅ Run away cancelled.");
  logs.push("Choose one of your cards to continue the fight.");

  await safeEditInteractionMessage(interaction, {
    embeds: [
      buildFightEmbed(
        player.username || message.author.username,
        playerTeam,
        enemyTeam,
        logs,
        currentStreak,
        false,
        premiumMode,
        currentIsland
      ),
    ],
    components: buildActionRows(playerTeam, false, false),
  });

  return;
}

      if (interaction.customId === "fight_run_confirm") {
        battleEnded = true;
        confirmingRunAway = false;
        logs.length = 0;
        logs.push("🏃 You ran away from the fight.");
        logs.push("No EXP gained from running away.");

        await safeEditInteractionMessage(interaction, {
          embeds: [
            buildFightResultEmbed({
              title: "🏃 Fight Escaped",
              color: 0xf1c40f,
              result: "RUN AWAY",
              rewardLines: ["No rewards."],
              expLines: ["No EXP gained."],
              logs,
            }),
          ],
          components: [],
        });

        collector.stop("run");
        return;
      }

      confirmingRunAway = false;

      const index = Number(interaction.customId.replace("fight_attack_", ""));
      const playerAttacker = playerTeam[index];

      if (!playerAttacker || Number(playerAttacker.battleHp ?? playerAttacker.hp) <= 0) {
        return safeEphemeralReply(interaction, "That card cannot attack right now.");
      }

      const enemyTarget = getFirstAlive(enemyTeam);

      if (!enemyTarget) {
        return safeEphemeralReply(interaction, "No enemy is available to attack.");
      }

      logs.length = 0;

      const turns = resolveTurnOrder(playerAttacker, enemyTarget);

      for (const turn of turns) {
        const actor = turn.actor;
        const target = turn.target;

        if (Number(actor.battleHp ?? actor.hp) <= 0) continue;
        if (Number(target.battleHp ?? target.hp) <= 0) continue;

        const damage = performAttack(
          actor,
          target,
          turn.isPlayer ? actor.passiveBoostsApplied || combatBoosts : {}
        );

        if (turn.isPlayer) {
          logs.push(`⚔️ ${actor.name} attacked ${target.name}.`);
          logs.push(`➡️ ${actor.name} dealt **${damage}** damage to ${target.name}.`);
        } else {
          logs.push(`⚔️ ${actor.name} attacked ${target.name}.`);
          logs.push(`⬅️ ${actor.name} dealt **${damage}** damage to ${target.name}.`);
        }

        if (Number(target.battleHp ?? target.hp) <= 0) {
          if (turn.isPlayer) {
            playerAttacker.kills += 1;
          }
          logs.push(`☠️ ${target.name} was defeated.`);
        }
      }

      if (!getAliveUnits(enemyTeam).length) {
        battleEnded = true;
        currentStreak += 1;

        const reward = calculateWinReward(currentStreak, premiumTier, currentIsland);
        const expResults = calculateFightExp(playerTeam, true);

        updatePlayerAtomic(
          message.author.id,
          (fresh) => {
            let updatedBoxes = [...(fresh.boxes || [])];

            reward.boxes.forEach((item) => {
              updatedBoxes = addOrIncrease(updatedBoxes, item);
            });

            let updatedDailyState = incrementQuestCounter(fresh, "fightsPlayed", 1);
            updatedDailyState = incrementQuestCounter(
              {
                ...fresh,
                quests: {
                  ...(fresh.quests || {}),
                  dailyState: updatedDailyState,
                },
              },
              "fightsWon",
              1
            );

            return {
              ...fresh,
              cards: applyFightExpToFreshCards(fresh, playerTeam, expResults),
              boxes: updatedBoxes,
              berries: Number(fresh.berries || 0) + reward.berries,
              gems: Number(fresh.gems || 0) + reward.gems,
              fightStreak: currentStreak,
              quests: {
                ...(fresh.quests || {}),
                dailyState: updatedDailyState,
              },
            };
          },
          message.author.username
        );

        const expLines = formatExpResults(playerTeam, expResults);

        logs.push("🏆 You won the fight!");

        await safeEditInteractionMessage(interaction, {
          embeds: [
            buildFightResultEmbed({
              title: "🏆 Fight Victory",
              color: 0x2ecc71,
              result: "WIN",
              rewardLines: formatFightRewardLines(reward),
              expLines,
              logs,
            }),
          ],
          components: [],
        });

        collector.stop("win");
        return;
      }

      if (!getAliveUnits(playerTeam).length) {
        battleEnded = true;

        const expResults = applyFightLoss(message, player, playerTeam);
        const expLines = formatExpResults(playerTeam, expResults);

        logs.push("💀 You lost the fight.");

        await safeEditInteractionMessage(interaction, {
          embeds: [
            buildFightResultEmbed({
              title: "💀 Fight Defeat",
              color: 0xe74c3c,
              result: "LOSE",
              expLines,
              logs,
            }),
          ],
          components: [],
        });

        collector.stop("lose");
        return;
      }

      await safeEditInteractionMessage(interaction, {
        embeds: [
          buildFightEmbed(
            player.username || message.author.username,
            playerTeam,
            enemyTeam,
            logs,
            currentStreak,
            false,
            premiumMode,
            currentIsland
          ),
        ],
        components: buildActionRows(playerTeam, false, confirmingRunAway),
      });
    });

    collector.on("end", async (_collected, reason) => {
      if (reason === "time" && !battleEnded) {
        try {
          battleEnded = true;
          logs.length = 0;
          logs.push("⌛ No interaction for 5 minutes. You lost the fight.");

          const expResults = applyFightLoss(message, player, playerTeam);
          const expLines = formatExpResults(playerTeam, expResults);

          await reply.edit({
            embeds: [
              buildFightResultEmbed({
                title: "⌛ Fight Timeout",
                color: 0xe74c3c,
                result: "LOSE",
                expLines,
                logs,
              }),
            ],
            components: [],
          });
        } catch (_) {}
      }
    });
  },
};