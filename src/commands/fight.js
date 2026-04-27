const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { hydrateCard, findCardTemplate } = require("../utils/evolution");
const { incrementQuestCounter } = require("../utils/questProgress");
const { ITEMS, cloneItem } = require("../data/items");
const { getCurrentIsland, getIslandByCode } = require("../data/islands");
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

const FIGHT_COOLDOWN_MS = 8 * 60 * 1000;
const MOTHER_FLAME_FIGHT_COOLDOWN_MS = 4 * 60 * 1000;
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

function formatExpResults(playerTeam, expResults) {
  return expResults
    .map((entry) => {
      const unit = playerTeam.find((card) => card.instanceId === entry.instanceId);
      if (!unit) return null;

      if (entry.locked) {
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

function toBattleUnit(card, slotIndex, combatBoosts = {}) {
  const displayAtk = Number(card.atk || 0);
  const displayHp = Number(card.hp || 0);
  const displaySpeed = Number(card.speed || 0);

  const battleAtk = applyBoostToNumber(displayAtk, combatBoosts.atk);
  const battleMaxHp = applyBoostToNumber(displayHp, combatBoosts.hp);
  const battleSpeed = applyBoostToNumber(displaySpeed, combatBoosts.spd);

  return {
    slot: slotIndex + 1,
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
  const bossName = getIslandBossName(island);

  const scoutAtk = 90 + order * 18;
  const scoutHp = 800 + order * 160;
  const scoutSpeed = 70 + order * 5;

  const eliteAtk = 115 + order * 23;
  const eliteHp = 1050 + order * 210;
  const eliteSpeed = 82 + order * 6;

  const bossAtk = 145 + order * 28;
  const bossHp = 1400 + order * 280;
  const bossSpeed = 96 + order * 7;

  return [
    createEnemy(
      `${islandName} Scout`,
      rarities[0],
      scaleByIsland(scoutAtk, island),
      scaleByIsland(scoutHp, island),
      scaleByIsland(scoutSpeed, island)
    ),
    createEnemy(
      `${islandName} Elite`,
      rarities[1],
      scaleByIsland(eliteAtk, island),
      scaleByIsland(eliteHp, island),
      scaleByIsland(eliteSpeed, island)
    ),
    createEnemy(
      bossName,
      rarities[2],
      scaleByIsland(bossAtk, island, 1.08),
      scaleByIsland(bossHp, island, 1.15),
      scaleByIsland(bossSpeed, island, 1.05)
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
  const levelMultiplier = 1 + (level - 1) * 0.012;

  const atkMult = (randomInt(95, 108) / 100) * levelMultiplier;
  const hpMult = (randomInt(97, 112) / 100) * levelMultiplier;
  const speedMult = (randomInt(96, 106) / 100) * (1 + (level - 1) * 0.004);

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
  const battleHp = Number(unit.battleHp ?? unit.hp ?? 0);
  const battleMaxHp = Math.max(1, Number(unit.battleMaxHp ?? unit.maxHp ?? 1));
  const ratio = Math.max(0, battleHp) / battleMaxHp;

  unit.hp = clampHp(Number(unit.maxHp || 0) * ratio);
}

function performAttack(attacker, defender, boosts = {}) {
  const atk = Number(attacker.battleAtk || attacker.atk || 0);
  const defSpeed = Number(defender.battleSpeed || defender.speed || 0);
  const rolledAtk = Math.floor(atk * (0.85 + Math.random() * 0.3));
  const rawDamage = Math.max(1, rolledAtk - Math.floor(defSpeed * 0.15));
  const isPlayerUnit = !String(attacker.instanceId || "").startsWith("enemy-");
  const finalDamage = isPlayerUnit ? applyDamageBoost(rawDamage, boosts) : rawDamage;

  defender.battleHp = clampHp(Number(defender.battleHp ?? defender.hp ?? 0) - finalDamage);
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
  const playerLines = playerTeam.map((unit) => {
    return [
      `**${unit.slot}. ${unit.name}**`,
      `[${unit.rarity}] • ATK \`${formatAtkRange(unit.battleAtk)}\` • SPD \`${unit.battleSpeed}\` • LV \`${unit.level}\``,
      renderHpBar(unit.battleHp, unit.battleMaxHp),
    ].join("\n");
  });

  const enemyLines = enemyTeam.map((unit, index) => {
    return [
      `**${index + 1}. ${unit.name}**`,
      `[${unit.rarity}] • LV \`${unit.level || 1}\` • ATK \`${formatAtkRange(unit.atk)}\` • SPD \`${unit.speed}\``,
      renderHpBar(unit.hp, unit.maxHp),
    ].join("\n");
  });

  const recentLogs = logs.slice(-6);

  return [
    `**Current Island:** \`${island?.name || "Unknown Island"}\``,
    `**Island Difficulty:** \`Order ${Number(island?.order || 0)}\``,
    `**Current Win Streak:** \`${streak}\``,
    `**Mode:** \`${premiumMode ? "Mother Flame Premium" : "Normal Fight"}\``,
    "",
    "## Your Team",
    ...playerLines,
    "",
    "## Enemy Team",
    ...enemyLines,
    "",
    "## Battle Log",
    ...(recentLogs.length ? recentLogs : ["No actions yet. Choose your first attacker."]),
  ].join("\n");
}

function buildActionRows(playerTeam, battleEnded) {
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
      text: premiumMode ? "One Piece Bot • Mother Flame Fight" : "One Piece Bot • Manual Fight",
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
        rewardLines.length ? "## Rewards" : null,
        ...rewardLines,
        rewardLines.length ? "" : null,
        expLines.length ? "## EXP" : null,
        ...expLines,
        expLines.length ? "" : null,
        "## Final Log",
        ...(logs.length ? logs.slice(-8) : ["No final log."]),
      ]
        .filter(Boolean)
        .join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Fight Result",
    });
}

function calculateWinReward(streakAfterWin, premiumMode) {
  const reward = {
    berries: premiumMode ? 3500 : 2500,
    gems: premiumMode ? 12 : 8,
    boxes: [],
  };

  if (streakAfterWin % 10 === 0) {
    reward.berries += premiumMode ? 7000 : 5000;
    reward.gems += premiumMode ? 20 : 15;
    reward.boxes.push(cloneItem(ITEMS.basicResourceBox, 1));
  }

  return reward;
}

function calculateFightExp(playerTeam, won) {
  const BASE_WIN_EXP = 150;
  const BASE_LOSE_EXP = 95;

  return playerTeam.map((unit) => {
    const level = Number(unit.level || 1);
    const cap = Number(unit.levelCap || 50);

    if (level >= cap) {
      return {
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
      instanceId: unit.instanceId,
      expGain: applyExpBoost(baseExp, unit.passiveBoostsApplied || {}),
      locked: false,
      level,
      cap,
      leveledUp: 0,
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

function isMotherFlamePremium(player) {
  return Number(player?.boosts?.motherFlameFight || 0) > 0;
}

function applyFightLoss(message, player, playerTeam) {
  const expResults = calculateFightExp(playerTeam, false);

  const updatedCards = [...(player.cards || [])].map((card) => {
    const expEntry = expResults.find((entry) => entry.instanceId === card.instanceId);
    const unit = playerTeam.find((entry) => entry.instanceId === card.instanceId);

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

  const updatedDailyState = incrementQuestCounter(player, "fightsPlayed", 1);

  updatePlayer(message.author.id, {
    cards: updatedCards,
    fightStreak: 0,
    quests: {
      ...(player.quests || {}),
      dailyState: updatedDailyState,
    },
  });

  return expResults;
}

module.exports = {
  name: "fight",
  aliases: ["f"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const premiumMode = isMotherFlamePremium(player);
    const currentIsland = getPlayerFightIsland(player);
    const cooldownKey = premiumMode ? "fightMotherFlame" : "fight";
    const cooldownMs = premiumMode ? MOTHER_FLAME_FIGHT_COOLDOWN_MS : FIGHT_COOLDOWN_MS;
    const cooldownUntil = Number(player?.cooldowns?.[cooldownKey] || 0);

    if (cooldownUntil > Date.now()) {
      return message.reply(
        `You must wait **${formatRemaining(
          cooldownUntil - Date.now()
        )}** before using \`op fight\` again.`
      );
    }

    const combatBoosts = getPlayerCombatBoosts(player);
    const cards = (Array.isArray(player.cards) ? player.cards : [])
      .map(mergeOwnedCardWithLatestTemplate)
      .filter(Boolean);

    const teamSlots = Array.isArray(player?.team?.slots)
      ? player.team.slots
      : [null, null, null];

    const teamCards = teamSlots
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

    if (teamCards.length === 0) {
      return message.reply("You do not have any battle cards in your team.");
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
        return interaction.reply({
          content: "This fight has already ended.",
          ephemeral: true,
        });
      }

      if (interaction.customId === "fight_run") {
        battleEnded = true;
        logs.length = 0;
        logs.push("🏃 You ran away from the fight.");
        logs.push("🚫 No EXP gained from running away.");

        await interaction.update({
          embeds: [
            buildFightResultEmbed({
              title: "🏃 Fight Escaped",
              color: 0xf1c40f,
              result: "RUN AWAY",
              rewardLines: ["🚫 No rewards."],
              expLines: ["🚫 No EXP gained."],
              logs,
            }),
          ],
          components: [],
        });

        collector.stop("run");
        return;
      }

      const index = Number(interaction.customId.replace("fight_attack_", ""));
      const playerAttacker = playerTeam[index];

      if (!playerAttacker || Number(playerAttacker.battleHp ?? playerAttacker.hp) <= 0) {
        return interaction.reply({
          content: "That card cannot attack right now.",
          ephemeral: true,
        });
      }

      const enemyTarget = getFirstAlive(enemyTeam);

      if (!enemyTarget) {
        return interaction.reply({
          content: "No enemy is available to attack.",
          ephemeral: true,
        });
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
          logs.push(`⚡ ${actor.name} moved first with SPD ${actor.battleSpeed}.`);
          logs.push(`⚔️ ${actor.name} attacked ${target.name}.`);
          logs.push(`➡️ ${actor.name} dealt **${damage}** damage to ${target.name}.`);
        } else {
          logs.push(`⚡ ${actor.name} moved first with SPD ${actor.battleSpeed}.`);
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

        const reward = calculateWinReward(currentStreak, premiumMode);
        let updatedBoxes = [...(player.boxes || [])];

        reward.boxes.forEach((item) => {
          updatedBoxes = addOrIncrease(updatedBoxes, item);
        });

        const expResults = calculateFightExp(playerTeam, true);

        const updatedCards = [...(player.cards || [])].map((card) => {
          const expEntry = expResults.find((entry) => entry.instanceId === card.instanceId);
          const unit = playerTeam.find((entry) => entry.instanceId === card.instanceId);

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

        const expLines = formatExpResults(playerTeam, expResults);

        let updatedDailyState = incrementQuestCounter(player, "fightsPlayed", 1);

        updatedDailyState = incrementQuestCounter(
          {
            ...player,
            quests: {
              ...(player.quests || {}),
              dailyState: updatedDailyState,
            },
          },
          "fightsWon",
          1
        );

        updatePlayer(message.author.id, {
          cards: updatedCards,
          boxes: updatedBoxes,
          berries: Number(player.berries || 0) + reward.berries,
          gems: Number(player.gems || 0) + reward.gems,
          fightStreak: currentStreak,
          quests: {
            ...(player.quests || {}),
            dailyState: updatedDailyState,
          },
        });

        logs.push("🏆 You won the fight!");

        await interaction.update({
          embeds: [
            buildFightResultEmbed({
              title: "🏆 Fight Victory",
              color: 0x2ecc71,
              result: "WIN",
              rewardLines: [
                `💰 +${reward.berries.toLocaleString("en-US")} berries`,
                `💎 +${reward.gems} gems`,
                reward.boxes.length ? "📦 Basic Resource Box x1" : null,
              ].filter(Boolean),
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

        await interaction.update({
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

      await interaction.update({
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
        components: buildActionRows(playerTeam, false),
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