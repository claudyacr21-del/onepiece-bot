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
const {
  getPlayerCombatBoosts,
  applyDamageBoost,
  applyExpBoost,
} = require("../utils/combatStats");

const FIGHT_COOLDOWN_MS = 8 * 60 * 1000;
const MOTHER_FLAME_FIGHT_COOLDOWN_MS = 4 * 60 * 1000;
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

function formatExpResults(playerTeam, expResults) {
  return expResults
    .map((entry) => {
      const unit = playerTeam.find((card) => card.instanceId === entry.instanceId);
      if (!unit) return null;
      return `✨ ${unit.name} gained **${entry.expGain} EXP**.`;
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

  arr.push({ ...item, amount: Number(item.amount || 1) });
  return arr;
}

function getCardExp(card) {
  return Number(card.exp || 0);
}

function getExpToNextLevel(level) {
  const safeLevel = Math.max(1, Number(level || 1));
  return 100 + (safeLevel - 1) * 50;
}

function applyExpToCard(card, gainedExp) {
  let level = Number(card.level || 1);
  let exp = Number(card.exp || 0) + Number(gainedExp || 0);
  let leveledUp = 0;

  while (exp >= getExpToNextLevel(level)) {
    exp -= getExpToNextLevel(level);
    level += 1;
    leveledUp += 1;
  }

  return { ...card, level, exp, leveledUp };
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
    kills: rawCard.kills,
    fragments: rawCard.fragments,

    evolutionStage: rawCard.evolutionStage,
    evolutionKey: rawCard.evolutionKey,
    currentTier: rawCard.currentTier || template.currentTier,
    rarity: rawCard.rarity || template.rarity,

    equippedWeapons: Array.isArray(rawCard.equippedWeapons) ? rawCard.equippedWeapons : [],
    equippedWeapon: rawCard.equippedWeapon || null,
    equippedWeaponName: rawCard.equippedWeaponName || null,
    equippedWeaponCode: rawCard.equippedWeaponCode || null,
    equippedWeaponLevel: rawCard.equippedWeaponLevel || 0,

    equippedDevilFruit: rawCard.equippedDevilFruit || null,
    equippedDevilFruitName: rawCard.equippedDevilFruitName || null,

    cardRole: rawCard.cardRole || template.cardRole,
  });
}

function formatEquippedWeapons(card) {
  if (Array.isArray(card?.equippedWeapons) && card.equippedWeapons.length) {
    return card.equippedWeapons
      .map((w) => `${w.name}${Number(w.upgradeLevel || 0) > 0 ? ` +${w.upgradeLevel}` : ""}`)
      .join(", ");
  }

  return card?.displayWeaponName || card?.equippedWeapon || "None";
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
    exp: Number(card.exp || 0),
    kills: Number(card.kills || 0),
    image: card.image || "",

    equippedWeapon: formatEquippedWeapons(card),
    equippedDevilFruit:
      card.displayFruitName ||
      card.equippedDevilFruitName ||
      card.equippedDevilFruit ||
      "None",

    passiveBoostsApplied: {
      atk: Number(combatBoosts.atk || 0),
      hp: Number(combatBoosts.hp || 0),
      spd: Number(combatBoosts.spd || 0),
      dmg: Number(combatBoosts.dmg || 0),
      exp: Number(combatBoosts.exp || 0),
    },
  };
}

function createEnemy(name, rarity, atk, hp, speed) {
  return {
    name,
    rarity,

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

function generateEnemyTeam() {
  const pool = [
    createEnemy("Marine Recruit", "C", 35, 220, 35),
    createEnemy("Pirate Raider", "C", 40, 240, 32),
    createEnemy("Bounty Hunter", "B", 55, 290, 40),
    createEnemy("CP Agent", "A", 70, 340, 52),
    createEnemy("Vice Admiral Soldier", "S", 90, 420, 60),
  ];

  const picks = [];

  for (let i = 0; i < 3; i++) {
    const enemy = pool[Math.floor(Math.random() * pool.length)];
    picks.push({
      ...enemy,
      instanceId: `enemy-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
    });
  }

  return picks;
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

function renderHpBar(hp, maxHp, size = 10) {
  const current = Math.max(0, Number(hp || 0));
  const max = Math.max(1, Number(maxHp || 1));
  const filled = Math.round((current / max) * size);
  const safeFilled = Math.max(0, Math.min(size, filled));
  return `${"█".repeat(safeFilled)}${"░".repeat(size - safeFilled)} ${current}/${max}`;
}

function buildFightDescription(playerTeam, enemyTeam, logs, streak, premiumMode) {
  const playerLines = playerTeam.map((unit) => {
    return [
      `**${unit.slot}. ${unit.name}**`,
      `[${unit.rarity}] • ATK \`${formatAtkRange(unit.atk)}\` • SPD \`${unit.speed}\` • LV \`${unit.level}\``,
      `↪ Weapon: ${unit.equippedWeapon}`,
      `↪ Fruit: ${unit.equippedDevilFruit}`,
      renderHpBar(unit.hp, unit.maxHp),
    ].join("\n");
  });

  const enemyLines = enemyTeam.map((unit, index) => {
    return [
      `**${index + 1}. ${unit.name}**`,
      `[${unit.rarity}] • ATK \`${formatAtkRange(unit.atk)}\` • SPD \`${unit.speed}\``,
      renderHpBar(unit.hp, unit.maxHp),
    ].join("\n");
  });

  const recentLogs = logs.slice(-6);

  return [
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

function buildFightEmbed(playerName, playerTeam, enemyTeam, logs, streak, battleEnded, premiumMode) {
  return new EmbedBuilder()
    .setColor(battleEnded ? 0x2ecc71 : 0xc0392b)
    .setTitle(`⚔️ ${playerName}'s Fight`)
    .setDescription(buildFightDescription(playerTeam, enemyTeam, logs, streak, premiumMode))
    .setFooter({
      text: premiumMode ? "One Piece Bot • Mother Flame Fight" : "One Piece Bot • Manual Fight",
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

function calculateFightExp(playerTeam, won, premiumMode) {
  return playerTeam.map((unit) => {
    let expGain = premiumMode ? 16 : 10;
    if (won) expGain += premiumMode ? 20 : 15;
    if (Number(unit.battleHp ?? unit.hp) > 0) expGain += premiumMode ? 8 : 5;
    expGain += Number(unit.kills || 0) * 5;

    return {
      instanceId: unit.instanceId,
      expGain: applyExpBoost(expGain, unit.passiveBoostsApplied || {}),
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
  const expResults = calculateFightExp(playerTeam, false, isMotherFlamePremium(player));

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
      },
      expEntry.expGain
    );

    return { ...nextCard, kills: Number(unit.kills || 0) };
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
}

module.exports = {
  name: "fight",
  aliases: ["battle"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const premiumMode = isMotherFlamePremium(player);

    const cooldownKey = premiumMode ? "fightMotherFlame" : "fight";
    const cooldownMs = premiumMode ? MOTHER_FLAME_FIGHT_COOLDOWN_MS : FIGHT_COOLDOWN_MS;
    const cooldownUntil = Number(player?.cooldowns?.[cooldownKey] || 0);

    if (cooldownUntil > Date.now()) {
      return message.reply(
        `You must wait **${formatRemaining(cooldownUntil - Date.now())}** before using \`op fight\` again.`
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
    const enemyTeam = generateEnemyTeam();
    const logs = [];

    let battleEnded = false;
    let battleWon = false;
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
          premiumMode
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
        logs.push("🏃 You ran away from the fight.");
        applyFightLoss(message, player, playerTeam);

        await interaction.update({
          embeds: [
            buildFightEmbed(
              player.username || message.author.username,
              playerTeam,
              enemyTeam,
              logs,
              0,
              true,
              premiumMode
            ),
          ],
          components: buildActionRows(playerTeam, true),
        });

        collector.stop("run");
        return;
      }

      const index = Number(interaction.customId.replace("fight_attack_", ""));
      const attacker = playerTeam[index];

      if (!attacker || Number(attacker.battleHp ?? attacker.hp) <= 0) {
        return interaction.reply({
          content: "That card cannot attack right now.",
          ephemeral: true,
        });
      }

      const target = getFirstAlive(enemyTeam);
      if (!target) {
        return interaction.reply({
          content: "No enemy is available to attack.",
          ephemeral: true,
        });
      }

      const damage = performAttack(attacker, target, attacker.passiveBoostsApplied || combatBoosts);
      logs.push(`⚔️ ${attacker.name} dealt **${damage}** damage to ${target.name}.`);

      if (Number(target.battleHp ?? target.hp) <= 0) {
        attacker.kills += 1;
        logs.push(`☠️ ${target.name} was defeated.`);
      }

      if (!getAliveUnits(enemyTeam).length) {
        battleEnded = true;
        battleWon = true;
        currentStreak += 1;

        const reward = calculateWinReward(currentStreak, premiumMode);
        let updatedBoxes = [...(player.boxes || [])];

        reward.boxes.forEach((item) => {
          updatedBoxes = addOrIncrease(updatedBoxes, item);
        });

        const expResults = calculateFightExp(playerTeam, true, premiumMode);
        logs.push(...formatExpResults(playerTeam, expResults));

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
            },
            expEntry.expGain
          );

          return { ...nextCard, kills: Number(unit.kills || 0) };
        });

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
        logs.push(`💰 +${reward.berries.toLocaleString("en-US")} berries`);
        logs.push(`💎 +${reward.gems} gems`);
        if (reward.boxes.length) logs.push("📦 Basic Resource Box x1");

        await interaction.update({
          embeds: [
            buildFightEmbed(
              player.username || message.author.username,
              playerTeam,
              enemyTeam,
              logs,
              currentStreak,
              true,
              premiumMode
            ),
          ],
          components: buildActionRows(playerTeam, true),
        });

        collector.stop("win");
        return;
      }

      const retaliationPool = getAliveUnits(enemyTeam);

      for (const enemy of retaliationPool) {
        const retaliationTarget = getFirstAlive(playerTeam);
        if (!retaliationTarget) break;

        const retaliationDamage = performAttack(enemy, retaliationTarget, {});
        logs.push(`🩸 ${enemy.name} dealt **${retaliationDamage}** damage to ${retaliationTarget.name}.`);

        if (Number(retaliationTarget.battleHp ?? retaliationTarget.hp) <= 0) {
          logs.push(`☠️ ${retaliationTarget.name} was defeated.`);
        }
      }

      if (!getAliveUnits(playerTeam).length) {
        battleEnded = true;
        battleWon = false;
        applyFightLoss(message, player, playerTeam);
        logs.push("💀 You lost the fight.");

        await interaction.update({
          embeds: [
            buildFightEmbed(
              player.username || message.author.username,
              playerTeam,
              enemyTeam,
              logs,
              0,
              true,
              premiumMode
            ),
          ],
          components: buildActionRows(playerTeam, true),
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
            premiumMode
          ),
        ],
        components: buildActionRows(playerTeam, false),
      });
    });

    collector.on("end", async (_collected, reason) => {
      if (reason === "time" && !battleEnded) {
        try {
          battleEnded = true;

          const expResults = calculateFightExp(playerTeam, false, premiumMode);
          logs.push("⌛ No interaction for 5 minutes. You lost the fight.");
          logs.push(...formatExpResults(playerTeam, expResults));

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
              },
              expEntry.expGain
            );

            return { ...nextCard, kills: Number(unit.kills || 0) };
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

          await reply.edit({
            embeds: [
              buildFightEmbed(
                player.username || message.author.username,
                playerTeam,
                enemyTeam,
                logs,
                0,
                true,
                premiumMode
              ),
            ],
            components: buildActionRows(playerTeam, true),
          });
        } catch (_) {}
      }
    });
  },
};