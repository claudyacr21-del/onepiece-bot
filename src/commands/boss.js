const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const {
  readPlayers,
  getPlayer,
  updatePlayer,
  updatePlayerAtomic,
} = require("../playerStore");
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

const BOSS_GLOBAL_ATK_MULT = 1.25;
const BOSS_GLOBAL_HP_MULT = 1.2;
const BOSS_GLOBAL_SPD_MULT = 2.5;


function isIgnorableDiscordInteractionError(error) {
  const code = Number(error?.code || error?.rawError?.code || 0);
  const status = Number(error?.status || error?.rawError?.status || 0);
  const message = String(error?.message || "");
  const errno = String(error?.errno || error?.cause?.errno || "");
  const requestCode = String(error?.requestBody?.code || "");

  return (
    code === 10062 ||
    code === 40060 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    errno === "ECONNRESET" ||
    errno === "ETIMEDOUT" ||
    errno === "EAI_AGAIN" ||
    requestCode === "UND_ERR_SOCKET" ||
    message.includes("Unknown interaction") ||
    message.includes("Interaction has already been acknowledged") ||
    message.includes("Service Unavailable") ||
    message.includes("Bad Gateway") ||
    message.includes("Gateway Timeout")
  );
}

async function safeDeferUpdate(interaction) {
  if (!interaction) return false;
  if (interaction.deferred || interaction.replied) return true;

  try {
    await interaction.deferUpdate();
    return true;
  } catch (error) {
    if (!isIgnorableDiscordInteractionError(error)) {
      console.error("[BOSS DEFER UPDATE ERROR]", error);
    }
    return false;
  }
}

async function safeEditInteractionMessage(interaction, payload) {
  try {
    if (!interaction?.message) return null;
    return await interaction.message.edit(payload);
  } catch (error) {
    if (!isIgnorableDiscordInteractionError(error)) {
      console.error("[BOSS MESSAGE EDIT ERROR]", error);
    }
    return null;
  }
}

async function safeUpdateInteraction(interaction, payload) {
  try {
    if (!interaction) return null;

    if (!interaction.deferred && !interaction.replied) {
      return await interaction.update(payload);
    }

    if (interaction.message) {
      return await interaction.message.edit(payload);
    }

    return null;
  } catch (error) {
    if (!isIgnorableDiscordInteractionError(error)) {
      console.error("[BOSS UPDATE ERROR]", error);
    }

    try {
      if (interaction?.message) {
        return await interaction.message.edit(payload);
      }
    } catch (editError) {
      if (!isIgnorableDiscordInteractionError(editError)) {
        console.error("[BOSS UPDATE FALLBACK EDIT ERROR]", editError);
      }
    }

    return null;
  }
}

async function safeEphemeralReply(interaction, content) {
  try {
    if (!interaction) return null;

    const payload = {
      content,
      flags: MessageFlags.Ephemeral,
    };

    if (interaction.deferred || interaction.replied) {
      return await interaction.followUp(payload);
    }

    return await interaction.reply(payload);
  } catch (error) {
    if (!isIgnorableDiscordInteractionError(error)) {
      console.error("[BOSS REPLY ERROR]", error);
    }
    return null;
  }
}

async function safeInteractionUpdate(interaction, payload) {
  try {
    if (!interaction) return null;

    if (!interaction.deferred && !interaction.replied) {
      return await interaction.update(payload);
    }

    if (interaction.message) {
      return await interaction.message.edit(payload);
    }

    return await interaction.editReply(payload);
  } catch (error) {
    if (!isIgnorableDiscordInteractionError(error)) {
      console.error("[BOSS INTERACTION UPDATE ERROR]", error?.message || error);
    }

    try {
      if (interaction?.message) {
        return await interaction.message.edit(payload);
      }
    } catch (editError) {
      if (!isIgnorableDiscordInteractionError(editError)) {
        console.error("[BOSS INTERACTION FALLBACK EDIT ERROR]", editError);
      }
    }

    return null;
  }
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

function isUnitUsedThisCycle(_usedThisCycle, _unit) {
  return false;
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

function getSafeEmbedImageUrl(url) {
  const value = String(url || "").trim();

  if (!value) return null;

  if (!/^https?:\/\//i.test(value)) return null;

  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return value;
  } catch (_) {
    return null;
  }
}

function applySafeEmbedImage(embed, url) {
  const safeUrl = getSafeEmbedImageUrl(url);
  if (!safeUrl) return embed;

  try {
    return embed.setImage(safeUrl);
  } catch (error) {
    console.error("[BOSS SAFE IMAGE ERROR]", {
      image: String(url || ""),
      message: error?.message,
    });

    return embed;
  }
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
    fromDb?.bossImage ||
    fromDb?.image ||
    currentIsland?.image ||
    ""
  );
}

function getSpecialPhaseBossTemplate(phaseBoss, currentIsland) {
  const code = String(phaseBoss?.bossCode || "").toLowerCase();
  const order = Number(currentIsland?.order || 0);

  if (code === "five_elders_combined") {
    const hp = 24000 + order * 580;

    return applyGlobalBossStats(
      applyPhaseStatMultiplier(
        {
          name: "Five Elders",
          rarity: "UR",
          atk: 1020 + order * 21,
          hp,
          maxHp: hp,
          speed: 165 + Math.floor(order * 1.15),
          image: getIslandBossImage(currentIsland, phaseBoss, null),
        },
        phaseBoss,
        currentIsland
      )
    );
  }

  return null;
}

function getBossPhaseStatMultiplier(phaseBoss = null, currentIsland = null) {
  const phase = Number(phaseBoss?.phase || 0);
  const islandCode = String(currentIsland?.code || "").toLowerCase();

  if (["egghead", "elbaf"].includes(islandCode) && phase === 1) {
    return {
      atk: 1.5,
      hp: 2.7,
      speed: 2.2,
    };
  }

  if (["egghead", "elbaf"].includes(islandCode) && phase >= 2) {
    return {
      atk: 1.5,
      hp: 3.0,
      speed: 2.2,
    };
  }

  if (phase >= 2) {
    return {
      atk: 1.2,
      hp: 1.3,
      speed: 1.2,
    };
  }

  return {
    atk: 1,
    hp: 1,
    speed: 1,
  };
}

function applyPhaseStatMultiplier(template, phaseBoss = null, currentIsland = null) {
  const mult = getBossPhaseStatMultiplier(phaseBoss, currentIsland);
  const hp = Math.floor(Number(template.hp || template.maxHp || 1) * mult.hp);
  const atk = Math.floor(Number(template.atk || 1) * mult.atk);
  const speed = Math.floor(Number(template.speed || 1) * mult.speed);

  return {
    ...template,
    atk,
    hp,
    maxHp: hp,
    speed,
  };
}

function getSpecialIslandBossTemplate(currentIsland) {
  const code = String(currentIsland?.code || "").toLowerCase();
  const order = Number(currentIsland?.order || 0);
  const image = getIslandBossImage(currentIsland, null, null);

  const specials = {
    foosha_village: {
      name: "Mountain Bandit Dadan",
      rarity: "C",
      atk: 285,
      hp: 2900,
      speed: 65,
      image,
    },

    reverse_mountain: {
      name: "Laboon",
      rarity: "A",
      atk: 420,
      hp: 7900,
      speed: 94,
      image,
    },

    whiskey_peak: {
      name: "Baroque Works Agents",
      rarity: "B",
      atk: 375,
      hp: 6700,
      speed: 98,
      image,
    },

    long_ring_long_land: {
      name: "Foxy",
      rarity: "A",
      atk: 460,
      hp: 8300,
      speed: 116,
      image,
    },

    water_7: {
      name: "CP9 Lead Fight",
      rarity: "S",
      atk: 615,
      hp: 11600,
      speed: 138,
      image,
    },

    sabaody: {
      name: "Pacifista Survival",
      rarity: "S",
      atk: 680,
      hp: 13700,
      speed: 146,
      image,
    },

    impel_down: {
      name: "Magellan",
      rarity: "SS",
      atk: 850,
      hp: 15100,
      speed: 150,
      image,
    },
  };

  const base = specials[code];
  if (!base) return null;

  const hp = Math.floor(Number(base.hp) + order * 470);

  return applyGlobalBossStats({
    ...base,
    atk: Math.floor(Number(base.atk) + order * 20),
    hp,
    maxHp: hp,
    speed: Math.floor(Number(base.speed) + order * 1.9),
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
    1: 2.85,
    2: 3.3,
    3: 3.8,
    4: 4.35,
    5: 4.95,
  };

  const hpMulByTier = {
    1: 3.9,
    2: 4.55,
    3: 5.3,
    4: 6.15,
    5: 7.15,
  };

  const spdMulByTier = {
    1: 1.3,
    2: 1.4,
    3: 1.51,
    4: 1.63,
    5: 1.76,
  };

  const atkMul = (atkMulByTier[shipTier] || 2.85) + islandOrder * 0.036;
  const hpMul = (hpMulByTier[shipTier] || 3.9) + islandOrder * 0.068;
  const spdMul = (spdMulByTier[shipTier] || 1.3) + islandOrder * 0.008;

  if (fromDb) {
    const baseAtk = Number(fromDb.atk || 100);
    const baseHp = Number(fromDb.hp || 1000);
    const baseSpeed = Number(fromDb.speed || 50);

    const hp = Math.floor(baseHp * hpMul);

    return applyGlobalBossStats(
      applyPhaseStatMultiplier(
        {
          name: phaseBoss?.name || fromDb.displayName || fromDb.name,
          rarity: fromDb.currentTier || fromDb.rarity || "S",
          atk: Math.floor(baseAtk * atkMul),
          hp,
          maxHp: hp,
          speed: Math.floor(baseSpeed * spdMul),
          image: getIslandBossImage(currentIsland, phaseBoss, fromDb),
        },
        phaseBoss,
        currentIsland
      )
    );
  }

  const fallbackAtk = 375 + shipTier * 95 + islandOrder * 23;
  const fallbackHp = 6200 + shipTier * 1750 + islandOrder * 430;
  const fallbackSpeed = 106 + shipTier * 12 + Math.floor(islandOrder * 1.1);

  return applyGlobalBossStats(
    applyPhaseStatMultiplier(
      {
        name: phaseBoss?.name || currentIsland?.boss || "Island Boss",
        rarity: shipTier >= 4 ? "UR" : "S",
        atk: fallbackAtk,
        hp: fallbackHp,
        maxHp: fallbackHp,
        speed: fallbackSpeed,
        image: getIslandBossImage(currentIsland, phaseBoss, null),
      },
      phaseBoss,
      currentIsland
    )
  );
}

function buildPhaseSelectEmbed(island, player) {
  const phaseState = getBossPhaseState(player, island.code);
  const phases = Array.isArray(island.bossPhases) ? island.bossPhases : [];

  const lines = phases.map((phase) => {
    const num = Number(phase.phase || 0);
    const cleared =
      num === 1 ? phaseState.phase1Cleared : num === 2 ? phaseState.phase2Cleared : false;
    const locked = num === 2 && !phaseState.phase1Cleared;
    const template = getBossTemplate(island, phase);

    const status = cleared ? "✅ Cleared" : locked ? "🔒 Locked" : "⚔️ Available";
    const partyStatus =
      num === 2
        ? `\nParty: **${BOSS_PHASE_JOIN_MIN}-${BOSS_PHASE_JOIN_MAX} players** • Full 3-card team each`
        : "";

    return [
      `**Phase ${num}:** ${phase.name || phase.bossName || template?.name || "Boss"} — ${status}`,
      `Rarity: **${template?.rarity || "S"}**`,
      `ATK: \`${formatAtkRange(template?.atk || 0)}\` • HP: \`${Number(
        template?.hp || template?.maxHp || 0
      )}\` • SPD: \`${Number(template?.speed || 0)}\`${partyStatus}`,
    ].join("\n");
  });

  const phase2Text = phaseState.phase2Cleared
    ? "Phase 2 Status: **Cleared**"
    : phaseState.phase1Cleared
      ? "Phase 2 Status: **Unlocked / Ready for party raid**"
      : "Phase 2 Status: **Locked until Phase 1 is cleared**";

  const phaseEmbed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${island.name} Boss Phase Select`)
    .setDescription(
      [
        "Choose which boss phase you want to fight.",
        "",
        ...lines,
        "",
        `**${phase2Text}**`,
        "",
        "Phase 2 uses raid-style party room.",
        `Minimum **${BOSS_PHASE_JOIN_MIN} players**, maximum **${BOSS_PHASE_JOIN_MAX} players**.`,
        "Each player joins with their current full **3-card team**.",
        `Max total party cards: **${BOSS_PHASE_JOIN_MAX * 3} cards**.`,
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Boss Phase Select",
    });

  return applySafeEmbedImage(
    phaseEmbed,
    getIslandBossImage(island, getBossPhaseForBattle(player, island), null)
  );
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

    await safeDeferUpdate(interaction);

    const selectedPhase = interaction.customId === "boss_phase_2" ? 2 : 1;
    const phaseBoss = getRequestedBossPhase(player, island, [String(selectedPhase)]);

    if (phaseBoss?.error) {
      await sent.edit({
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

    await sent.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("Boss Phase Selected")
          .setDescription(`Starting **${island.name} Phase ${selectedPhase}**...`),
      ],
      components: [],
    });

    return phaseBoss;
  } catch (error) {
    const code = error?.code;
    const messageText = String(error?.message || "");

    if (code !== 10062 && code !== 40060 && !messageText.includes("Unknown interaction")) {
      console.error("[BOSS PHASE SELECT ERROR]", error);
    }

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

function getBossLobbyImage(island, phaseBoss) {
  return (
    phaseBoss?.bossImage ||
    phaseBoss?.image ||
    island?.bossImage ||
    island?.image ||
    ""
  );
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

    const lobbyEmbed = new EmbedBuilder()
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

    return applySafeEmbedImage(lobbyEmbed, getBossLobbyImage(island, phaseBoss));
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

function getLastUsedKeySet(lastUsedUnitKey = "") {
  const key = String(lastUsedUnitKey || "");
  return key ? new Set([key]) : new Set();
}

function shouldDisableLastUsed(units, lastUsedUnitKey, unit) {
  if (!unit) return false;

  const key = String(lastUsedUnitKey || "");
  if (!key) return false;

  const unitKey = getUnitActionKey(unit);
  if (unitKey !== key) return false;

  const aliveUnits = getAliveUnits(units || []);
  const aliveOtherUnits = aliveUnits.filter(
    (aliveUnit) => getUnitActionKey(aliveUnit) !== key
  );

  // Kalau tinggal 1 card hidup, jangan softlock.
  return aliveOtherUnits.length > 0;
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

    const participants = [];

    for (const userId of ids) {
      const username =
        extraUserId && String(extraUserId) === String(userId) && extraUsername
          ? extraUsername
          : userId === String(message.author.id)
          ? message.author.username
          : await resolveUsernameSafe(message, userId);

      const player =
        extraUserId && String(extraUserId) === String(userId) && extraPlayer
          ? extraPlayer
          : getPlayer(userId, username);

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
    let lobbyProcessing = false;
    collector.on("collect", async (interaction) => {
if (lobbyProcessing) {
        await safeDeferUpdate(interaction);
        return;
      }

      lobbyProcessing = true;

      try {
        
      if (interaction.customId === "boss_lobby_join") {
        const bossJoinAckOk = await interaction
          .deferReply({ flags: MessageFlags.Ephemeral })
          .then(() => true)
          .catch((error) => {
            if (!isIgnorableDiscordInteractionError(error)) {
              console.error("[BOSS JOIN DEFER ERROR]", error?.message || error);
            }
            return false;
          });

        if (!bossJoinAckOk) return;

        const replyBossJoin = async (payload) => {
          return interaction.editReply(payload).catch((error) => {
            if (!isIgnorableDiscordInteractionError(error)) {
              console.error("[BOSS JOIN EDIT REPLY ERROR]", error?.message || error);
            }
            return null;
          });
        };

        const failJoin = async (content) => {
          return replyBossJoin({
            content,
            embeds: [],
            components: [],
          });
        };

        const userId = String(interaction.user.id);

        if (joinedIds.size >= BOSS_PHASE_JOIN_MAX) {
          await failJoin("This boss interaction is no longer available or already processed.");
          return;
        }

        if (joinedIds.has(userId)) {
          await failJoin("This boss interaction is no longer available or already processed.");
          return;
        }

        const username = await resolveUsernameSafe(message, userId);
        const joiningPlayer = getPlayer(userId, username);

        if (!joiningPlayer) {
          await safeEphemeralReply(interaction, "This boss interaction is no longer available or already processed.");
          return;
        }

        const { teamCards } = getFullTeamFromPlayer(joiningPlayer);

        if (teamCards.length < 3) {
          await safeEphemeralReply(interaction, "This boss interaction is no longer available or already processed.");
          return;
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

        await interaction.editReply({
          embeds: [confirmEmbed],
          components: [confirmRow],
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
        await safeEphemeralReply(interaction, "This boss interaction is no longer available or already processed.");
        return;
      }

      if (interaction.customId === "boss_lobby_cancel") {
        await safeDeferUpdate(interaction);

        cancelled = true;

        const cancelParticipants = await getJoinedParticipantsPreview();

        await safeEditInteractionMessage(interaction, {
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
          await safeEphemeralReply(interaction, "This boss interaction is no longer available or already processed.");
          return;
        }

        await safeDeferUpdate(interaction);

        const participants = await getJoinedParticipantsPreview();
        const duplicates = getDuplicatePartyCards(participants);

        if (duplicates.length) {
          return safeEphemeralReply(
            interaction,
            [
              "Cannot start because duplicate cards exist in the party:",
              ...duplicates.map((dup) => `- ${dup.name} used by ${dup.users.join(" and ")}`),
            ].join("\n")
          );
        }

        approved = true;

        const startParticipants = await getJoinedParticipantsPreview();

        await safeEditInteractionMessage(interaction, {
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
      } catch (error) {
        console.error("[BOSS JOIN LOBBY COLLECTOR ERROR]", error?.message || error);
        await safeEphemeralReply(interaction, "Boss lobby interaction error. Please try again.");
      } finally {
lobbyProcessing = false;
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

  const embed = new EmbedBuilder()
    .setColor(ended ? 0x2ecc71 : 0xe74c3c)
    .setTitle(`${playerName}'s ${island.name}${phaseLabel} Boss Battle`)
    .setDescription(
      [
        "**Selection Phase**",
        "Select a character to deploy for battle!",
        "",
        "## Battle Log",
        ...(recentLogs.length ? recentLogs : ["Choose a card to attack the island boss."]),
        "",
        "## ☠️ Boss",
        `**${boss.name}** [${boss.rarity}]`,
        renderBossHpBar(boss.battleHp ?? boss.hp, boss.battleMaxHp ?? boss.maxHp),
        `❤️ ${Math.max(0, Number(boss.battleHp ?? boss.hp))}/${Number(boss.battleMaxHp ?? boss.maxHp)} | SPD \`${boss.battleSpeed || boss.speed}\` | ⚔️ ${formatAtkRange(boss.battleAtk || boss.atk)}`,
        "",
        "## Your Team",
        ...teamLines,
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Island Boss",
    });

  return applySafeEmbedImage(embed, boss.image);
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
  const participants = [];
  const rejected = [];

  for (const userId of joinedIds.map(String)) {
    const username =
      userId === String(message.author.id)
        ? message.author.username
        : await resolveUsernameSafe(message, userId);

    const player = getPlayer(userId, username);

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

  function pickBossResourceBox() {
    const roll = Math.random() * 100;

    // Early islands: no Elite / Legend yet
    if (order < 8) {
      return cloneItem(ITEMS.rareResourceBox, 1);
    }

    // Mid islands: small Elite chance
    // Rare 80% / Elite 20%
    if (order < 15) {
      if (roll < 20) return cloneItem(ITEMS.eliteResourceBox, 1);
      return cloneItem(ITEMS.rareResourceBox, 1);
    }

    // Late-mid islands: better Elite, tiny Legend
    // Rare 55% / Elite 40% / Legend 5%
    if (order < 22) {
      if (roll < 5) return cloneItem(ITEMS.legendResourceBox, 1);
      if (roll < 45) return cloneItem(ITEMS.eliteResourceBox, 1);
      return cloneItem(ITEMS.rareResourceBox, 1);
    }

    // Endgame islands: Elite common, Legend possible
    // Rare 35% / Elite 50% / Legend 15%
    if (roll < 15) return cloneItem(ITEMS.legendResourceBox, 1);
    if (roll < 65) return cloneItem(ITEMS.eliteResourceBox, 1);
    return cloneItem(ITEMS.rareResourceBox, 1);
  }

  function getBossBoxes(amount = 1) {
    const boxes = [];

    for (let i = 0; i < amount; i++) {
      boxes.push(pickBossResourceBox());
    }

    return boxes;
  }

  const base = {
    berries: 6000 + order * 550,
    gems: 10 + Math.floor(order / 2),
    boxes: getBossBoxes(1),
  };

  if (phase === 1) {
    return {
      berries: 9000 + order * 750,
      gems: 18 + Math.floor(order / 2),
      boxes: getBossBoxes(1),
    };
  }

  if (phase === 2) {
    const islandCode = String(island?.code || "").toLowerCase();

    if (islandCode === "egghead") {
      return {
        berries: 42000,
        gems: 95,
        boxes: getBossBoxes(3),
      };
    }

    if (islandCode === "elbaf") {
      return {
        berries: 52000,
        gems: 120,
        boxes: getBossBoxes(4),
      };
    }

    return {
      berries: 30000 + order * 1200,
      gems: 70 + Math.floor(order / 2),
      boxes: getBossBoxes(2),
    };
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

function buildRaidBossEmbed(island, phaseBoss, participants, boss, logs, ended, lastUsedUnitKey = "") {
  const phaseLabel = phaseBoss ? `Phase ${phaseBoss.phase}` : "Boss";
  const allUnits = participants.flatMap((p) => p.units || []);
  const usedSet = getLastUsedKeySet(lastUsedUnitKey);
  const teamLines = [];

  for (const participant of participants) {
    for (const unit of participant.units) {
      const unitKey = getUnitActionKey(unit);
      const isDead = Number(unit.battleHp ?? unit.hp) <= 0;
      const alreadyUsed = usedSet.has(unitKey) && shouldDisableLastUsed(allUnits, lastUsedUnitKey, unit);
      const status = isDead ? "DEFEATED" : alreadyUsed ? "WAIT" : "READY";

      teamLines.push(
        `**${unit.globalSlot + 1}. ${unit.name}**${alreadyUsed ? " ⏳" : ""} ❤️ ${Math.max(0, Number(unit.battleHp ?? unit.hp))}/${Number(unit.battleMaxHp ?? unit.maxHp)} | PWR \`${Number(unit.battlePower || unit.currentPower || 0).toLocaleString("en-US")}\` | SPD \`${unit.battleSpeed || unit.speed}\` | ⚔️ ${formatAtkRange(unit.battleAtk || unit.atk)} | ${status}`
      );
    }
  }

  const embed = new EmbedBuilder()
    .setColor(ended ? 0x2ecc71 : 0xe74c3c)
    .setTitle(`${island.name} ${phaseLabel} Boss Raid`)
    .setDescription(
      [
        "**Selection Phase**",
        "Select a character to deploy for battle!",
        "",
        "## Battle Log",
        ...(logs.length ? logs.slice(-2) : ["Choose a raid unit to attack."]),
        "",
        "## ☠️ Boss",
        `**${boss.name}** [${boss.rarity}]`,
        renderBossHpBar(boss.battleHp ?? boss.hp, boss.battleMaxHp ?? boss.maxHp),
        `❤️ ${Math.max(0, Number(boss.battleHp ?? boss.hp))}/${Number(boss.battleMaxHp ?? boss.maxHp)} | SPD \`${boss.battleSpeed || boss.speed}\` | ⚔️ ${formatAtkRange(boss.battleAtk || boss.atk)}`,
        "",
        "## Raid Team",
        ...teamLines,
      ].join("\n").slice(0, 4096)
    )
    .setFooter({ text: "One Piece Bot • Boss Phase 2 Raid" });

  return applySafeEmbedImage(embed, boss.image);
}

function buildRaidBossButtons(participants, ended, lastUsedUnitKey = "") {
  const usedSet = getLastUsedKeySet(lastUsedUnitKey);
  const allUnits = participants.flatMap((p) => p.units || []);
  const rows = [];
  let row = new ActionRowBuilder();

  for (const unit of allUnits.slice(0, 20)) {
    const unitKey = getUnitActionKey(unit);
    const alreadyUsed = usedSet.has(unitKey) && shouldDisableLastUsed(allUnits, lastUsedUnitKey, unit);
    const dead = Number(unit.battleHp ?? unit.hp) <= 0;
    const label = `${Number(unit.globalSlot || 0) + 1} ${String(unit.name || "Unknown")}`.slice(0, 80);

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`boss_raid_attack_${Number(unit.globalSlot || 0)}`)
        .setLabel(label || "Unknown")
        .setStyle(dead || alreadyUsed ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(Boolean(ended || dead || alreadyUsed))
    );

    if (row.components.length >= 5) {
      rows.push(row);
      row = new ActionRowBuilder();
    }
  }

  if (row.components.length) rows.push(row);

  if (rows.length < 5) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("boss_raid_run")
          .setLabel("Run Away")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(Boolean(ended))
      )
    );
  }

  return rows.slice(0, 5);
}

function startBossCooldownNow(userId, username = "Unknown") {
  const nextBossAt = Date.now() + BOSS_COOLDOWN_MS;

  updatePlayerAtomic(
    userId,
    (fresh) => ({
      ...fresh,
      cooldowns: {
        ...(fresh.cooldowns || {}),
        boss: nextBossAt,
      },
    }),
    username
  );

  return nextBossAt;
}

function disableActionRows(rows = []) {
  return rows.map((row) => {
    const nextRow = ActionRowBuilder.from(row);

    nextRow.setComponents(
      row.components.map((component) =>
        ButtonBuilder.from(component).setDisabled(true)
      )
    );

    return nextRow;
  });
}

function buildBossProcessingEmbed(playerName, island, phaseBoss, playerTeam, boss, logs) {
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`${playerName}'s ${island.name}${phaseBoss ? ` Phase ${phaseBoss.phase}` : ""} Boss Battle`)
    .setDescription(
      [
        "⏳ **Processing boss result...**",
        "Please wait while rewards, EXP, quests, and story progress are being saved.",
        "",
        "## Final Action",
        ...(logs.length ? logs.slice(-BOSS_MAX_LOG_LINES) : ["Final hit is being processed."]),
        "",
        "## ☠️ Boss",
        `**${boss.name}** [${boss.rarity}]`,
        renderBossHpBar(boss.battleHp ?? boss.hp, boss.battleMaxHp ?? boss.maxHp),
        `❤️ ${Math.max(0, Number(boss.battleHp ?? boss.hp))}/${Number(boss.battleMaxHp ?? boss.maxHp)} | SPD \`${boss.battleSpeed || boss.speed}\` | ⚔️ ${formatAtkRange(boss.battleAtk || boss.atk)}`,
        "",
        "## Your Team",
        ...playerTeam.map((unit) => {
          return `**${unit.slot}. ${unit.name}** ❤️ ${Math.max(0, Number(unit.battleHp ?? unit.hp))}/${Number(unit.battleMaxHp ?? unit.maxHp)} | PWR \`${Number(unit.battlePower || unit.currentPower || 0).toLocaleString("en-US")}\` | SPD \`${unit.battleSpeed || unit.speed}\` | ⚔️ ${formatAtkRange(unit.battleAtk || unit.atk)}`;
        }),
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Saving Boss Result",
    });

  return applySafeEmbedImage(embed, boss.image);
}

function buildRaidBossProcessingEmbed(island, phaseBoss, participants, boss, logs) {
  const phaseLabel = phaseBoss ? `Phase ${phaseBoss.phase}` : "Boss";

  const teamLines = [];

  for (const participant of participants || []) {
    for (const unit of participant.units || []) {
      const isDead = Number(unit.battleHp ?? unit.hp) <= 0;
      const status = isDead ? "DEFEATED" : "SAVING";

      teamLines.push(
        `**${unit.globalSlot + 1}. ${unit.name}** ❤️ ${Math.max(
          0,
          Number(unit.battleHp ?? unit.hp)
        )}/${Number(unit.battleMaxHp ?? unit.maxHp)} | PWR \`${Number(
          unit.battlePower || unit.currentPower || 0
        ).toLocaleString("en-US")}\` | SPD \`${unit.battleSpeed || unit.speed}\` | ⚔️ ${formatAtkRange(
          unit.battleAtk || unit.atk
        )} | ${status}`
      );
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`${island.name} ${phaseLabel} Boss Raid`)
    .setDescription(
      [
        "⏳ **Processing boss raid result...**",
        "Please wait while rewards, EXP, quests, and story progress are being saved.",
        "",
        "## Final Action",
        ...(logs.length ? logs.slice(-BOSS_MAX_LOG_LINES) : ["Final hit is being processed."]),
        "",
        "## ☠️ Boss",
        `**${boss.name}** [${boss.rarity}]`,
        renderBossHpBar(boss.battleHp ?? boss.hp, boss.battleMaxHp ?? boss.maxHp),
        `❤️ ${Math.max(0, Number(boss.battleHp ?? boss.hp))}/${Number(
          boss.battleMaxHp ?? boss.maxHp
        )} | SPD \`${boss.battleSpeed || boss.speed}\` | ⚔️ ${formatAtkRange(
          boss.battleAtk || boss.atk
        )}`,
        "",
        "## Raid Team",
        ...(teamLines.length ? teamLines : ["No raid team data found."]),
      ]
        .join("\n")
        .slice(0, 4096)
    )
    .setFooter({
      text: "One Piece Bot • Saving Boss Phase 2 Raid Result",
    });

  return applySafeEmbedImage(embed, boss.image);
}

function stripEmbedImage(embed) {
  try {
    return EmbedBuilder.from(embed).setImage(null);
  } catch (_) {
    return embed;
  }
}

async function sendRaidBossBattleMessage(message, payload) {
  try {
    return await message.reply(payload);
  } catch (error) {
    console.error("[BOSS PHASE 2 RAID START REPLY ERROR]", {
      message: error?.message,
      code: error?.code,
      status: error?.status,
      rawError: error?.rawError,
    });

    try {
      const fallbackPayload = {
        ...payload,
        embeds: Array.isArray(payload.embeds)
          ? payload.embeds.map((embed) => stripEmbedImage(embed))
          : payload.embeds,
      };

      return await message.reply(fallbackPayload);
    } catch (fallbackError) {
      console.error("[BOSS PHASE 2 RAID START FALLBACK ERROR]", {
        message: fallbackError?.message,
        code: fallbackError?.code,
        status: fallbackError?.status,
        rawError: fallbackError?.rawError,
      });

      await message.reply(
        "Boss Phase 2 raid failed to start because Discord rejected the battle message payload. Check console log: `[BOSS PHASE 2 RAID START FALLBACK ERROR]`."
      );

      return null;
    }
  }
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
    const requestedPhase = normalizePhaseArg(args);

    if (requestedPhase && !isPhasedIsland(currentIsland)) {
      return message.reply(
        [
          `**${currentIsland.name}** does not have boss phases.`,
          "",
          "`op boss 2` can only be used on islands with a real Phase 2 boss.",
          "Use `op boss` for this island.",
        ].join("\n")
      );
    }

    if (requestedPhase && isPhasedIsland(currentIsland)) {
      const phaseState = getBossPhaseState(player, currentIsland.code);

      if (routeAlreadyCleared) {
        return message.reply(
          `You already cleared all boss phases for **${currentIsland.name}**.`
        );
      }

      if (requestedPhase === 1 && phaseState.phase1Cleared) {
        return message.reply(
          [
            `**${currentIsland.name} Phase 1** is already cleared.`,
            phaseState.phase2Cleared
              ? "Phase 2 is also cleared."
              : "Use `op boss 2` to challenge Phase 2.",
          ].join("\n")
        );
      }

      if (requestedPhase === 2 && !phaseState.phase1Cleared) {
        return message.reply(
          `You must clear **${currentIsland.name} Phase 1** before using \`op boss 2\`.`
        );
      }

      if (requestedPhase === 2 && phaseState.phase2Cleared) {
        return message.reply(
          `**${currentIsland.name} Phase 2** is already cleared.`
        );
      }
    }

    let phaseBossResult = null;

    if (isPhasedIsland(currentIsland) && !requestedPhase) {
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

      startBossCooldownNow(message.author.id, message.author.username);

      const boss = toBossBattleUnit(getBossTemplate(currentIsland, phaseBoss));
      const logs = [];
      let ended = false;
      let lastUsedUnitKey = "";
      const allUnits = participants.flatMap((participant) => participant.units);

      let raidStartPayload;

      try {
        raidStartPayload = {
          embeds: [
            buildRaidBossEmbed(
              currentIsland,
              phaseBoss,
              participants,
              boss,
              logs,
              ended,
              lastUsedUnitKey
            ),
          ],
          components: buildRaidBossButtons(
            participants,
            ended,
            lastUsedUnitKey
          ),
        };
      } catch (error) {
        console.error("[BOSS PHASE 2 BUILD PAYLOAD ERROR]", {
          message: error?.message,
          stack: error?.stack,
          bossImage: boss?.image,
          bossName: boss?.name,
          island: currentIsland?.code,
          phase: phaseBoss?.phase,
        });

        await message.reply(
          "Boss Phase 2 failed while building the battle UI. Check Render logs: `[BOSS PHASE 2 BUILD PAYLOAD ERROR]`."
        );

        return;
      }

      const reply = await sendRaidBossBattleMessage(message, raidStartPayload);

      if (!reply) return;

      const collector = reply.createMessageComponentCollector({
        time: SESSION_TIMEOUT_MS,
      });

      collector.on("collect", async (interaction) => {
if (ended) {
          await safeEphemeralReply(interaction, "This boss interaction is no longer available or already processed.");
          return;
        }

        const deferred = await safeDeferUpdate(interaction);
        if (!deferred) return;
if (interaction.customId === "boss_raid_run") {
          if (interaction.user.id !== message.author.id) {
            await safeEphemeralReply(interaction, "Only the raid host can run away.");
            return;
          }
          logs.length = 0;
          pushBossLog(logs, "⚠️ Run away confirmation requested.");
          pushBossLog(logs, "Confirm run away or cancel to continue.");

          await safeEditInteractionMessage(interaction, {
            embeds: [
              buildRaidBossEmbed(
                currentIsland,
                phaseBoss,
                participants,
                boss,
                logs,
                false,
                lastUsedUnitKey
              ),
            ],
            components: buildRaidBossRunConfirmButtons(),
          });
          return;
        }

        if (interaction.customId === "boss_raid_run_cancel") {
          if (interaction.user.id !== message.author.id) {
            await safeEphemeralReply(interaction, "Only the raid host can cancel run away.");
            return;
          }
          logs.length = 0;
          pushBossLog(logs, "✅ Run away cancelled.");
          pushBossLog(logs, "Choose a raid unit to continue.");

          await safeEditInteractionMessage(interaction, {
            embeds: [
              buildRaidBossEmbed(
                currentIsland,
                phaseBoss,
                participants,
                boss,
                logs,
                false,
                lastUsedUnitKey
              ),
            ],
            components: buildRaidBossButtons(
              participants,
              false,
              lastUsedUnitKey
            ),
          });
          return;
        }

        if (interaction.customId === "boss_raid_run_confirm") {
          if (interaction.user.id !== message.author.id) {
            await safeEphemeralReply(interaction, "Only the raid host can confirm run away.");
            return;
          }
          ended = true;
          logs.length = 0;
          pushBossLog(logs, "🏃 The raid host ran away.");
          pushBossLog(logs, "No EXP gained from running away.");

          const updatedQuests = applyBossQuestProgress(player, ["bossFights"]);

          updatePlayerAtomic(
            message.author.id,
            (fresh) => {
              return {
                ...fresh,
                quests: applyBossQuestProgress(fresh, ["bossFights"]),
              };
            },
            message.author.username
          );

          await safeEditInteractionMessage(interaction, {
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

        if (!interaction.customId.startsWith("boss_raid_attack_")) {
          return safeEphemeralReply(interaction, "Unknown boss raid action.");
        }

        const index = Number(interaction.customId.replace("boss_raid_attack_", ""));
        const attacker = allUnits.find((unit) => unit.globalSlot === index);

        if (!attacker || Number(attacker.battleHp ?? attacker.hp) <= 0) {
          return safeEphemeralReply(interaction, "That raid unit cannot attack right now.");
        }

        if (String(interaction.user.id) !== String(message.author.id)) {
          return safeEphemeralReply(
            interaction,
            "Only the raid host can control raid attacks. Other users only join the raid."
          );
        }

        const unitKey = getUnitActionKey(attacker);

        if (shouldDisableLastUsed(allUnits, lastUsedUnitKey, attacker)) {
          return safeEphemeralReply(
            interaction,
            "This card is on 1-turn cooldown. Use another card first."
          );
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

          await safeEditInteractionMessage(interaction, {
            embeds: [
              buildRaidBossProcessingEmbed(
                currentIsland,
                phaseBoss,
                participants,
                boss,
                logs
              ),
            ],
            components: [],
          });

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

            updatePlayerAtomic(
              participant.userId,
              (fresh) => {
                const freshStory = {
                  ...(fresh.story || {}),
                  clearedIslandBosses: Array.isArray(fresh?.story?.clearedIslandBosses)
                    ? [...fresh.story.clearedIslandBosses]
                    : [],
                  bossPhases: {
                    ...(fresh?.story?.bossPhases || {}),
                  },
                };

                const freshIsland = getCurrentIsland(fresh);
                const sameIsland = freshIsland?.code === currentIsland.code;

                if (sameIsland) {
                  const currentState = getBossPhaseState(fresh, currentIsland.code);

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

                  freshStory.bossPhases[currentIsland.code] = nextPhaseState;

                  if (
                    nextPhaseState.completed &&
                    !freshStory.clearedIslandBosses.includes(currentIsland.code)
                  ) {
                    freshStory.clearedIslandBosses.push(currentIsland.code);
                  }
                }

                return {
                  ...fresh,
                  cards: applyBossExpToCards(fresh, participant.units, expResults),
                  boxes: applyBoxes(fresh.boxes, reward.boxes),
                  berries: Number(fresh.berries || 0) + reward.berries,
                  gems: Number(fresh.gems || 0) + reward.gems,
                  story: freshStory,
                  quests: applyBossQuestProgress(fresh, ["bossFights", "bossesDefeated"]),
                };
              },
              participant.username || "Unknown"
            );
          }

          storyLines.push(`✅ ${currentIsland.name} Phase ${phaseBoss.phase} cleared.`);
          storyLines.push("Rewards were given to every valid raid participant.");

          pushBossLog(logs, `🏆 ${boss.name} was defeated by the raid team!`);

          await safeEditInteractionMessage(interaction, {
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

          await safeEditInteractionMessage(interaction, {
            embeds: [
              buildRaidBossProcessingEmbed(
                currentIsland,
                phaseBoss,
                participants,
                boss,
                logs
              ),
            ],
            components: [],
          });

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

            updatePlayerAtomic(
              participant.userId,
              (fresh) => {
                return {
                  ...fresh,
                  cards: applyBossExpToCards(fresh, participant.units, expResults),
                  quests: applyBossQuestProgress(fresh, ["bossFights"]),
                };
              },
              participant.username || "Unknown"
            );
          }

          pushBossLog(logs, `💀 The raid team was wiped out by ${boss.name}.`);

          await safeEditInteractionMessage(interaction, {
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

        await safeEditInteractionMessage(interaction, {
          embeds: [
            buildRaidBossEmbed(
              currentIsland,
              phaseBoss,
              participants,
              boss,
              logs,
              false,
              lastUsedUnitKey
            ),
          ],
          components: buildRaidBossButtons(
            participants,
            false,
            lastUsedUnitKey
          ),
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

    startBossCooldownNow(message.author.id, message.author.username);

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
        await safeEphemeralReply(interaction, "This boss interaction is no longer available or already processed.");
        return;
      }

      if (ended) {
        await safeEphemeralReply(interaction, "This boss interaction is no longer available or already processed.");
        return;
      }

      const deferred = await safeDeferUpdate(interaction);
      if (!deferred) return;
if (interaction.customId === "boss_run") {
        logs.length = 0;
        pushBossLog(logs, "⚠️ Run away confirmation requested.");
        pushBossLog(logs, "Confirm run away or cancel to continue.");

        await safeEditInteractionMessage(interaction, {
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

        await safeEditInteractionMessage(interaction, {
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

        await safeEditInteractionMessage(interaction, {
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

      if (!interaction.customId.startsWith("boss_attack_")) {
        return safeEphemeralReply(interaction, "Unknown boss action.");
      }

      const index = Number(interaction.customId.replace("boss_attack_", ""));
      const attacker = playerTeam[index];

      if (!attacker || Number(attacker.battleHp ?? attacker.hp) <= 0) {
        return safeEphemeralReply(interaction, "That card cannot attack right now.");
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

        updatePlayerAtomic(
          message.author.id,
          (fresh) => {
            const freshStory = {
              ...(fresh.story || {}),
              clearedIslandBosses: Array.isArray(fresh?.story?.clearedIslandBosses)
                ? [...fresh.story.clearedIslandBosses]
                : [],
              bossPhases: {
                ...(fresh?.story?.bossPhases || {}),
              },
            };

            const freshRouteAlreadyCleared = isIslandBossRouteCleared(fresh, currentIsland);

            if (phaseBoss && !freshRouteAlreadyCleared) {
              const currentState = getBossPhaseState(fresh, currentIsland.code);

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

              freshStory.bossPhases[currentIsland.code] = nextPhaseState;

              if (
                nextPhaseState.completed &&
                !freshStory.clearedIslandBosses.includes(currentIsland.code)
              ) {
                freshStory.clearedIslandBosses.push(currentIsland.code);
              }
            } else if (!freshRouteAlreadyCleared) {
              if (!freshStory.clearedIslandBosses.includes(currentIsland.code)) {
                freshStory.clearedIslandBosses.push(currentIsland.code);
              }
            }

            return {
              ...fresh,
              cards: applyBossExpToCards(fresh, playerTeam, expResults),
              boxes: applyBoxes(fresh.boxes, reward.boxes),
              berries: Number(fresh.berries || 0) + reward.berries,
              gems: Number(fresh.gems || 0) + reward.gems,
              story: freshStory,
              quests: applyBossQuestProgress(fresh, ["bossFights", "bossesDefeated"]),
            };
          },
          message.author.username
        );

        pushBossLog(logs, `🏆 ${boss.name} was defeated!`);

        await safeEditInteractionMessage(interaction, {
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

          await safeEditInteractionMessage(interaction, {
            embeds: [
              buildBossProcessingEmbed(
                player.username || message.author.username,
                currentIsland,
                phaseBoss,
                playerTeam,
                boss,
                logs
              ),
            ],
            components: disableActionRows(buildButtons(playerTeam, true, [])),
          });

        const expResults = calculateBossExp(playerTeam, false, combatBoosts);
        const updatedCards = applyBossExpToCards(player, playerTeam, expResults);
        const expLines = formatExpResults(playerTeam, expResults);
        const updatedQuests = applyBossQuestProgress(player, ["bossFights"]);

        updatePlayerAtomic(
          message.author.id,
          (fresh) => {
            return {
              ...fresh,
              cards: applyBossExpToCards(fresh, playerTeam, expResults),
              quests: applyBossQuestProgress(fresh, ["bossFights"]),
            };
          },
          message.author.username
        );

        pushBossLog(logs, `💀 Your team was wiped out by ${boss.name}.`);

        await safeEditInteractionMessage(interaction, {
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

      await safeEditInteractionMessage(interaction, {
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

        updatePlayerAtomic(
          message.author.id,
          (fresh) => {
            return {
              ...fresh,
              cards: applyBossExpToCards(fresh, playerTeam, expResults),
              quests: applyBossQuestProgress(fresh, ["bossFights"]),
            };
          },
          message.author.username
        );

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