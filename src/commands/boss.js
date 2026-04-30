const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { getPlayer, updatePlayer } = require("../playerStore");
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

const BOSS_PHASE_JOIN_REQUIRED = 2;
const BOSS_JOIN_LOBBY_MS = 2 * 60 * 1000;

const BOSS_WIN_EXP_PER_CARD = 180;
const BOSS_LOSE_EXP_PER_CARD = 95;

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
  const synced = hydrateCard(card);

  const displayAtk = Number(synced.atk || 0);
  const displayHp = Number(synced.hp || 0);
  const displaySpeed = Number(synced.speed || 0);

  const battleAtk = applyBoostToNumber(displayAtk, combatBoosts.atk);
  const battleMaxHp = applyBoostToNumber(displayHp, combatBoosts.hp);
  const battleSpeed = applyBoostToNumber(displaySpeed, combatBoosts.spd);

  return {
    slot: slotIndex + 1,
    sourceIndex: Number.isInteger(card.sourceIndex) ? card.sourceIndex : null,
    instanceId: synced.instanceId,
    name: synced.displayName || synced.name || "Unknown",
    rarity: synced.currentTier || synced.rarity || "C",

    atk: displayAtk,
    hp: displayHp,
    maxHp: displayHp,
    speed: displaySpeed,

    battleAtk,
    battleHp: battleMaxHp,
    battleMaxHp,
    battleSpeed,

    level: Number(synced.level || 1),
    levelCap: getCardLevelCap(synced),
    exp: getCardExp(synced),
    kills: Number(synced.kills || 0),
    image: synced.image || "",

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

function buildBossJoinEmbed(hostId, island, phaseBoss, joinedIds, statusText = "") {
  const phaseLabel = phaseBoss ? `Phase ${phaseBoss.phase}` : "Boss Phase";
  const joinedList = [...joinedIds].map((id, index) => `${index + 1}. <@${id}>`);

  return new EmbedBuilder()
    .setColor(joinedIds.size >= BOSS_PHASE_JOIN_REQUIRED ? 0x2ecc71 : 0xf1c40f)
    .setTitle(`👥 ${island.name} ${phaseLabel} Lobby`)
    .setDescription(
      [
        `**Host:** <@${hostId}>`,
        `**Joined:** ${joinedIds.size}/${BOSS_PHASE_JOIN_REQUIRED}`,
        "",
        joinedList.length ? joinedList.join("\n") : "No one has joined yet.",
        "",
        statusText || "At least **2 users must join this boss lobby** before the fight can start.",
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Boss Join Lobby",
    });
}

function buildBossJoinButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("boss_lobby_join")
        .setLabel("Join")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("boss_lobby_start")
        .setLabel("Start")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("boss_lobby_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

async function waitForBossJoinLobby(message, island, phaseBoss) {
  const joinedIds = new Set([String(message.author.id)]);
  let approved = false;
  let cancelled = false;

  const lobbyMessage = await message.reply({
    embeds: [
      buildBossJoinEmbed(
        message.author.id,
        island,
        phaseBoss,
        joinedIds,
        "Host is counted as joined. At least **1 more user** must press **Join**."
      ),
    ],
    components: buildBossJoinButtons(),
  });

  const collector = lobbyMessage.createMessageComponentCollector({
    time: BOSS_JOIN_LOBBY_MS,
  });

  await new Promise((resolve) => {
    collector.on("collect", async (interaction) => {
      if (interaction.customId === "boss_lobby_join") {
        joinedIds.add(String(interaction.user.id));

        await interaction.update({
          embeds: [
            buildBossJoinEmbed(
              message.author.id,
              island,
              phaseBoss,
              joinedIds,
              joinedIds.size >= BOSS_PHASE_JOIN_REQUIRED
                ? "Enough users joined. The host can press **Start**."
                : "Waiting for more users to press **Join**."
            ),
          ],
          components: buildBossJoinButtons(),
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

        await interaction.update({
          embeds: [
            buildBossJoinEmbed(
              message.author.id,
              island,
              phaseBoss,
              joinedIds,
              "Boss lobby cancelled."
            ),
          ],
          components: [],
        });

        collector.stop("cancelled");
        resolve();
        return;
      }

      if (interaction.customId === "boss_lobby_start") {
        if (joinedIds.size < BOSS_PHASE_JOIN_REQUIRED) {
          return interaction.reply({
            content:
              "You need at least **2 users** to start this boss phase. Ask another user to press **Join** first.",
            ephemeral: true,
          });
        }

        approved = true;

        await interaction.update({
          embeds: [
            buildBossJoinEmbed(
              message.author.id,
              island,
              phaseBoss,
              joinedIds,
              "Boss lobby approved. Starting boss battle..."
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
        await lobbyMessage.edit({
          embeds: [
            buildBossJoinEmbed(
              message.author.id,
              island,
              phaseBoss,
              joinedIds,
              "Boss lobby expired. Please run `op boss` again."
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

    return {
      name: "Five Elders",
      rarity: "UR",
      atk: 850 + order * 16,
      hp,
      maxHp: hp,
      speed: 145 + Math.floor(order * 1.2),
      image: getIslandBossImage(currentIsland, phaseBoss, null),
    };
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
      atk: 125,
      hp: 1400,
      speed: 42,
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

  return {
    ...base,
    atk: Math.floor(Number(base.atk) + order * 9),
    hp,
    maxHp: hp,
    speed: Math.floor(Number(base.speed) + order * 1.1),
    image,
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

    return {
      name: phaseBoss?.name || fromDb.displayName || fromDb.name,
      rarity: fromDb.currentTier || fromDb.rarity || "S",
      atk: Math.floor(baseAtk * atkMul),
      hp: Math.floor(baseHp * hpMul),
      maxHp: Math.floor(baseHp * hpMul),
      speed: Math.floor(baseSpeed * spdMul),
      image: getIslandBossImage(currentIsland, phaseBoss, fromDb),
    };
  }

  const fallbackAtk = 280 + shipTier * 75 + islandOrder * 16;
  const fallbackHp = 4600 + shipTier * 1350 + islandOrder * 320;
  const fallbackSpeed = 105 + shipTier * 12 + Math.floor(islandOrder * 1.25);

  return {
    name: phaseBoss?.name || currentIsland?.boss || "Island Boss",
    rarity: shipTier >= 4 ? "UR" : "S",
    atk: fallbackAtk,
    hp: fallbackHp,
    maxHp: fallbackHp,
    speed: fallbackSpeed,
    image: getIslandBossImage(currentIsland, phaseBoss, null),
  };
}

function buildBossEmbed(playerName, island, phaseBoss, playerTeam, boss, logs, ended) {
  const teamLines = playerTeam.map((unit) => {
    return [
      `**${unit.slot}. ${unit.name}** [${unit.rarity}] • LV \`${unit.level}\``,
      `ATK \`${formatAtkRange(unit.battleAtk || unit.atk)}\` • SPD \`${unit.battleSpeed || unit.speed}\``,
      renderHpBar(unit.battleHp ?? unit.hp, unit.battleMaxHp ?? unit.maxHp),
    ].join("\n");
  });

  const recentLogs = logs.slice(-6);
  const phaseLabel = phaseBoss ? ` • Phase ${phaseBoss.phase}` : "";

  return new EmbedBuilder()
    .setColor(ended ? 0x2ecc71 : 0xe74c3c)
    .setTitle(`👑 ${playerName}'s Boss Battle`)
    .setDescription(
      [
        `**Island:** \`${island.name}${phaseLabel}\``,
        `**Boss:** \`${boss.name}\` [${boss.rarity}]`,
        `**ATK:** \`${formatAtkRange(boss.battleAtk || boss.atk)}\` • **SPD:** \`${boss.battleSpeed || boss.speed}\``,
        renderHpBar(boss.battleHp ?? boss.hp, boss.battleMaxHp ?? boss.maxHp),
        "",
        "## Battle Log",
        ...(recentLogs.length
          ? recentLogs
          : ["Choose a card to attack the island boss. SPD decides turn order."]),
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
        ...(logs.length ? logs.slice(-8) : ["No final log."]),
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

function buildButtons(playerTeam, ended) {
  const row1 = new ActionRowBuilder();

  for (let i = 0; i < 3; i++) {
    const unit = playerTeam[i];

    row1.addComponents(
      new ButtonBuilder()
        .setCustomId(`boss_attack_${i}`)
        .setLabel(unit ? unit.name.slice(0, 20) : `Slot ${i + 1}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(ended || !unit || Number(unit.battleHp ?? unit.hp) <= 0)
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

    const routeAlreadyCleared = isIslandBossRouteCleared(player, currentIsland);
    const phaseBoss = getBossPhaseForBattle(player, currentIsland);
    if (requiresJoinLobbyForBossPhase(currentIsland, phaseBoss)) {
      const lobbyResult = await waitForBossJoinLobby(
        message,
        currentIsland,
        phaseBoss
      );

      if (!lobbyResult.approved) {
        return;
      }
    }

    const combatBoosts = getPassiveBoostSummary(player);

    const rawCards = Array.isArray(player.cards) ? player.cards : [];
    const cards = rawCards
      .map((rawCard, sourceIndex) => {
        const card = hydrateCard(rawCard);
        if (!card) return null;

        return {
          ...card,
          sourceIndex,
        };
      })
      .filter(Boolean);

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
        logs.length = 0;
        logs.push("🏃 You ran away from the boss battle.");
        logs.push("🚫 No EXP gained from running away.");

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

      logs.length = 0;

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

        logs.push(`⚔️ ${actor.name} attacked ${target.name}.`);
        logs.push(
          `${turn.isPlayer ? "➡️" : "⬅️"} ${actor.name} dealt **${damage}** damage to ${target.name}.`
        );

        if (Number(target.battleHp ?? target.hp) <= 0) {
          if (turn.isPlayer) attacker.kills += 1;
          logs.push(`☠️ ${target.name} was defeated.`);
        }
      }

      if (Number(boss.battleHp ?? boss.hp) <= 0) {
        ended = true;

        const reward = {
          berries: 12000,
          gems: 30,
          boxes: [cloneItem(ITEMS.rareResourceBox, 1)],
        };

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

        logs.push(`🏆 ${boss.name} was defeated!`);

        await interaction.update({
          embeds: [
            buildBossResultEmbed({
              title: "🏆 Boss Victory",
              color: 0x2ecc71,
              result: "WIN",
              rewardLines: [
                `💰 +${reward.berries.toLocaleString("en-US")} berries`,
                `💎 +${reward.gems} gems`,
                "📦 Rare Resource Box x1",
              ],
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

        logs.push(`💀 Your team was wiped out by ${boss.name}.`);

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
        components: buildButtons(playerTeam, false),
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
        logs.push("⌛ No interaction for 10 minutes. You lost the boss battle.");

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