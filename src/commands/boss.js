const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { readPlayers, getPlayer, updatePlayer } = require("../playerStore");
const { ITEMS, cloneItem } = require("../data/items");
const { incrementQuestPayload } = require("../utils/questProgress");
const { getCurrentIsland } = require("../data/islands");
const cardsDb = require("../data/cards");
const { hydrateCard } = require("../utils/evolution");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const {
  applyDamageBoost,
  applyExpBoost,
} = require("../utils/combatStats");
const {
  getCardExp,
  getCardLevelCap,
  applyExpToCard,
} = require("../utils/cardExp");

const BOSS_COOLDOWN_MS = 10 * 60 * 1000;
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

const BOSS_PHASE_JOIN_MIN = 2;
const BOSS_PHASE_JOIN_MAX = 4;
const BOSS_JOIN_LOBBY_MS = 2 * 60 * 1000;

const BOSS_WIN_EXP_PER_CARD = 180;
const BOSS_LOSE_EXP_PER_CARD = 95;
const BOSS_MAX_LOG_LINES = 2;

const BOSS_GLOBAL_ATK_MULT = 1.12;
const BOSS_GLOBAL_HP_MULT = 1.18;
const BOSS_GLOBAL_SPD_MULT = 1.08;

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

function applyGlobalBossStats(template) {
  if (!template) return template;

  const atk = Math.max(1, Math.floor(Number(template.atk || 1) * BOSS_GLOBAL_ATK_MULT));
  const hp = Math.max(1, Math.floor(Number(template.hp || template.maxHp || 1) * BOSS_GLOBAL_HP_MULT));
  const speed = Math.max(1, Math.floor(Number(template.speed || 1) * BOSS_GLOBAL_SPD_MULT));

  return {
    ...template,
    atk,
    hp,
    maxHp: hp,
    speed,
  };
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

function formatExpResults(playerTeam, expResults) {
  return expResults
    .map((entry) => {
      const unit =
        playerTeam.find(
          (card) =>
            Number.isInteger(entry.sourceIndex) &&
            Number.isInteger(card.sourceIndex) &&
            card.sourceIndex === entry.sourceIndex
        ) || playerTeam.find((card) => card.instanceId === entry.instanceId);

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

function toBattleUnit(card, slotIndex, combatBoosts = {}) {
  const boosted = applyBoostedDisplayStats(card, combatBoosts);

  const displayAtk = Number(boosted.atk || 0);
  const displayHp = Number(boosted.hp || 0);
  const displaySpeed = Number(boosted.speed || 0);
  const displayPower = Number(boosted.currentPower || boosted.power || 0);

  return {
    slot: slotIndex + 1,
    sourceIndex: Number.isInteger(boosted.sourceIndex) ? boosted.sourceIndex : null,
    instanceId: boosted.instanceId,
    code: boosted.code,
    name: boosted.displayName || boosted.name || "Unknown",
    rarity: boosted.currentTier || boosted.rarity || "C",

    atk: displayAtk,
    hp: displayHp,
    maxHp: displayHp,
    speed: displaySpeed,
    currentPower: displayPower,

    battleAtk: displayAtk,
    battleHp: displayHp,
    battleMaxHp: displayHp,
    battleSpeed: displaySpeed,
    battlePower: displayPower,

    level: Number(boosted.level || 1),
    levelCap: getCardLevelCap(boosted),
    exp: getCardExp(boosted),
    kills: Number(boosted.kills || 0),
    image: boosted.image || "",

    passiveBoostsApplied: {
      atk: Number(combatBoosts.atk || 0),
      hp: Number(combatBoosts.hp || 0),
      spd: Number(combatBoosts.spd || 0),
      dmg: Number(combatBoosts.dmg || 0),
      exp: Number(combatBoosts.exp || 0),
    },
  };
}

function toBossBattleUnit(template) {
  const atk = Number(template.atk || 0);
  const hp = Number(template.hp || template.maxHp || 1);
  const speed = Number(template.speed || 0);

  return {
    ...template,
    instanceId: `boss-${Date.now()}`,
    atk,
    hp,
    maxHp: Number(template.maxHp || hp),
    speed,
    battleAtk: atk,
    battleHp: hp,
    battleMaxHp: Number(template.maxHp || hp),
    battleSpeed: speed,
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

function syncDisplayHp(unit) {
  const battleHp = Number(unit.battleHp ?? unit.hp ?? 0);
  const battleMaxHp = Math.max(1, Number(unit.battleMaxHp ?? unit.maxHp ?? 1));
  const ratio = Math.max(0, battleHp) / battleMaxHp;

  unit.battleHp = clampHp(battleHp);
  unit.hp = clampHp(Number(unit.maxHp || 0) * ratio);
}

function performAttack(attacker, defender, boosts = {}) {
  const atk = Number(attacker.battleAtk || attacker.atk || 0);
  const defSpeed = Number(defender.battleSpeed || defender.speed || 0);
  const rolledAtk = Math.floor(atk * (0.85 + Math.random() * 0.3));
  const rawDamage = Math.max(1, rolledAtk - Math.floor(defSpeed * 0.15));

  const isBossUnit = String(attacker.instanceId || "").startsWith("boss-");
  const finalDamage = isBossUnit ? rawDamage : applyDamageBoost(rawDamage, boosts);

  defender.battleHp = clampHp(
    Number(defender.battleHp ?? defender.hp ?? 0) - finalDamage
  );

  syncDisplayHp(defender);

  return finalDamage;
}

function resolveTurnOrder(playerUnit, bossUnit) {
  const playerSpeed = Number(playerUnit?.battleSpeed || playerUnit?.speed || 0);
  const bossSpeed = Number(bossUnit?.battleSpeed || bossUnit?.speed || 0);

  if (bossSpeed > playerSpeed) {
    return [
      {
        actor: bossUnit,
        target: playerUnit,
        isPlayer: false,
      },
      {
        actor: playerUnit,
        target: bossUnit,
        isPlayer: true,
      },
    ];
  }

  return [
    {
      actor: playerUnit,
      target: bossUnit,
      isPlayer: true,
    },
    {
      actor: bossUnit,
      target: playerUnit,
      isPlayer: false,
    },
  ];
}

function getAliveUnits(units) {
  return units.filter((unit) => Number(unit.battleHp ?? unit.hp) > 0);
}

function getAliveUnitIds(units) {
  return getAliveUnits(units).map((unit) => String(unit.instanceId || unit.globalSlot));
}

function isUnitUsedThisCycle(usedThisCycle, unit) {
  const key = String(unit?.instanceId || unit?.globalSlot || "");

  return Array.isArray(usedThisCycle) ? usedThisCycle.includes(key) : false;
}

function resetBossActionCycleIfReady(playerTeam, usedThisCycle) {
  const aliveIds = getAliveUnitIds(playerTeam);
  if (!aliveIds.length) return usedThisCycle;

  const usedAliveIds = (Array.isArray(usedThisCycle) ? usedThisCycle : []).filter((id) =>
    aliveIds.includes(String(id))
  );

  if (usedAliveIds.length >= aliveIds.length) {
    return [];
  }

  return usedAliveIds;
}

function pushBossLog(logs, line) {
  logs.push(line);

  if (logs.length > BOSS_MAX_LOG_LINES) {
    logs.splice(0, logs.length - BOSS_MAX_LOG_LINES);
  }
}

function renderHpBar(hp, maxHp, size = 12) {
  const current = Math.max(0, Number(hp || 0));
  const max = Math.max(1, Number(maxHp || 1));
  const filled = Math.round((current / max) * size);
  const safeFilled = Math.max(0, Math.min(size, filled));

  return `${"█".repeat(safeFilled)}${"░".repeat(size - safeFilled)} ${current}/${max}`;
}

function renderBossHpBar(hp, maxHp, size = 18) {
  const current = Math.max(0, Number(hp || 0));
  const max = Math.max(1, Number(maxHp || 1));
  const filled = Math.round((current / max) * size);
  const safeFilled = Math.max(0, Math.min(size, filled));

  return `${"🟩".repeat(safeFilled)}${"⬛".repeat(size - safeFilled)}`;
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

  return Boolean(
    phaseState.phase1Cleared &&
      phaseState.phase2Cleared &&
      phaseState.completed
  );
}

function getActiveBossPhase(player, island) {
  if (!isPhasedIsland(island)) return null;

  const phaseState = getBossPhaseState(player, island.code);

  if (!phaseState.phase1Cleared) {
    return island.bossPhases.find((phase) => Number(phase.phase) === 1) || null;
  }

  if (!phaseState.phase2Cleared) {
    return island.bossPhases.find((phase) => Number(phase.phase) === 2) || null;
  }

  return null;
}

function getBossPhaseForBattle(player, island) {
  if (!isPhasedIsland(island)) return null;

  const activePhase = getActiveBossPhase(player, island);
  if (activePhase) return activePhase;

  const phases = Array.isArray(island.bossPhases) ? island.bossPhases : [];

  return (
    [...phases]
      .sort((a, b) => Number(b.phase || 0) - Number(a.phase || 0))
      .find(Boolean) || null
  );
}

function requiresJoinLobbyForBossPhase(island, phaseBoss) {
  if (!phaseBoss) return false;

  const islandCode = String(island?.code || "").toLowerCase();
  const phase = Number(phaseBoss?.phase || 0);

  if (phaseBoss.requiresParty) return true;

  return ["egghead", "elbaf"].includes(islandCode) && phase === 2;
}

function normalizePhaseArg(args = []) {
  const raw = String(args[0] || "").toLowerCase().trim();
  if (["1", "p1", "phase1", "phase-1"].includes(raw)) return 1;
  if (["2", "p2", "phase2", "phase-2"].includes(raw)) return 2;
  return null;
}

function getRequestedBossPhase(player, island, args = []) {
  if (!isPhasedIsland(island)) return null;

  const requestedPhase = normalizePhaseArg(args);
  const phases = Array.isArray(island.bossPhases) ? island.bossPhases : [];

  if (!requestedPhase) return getBossPhaseForBattle(player, island);

  const phaseBoss = phases.find((phase) => Number(phase.phase) === requestedPhase);
  if (!phaseBoss) return null;

  const phaseState = getBossPhaseState(player, island.code);

  if (requestedPhase === 2 && !phaseState.phase1Cleared) {
    return {
      error: `You must clear **${island.name} Phase 1** before challenging Phase 2.`,
    };
  }

  return phaseBoss;
}

function isBossPhaseTwoParty(island, phaseBoss) {
  return requiresJoinLobbyForBossPhase(island, phaseBoss);
}

function getIslandBossImage(currentIsland, phaseBoss = null, fromDb = null) {
  return (
    phaseBoss?.bossImage ||
    phaseBoss?.image ||
    currentIsland?.bossImage ||
    fromDb?.image ||
    currentIsland?.image ||
    ""
  );
}

function getSpecialPhaseBossTemplate(phaseBoss, currentIsland) {
  const code = String(phaseBoss?.bossCode || "").toLowerCase();
  const order = Number(currentIsland?.order || 0);

  if (code === "five_elders_combined") {
    const hp = 18000 + order * 520;

    return applyGlobalBossStats({
      name: "Five Elders",
      rarity: "UR",
      atk: 850 + order * 16,
      hp,
      maxHp: hp,
      speed: 145 + Math.floor(order * 1.2),
      image: getIslandBossImage(currentIsland, phaseBoss, null),
    });
  }

  return null;
}

function getSpecialIslandBossTemplate(currentIsland) {
  const code = String(currentIsland?.code || "").toLowerCase();
  const order = Number(currentIsland?.order || 0);
  const image = getIslandBossImage(currentIsland, null, null);

  const specials = {
    foosha_village: {
      name: "Mountain Bandit Dadan",
      rarity: "C",
      atk: 200,
      hp: 1500,
      speed: 45,
      image,
    },
    reverse_mountain: {
      name: "Laboon",
      rarity: "A",
      atk: 285,
      hp: 4700,
      speed: 72,
      image,
    },
    whiskey_peak: {
      name: "Baroque Works Agents",
      rarity: "B",
      atk: 245,
      hp: 3900,
      speed: 78,
      image,
    },
    long_ring_long_land: {
      name: "Foxy",
      rarity: "A",
      atk: 310,
      hp: 4800,
      speed: 88,
      image,
    },
    water_7: {
      name: "CP9 Lead Fight",
      rarity: "S",
      atk: 390,
      hp: 6500,
      speed: 106,
      image,
    },
    sabaody: {
      name: "Pacifista Survival",
      rarity: "S",
      atk: 430,
      hp: 7600,
      speed: 112,
      image,
    },
    impel_down: {
      name: "Magellan",
      rarity: "SS",
      atk: 520,
      hp: 9200,
      speed: 122,
      image,
    },
  };

  const base = specials[code];

  if (!base) return null;

  const hp = Math.floor(Number(base.hp) + order * 180);

  return applyGlobalBossStats({
    ...base,
    atk: Math.floor(Number(base.atk) + order * 9),
    hp,
    maxHp: hp,
    speed: Math.floor(Number(base.speed) + order * 1.1),
    image,
  });
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

  const atkMulByTier = {
    1: 2.45,
    2: 2.85,
    3: 3.25,
    4: 3.8,
    5: 4.35,
  };

  const hpMulByTier = {
    1: 3.1,
    2: 3.75,
    3: 4.45,
    4: 5.25,
    5: 6.2,
  };

  const spdMulByTier = {
    1: 1.35,
    2: 1.45,
    3: 1.58,
    4: 1.7,
    5: 1.85,
  };

  const atkMul = (atkMulByTier[shipTier] || 2.45) + islandOrder * 0.028;
  const hpMul = (hpMulByTier[shipTier] || 3.1) + islandOrder * 0.055;
  const spdMul = (spdMulByTier[shipTier] || 1.35) + islandOrder * 0.012;

  if (fromDb) {
    const baseAtk = Number(fromDb.atk || 100);
    const baseHp = Number(fromDb.hp || 1000);
    const baseSpeed = Number(fromDb.speed || 50);

    const hp = Math.floor(baseHp * hpMul);

    return applyGlobalBossStats({
      name: phaseBoss?.name || fromDb.displayName || fromDb.name,
      rarity: fromDb.currentTier || fromDb.rarity || "S",
      atk: Math.floor(baseAtk * atkMul),
      hp,
      maxHp: hp,
      speed: Math.floor(baseSpeed * spdMul),
      image: getIslandBossImage(currentIsland, phaseBoss, fromDb),
    });
  }

  const fallbackAtk = 280 + shipTier * 75 + islandOrder * 16;
  const fallbackHp = 4600 + shipTier * 1350 + islandOrder * 320;
  const fallbackSpeed = 105 + shipTier * 12 + Math.floor(islandOrder * 1.25);

  return applyGlobalBossStats({
    name: phaseBoss?.name || currentIsland?.boss || "Island Boss",
    rarity: shipTier >= 4 ? "UR" : "S",
    atk: fallbackAtk,
    hp: fallbackHp,
    maxHp: fallbackHp,
    speed: fallbackSpeed,
    image: getIslandBossImage(currentIsland, phaseBoss, null),
  });
}

function buildPhaseSelectEmbed(island, player) {
  const phaseState = getBossPhaseState(player, island.code);
  const phases = Array.isArray(island.bossPhases) ? island.bossPhases : [];

  const lines = phases.map((phase) => {
    const num = Number(phase.phase || 0);
    const cleared =
      num === 1 ? phaseState.phase1Cleared :
      num === 2 ? phaseState.phase2Cleared :
      false;

    return `**Phase ${num}:** ${phase.name || phase.bossName || "Boss"} ${
      cleared ? "✅ Cleared" : "⚔️ Available"
    }`;
  });

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${island.name} Boss Phase Select`)
    .setDescription(
      [
        "Choose which boss phase you want to fight.",
        "",
        ...lines,
        "",
        `Phase 2 uses raid-style party room.`,
        `Minimum **${BOSS_PHASE_JOIN_MIN} players**, maximum **${BOSS_PHASE_JOIN_MAX} players**.`,
        `Each player joins with their current full **3-card team**.`,
        `Max total party cards: **${BOSS_PHASE_JOIN_MAX * 3} cards**.`,
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Boss Phase Select",
    });
}

function buildPhaseSelectRows(player, island) {
  const phaseState = getBossPhaseState(player, island.code);

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("boss_phase_1")
        .setLabel("Phase 1 Boss")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("boss_phase_2")
        .setLabel("Phase 2 Raid Boss")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!phaseState.phase1Cleared)
    ),
  ];
}

async function chooseBossPhase(message, player, island) {
  if (!isPhasedIsland(island)) return null;

  const sent = await message.reply({
    embeds: [buildPhaseSelectEmbed(island, player)],
    components: buildPhaseSelectRows(player, island),
  });

  try {
    const interaction = await sent.awaitMessageComponent({
      time: 60 * 1000,
      filter: (button) =>
        button.user.id === message.author.id &&
        ["boss_phase_1", "boss_phase_2"].includes(button.customId),
    });

    const selectedPhase = interaction.customId === "boss_phase_2" ? 2 : 1;
    const phaseBoss = getRequestedBossPhase(player, island, [String(selectedPhase)]);

    if (phaseBoss?.error) {
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("Boss Phase Locked")
            .setDescription(phaseBoss.error),
        ],
        components: [],
      });

      return {
        cancelled: true,
      };
    }

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("Boss Phase Selected")
          .setDescription(`Starting **${island.name} Phase ${selectedPhase}**...`),
      ],
      components: [],
    });

    return phaseBoss;
  } catch (_) {
    try {
      await sent.edit({
        components: [],
      });
    } catch {}

    return {
      cancelled: true,
    };
  }
}

function buildBossJoinEmbed(
  hostId,
  island,
  phaseBoss,
  joinedIds,
  statusText = "",
  participants = []
) {
  const phaseLabel = phaseBoss ? `Phase ${phaseBoss.phase}` : "Boss Phase";
  const joinedCount = joinedIds.size;
  const totalCards = joinedCount * 3;

  const participantLines = Array.isArray(participants) && participants.length
    ? participants.map((participant, playerIndex) => {
        const username =
          participant.username ||
          participant.ownerName ||
          `Player ${playerIndex + 1}`;

        const cards = Array.isArray(participant.units) ? participant.units : [];

        const cardLines = cards.slice(0, 3).map((unit, cardIndex) => {
          return `   ${cardIndex + 1}. ${unit.name || "Unknown"}`;
        });

        return [
          `**${playerIndex + 1}. ${username}** <@${participant.userId}>`,
          cardLines.length ? cardLines.join("\n") : "   No battle cards found.",
        ].join("\n");
      })
    : [...joinedIds].map((id, index) => `**${index + 1}.** <@${id}>`);

  return new EmbedBuilder()
    .setColor(joinedCount >= BOSS_PHASE_JOIN_MIN ? 0x2ecc71 : 0xf1c40f)
    .setTitle(`🏴‍☠️ ${island.name} ${phaseLabel} Raid Party Room`)
    .setDescription(
      [
        `**Host:** <@${hostId}>`,
        `**Players:** ${joinedCount}/${BOSS_PHASE_JOIN_MAX}`,
        `**Required:** ${BOSS_PHASE_JOIN_MIN}-${BOSS_PHASE_JOIN_MAX} players`,
        `**Party Cards:** ${totalCards}/${BOSS_PHASE_JOIN_MAX * 3}`,
        "",
        "**Joined Party:**",
        participantLines.length ? participantLines.join("\n\n") : "No one has joined yet.",
        "",
        statusText ||
          "Users who press **Join** will enter with their current full 3-card team.",
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Boss Phase 2 Party Room",
    });
}

function buildBossJoinButtons(joinedCount = 0) {
  const full = Number(joinedCount || 0) >= BOSS_PHASE_JOIN_MAX;
  const canStart = Number(joinedCount || 0) >= BOSS_PHASE_JOIN_MIN;

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("boss_lobby_join")
        .setLabel(full ? "Party Full" : "Join")
        .setStyle(ButtonStyle.Success)
        .setDisabled(full),

      new ButtonBuilder()
        .setCustomId("boss_lobby_start")
        .setLabel("Start")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!canStart),

      new ButtonBuilder()
        .setCustomId("boss_lobby_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

function formatTeamPreview(teamCards) {
  return teamCards
    .map((unit, index) => {
      return `${index + 1}. ${unit.name} [${unit.rarity}]`;
    })
    .join("\n");
}

function getDuplicatePartyCards(participants) {
  const map = new Map();

  for (const participant of participants) {
    for (const unit of participant.units || []) {
      const key = String(unit.code || unit.name || "").toLowerCase();
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, {
          name: unit.name,
          users: [],
        });
      }

      map.get(key).users.push(participant.username);
    }
  }

  return [...map.values()].filter((entry) => entry.users.length > 1);
}

function getUnitActionKey(unit) {
  return [
    String(unit?.ownerId || unit?.userId || "solo"),
    String(unit?.instanceId || ""),
    String(unit?.globalSlot ?? unit?.slot ?? ""),
  ].join(":");
}

function getAliveActionKeys(units) {
  return getAliveUnits(units).map((unit) => getUnitActionKey(unit));
}

function shouldDisableLastUsed(units, lastUsedKey, unit) {
  if (!lastUsedKey) return false;

  const aliveKeys = getAliveActionKeys(units);
  if (aliveKeys.length <= 1) return false;

  return getUnitActionKey(unit) === String(lastUsedKey);
}

async function waitForBossJoinLobby(message, island, phaseBoss) {
  const joinedIds = new Set([String(message.author.id)]);
  let approved = false;
  let cancelled = false;

  const getJoinedParticipantsPreview = async (extraUserId = null, extraPlayer = null, extraUsername = null) => {
    const ids = [...joinedIds];

    if (extraUserId && !ids.includes(String(extraUserId))) {
      ids.push(String(extraUserId));
    }

    const players = readPlayers();
    const participants = [];

    for (const userId of ids) {
      const player =
        extraUserId && String(extraUserId) === String(userId) && extraPlayer
          ? extraPlayer
          : userId === String(message.author.id)
          ? getPlayer(userId, message.author.username)
          : players[userId];

      const username =
        extraUserId && String(extraUserId) === String(userId) && extraUsername
          ? extraUsername
          : userId === String(message.author.id)
          ? message.author.username
          : await resolveUsernameSafe(message, userId);

      if (!player) continue;

      const { teamCards } = getFullTeamFromPlayer(player);

      participants.push({
        userId,
        username: player.username || username,
        units: teamCards.map((unit) => ({
          ...unit,
          ownerId: userId,
          ownerName: player.username || username,
        })),
      });
    }

    return participants;
  };

  const initialParticipants = await getJoinedParticipantsPreview();

  const lobbyMessage = await message.reply({
    embeds: [
      buildBossJoinEmbed(
        message.author.id,
        island,
        phaseBoss,
        joinedIds,
        "Host is counted as joined.\nOther users can press **Join** to confirm their full 3-card team.",
        initialParticipants
      ),
    ],
    components: buildBossJoinButtons(joinedIds.size),
  });

  const collector = lobbyMessage.createMessageComponentCollector({
    time: BOSS_JOIN_LOBBY_MS,
  });

  await new Promise((resolve) => {
    collector.on("collect", async (interaction) => {
      if (interaction.customId === "boss_lobby_join") {
        const userId = String(interaction.user.id);

        if (joinedIds.size >= BOSS_PHASE_JOIN_MAX) {
          return interaction.reply({
            content: `This Boss Phase 2 party is already full. Max **${BOSS_PHASE_JOIN_MAX} players** / **${BOSS_PHASE_JOIN_MAX * 3} cards**.`,
            ephemeral: true,
          });
        }

        if (joinedIds.has(userId)) {
          return interaction.reply({
            content: "You already joined this Boss Phase 2 raid.",
            ephemeral: true,
          });
        }

        const players = readPlayers();
        const joiningPlayer = players[userId];

        if (!joiningPlayer) {
          return interaction.reply({
            content: "You do not have player data yet.",
            ephemeral: true,
          });
        }

        const username = await resolveUsernameSafe(message, userId);
        const { teamCards } = getFullTeamFromPlayer(joiningPlayer);

        if (teamCards.length < 3) {
          return interaction.reply({
            content: "You need a full battle team of 3 cards to join Boss Phase 2.",
            ephemeral: true,
          });
        }

        const previewParticipants = await getJoinedParticipantsPreview(userId, joiningPlayer, username);
        const duplicates = getDuplicatePartyCards(previewParticipants);

        const confirmEmbed = new EmbedBuilder()
          .setColor(duplicates.length ? 0xe74c3c : 0x2ecc71)
          .setTitle("Confirm Boss Phase 2 Join")
          .setDescription(
            [
              "You will join with these cards:",
              "",
              formatTeamPreview(teamCards),
              "",
              duplicates.length
                ? [
                    "⚠️ Duplicate card detected in party:",
                    ...duplicates.map((dup) => `- ${dup.name} used by ${dup.users.join(" and ")}`),
                    "",
                    "You cannot join while party has duplicate card codes.",
                  ].join("\n")
                : "No duplicate card detected. Press Confirm to join.",
            ].join("\n")
          );

        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("boss_join_confirm")
            .setLabel("Confirm Join")
            .setStyle(ButtonStyle.Success)
            .setDisabled(Boolean(duplicates.length)),
          new ButtonBuilder()
            .setCustomId("boss_join_cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({
          embeds: [confirmEmbed],
          components: [confirmRow],
          ephemeral: true,
        });

        const confirmReply = await interaction.fetchReply();
        let confirmInteraction;

        try {
          confirmInteraction = await confirmReply.awaitMessageComponent({
            time: 60 * 1000,
            filter: (button) =>
              button.user.id === interaction.user.id &&
              ["boss_join_confirm", "boss_join_cancel"].includes(button.customId),
          });
        } catch (_) {
          return interaction.editReply({
            content: "Join confirmation expired.",
            embeds: [],
            components: [],
          }).catch(() => null);
        }

                if (confirmInteraction.customId === "boss_join_cancel") {
          return confirmInteraction.update({
            content: "Join cancelled.",
            embeds: [],
            components: [],
          });
        }

        const finalParticipants = await getJoinedParticipantsPreview(userId, joiningPlayer, username);
        const finalDuplicates = getDuplicatePartyCards(finalParticipants);

        if (finalDuplicates.length) {
          return confirmInteraction.update({
            content: [
              "Join failed because another party member already uses the same card.",
              "",
              ...finalDuplicates.map((dup) => `- ${dup.name} used by ${dup.users.join(" and ")}`),
            ].join("\n"),
            embeds: [],
            components: [],
          });
        }

        joinedIds.add(userId);

        await confirmInteraction.update({
          content: `Joined Boss Phase 2 raid with:\n${formatTeamPreview(teamCards)}`,
          embeds: [],
          components: [],
        });

        const updatedParticipants = await getJoinedParticipantsPreview();

        await lobbyMessage.edit({
          embeds: [
            buildBossJoinEmbed(
              message.author.id,
              island,
              phaseBoss,
              joinedIds,
              joinedIds.size >= BOSS_PHASE_JOIN_MIN
                ? joinedIds.size >= BOSS_PHASE_JOIN_MAX
                  ? "Party is full.\nThe host can press **Start**."
                  : "Enough users joined.\nThe host can press **Start**, or wait for more players."
                : "Waiting for more users to press **Join**.",
              updatedParticipants
            ),
          ],
          components: buildBossJoinButtons(joinedIds.size),
        });

        return;
      }

      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the host can start or cancel this boss lobby.",
          ephemeral: true,
        });
      }

      if (interaction.customId === "boss_lobby_cancel") {
        cancelled = true;

        const cancelParticipants = await getJoinedParticipantsPreview();

        await interaction.update({
          embeds: [
            buildBossJoinEmbed(
              message.author.id,
              island,
              phaseBoss,
              joinedIds,
              "Boss lobby cancelled.",
              cancelParticipants
            ),
          ],
          components: [],
        });

        collector.stop("cancelled");
        resolve();
        return;
      }

      if (interaction.customId === "boss_lobby_start") {
        if (joinedIds.size < BOSS_PHASE_JOIN_MIN) {
          return interaction.reply({
            content: `You need at least **${BOSS_PHASE_JOIN_MIN} users** to start this boss phase.\nAsk another user to press **Join** first.`,
            ephemeral: true,
          });
        }

        const participants = await getJoinedParticipantsPreview();
        const duplicates = getDuplicatePartyCards(participants);

        if (duplicates.length) {
          return interaction.reply({
            content: [
              "Cannot start because duplicate cards exist in the party:",
              ...duplicates.map((dup) => `- ${dup.name} used by ${dup.users.join(" and ")}`),
            ].join("\n"),
            ephemeral: true,
          });
        }

        approved = true;

        const startParticipants = await getJoinedParticipantsPreview();

        await interaction.update({
          embeds: [
            buildBossJoinEmbed(
              message.author.id,
              island,
              phaseBoss,
              joinedIds,
              "Boss lobby approved.\nStarting boss battle...",
              startParticipants
            ),
          ],
          components: [],
        });

        collector.stop("started");
        resolve();
      }
    });

    collector.on("end", async (_collected, reason) => {
      if (approved || cancelled || reason === "started" || reason === "cancelled") {
        resolve();
        return;
      }

      cancelled = true;

      try {
        const expiredParticipants = await getJoinedParticipantsPreview();

        await lobbyMessage.edit({
          embeds: [
            buildBossJoinEmbed(
              message.author.id,
              island,
              phaseBoss,
              joinedIds,
              "Boss lobby expired.\nPlease run `op boss` again.",
              expiredParticipants
            ),
          ],
          components: [],
        });
      } catch (_) {}

      resolve();
    });
  });

  return {
    approved,
    cancelled,
    joinedIds: [...joinedIds],
  };
}

function buildBossEmbed(playerName, island, phaseBoss, playerTeam, boss, logs, ended) {
  const teamLines = playerTeam.map((unit) => {
    return `**${unit.slot}. ${unit.name}** ❤️ ${Math.max(0, Number(unit.battleHp ?? unit.hp))}/${Number(unit.battleMaxHp ?? unit.maxHp)} | PWR \`${Number(unit.battlePower || unit.currentPower || 0).toLocaleString("en-US")}\` | SPD \`${unit.battleSpeed || unit.speed}\` | ⚔️ ${formatAtkRange(unit.battleAtk || unit.atk)}`;
  });

  const recentLogs = logs.slice(-BOSS_MAX_LOG_LINES);
  const phaseLabel = phaseBoss ? ` Phase ${phaseBoss.phase}` : "";

  return new EmbedBuilder()
    .setColor(ended ? 0x2ecc71 : 0xe74c3c)
    .setTitle(`${playerName}'s ${island.name}${phaseLabel} Boss Battle`)
    .setDescription(
      [
        "**Selection Phase**",
        "Select a character to deploy for battle!",
        "",
        "## ☠️ Boss",
        `**${boss.name}** [${boss.rarity}]`,
        renderBossHpBar(boss.battleHp ?? boss.hp, boss.battleMaxHp ?? boss.maxHp),
        `❤️ ${Math.max(0, Number(boss.battleHp ?? boss.hp))}/${Number(boss.battleMaxHp ?? boss.maxHp)} | SPD \`${boss.battleSpeed || boss.speed}\` | ⚔️ ${formatAtkRange(boss.battleAtk || boss.atk)}`,
        "",
        "## Battle Log",
        ...(recentLogs.length ? recentLogs : ["Choose a card to attack the island boss."]),
        "",
        "## Your Team",
        ...teamLines,
      ].join("\n")
    )
    .setImage(boss.image || null)
    .setFooter({
      text: "One Piece Bot • Island Boss",
    });
}

function buildBossResultEmbed({
  title,
  color,
  result,
  rewardLines = [],
  expLines = [],
  storyLines = [],
  logs = [],
}) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(
      [
        `**Result:** ${result}`,
        "",
        "## Final Log",
        ...(logs.length ? logs.slice(-2) : ["No final log."]),
        "",
        rewardLines.length ? "## Rewards" : null,
        ...rewardLines,
        rewardLines.length ? "" : null,
        expLines.length ? "## EXP" : null,
        ...expLines,
        expLines.length ? "" : null,
        storyLines.length ? "## Story Progress" : null,
        ...storyLines,
      ]
        .filter(Boolean)
        .join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Boss Result",
    });
}

function buildButtons(playerTeam, ended, usedThisCycle = []) {
  const rows = [];
  let currentRow = new ActionRowBuilder();

  playerTeam.forEach((unit, index) => {
    const isDead = Number(unit.battleHp ?? unit.hp) <= 0;
    const alreadyUsed = isUnitUsedThisCycle(usedThisCycle, unit);

    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`boss_attack_${index}`)
        .setLabel(unit.name.slice(0, 80))
        .setStyle(isDead || alreadyUsed ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(Boolean(ended || isDead || alreadyUsed))
    );

    if (currentRow.components.length >= 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
  });

  if (currentRow.components.length) rows.push(currentRow);

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("boss_run")
        .setLabel("Run Away")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(Boolean(ended))
    )
  );

  return rows;
}

function buildBossRunConfirmButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("boss_run_confirm")
        .setLabel("Confirm Run Away")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("boss_run_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

function buildRaidBossRunConfirmButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("boss_raid_run_confirm")
        .setLabel("Confirm Run Away")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("boss_raid_run_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

function calculateBossExp(playerTeam, won, combatBoosts) {
  const baseExp = won ? BOSS_WIN_EXP_PER_CARD : BOSS_LOSE_EXP_PER_CARD;

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

    return {
      sourceIndex: Number.isInteger(unit.sourceIndex) ? unit.sourceIndex : null,
      instanceId: unit.instanceId,
      expGain: applyExpBoost(baseExp, unit.passiveBoostsApplied || combatBoosts),
      locked: false,
      level,
      cap,
      leveledUp: 0,
    };
  });
}

function applyBossExpToCards(player, playerTeam, expResults) {
  return [...(player.cards || [])].map((card, index) => {
    const unit =
      playerTeam.find(
        (entry) =>
          Number.isInteger(entry.sourceIndex) && entry.sourceIndex === index
      ) || playerTeam.find((entry) => entry.instanceId === card.instanceId);

    const expEntry =
      expResults.find(
        (entry) =>
          Number.isInteger(entry.sourceIndex) && entry.sourceIndex === index
      ) || expResults.find((entry) => entry.instanceId === card.instanceId);

    if (!unit || !expEntry) return card;

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

function applyBossQuestProgress(player, keys) {
  let nextPlayer = {
    ...player,
  };

  let nextQuests = player.quests || {};

  for (const key of keys) {
    nextQuests = incrementQuestPayload(
      {
        ...nextPlayer,
        quests: nextQuests,
      },
      key,
      1
    );

    nextPlayer = {
      ...nextPlayer,
      quests: nextQuests,
    };
  }

  return nextQuests;
}

function getFullTeamFromPlayer(player) {
  const combatBoosts = getPassiveBoostSummary(player);

  const cards = (Array.isArray(player.cards) ? player.cards : [])
    .map((rawCard, sourceIndex) => {
      const card = hydrateCard(rawCard);
      if (!card) return null;

      return {
        ...card,
        sourceIndex,
      };
    })
    .filter((card) => String(card.cardRole || "").toLowerCase() !== "boost");

  const teamSlots = Array.isArray(player?.team?.slots)
    ? player.team.slots.slice(0, 3)
    : [null, null, null];

  const teamCards = teamSlots
    .map((instanceId, index) => {
      if (!instanceId) return null;

      const found = cards.find(
        (card) =>
          String(card.instanceId || "") === String(instanceId) &&
          String(card.cardRole || "").toLowerCase() !== "boost"
      );

      return found ? toBattleUnit(found, index, combatBoosts) : null;
    })
    .filter(Boolean);

  return {
    combatBoosts,
    teamCards: teamCards.sort((a, b) => a.slot - b.slot),
  };
}

async function resolveUsernameSafe(message, userId) {
  const id = String(userId);
  const cachedMember = message.guild?.members?.cache?.get(id);
  if (cachedMember?.user?.username) return cachedMember.user.username;

  const fetchedMember = message.guild
    ? await message.guild.members.fetch(id).catch(() => null)
    : null;
  if (fetchedMember?.user?.username) return fetchedMember.user.username;

  const cachedUser = message.client?.users?.cache?.get(id);
  if (cachedUser?.username) return cachedUser.username;

  const fetchedUser = await message.client.users.fetch(id).catch(() => null);
  if (fetchedUser?.username) return fetchedUser.username;

  return id;
}

async function buildRaidBossParticipantsFromJoinedIds(message, joinedIds) {
  const players = readPlayers();
  const participants = [];
  const rejected = [];

  for (const userId of joinedIds.map(String)) {
    const player =
      userId === String(message.author.id)
        ? getPlayer(userId, message.author.username)
        : players[userId];

    const username =
      userId === String(message.author.id)
        ? message.author.username
        : await resolveUsernameSafe(message, userId);

    if (!player) {
      rejected.push(`${username} has no player data.`);
      continue;
    }

        const { combatBoosts, teamCards } = getFullTeamFromPlayer(player);

    if (teamCards.length < 3) {
      rejected.push(`${username} does not have a full team of 3 cards.`);
      continue;
    }

    participants.push({
      userId,
      username: player.username || username,
      player,
      combatBoosts,
      units: teamCards.map((unit) => ({
        ...unit,
        ownerId: userId,
        ownerName: player.username || username,
        globalSlot: 0,
      })),
    });
  }

  participants.forEach((participant, participantIndex) => {
    participant.units.forEach((unit, unitIndex) => {
      unit.globalSlot = participantIndex * 3 + unitIndex;
      unit.slot = unitIndex + 1;
    });
  });

  return { participants, rejected };
}

function getBossReward(island, phaseBoss = null) {
  const order = Number(island?.order || 0);
  const phase = Number(phaseBoss?.phase || 0);

  const base = {
    berries: 6000 + order * 550,
    gems: 10 + Math.floor(order / 2),
    boxes: [cloneItem(ITEMS.rareResourceBox, 1)],
  };

  if (phase === 1) {
    return {
      berries: 9000 + order * 750,
      gems: 18 + Math.floor(order / 2),
      boxes: [cloneItem(ITEMS.rareResourceBox, 1)],
    };
  }

  if (phase === 2) {
    const specialByIsland = {
      egghead: {
        berries: 42000,
        gems: 95,
        boxes: [cloneItem(ITEMS.rareResourceBox, 3)],
      },
      elbaf: {
        berries: 52000,
        gems: 120,
        boxes: [cloneItem(ITEMS.rareResourceBox, 4)],
      },
    };

    return (
      specialByIsland[String(island?.code || "").toLowerCase()] || {
        berries: 30000 + order * 1200,
        gems: 70 + Math.floor(order / 2),
        boxes: [cloneItem(ITEMS.rareResourceBox, 2)],
      }
    );
  }

  return base;
}

function formatRewardLines(reward) {
  const lines = [
    `💰 +${Number(reward.berries || 0).toLocaleString("en-US")} berries`,
    `💎 +${Number(reward.gems || 0)} gems`,
  ];

  for (const box of reward.boxes || []) {
    lines.push(`🎁 ${box.name || "Reward Box"} x${Number(box.amount || 1)}`);
  }

  return lines;
}

function applyBoxes(currentBoxes, rewardBoxes) {
  let updatedBoxes = [...(currentBoxes || [])];
  for (const item of rewardBoxes || []) {
    updatedBoxes = addOrIncrease(updatedBoxes, item);
  }
  return updatedBoxes;
}

function buildRaidBossEmbed(island, phaseBoss, participants, boss, logs, ended, usedThisCycle = []) {
  const phaseLabel = phaseBoss ? `Phase ${phaseBoss.phase}` : "Boss";
  const usedSet = new Set((Array.isArray(usedThisCycle) ? usedThisCycle : []).map(String));
  const teamLines = [];

  for (const participant of participants) {
    for (const unit of participant.units) {
      const unitKey = getUnitActionKey(unit);
      const isDead = Number(unit.battleHp ?? unit.hp) <= 0;
      const alreadyUsed = usedSet.has(unitKey);
      const status = isDead ? "DEFEATED" : alreadyUsed ? "WAIT" : "READY";

      teamLines.push(
        `**${unit.globalSlot + 1}. ${unit.name}**${alreadyUsed ? " ⏳" : ""} ❤️ ${Math.max(0, Number(unit.battleHp ?? unit.hp))}/${Number(unit.battleMaxHp ?? unit.maxHp)} | PWR \`${Number(unit.battlePower || unit.currentPower || 0).toLocaleString("en-US")}\` | SPD \`${unit.battleSpeed || unit.speed}\` | ⚔️ ${formatAtkRange(unit.battleAtk || unit.atk)} | ${status}`
      );
    }
  }

  return new EmbedBuilder()
    .setColor(ended ? 0x2ecc71 : 0xe74c3c)
    .setTitle(`${island.name} ${phaseLabel} Boss Raid`)
    .setDescription(
      [
        "**Selection Phase**",
        "Select a character to deploy for battle!",
        "",
        "## ☠️ Boss",
        `**${boss.name}** [${boss.rarity}]`,
        renderBossHpBar(boss.battleHp ?? boss.hp, boss.battleMaxHp ?? boss.maxHp),
        `❤️ ${Math.max(0, Number(boss.battleHp ?? boss.hp))}/${Number(boss.battleMaxHp ?? boss.maxHp)} | SPD \`${boss.battleSpeed || boss.speed}\` | ⚔️ ${formatAtkRange(boss.battleAtk || boss.atk)}`,
        "",
        "## Battle Log",
        ...(logs.length ? logs.slice(-2) : ["Choose a raid unit to attack."]),
        "",
        "## Raid Team",
        ...teamLines,
      ].join("\n").slice(0, 4096)
    )
    .setImage(boss.image || null)
    .setFooter({ text: "One Piece Bot • Boss Phase 2 Raid" });
}

function buildRaidBossButtons(participants, ended, usedThisCycle = []) {
  const usedSet = new Set((Array.isArray(usedThisCycle) ? usedThisCycle : []).map(String));
  const allUnits = participants.flatMap((p) => p.units);
  const rows = [];
  let row = new ActionRowBuilder();

  for (const unit of allUnits) {
    const unitKey = getUnitActionKey(unit);
    const alreadyUsed = usedSet.has(unitKey);
    const dead = Number(unit.battleHp ?? unit.hp) <= 0;
    const label = `${unit.globalSlot + 1} ${unit.name}`.slice(0, 80);

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`boss_raid_attack_${unit.globalSlot}`)
        .setLabel(label)
        .setStyle(dead || alreadyUsed ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(Boolean(ended || dead || alreadyUsed))
    );

    if (row.components.length >= 5) {
      rows.push(row);
      row = new ActionRowBuilder();
    }
  }

  if (row.components.length) rows.push(row);

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("boss_raid_run")
        .setLabel("Run Away")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(ended)
    )
  );

  return rows.slice(0, 5);
}

module.exports = {
  name: "boss",

  async execute(message, args = []) {
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
    const routeAlreadyCleared = isIslandBossRouteCleared(player, currentIsland);

    let phaseBossResult = null;

    if (isPhasedIsland(currentIsland) && !normalizePhaseArg(args)) {
      phaseBossResult = await chooseBossPhase(message, player, currentIsland);

      if (phaseBossResult?.cancelled) return;
    } else {
      phaseBossResult = getRequestedBossPhase(player, currentIsland, args);
    }

    if (phaseBossResult?.error) {
      return message.reply(phaseBossResult.error);
    }

    const phaseBoss = phaseBossResult;

    if (isBossPhaseTwoParty(currentIsland, phaseBoss)) {
      const lobby = await waitForBossJoinLobby(message, currentIsland, phaseBoss);

      if (!lobby.approved || lobby.cancelled) return;

      const { participants, rejected } = await buildRaidBossParticipantsFromJoinedIds(
        message,
        lobby.joinedIds
      );

      if (participants.length < 2) {
        return message.reply(
          [
            "Boss Phase 2 requires at least **2 valid users**.",
            "Every joined user must have a full battle team of **3 cards**.",
            "",
            rejected.length ? `Rejected:\n${rejected.map((x) => `- ${x}`).join("\n")}` : "",
          ]
            .filter(Boolean)
            .join("\n")
        );
      }

      const duplicates = getDuplicatePartyCards(participants);
      if (duplicates.length) {
        return message.reply(
          [
            "Cannot start Boss Phase 2 because duplicate cards exist in the party:",
            ...duplicates.map((dup) => `- ${dup.name} used by ${dup.users.join(" and ")}`),
          ].join("\n")
        );
      }

      const boss = toBossBattleUnit(getBossTemplate(currentIsland, phaseBoss));
      const logs = [];
      let ended = false;
      let lastUsedUnitKey = "";

      updatePlayer(message.author.id, {
        cooldowns: {
          ...(player.cooldowns || {}),
          boss: Date.now() + BOSS_COOLDOWN_MS,
        },
      });

      const reply = await message.reply({
        embeds: [
          buildRaidBossEmbed(currentIsland, phaseBoss, participants, boss, logs, ended, lastUsedUnitKey ? [lastUsedUnitKey] : []),
        ],
        components: buildRaidBossButtons(participants, ended, lastUsedUnitKey ? [lastUsedUnitKey] : []),
      });

      const collector = reply.createMessageComponentCollector({
        time: SESSION_TIMEOUT_MS,
      });

      collector.on("collect", async (interaction) => {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({
            content: "Only the host can control this Boss Phase 2 raid.",
            ephemeral: true,
          });
        }

        if (ended) {
          return interaction.reply({
            content: "This boss raid has already ended.",
            ephemeral: true,
          });
        }

        const allUnits = participants.flatMap((p) => p.units);

        if (interaction.customId === "boss_raid_run") {
          logs.length = 0;
          pushBossLog(logs, "⚠️ Run away confirmation requested.");
          pushBossLog(logs, "Confirm run away or cancel to continue.");

          await interaction.update({
            embeds: [
              buildRaidBossEmbed(currentIsland, phaseBoss, participants, boss, logs, false, lastUsedUnitKey ? [lastUsedUnitKey] : []),
            ],
            components: buildRaidBossRunConfirmButtons(),
          });
          return;
        }

        if (interaction.customId === "boss_raid_run_cancel") {
          logs.length = 0;
          pushBossLog(logs, "✅ Run away cancelled.");
          pushBossLog(logs, "Choose a raid unit to continue.");

          await interaction.update({
            embeds: [
              buildRaidBossEmbed(currentIsland, phaseBoss, participants, boss, logs, false, lastUsedUnitKey ? [lastUsedUnitKey] : []),
            ],
            components: buildRaidBossButtons(participants, false, lastUsedUnitKey ? [lastUsedUnitKey] : []),
          });
          return;
        }

        if (interaction.customId === "boss_raid_run_confirm") {
          ended = true;
          logs.length = 0;
          pushBossLog(logs, "🏃 The raid host ran away.");
          pushBossLog(logs, "No EXP gained from running away.");

          const updatedQuests = applyBossQuestProgress(player, ["bossFights"]);

          updatePlayer(message.author.id, {
            quests: updatedQuests,
          });

          await interaction.update({
            embeds: [
              buildBossResultEmbed({
                title: "Boss Phase 2 Raid Escaped",
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

        const index = Number(interaction.customId.replace("boss_raid_attack_", ""));
        const attacker = allUnits.find((unit) => unit.globalSlot === index);

        if (!attacker || Number(attacker.battleHp ?? attacker.hp) <= 0) {
          return interaction.reply({
            content: "That raid unit cannot attack right now.",
            ephemeral: true,
          });
        }

        const unitKey = getUnitActionKey(attacker);

        if (shouldDisableLastUsed(allUnits, lastUsedUnitKey, attacker)) {
          return interaction.reply({
            content: "This unit acted last turn. Choose another available unit first.",
            ephemeral: true,
          });
        }

        const owner = participants.find((p) => p.userId === attacker.ownerId);
        const combatLogs = [];
        const turns = resolveTurnOrder(attacker, boss);

        for (const turn of turns) {
          const actor = turn.actor;
          const target = turn.target;

          if (Number(actor.battleHp ?? actor.hp) <= 0) continue;
          if (Number(target.battleHp ?? target.hp) <= 0) continue;

          const damage = performAttack(
            actor,
            target,
            turn.isPlayer ? attacker.passiveBoostsApplied || owner?.combatBoosts || {} : {}
          );

          combatLogs.push(
            `${turn.isPlayer ? "⚔️" : "💢"} ${actor.name} dealt **${damage}** damage to ${target.name}.`
          );

          if (Number(target.battleHp ?? target.hp) <= 0) {
            if (turn.isPlayer) attacker.kills += 1;
            combatLogs.push(`☠️ ${target.name} was defeated.`);
            break;
          }
        }

        logs.length = 0;
        logs.push(...combatLogs.slice(-BOSS_MAX_LOG_LINES));
        lastUsedUnitKey = unitKey;

        if (Number(boss.battleHp ?? boss.hp) <= 0) {
          ended = true;

          const reward = getBossReward(currentIsland, phaseBoss);
          const storyLines = [];
          const rewardLines = formatRewardLines(reward);
          const allExpLines = [];

          for (const participant of participants) {
            const expResults = calculateBossExp(
              participant.units,
              true,
              participant.combatBoosts
            );

            const updatedCards = applyBossExpToCards(
              participant.player,
              participant.units,
              expResults
            );

            const expLines = formatExpResults(participant.units, expResults);
            allExpLines.push(`**${participant.username}**`);
            allExpLines.push(...expLines);

            const participantStory = {
              ...(participant.player.story || {}),
              clearedIslandBosses: Array.isArray(participant.player?.story?.clearedIslandBosses)
                ? [...participant.player.story.clearedIslandBosses]
                : [],
              bossPhases: {
                ...(participant.player?.story?.bossPhases || {}),
              },
            };

            const participantIsland = getCurrentIsland(participant.player);
            const sameIsland = participantIsland?.code === currentIsland.code;

            if (sameIsland) {
              const currentState = getBossPhaseState(
                participant.player,
                currentIsland.code
              );

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

              participantStory.bossPhases[currentIsland.code] = nextPhaseState;

              if (
                nextPhaseState.completed &&
                !participantStory.clearedIslandBosses.includes(currentIsland.code)
              ) {
                participantStory.clearedIslandBosses.push(currentIsland.code);
              }
            }

            const updatedQuests = applyBossQuestProgress(participant.player, [
              "bossFights",
              "bossesDefeated",
            ]);

            updatePlayer(participant.userId, {
              cards: updatedCards,
              boxes: applyBoxes(participant.player.boxes, reward.boxes),
              berries: Number(participant.player.berries || 0) + reward.berries,
              gems: Number(participant.player.gems || 0) + reward.gems,
              story: participantStory,
              quests: updatedQuests,
            });
          }

          storyLines.push(`✅ ${currentIsland.name} Phase ${phaseBoss.phase} cleared.`);
          storyLines.push("Rewards were given to every valid raid participant.");

          pushBossLog(logs, `🏆 ${boss.name} was defeated by the raid team!`);

          await interaction.update({
            embeds: [
              buildBossResultEmbed({
                title: "Boss Phase 2 Raid Victory",
                color: 0x2ecc71,
                result: "WIN",
                rewardLines,
                expLines: allExpLines,
                storyLines,
                logs,
              }),
            ],
            components: [],
          });

          collector.stop("win");
          return;
        }

        if (!getAliveUnits(allUnits).length) {
          ended = true;

          const allExpLines = [];

          for (const participant of participants) {
            const expResults = calculateBossExp(
              participant.units,
              false,
              participant.combatBoosts
            );

            const updatedCards = applyBossExpToCards(
              participant.player,
              participant.units,
              expResults
            );

            const expLines = formatExpResults(participant.units, expResults);
            allExpLines.push(`**${participant.username}**`);
            allExpLines.push(...expLines);

            const updatedQuests = applyBossQuestProgress(participant.player, [
              "bossFights",
            ]);

            updatePlayer(participant.userId, {
              cards: updatedCards,
              quests: updatedQuests,
            });
          }

          pushBossLog(logs, `💀 The raid team was wiped out by ${boss.name}.`);

          await interaction.update({
            embeds: [
              buildBossResultEmbed({
                title: "Boss Phase 2 Raid Defeat",
                color: 0xe74c3c,
                result: "LOSE",
                expLines: allExpLines,
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
            buildRaidBossEmbed(currentIsland, phaseBoss, participants, boss, logs, false, lastUsedUnitKey ? [lastUsedUnitKey] : []),
          ],
          components: buildRaidBossButtons(participants, false, lastUsedUnitKey ? [lastUsedUnitKey] : []),
        });
      });

      collector.on("end", async (_collected, reason) => {
        if (ended) return;

        if (reason === "time") {
          ended = true;
          logs.length = 0;
          pushBossLog(logs, "⌛ No interaction for 10 minutes.");
          pushBossLog(logs, "Boss Phase 2 raid failed.");

          try {
            await reply.edit({
              embeds: [
                buildBossResultEmbed({
                  title: "Boss Phase 2 Raid Timeout",
                  color: 0xe74c3c,
                  result: "LOSE",
                  logs,
                }),
              ],
              components: [],
            });
          } catch (_) {}
        }
      });

      return;
    }

    const { combatBoosts, teamCards } = getFullTeamFromPlayer(player);

    if (teamCards.length < 3) {
      return message.reply("You need a full battle team of 3 cards to challenge the island boss.");
    }

    updatePlayer(message.author.id, {
      cooldowns: {
        ...(player.cooldowns || {}),
        boss: Date.now() + BOSS_COOLDOWN_MS,
      },
    });

    const playerTeam = [...teamCards].sort((a, b) => a.slot - b.slot);
    const boss = toBossBattleUnit(getBossTemplate(currentIsland, phaseBoss));
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
      components: buildButtons(playerTeam, ended, []),
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
        logs.length = 0;
        pushBossLog(logs, "⚠️ Run away confirmation requested.");
        pushBossLog(logs, "Confirm run away or cancel to continue.");

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
          components: buildBossRunConfirmButtons(),
        });
        return;
      }

      if (interaction.customId === "boss_run_cancel") {
        logs.length = 0;
        pushBossLog(logs, "✅ Run away cancelled.");
        pushBossLog(logs, "Choose a card to continue.");

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
          components: buildButtons(playerTeam, false, []),
        });
        return;
      }

      if (interaction.customId === "boss_run_confirm") {
        ended = true;
        logs.length = 0;
        pushBossLog(logs, "🏃 You ran away from the boss battle.");
        pushBossLog(logs, "🚫 No EXP gained from running away.");

        const updatedQuests = applyBossQuestProgress(player, ["bossFights"]);

        updatePlayer(message.author.id, {
          quests: updatedQuests,
        });

        await interaction.update({
          embeds: [
            buildBossResultEmbed({
              title: "🏃 Boss Battle Escaped",
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

      const index = Number(interaction.customId.replace("boss_attack_", ""));
      const attacker = playerTeam[index];

      if (!attacker || Number(attacker.battleHp ?? attacker.hp) <= 0) {
        return interaction.reply({
          content: "That card cannot attack right now.",
          ephemeral: true,
        });
      }

      const combatLogs = [];
      const turns = resolveTurnOrder(attacker, boss);

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

        combatLogs.push(
          `${turn.isPlayer ? "⚔️" : "💢"} ${actor.name} dealt **${damage}** damage to ${target.name}.`
        );

        if (Number(target.battleHp ?? target.hp) <= 0) {
          if (turn.isPlayer) attacker.kills += 1;
          combatLogs.push(`☠️ ${target.name} was defeated.`);
          break;
        }
      }

      logs.length = 0;
      logs.push(...combatLogs.slice(-BOSS_MAX_LOG_LINES));

      if (Number(boss.battleHp ?? boss.hp) <= 0) {
        ended = true;

        const reward = getBossReward(currentIsland, phaseBoss);

        let updatedBoxes = [...(player.boxes || [])];

        reward.boxes.forEach((item) => {
          updatedBoxes = addOrIncrease(updatedBoxes, item);
        });

        const expResults = calculateBossExp(playerTeam, true, combatBoosts);
        const updatedCards = applyBossExpToCards(player, playerTeam, expResults);
        const expLines = formatExpResults(playerTeam, expResults);

        const nextStory = {
          ...(player.story || {}),
          clearedIslandBosses: Array.isArray(player?.story?.clearedIslandBosses)
            ? [...player.story.clearedIslandBosses]
            : [],
          bossPhases: {
            ...(player?.story?.bossPhases || {}),
          },
        };

        const storyLines = [];
        if (routeAlreadyCleared) {
          storyLines.push(`🔁 ${currentIsland.name} boss route was already cleared. This was a grind rematch.`);
        }
        if (phaseBoss && !routeAlreadyCleared) {
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

          if (
            nextPhaseState.completed &&
            !nextStory.clearedIslandBosses.includes(currentIsland.code)
          ) {
            nextStory.clearedIslandBosses.push(currentIsland.code);
          }

          if (Number(phaseBoss.phase) === 1) {
            storyLines.push(`✅ ${currentIsland.name} Phase 1 cleared.`);
          } else {
            storyLines.push(`✅ ${currentIsland.name} Phase 2 cleared.`);
          }

          if (nextPhaseState.completed) {
            storyLines.push(`🏁 ${currentIsland.name} boss route is now fully cleared.`);
          }
        } else if (!routeAlreadyCleared) {
          if (!nextStory.clearedIslandBosses.includes(currentIsland.code)) {
            nextStory.clearedIslandBosses.push(currentIsland.code);
          }

          storyLines.push(`✅ ${currentIsland.name} boss route is now cleared.`);
        }

        const updatedQuests = applyBossQuestProgress(player, [
          "bossFights",
          "bossesDefeated",
        ]);

        updatePlayer(message.author.id, {
          cards: updatedCards,
          boxes: updatedBoxes,
          berries: Number(player.berries || 0) + reward.berries,
          gems: Number(player.gems || 0) + reward.gems,
          story: nextStory,
          quests: updatedQuests,
        });

        pushBossLog(logs, `🏆 ${boss.name} was defeated!`);

        await interaction.update({
          embeds: [
            buildBossResultEmbed({
              title: "🏆 Boss Victory",
              color: 0x2ecc71,
              result: "WIN",
              rewardLines: formatRewardLines(reward),
              expLines,
              storyLines,
              logs,
            }),
          ],
          components: [],
        });

        collector.stop("win");
        return;
      }

      if (!getAliveUnits(playerTeam).length) {
        ended = true;

        const expResults = calculateBossExp(playerTeam, false, combatBoosts);
        const updatedCards = applyBossExpToCards(player, playerTeam, expResults);
        const expLines = formatExpResults(playerTeam, expResults);
        const updatedQuests = applyBossQuestProgress(player, ["bossFights"]);

        updatePlayer(message.author.id, {
          cards: updatedCards,
          quests: updatedQuests,
        });

        pushBossLog(logs, `💀 Your team was wiped out by ${boss.name}.`);

        await interaction.update({
          embeds: [
            buildBossResultEmbed({
              title: "💀 Boss Defeat",
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
        components: buildButtons(playerTeam, false, []),
      });
    });

    collector.on("end", async (_collected, reason) => {
      if (ended) return;

      if (reason === "time") {
        ended = true;

        const expResults = calculateBossExp(playerTeam, false, combatBoosts);
        const updatedCards = applyBossExpToCards(player, playerTeam, expResults);
        const expLines = formatExpResults(playerTeam, expResults);
        const updatedQuests = applyBossQuestProgress(player, ["bossFights"]);

        updatePlayer(message.author.id, {
          cards: updatedCards,
          quests: updatedQuests,
        });

        logs.length = 0;
        pushBossLog(logs, "⌛ No interaction for 10 minutes.");
        pushBossLog(logs, "You lost the boss battle.");

        try {
          await reply.edit({
            embeds: [
              buildBossResultEmbed({
                title: "⌛ Boss Battle Timeout",
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