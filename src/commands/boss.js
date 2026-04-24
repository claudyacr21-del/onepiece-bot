const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { ITEMS, cloneItem } = require("../data/items");
const { incrementQuestCounter } = require("../utils/questProgress");
const { getCurrentIsland } = require("../data/islands");
const cardsDb = require("../data/cards");
const { hydrateCard } = require("../utils/evolution");
const {
  getPlayerCombatCards,
  getPlayerCombatBoosts,
  applyDamageBoost,
  applyExpBoost,
} = require("../utils/combatStats");
const BOSS_COOLDOWN_MS = 10 * 60 * 1000;
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

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

  return {
    ...card,
    level,
    exp,
    leveledUp,
  };
}

function formatEquippedWeapons(card) {
  if (Array.isArray(card?.equippedWeapons) && card.equippedWeapons.length) {
    return card.equippedWeapons
      .map(
        (w) => `${w.name}${Number(w.upgradeLevel || 0) > 0 ? ` +${w.upgradeLevel}` : ""}`
      )
      .join(", ");
  }

  return card?.equippedWeapon || "None";
}

function toBattleUnit(card, slotIndex, combatBoosts = {}) {
  const synced = hydrateCard(card);

  return {
    slot: slotIndex + 1,
    instanceId: synced.instanceId,
    name: synced.displayName || synced.name || "Unknown",
    rarity: synced.currentTier || synced.rarity || "C",
    atk: Number(synced.atk || 0),
    hp: Number(synced.hp || 0),
    maxHp: Number(synced.hp || 0),
    speed: Number(synced.speed || 0),
    level: Number(synced.level || 1),
    exp: Number(synced.exp || 0),
    kills: Number(synced.kills || 0),
    image: synced.image || "",
    equippedWeapon: formatEquippedWeapons(synced),
    equippedDevilFruit: synced.equippedDevilFruit || "None",
    passiveBoostsApplied: {
      atk: Number(combatBoosts.atk || 0),
      hp: Number(combatBoosts.hp || 0),
      spd: Number(combatBoosts.spd || 0),
      dmg: Number(combatBoosts.dmg || 0),
      exp: Number(combatBoosts.exp || 0),
    },
  };
}

function formatRemaining(ms) {
  const safeMs = Math.max(0, Number(ms || 0));
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function clampHp(value) {
  return Math.max(0, Math.floor(value));
}

function performAttack(attacker, defender, boosts = {}) {
  const rawDamage = Math.max(
    1,
    Number(attacker.atk || 0) - Math.floor(Number(defender.speed || 0) * 0.15)
  );

  const finalDamage = applyDamageBoost(rawDamage, boosts);

  defender.hp = clampHp(Number(defender.hp || 0) - finalDamage);
  return finalDamage;
}

function getAliveUnits(units) {
  return units.filter((unit) => Number(unit.hp) > 0);
}

function getFirstAlive(units) {
  return units.find((unit) => Number(unit.hp) > 0) || null;
}

function renderHpBar(hp, maxHp, size = 12) {
  const current = Math.max(0, Number(hp || 0));
  const max = Math.max(1, Number(maxHp || 1));
  const filled = Math.round((current / max) * size);
  const safeFilled = Math.max(0, Math.min(size, filled));
  return `${"█".repeat(safeFilled)}${"░".repeat(size - safeFilled)} ${current}/${max}`;
}

function isPhasedIsland(island) {
  return Array.isArray(island?.bossPhases) && island.bossPhases.length > 0;
}

function getBossPhaseState(player, islandCode) {
  return player?.story?.bossPhases?.[islandCode] || {
    phase1Cleared: false,
    phase2Cleared: false,
    completed: false,
  };
}

function isIslandBossRouteCleared(player, island) {
  if (!isPhasedIsland(island)) {
    const clearedBosses = Array.isArray(player?.story?.clearedIslandBosses)
      ? player.story.clearedIslandBosses
      : [];
    return clearedBosses.includes(island.code);
  }

  const phaseState = getBossPhaseState(player, island.code);
  return Boolean(phaseState.phase1Cleared && phaseState.phase2Cleared && phaseState.completed);
}

function getActiveBossPhase(player, island) {
  if (!isPhasedIsland(island)) return null;

  const phaseState = getBossPhaseState(player, island.code);
  if (!phaseState.phase1Cleared) {
    return island.bossPhases.find((p) => Number(p.phase) === 1) || null;
  }

  if (!phaseState.phase2Cleared) {
    return island.bossPhases.find((p) => Number(p.phase) === 2) || null;
  }

  return null;
}

function getSpecialPhaseBossTemplate(phaseBoss, currentIsland) {
  const code = String(phaseBoss?.bossCode || "").toLowerCase();
  const order = Number(currentIsland?.order || 0);

  if (code === "five_elders_combined") {
    const hp = 12500 + order * 320;
    return {
      name: "Five Elders",
      rarity: "UR",
      atk: 560 + order * 8,
      hp,
      maxHp: hp,
      speed: 115 + Math.floor(order * 0.8),
      image: phaseBoss?.image || "",
    };
  }

  return null;
}

function getSpecialIslandBossTemplate(currentIsland) {
  const code = String(currentIsland?.code || "").toLowerCase();
  const order = Number(currentIsland?.order || 0);

  const specials = {
    foosha_village: {
      name: "Mountain Bandit Dadan",
      rarity: "C",
      atk: 70,
      hp: 900,
      speed: 28,
      image: currentIsland?.image || "",
    },
    reverse_mountain: {
      name: "Laboon",
      rarity: "A",
      atk: 185,
      hp: 3400,
      speed: 60,
      image: currentIsland?.image || "",
    },
    whiskey_peak: {
      name: "Baroque Works Agents",
      rarity: "B",
      atk: 138,
      hp: 2700,
      speed: 58,
      image: currentIsland?.image || "",
    },
    long_ring_long_land: {
      name: "Foxy",
      rarity: "A",
      atk: 185,
      hp: 3550,
      speed: 68,
      image: currentIsland?.image || "",
    },
    water_7: {
      name: "CP9 Lead Fight",
      rarity: "S",
      atk: 215,
      hp: 4300,
      speed: 82,
      image: currentIsland?.image || "",
    },
    sabaody: {
      name: "Pacifista Survival",
      rarity: "S",
      atk: 235,
      hp: 5200,
      speed: 86,
      image: currentIsland?.image || "",
    },
    impel_down: {
      name: "Magellan",
      rarity: "SS",
      atk: 270,
      hp: 6100,
      speed: 92,
      image: currentIsland?.image || "",
    },
  };

  const base = specials[code];
  if (!base) return null;

  const hp = Math.floor(Number(base.hp) + order * 90);
  return {
    ...base,
    atk: Math.floor(Number(base.atk) + order * 3),
    hp,
    maxHp: hp,
    speed: Math.floor(Number(base.speed) + order * 0.5),
  };
}

function getBossTemplate(currentIsland, phaseBoss = null) {
  const phaseSpecial = phaseBoss
    ? getSpecialPhaseBossTemplate(phaseBoss, currentIsland)
    : null;
  if (phaseSpecial) return phaseSpecial;

  const islandSpecial = !phaseBoss ? getSpecialIslandBossTemplate(currentIsland) : null;
  if (islandSpecial) return islandSpecial;

  const effectiveBossCode = phaseBoss?.bossCode || currentIsland?.bossCode || null;
  const fromDb = effectiveBossCode
    ? hydrateCard(cardsDb.find((card) => card.code === effectiveBossCode))
    : null;

  const shipTier = Number(currentIsland?.requiredShipTier || 1);
  const islandOrder = Number(currentIsland?.order || 0);

  const atkMulByTier = { 1: 1.75, 2: 2.0, 3: 2.3, 4: 2.7, 5: 3.1 };
  const hpMulByTier = { 1: 2.4, 2: 2.9, 3: 3.4, 4: 4.0, 5: 4.8 };
  const spdMulByTier = { 1: 1.2, 2: 1.28, 3: 1.36, 4: 1.45, 5: 1.55 };

  const atkMul = (atkMulByTier[shipTier] || 1.75) + islandOrder * 0.015;
  const hpMul = (hpMulByTier[shipTier] || 2.4) + islandOrder * 0.035;
  const spdMul = (spdMulByTier[shipTier] || 1.2) + islandOrder * 0.008;

  if (fromDb) {
    const baseAtk = Number(fromDb.atk || 100);
    const baseHp = Number(fromDb.hp || 1000);
    const baseSpeed = Number(fromDb.speed || 50);

    return {
      name: phaseBoss?.name || fromDb.displayName || fromDb.name,
      rarity: fromDb.currentTier || fromDb.rarity || "S",
      atk: Math.floor(baseAtk * atkMul),
      hp: Math.floor(baseHp * hpMul),
      maxHp: Math.floor(baseHp * hpMul),
      speed: Math.floor(baseSpeed * spdMul),
      image: phaseBoss?.image || currentIsland.image || fromDb.image || "",
    };
  }

  const fallbackAtk = 180 + shipTier * 45 + islandOrder * 8;
  const fallbackHp = 3200 + shipTier * 900 + islandOrder * 180;
  const fallbackSpeed = 90 + shipTier * 8 + Math.floor(islandOrder * 0.8);

  return {
    name: phaseBoss?.name || currentIsland?.boss || "Island Boss",
    rarity: shipTier >= 4 ? "UR" : "S",
    atk: fallbackAtk,
    hp: fallbackHp,
    maxHp: fallbackHp,
    speed: fallbackSpeed,
    image: phaseBoss?.image || currentIsland?.image || "",
  };
}

function buildBossEmbed(playerName, island, phaseBoss, playerTeam, boss, logs, ended) {
  const teamLines = playerTeam.map((unit) => {
    return [
      `**${unit.slot}. ${unit.name}** [${unit.rarity}] • LV \`${unit.level}\``,
      `↪ Weapon: ${unit.equippedWeapon}`,
      `↪ Fruit: ${unit.equippedDevilFruit}`,
      renderHpBar(unit.hp, unit.maxHp),
    ].join("\n");
  });

  const recentLogs = logs.slice(-6);
  const phaseLabel = phaseBoss ? ` • Phase ${phaseBoss.phase}` : "";

  return new EmbedBuilder()
    .setColor(ended ? 0x2ecc71 : 0xe74c3c)
    .setTitle(`👹 ${playerName}'s Boss Battle`)
    .setDescription(
      [
        `**Island:** \`${island.name}${phaseLabel}\``,
        `**Boss:** \`${boss.name}\` [${boss.rarity}]`,
        `**ATK:** \`${boss.atk}\` • **SPD:** \`${boss.speed}\``,
        renderHpBar(boss.hp, boss.maxHp),
        "",
        "## Your Team",
        ...teamLines,
        "",
        "## Battle Log",
        ...(recentLogs.length ? recentLogs : ["Choose a card to attack the island boss."]),
      ].join("\n")
    )
    .setImage(boss.image || null)
    .setFooter({ text: "One Piece Bot • Island Boss" });
}

function buildButtons(playerTeam, ended) {
  const row1 = new ActionRowBuilder();

  for (let i = 0; i < 3; i++) {
    const unit = playerTeam[i];

    row1.addComponents(
      new ButtonBuilder()
        .setCustomId(`boss_attack_${i}`)
        .setLabel(unit ? unit.name.slice(0, 20) : `Slot ${i + 1}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(ended || !unit || unit.hp <= 0)
    );
  }

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("boss_run")
      .setLabel("Run Away")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(ended)
  );

  return [row1, row2];
}

module.exports = {
  name: "boss",
  aliases: ["islandboss"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);

    const bossCooldownUntil = Number(player?.cooldowns?.boss || 0);
    if (bossCooldownUntil > Date.now()) {
      return message.reply(
        `You must wait **${formatRemaining(
          bossCooldownUntil - Date.now()
        )}** before using \`op boss\` again.`
      );
    }

    const currentIsland = getCurrentIsland(player);

    if (isIslandBossRouteCleared(player, currentIsland)) {
      return message.reply(
        `You already cleared the boss route of \`${currentIsland.name}\`.\nUse \`op sail\` to continue.`
      );
    }

    const phaseBoss = getActiveBossPhase(player, currentIsland);

    const combatBoosts = getPlayerCombatBoosts(player);
    const cards = getPlayerCombatCards(player);

    const teamSlots = Array.isArray(player?.team?.slots)
      ? player.team.slots
      : [null, null, null];

    const teamCards = teamSlots
      .map((instanceId, index) => {
        if (!instanceId) return null;
        const found = cards.find(
          (card) => card.instanceId === instanceId && card.cardRole !== "boost"
        );
        return found ? toBattleUnit(found, index, combatBoosts) : null;
      })
      .filter(Boolean);

    if (teamCards.length < 3) {
      return message.reply(
        "You need a full battle team of 3 cards to challenge the island boss."
      );
    }

    updatePlayer(message.author.id, {
      cooldowns: {
        ...(player.cooldowns || {}),
        boss: Date.now() + BOSS_COOLDOWN_MS,
      },
    });

    const playerTeam = [...teamCards].sort((a, b) => a.slot - b.slot);
    const boss = getBossTemplate(currentIsland, phaseBoss);
    const logs = [];
    let ended = false;

    const reply = await message.reply({
      embeds: [
        buildBossEmbed(
          player.username || message.author.username,
          currentIsland,
          phaseBoss,
          playerTeam,
          boss,
          logs,
          ended
        ),
      ],
      components: buildButtons(playerTeam, ended),
    });

    const collector = reply.createMessageComponentCollector({
      time: SESSION_TIMEOUT_MS,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the command user can control this boss battle.",
          ephemeral: true,
        });
      }

      if (ended) {
        return interaction.reply({
          content: "This boss battle has already ended.",
          ephemeral: true,
        });
      }

      if (interaction.customId === "boss_run") {
        ended = true;

        const updatedDailyState = incrementQuestCounter(player, "bossFights", 1);
        const updatedCards = [...(player.cards || [])].map((card) => {
          const unit = playerTeam.find((entry) => entry.instanceId === card.instanceId);
          if (!unit) return card;

          const nextCard = applyExpToCard(
            {
              ...card,
              kills: Number(unit.kills || 0),
              level: Number(card.level || 1),
              exp: getCardExp(card),
            },
            15
          );

          return { ...nextCard, kills: Number(unit.kills || 0) };
        });

        updatePlayer(message.author.id, {
          cards: updatedCards,
          quests: {
            ...(player.quests || {}),
            dailyState: updatedDailyState,
          },
        });

        logs.push("🏃 You ran away from the boss battle.");

        await interaction.update({
          embeds: [
            buildBossEmbed(
              player.username || message.author.username,
              currentIsland,
              phaseBoss,
              playerTeam,
              boss,
              logs,
              true
            ),
          ],
          components: buildButtons(playerTeam, true),
        });

        collector.stop("run");
        return;
      }

      const index = Number(interaction.customId.replace("boss_attack_", ""));
      const attacker = playerTeam[index];

      if (!attacker || attacker.hp <= 0) {
        return interaction.reply({
          content: "That card cannot attack right now.",
          ephemeral: true,
        });
      }

      const damage = performAttack(attacker, boss, attacker.passiveBoostsApplied || combatBoosts);
      logs.push(`⚔️ ${attacker.name} dealt **${damage}** damage to ${boss.name}.`);

      if (boss.hp <= 0) {
        ended = true;
        attacker.kills += 1;

        let updatedDailyState = incrementQuestCounter(player, "bossFights", 1);
        updatedDailyState = incrementQuestCounter(
          {
            ...player,
            quests: { ...(player.quests || {}), dailyState: updatedDailyState },
          },
          "bossesDefeated",
          1
        );

        const reward = {
          berries: 12000,
          gems: 30,
          boxes: [cloneItem(ITEMS.rareResourceBox, 1)],
        };

        let updatedBoxes = [...(player.boxes || [])];
        reward.boxes.forEach((item) => {
          updatedBoxes = addOrIncrease(updatedBoxes, item);
        });

        const updatedCards = [...(player.cards || [])].map((card) => {
          const unit = playerTeam.find((entry) => entry.instanceId === card.instanceId);
          if (!unit) return card;

          const rawExp = unit.hp > 0 ? 45 + unit.kills * 10 : 30 + unit.kills * 10;
          const gainedExp = applyExpBoost(rawExp, unit.passiveBoostsApplied || combatBoosts);
          const nextCard = applyExpToCard(
            {
              ...card,
              kills: Number(unit.kills || 0),
              level: Number(card.level || 1),
              exp: getCardExp(card),
            },
            gainedExp
          );

          return { ...nextCard, kills: Number(unit.kills || 0) };
        });

        const nextStory = {
          ...(player.story || {}),
          clearedIslandBosses: Array.isArray(player?.story?.clearedIslandBosses)
            ? [...player.story.clearedIslandBosses]
            : [],
          bossPhases: { ...(player?.story?.bossPhases || {}) },
        };

        if (phaseBoss) {
          const currentState = getBossPhaseState(player, currentIsland.code);
          const nextPhaseState = {
            ...currentState,
            phase1Cleared:
              Number(phaseBoss.phase) === 1 ? true : Boolean(currentState.phase1Cleared),
            phase2Cleared:
              Number(phaseBoss.phase) === 2 ? true : Boolean(currentState.phase2Cleared),
          };

          nextPhaseState.completed = Boolean(
            nextPhaseState.phase1Cleared && nextPhaseState.phase2Cleared
          );

          nextStory.bossPhases[currentIsland.code] = nextPhaseState;

          if (nextPhaseState.completed && !nextStory.clearedIslandBosses.includes(currentIsland.code)) {
            nextStory.clearedIslandBosses.push(currentIsland.code);
          }
        } else {
          if (!nextStory.clearedIslandBosses.includes(currentIsland.code)) {
            nextStory.clearedIslandBosses.push(currentIsland.code);
          }
        }

        updatePlayer(message.author.id, {
          cards: updatedCards,
          boxes: updatedBoxes,
          berries: Number(player.berries || 0) + reward.berries,
          gems: Number(player.gems || 0) + reward.gems,
          story: nextStory,
          quests: {
            ...(player.quests || {}),
            dailyState: updatedDailyState,
          },
        });

        logs.push(`👑 ${boss.name} was defeated!`);
        logs.push(`💰 +${reward.berries.toLocaleString("en-US")} berries`);
        logs.push(`💎 +${reward.gems} gems`);
        logs.push("📦 Rare Resource Box x1");

        if (phaseBoss) {
          if (Number(phaseBoss.phase) === 1) {
            logs.push(`✅ ${currentIsland.name} Phase 1 cleared.`);
          } else {
            logs.push(`✅ ${currentIsland.name} Phase 2 cleared.`);
          }

          const simulatedState = nextStory.bossPhases[currentIsland.code];
          if (simulatedState?.completed) {
            logs.push(`🚢 ${currentIsland.name} boss route is now fully cleared.`);
          }
        } else {
          logs.push(`✅ ${currentIsland.name} boss route is now cleared.`);
        }

        await interaction.update({
          embeds: [
            buildBossEmbed(
              player.username || message.author.username,
              currentIsland,
              phaseBoss,
              playerTeam,
              boss,
              logs,
              true
            ),
          ],
          components: buildButtons(playerTeam, true),
        });

        collector.stop("win");
        return;
      }

      const aliveEnemies = boss.hp > 0 ? [boss] : [];
      const alivePlayers = getAliveUnits(playerTeam);

      if (!aliveEnemies.length) {
        return;
      }

      const bossTarget = getFirstAlive(alivePlayers);
      if (bossTarget) {
        const bossDamage = performAttack(boss, bossTarget, {});
        logs.push(`💥 ${boss.name} dealt **${bossDamage}** damage to ${bossTarget.name}.`);

        if (bossTarget.hp <= 0) {
          logs.push(`☠️ ${bossTarget.name} was defeated.`);
        }
      }

      const remainingPlayers = getAliveUnits(playerTeam);
      if (!remainingPlayers.length) {
        ended = true;

        const updatedDailyState = incrementQuestCounter(player, "bossFights", 1);
        const updatedCards = [...(player.cards || [])].map((card) => {
          const unit = playerTeam.find((entry) => entry.instanceId === card.instanceId);
          if (!unit) return card;

          const nextCard = applyExpToCard(
            {
              ...card,
              kills: Number(unit.kills || 0),
              level: Number(card.level || 1),
              exp: getCardExp(card),
            },
            20 + unit.kills * 5
          );

          return { ...nextCard, kills: Number(unit.kills || 0) };
        });

        updatePlayer(message.author.id, {
          cards: updatedCards,
          quests: {
            ...(player.quests || {}),
            dailyState: updatedDailyState,
          },
        });

        logs.push(`💀 Your team was wiped out by ${boss.name}.`);

        await interaction.update({
          embeds: [
            buildBossEmbed(
              player.username || message.author.username,
              currentIsland,
              phaseBoss,
              playerTeam,
              boss,
              logs,
              true
            ),
          ],
          components: buildButtons(playerTeam, true),
        });

        collector.stop("lose");
        return;
      }

      await interaction.update({
        embeds: [
          buildBossEmbed(
            player.username || message.author.username,
            currentIsland,
            phaseBoss,
            playerTeam,
            boss,
            logs,
            false
          ),
        ],
        components: buildButtons(playerTeam, false),
      });
    });

    collector.on("end", async () => {
      try {
        await reply.edit({
          components: buildButtons(playerTeam, true),
        });
      } catch (_) {}
    });
  },
};