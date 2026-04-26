const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const { getPlayer, updatePlayer, readPlayers } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const { incrementQuestCounter } = require("../utils/questProgress");
const { syncArenaRankRoles } = require("../utils/arenaRankRoles");

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const ARENA_DAILY_LIMIT = 5;

function queueArenaRankRoleSync(message) {
  syncArenaRankRoles(message.client, message.guild).catch((error) => {
    console.error("[ARENA RANK ROLES SYNC ERROR]", error);
  });
}

function getDateKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
    now.getUTCDate()
  ).padStart(2, "0")}`;
}

function getArenaRankFromPoints(points) {
  const safePoints = Math.max(0, Number(points || 0));
  return Math.max(1, 1000 - Math.floor(safePoints / 10));
}

function formatArenaRank(points) {
  return `#${getArenaRankFromPoints(points)}`;
}

function getArenaDailyUses(arena) {
  const today = getDateKey();

  if (arena?.dailyDateKey !== today) return 0;

  return Math.max(0, Number(arena?.dailyUses || 0));
}

function getArenaUsesLeft(arena) {
  return Math.max(0, ARENA_DAILY_LIMIT - getArenaDailyUses(arena));
}

function getPower(card) {
  return Number(
    card.currentPower ||
      Math.floor(
        Number(card.atk || 0) * 1.4 +
          Number(card.hp || 0) * 0.22 +
          Number(card.speed || 0) * 9
      )
  );
}

function formatWeapons(card) {
  if (Array.isArray(card?.equippedWeapons) && card.equippedWeapons.length) {
    return card.equippedWeapons
      .map((weapon) =>
        `${weapon.name}${Number(weapon.upgradeLevel || 0) > 0 ? ` +${weapon.upgradeLevel}` : ""}`
      )
      .join(", ");
  }

  return card?.displayWeaponName || card?.equippedWeapon || "None";
}

function formatDevilFruit(card) {
  return (
    card?.displayFruitName ||
    card?.equippedDevilFruitName ||
    card?.equippedDevilFruit ||
    "None"
  );
}

function buildBattleUnit(card, slot, ownerTag = "player") {
  const synced = hydrateCard(card);

  return {
    slot: slot + 1,
    ownerTag,
    instanceId: synced.instanceId || `${ownerTag}-${slot}-${Date.now()}`,
    name: synced.displayName || synced.name || "Unknown",
    rarity: synced.currentTier || synced.rarity || "C",
    atk: Number(synced.atk || 0),
    hp: Number(synced.hp || 0),
    maxHp: Number(synced.hp || 0),
    speed: Number(synced.speed || 0),
    level: Number(synced.level || 1),
    power: getPower(synced),
    equippedWeapon: formatWeapons(synced),
    equippedDevilFruit: formatDevilFruit(synced),
  };
}

function getTeamUnits(player, ownerTag = "player") {
  const cards = (Array.isArray(player.cards) ? player.cards : [])
    .map(hydrateCard)
    .filter(Boolean);

  const slots = Array.isArray(player?.team?.slots)
    ? player.team.slots
    : [null, null, null];

  return slots
    .map((instanceId, index) => {
      if (!instanceId) return null;

      const found = cards.find(
        (card) =>
          String(card.instanceId) === String(instanceId) &&
          String(card.cardRole || "").toLowerCase() !== "boost"
      );

      return found ? buildBattleUnit(found, index, ownerTag) : null;
    })
    .filter(Boolean);
}

function getAliveUnits(units) {
  return units.filter((unit) => Number(unit.hp || 0) > 0);
}

function aliveCount(units) {
  return getAliveUnits(units).length;
}

function getFirstAlive(units) {
  return units.find((unit) => Number(unit.hp || 0) > 0) || null;
}

function performAttack(attacker, defender) {
  const atk = Number(attacker.atk || 0);
  const defSpeed = Number(defender.speed || 0);
  const rolledAtk = Math.floor(atk * (0.85 + Math.random() * 0.3));
  const rawDamage = Math.max(1, rolledAtk - Math.floor(defSpeed * 0.12));

  defender.hp = Math.max(0, Number(defender.hp || 0) - rawDamage);

  return rawDamage;
}

function resolveSpeedOrder(playerUnit, enemyUnit) {
  const playerSpeed = Number(playerUnit?.speed || 0);
  const enemySpeed = Number(enemyUnit?.speed || 0);

  if (playerSpeed > enemySpeed) return [playerUnit, enemyUnit];
  if (enemySpeed > playerSpeed) return [enemyUnit, playerUnit];

  const playerPower = Number(playerUnit?.power || 0);
  const enemyPower = Number(enemyUnit?.power || 0);

  if (playerPower >= enemyPower) return [playerUnit, enemyUnit];

  return [enemyUnit, playerUnit];
}

function renderHpBar(hp, maxHp, size = 10) {
  const current = Math.max(0, Number(hp || 0));
  const max = Math.max(1, Number(maxHp || 1));
  const filled = Math.round((current / max) * size);
  const safeFilled = Math.max(0, Math.min(size, filled));

  return `${"█".repeat(safeFilled)}${"░".repeat(size - safeFilled)} ${current}/${max}`;
}

function formatAtkRange(atk) {
  const value = Number(atk || 0);
  return `${Math.floor(value * 0.85)}-${Math.floor(value * 1.15)}`;
}

function teamSummary(units) {
  return units
    .map((unit) =>
      [
        `**${unit.slot}. ${unit.name}** [${unit.rarity}]`,
        `RANK ${formatArenaRank(unit.power)} • PWR \`${unit.power}\` • LV \`${unit.level}\``,
        `ATK \`${formatAtkRange(unit.atk)}\` • SPD \`${unit.speed}\``,
        renderHpBar(unit.hp, unit.maxHp),
      ].join("\n")
    )
    .join("\n\n");
}

function applyArenaResult(arena, result) {
  const current = {
    points: Number(arena?.points || 0),
    wins: Number(arena?.wins || 0),
    losses: Number(arena?.losses || 0),
    draws: Number(arena?.draws || 0),
    streak: Number(arena?.streak || 0),
    bestStreak: Number(arena?.bestStreak || 0),
    matches: Number(arena?.matches || 0),
    dailyDateKey: getDateKey(),
    dailyUses: getArenaDailyUses(arena) + 1,
  };

  current.matches += 1;

  if (result === "win") {
    current.points += 12;
    current.wins += 1;
    current.streak += 1;

    if (current.streak > current.bestStreak) {
      current.bestStreak = current.streak;
    }
  } else {
    current.points = Math.max(0, current.points - 5);
    current.losses += 1;
    current.streak = 0;
  }

  return current;
}

function getResultTitle(result) {
  return result === "win" ? "🏆 Arena Victory" : "💀 Arena Defeat";
}

function getResultColor(result, ended) {
  if (!ended) return 0x5865f2;
  return result === "win" ? 0x2ecc71 : 0xe74c3c;
}

function resolveNoDrawResult(myTeam, enemyTeam) {
  const myAlive = aliveCount(myTeam);
  const enemyAlive = aliveCount(enemyTeam);

  if (myAlive !== enemyAlive) return myAlive > enemyAlive ? "win" : "lose";

  const myTotalHp = myTeam.reduce((sum, unit) => sum + Math.max(0, Number(unit.hp || 0)), 0);
  const enemyTotalHp = enemyTeam.reduce((sum, unit) => sum + Math.max(0, Number(unit.hp || 0)), 0);

  if (myTotalHp !== enemyTotalHp) return myTotalHp > enemyTotalHp ? "win" : "lose";

  const myPower = myTeam.reduce((sum, unit) => sum + Number(unit.power || 0), 0);
  const enemyPower = enemyTeam.reduce((sum, unit) => sum + Number(unit.power || 0), 0);

  if (myPower !== enemyPower) return myPower > enemyPower ? "win" : "lose";

  const mySpeed = myTeam.reduce((sum, unit) => sum + Number(unit.speed || 0), 0);
  const enemySpeed = enemyTeam.reduce((sum, unit) => sum + Number(unit.speed || 0), 0);

  if (mySpeed !== enemySpeed) return mySpeed > enemySpeed ? "win" : "lose";

  return "win";
}

function updateArenaPlayer(message, result) {
  const freshPlayer = getPlayer(message.author.id, message.author.username);
  const updatedArena = applyArenaResult(freshPlayer.arena, result);

  let updatedDailyState = incrementQuestCounter(freshPlayer, "arenaMatches", 1);

  if (result === "win") {
    updatedDailyState = incrementQuestCounter(
      {
        ...freshPlayer,
        quests: {
          ...(freshPlayer.quests || {}),
          dailyState: updatedDailyState,
        },
      },
      "arenaWins",
      1
    );
  }

  const completed = Array.isArray(updatedDailyState.quests)
    ? updatedDailyState.quests.filter((quest) => {
        const progress = Number(updatedDailyState.progress?.[quest.key] || 0);
        return progress >= Number(quest.target || 0);
      }).length
    : 0;

  const total = Array.isArray(updatedDailyState.quests)
    ? updatedDailyState.quests.length
    : 0;

  updatePlayer(message.author.id, {
    arena: updatedArena,
    quests: {
      ...(freshPlayer.quests || {}),
      dailyState: updatedDailyState,
      daily: {
        ...(freshPlayer?.quests?.daily || {}),
        total,
        completed,
        left: Math.max(0, total - completed),
        lastSyncedAt: Date.now(),
      },
    },
  });

  queueArenaRankRoleSync(message);

  return updatedArena;
}

function buildArenaLobbyEmbed(player, opponents) {
  const arena = player.arena || {};
  const usesLeft = getArenaUsesLeft(arena);
  const playerPoints = Number(arena.points || 0);

  const rows = opponents.slice(0, 10).map((entry, index) => {
    const tag = entry.isBot ? "BOT" : "PLAYER";
    return `${index + 1}. ${formatArenaRank(entry.points)} • **${entry.username}** • ${entry.points} pts • ${tag}`;
  });

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Global Arena")
    .setDescription(
      [
        "Select your arena opponent below.",
        "",
        `**Your Rank:** ${formatArenaRank(playerPoints)}`,
        `**Your Points:** ${playerPoints}`,
        `**Daily Battles Left:** ${usesLeft}/${ARENA_DAILY_LIMIT}`,
        "",
        "## Available Opponents",
        ...(rows.length ? rows : ["No opponent available."]),
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Arena Lobby",
    });
}

function buildOpponentMenu(opponents) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("arena_select_opponent")
        .setPlaceholder("Select arena opponent")
        .addOptions(
          opponents.slice(0, 25).map((opponent, index) => ({
            label: `${formatArenaRank(opponent.points)} • ${opponent.username}`.slice(0, 100),
            description: `${opponent.points} pts • ${
              opponent.isBot ? "Bot opponent" : "Player opponent"
            }`.slice(0, 100),
            value: String(index),
          }))
        )
    ),
  ];
}

function buildArenaDescription({
  player,
  opponent,
  myTeam,
  enemyTeam,
  logs,
  arena,
  result,
  ended,
}) {
  const recentLogs = logs.slice(-8);

  return [
    `**You:** ${player.username || "Unknown"} • ${formatArenaRank(arena?.points || 0)}`,
    `**Opponent:** ${opponent.username || "Unknown"} • ${formatArenaRank(opponent?.points || 0)}`,
    ended ? `**Result:** ${String(result || "lose").toUpperCase()}` : "**Result:** In Progress",
    `**Arena Points:** ${Number(arena?.points || 0)}`,
    `**Daily Battles Left:** ${getArenaUsesLeft(arena)}/${ARENA_DAILY_LIMIT}`,
    `**Record:** ${Number(arena?.wins || 0)}W / ${Number(arena?.losses || 0)}L`,
    `**Streak:** ${Number(arena?.streak || 0)}`,
    "",
    "## Your Team",
    teamSummary(myTeam),
    "",
    "## Opponent Team",
    teamSummary(enemyTeam),
    "",
    "## Battle Log",
    ...(recentLogs.length
      ? recentLogs
      : ["Choose one of your cards to attack. Target starts from opponent slot 1. SPD decides turn order."]),
  ].join("\n");
}

function buildArenaEmbed({
  player,
  opponent,
  myTeam,
  enemyTeam,
  logs,
  arena,
  result,
  ended,
}) {
  return new EmbedBuilder()
    .setColor(getResultColor(result, ended))
    .setTitle(ended ? getResultTitle(result) : "⚔️ Arena Battle")
    .setDescription(
      buildArenaDescription({
        player,
        opponent,
        myTeam,
        enemyTeam,
        logs,
        arena,
        result,
        ended,
      })
    )
    .setFooter({
      text: ended ? "One Piece Bot • Arena Ranked" : "One Piece Bot • Manual Arena Ranked",
    });
}

function buildArenaResultEmbed({ result, player, opponent, arena, logs }) {
  return new EmbedBuilder()
    .setColor(getResultColor(result, true))
    .setTitle(getResultTitle(result))
    .setDescription(
      [
        `**You:** ${player.username || "Unknown"}`,
        `**Opponent:** ${opponent.username || "Unknown"}`,
        "",
        `**Your Rank:** ${formatArenaRank(arena?.points || 0)}`,
        `**Arena Points:** ${Number(arena?.points || 0)}`,
        `**Daily Battles Left:** ${getArenaUsesLeft(arena)}/${ARENA_DAILY_LIMIT}`,
        `**Record:** ${Number(arena?.wins || 0)}W / ${Number(arena?.losses || 0)}L`,
        `**Streak:** ${Number(arena?.streak || 0)}`,
        "",
        "## Final Log",
        ...(logs.length ? logs.slice(-10) : ["No final log."]),
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Arena Result",
    });
}

function buildActionRows(myTeam, ended) {
  const attackRow = new ActionRowBuilder();

  for (let i = 0; i < 3; i++) {
    const unit = myTeam[i];

    attackRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`arena_attack_${i}`)
        .setLabel(unit ? unit.name.slice(0, 20) : `Slot ${i + 1}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(ended || !unit || Number(unit.hp || 0) <= 0)
    );
  }

  const controlRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("arena_forfeit")
      .setLabel("Forfeit")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(ended)
  );

  return [attackRow, controlRow];
}

function makeBotCard({ code, name, rarity, atk, hp, speed, power, slot }) {
  return buildBattleUnit(
    {
      code,
      instanceId: `arena_bot_${code}_${Date.now()}_${slot}`,
      name,
      displayName: name,
      rarity,
      currentTier: rarity,
      cardRole: "battle",
      atk,
      hp,
      speed,
      level: 1,
      currentPower: power,
      equippedWeapons: [],
      equippedDevilFruit: null,
    },
    slot,
    "bot"
  );
}

function buildBotTeam(points, botIndex) {
  const scale = 1 + Math.max(0, Number(points || 0)) / 220;
  const base = [
    {
      code: `bot_marine_${botIndex}`,
      name: "Arena Marine",
      rarity: "C",
      atk: 95,
      hp: 900,
      speed: 55,
      power: 450,
    },
    {
      code: `bot_swordsman_${botIndex}`,
      name: "Arena Swordsman",
      rarity: "C",
      atk: 120,
      hp: 780,
      speed: 68,
      power: 500,
    },
    {
      code: `bot_captain_${botIndex}`,
      name: "Arena Captain",
      rarity: points >= 100 ? "B" : "C",
      atk: 145,
      hp: 1100,
      speed: 72,
      power: points >= 100 ? 820 : 600,
    },
  ];

  return base.map((entry, index) =>
    makeBotCard({
      ...entry,
      atk: Math.floor(entry.atk * scale),
      hp: Math.floor(entry.hp * scale),
      speed: Math.floor(entry.speed * Math.min(1.5, scale)),
      power: Math.floor(entry.power * scale),
      slot: index,
    })
  );
}

function buildBotOpponents(playerPoints, count = 6) {
  const offsets = [-20, -10, 0, 10, 30, 50, 70, 90, 120, 150];

  return Array.from({ length: count }).map((_, index) => {
    const offset = offsets[index % offsets.length];
    const botPoints = Math.max(0, playerPoints + offset);

    return {
      userId: `bot-${index}`,
      username: `Arena Bot ${index + 1}`,
      points: botPoints,
      wins: 0,
      losses: 0,
      isBot: true,
      teamUnits: buildBotTeam(botPoints, index),
    };
  });
}

function buildOpponentPool(message, player) {
  const allPlayers = readPlayers();
  const playerPoints = Number(player?.arena?.points || 0);

  const realOpponents = Object.entries(allPlayers)
    .filter(([userId]) => userId !== message.author.id)
    .map(([userId, raw]) => ({
      userId,
      ...raw,
    }))
    .map((entry) => ({
      ...entry,
      username: entry.username || "Unknown",
      cards: Array.isArray(entry.cards) ? entry.cards : [],
      team: entry.team || {
        slots: [null, null, null],
      },
      points: Number(entry?.arena?.points || 0),
      wins: Number(entry?.arena?.wins || 0),
      losses: Number(entry?.arena?.losses || 0),
      isBot: false,
    }))
    .filter((entry) => {
      const team = getTeamUnits(entry, "opponent");
      return team.length === 3;
    })
    .map((entry) => ({
      ...entry,
      teamUnits: getTeamUnits(entry, "opponent"),
    }));

  const botsNeeded = Math.max(0, 6 - realOpponents.length);
  const bots = buildBotOpponents(playerPoints, botsNeeded || 3);

  return [...realOpponents, ...bots]
    .sort((a, b) => {
      const diffA = Math.abs(Number(a.points || 0) - playerPoints);
      const diffB = Math.abs(Number(b.points || 0) - playerPoints);

      if (diffA !== diffB) return diffA - diffB;
      if (b.points !== a.points) return b.points - a.points;
      return String(a.username).localeCompare(String(b.username));
    })
    .slice(0, 25);
}

async function startArenaBattle({ message, player, opponent, myTeam, enemyTeam, lobbyMessage }) {
  const logs = [];
  let ended = false;
  let result = null;
  let currentArena = {
    points: Number(player?.arena?.points || 0),
    wins: Number(player?.arena?.wins || 0),
    losses: Number(player?.arena?.losses || 0),
    draws: Number(player?.arena?.draws || 0),
    streak: Number(player?.arena?.streak || 0),
    bestStreak: Number(player?.arena?.bestStreak || 0),
    matches: Number(player?.arena?.matches || 0),
    dailyDateKey: player?.arena?.dailyDateKey || null,
    dailyUses: getArenaDailyUses(player?.arena || {}),
  };

  await lobbyMessage.edit({
    embeds: [
      buildArenaEmbed({
        player,
        opponent,
        myTeam,
        enemyTeam,
        logs,
        arena: currentArena,
        result,
        ended,
      }),
    ],
    components: buildActionRows(myTeam, ended),
  });

  const collector = lobbyMessage.createMessageComponentCollector({
    time: SESSION_TIMEOUT_MS,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      return interaction.reply({
        content: "Only the command user can control this arena battle.",
        ephemeral: true,
      });
    }

    if (ended) {
      return interaction.reply({
        content: "This arena battle has already ended.",
        ephemeral: true,
      });
    }

    if (interaction.customId === "arena_forfeit") {
      ended = true;
      result = "lose";
      logs.length = 0;
      logs.push("🏳️ You forfeited the arena battle.");
      currentArena = updateArenaPlayer(message, result);

      await interaction.update({
        embeds: [
          buildArenaResultEmbed({
            result,
            player,
            opponent,
            arena: currentArena,
            logs,
          }),
        ],
        components: [],
      });

      collector.stop("forfeit");
      return;
    }

    const index = Number(interaction.customId.replace("arena_attack_", ""));
    const playerAttacker = myTeam[index];

    if (!playerAttacker || Number(playerAttacker.hp || 0) <= 0) {
      return interaction.reply({
        content: "That card cannot attack right now.",
        ephemeral: true,
      });
    }

    const enemyTarget = getFirstAlive(enemyTeam);

    if (!enemyTarget) {
      return interaction.reply({
        content: "No opponent card is available to fight.",
        ephemeral: true,
      });
    }

    logs.length = 0;

    const [first, second] = resolveSpeedOrder(playerAttacker, enemyTarget);
    const firstIsPlayer = first.ownerTag !== "opponent" && first.ownerTag !== "bot";
    const firstTarget = firstIsPlayer ? enemyTarget : playerAttacker;
    const firstDamage = performAttack(first, firstTarget);

    logs.push(`⚡ ${first.name} moved first by SPD.`);
    logs.push(`⚔️ ${first.name} attacked ${firstTarget.name}.`);
    logs.push(`➡️ ${first.name} dealt **${firstDamage}** damage to ${firstTarget.name}.`);

    if (Number(firstTarget.hp || 0) <= 0) {
      logs.push(`☠️ ${firstTarget.name} was defeated and cannot counter.`);
    }

    if (aliveCount(enemyTeam) <= 0) {
      ended = true;
      result = "win";
      logs.push("🏆 You won the arena battle!");
      currentArena = updateArenaPlayer(message, result);

      await interaction.update({
        embeds: [
          buildArenaResultEmbed({
            result,
            player,
            opponent,
            arena: currentArena,
            logs,
          }),
        ],
        components: [],
      });

      collector.stop("win");
      return;
    }

    if (aliveCount(myTeam) <= 0) {
      ended = true;
      result = "lose";
      logs.push("💀 You lost the arena battle.");
      currentArena = updateArenaPlayer(message, result);

      await interaction.update({
        embeds: [
          buildArenaResultEmbed({
            result,
            player,
            opponent,
            arena: currentArena,
            logs,
          }),
        ],
        components: [],
      });

      collector.stop("lose");
      return;
    }

    if (Number(second.hp || 0) > 0 && Number(firstTarget.hp || 0) > 0) {
      const secondTarget = firstIsPlayer ? playerAttacker : enemyTarget;
      const secondDamage = performAttack(second, secondTarget);

      logs.push(`💥 ${second.name} countered ${secondTarget.name}.`);
      logs.push(`⬅️ ${second.name} dealt **${secondDamage}** damage to ${secondTarget.name}.`);

      if (Number(secondTarget.hp || 0) <= 0) {
        logs.push(`☠️ ${secondTarget.name} was defeated.`);
      }
    }

    if (aliveCount(enemyTeam) <= 0) {
      ended = true;
      result = "win";
      logs.push("🏆 You won the arena battle!");
      currentArena = updateArenaPlayer(message, result);

      await interaction.update({
        embeds: [
          buildArenaResultEmbed({
            result,
            player,
            opponent,
            arena: currentArena,
            logs,
          }),
        ],
        components: [],
      });

      collector.stop("win");
      return;
    }

    if (aliveCount(myTeam) <= 0) {
      ended = true;
      result = "lose";
      logs.push("💀 You lost the arena battle.");
      currentArena = updateArenaPlayer(message, result);

      await interaction.update({
        embeds: [
          buildArenaResultEmbed({
            result,
            player,
            opponent,
            arena: currentArena,
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
        buildArenaEmbed({
          player,
          opponent,
          myTeam,
          enemyTeam,
          logs,
          arena: currentArena,
          result,
          ended,
        }),
      ],
      components: buildActionRows(myTeam, ended),
    });
  });

  collector.on("end", async (_collected, reason) => {
    if (ended) return;

    if (reason === "time") {
      ended = true;
      result = resolveNoDrawResult(myTeam, enemyTeam);
      logs.length = 0;
      logs.push("⌛ Arena battle timed out. Result decided by remaining units and HP.");
      currentArena = updateArenaPlayer(message, result);

      try {
        await lobbyMessage.edit({
          embeds: [
            buildArenaResultEmbed({
              result,
              player,
              opponent,
              arena: currentArena,
              logs,
            }),
          ],
          components: [],
        });
      } catch {}
    }
  });
}

module.exports = {
  name: "arena",
  aliases: ["pvp", "ranked"],

  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const myTeam = getTeamUnits(player, "player");

    if (myTeam.length < 3) {
      return message.reply("You need a full team of 3 battle cards to use `op arena`.");
    }

    const usesLeft = getArenaUsesLeft(player.arena || {});

    if (usesLeft <= 0) {
      return message.reply(`You already used all **${ARENA_DAILY_LIMIT}/5** arena battles today.`);
    }

    const opponents = buildOpponentPool(message, player);

    if (!opponents.length) {
      return message.reply("No arena opponent was found.");
    }

    const lobbyMessage = await message.reply({
      embeds: [buildArenaLobbyEmbed(player, opponents)],
      components: buildOpponentMenu(opponents),
    });

    const lobbyCollector = lobbyMessage.createMessageComponentCollector({
      time: SESSION_TIMEOUT_MS,
    });

    lobbyCollector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the command user can select an arena opponent.",
          ephemeral: true,
        });
      }

      const selectedIndex = Number(interaction.values?.[0] || 0);
      const opponent = opponents[selectedIndex];

      if (!opponent) {
        return interaction.reply({
          content: "That opponent is no longer available.",
          ephemeral: true,
        });
      }

      const freshPlayer = getPlayer(message.author.id, message.author.username);
      const freshUsesLeft = getArenaUsesLeft(freshPlayer.arena || {});

      if (freshUsesLeft <= 0) {
        return interaction.reply({
          content: `You already used all **${ARENA_DAILY_LIMIT}/5** arena battles today.`,
          ephemeral: true,
        });
      }

      lobbyCollector.stop("selected");

      await interaction.deferUpdate();

      await startArenaBattle({
        message,
        player: freshPlayer,
        opponent,
        myTeam: getTeamUnits(freshPlayer, "player"),
        enemyTeam: opponent.teamUnits,
        lobbyMessage,
      });
    });

    lobbyCollector.on("end", async (_collected, reason) => {
      if (reason === "selected") return;

      try {
        await lobbyMessage.edit({
          components: [],
        });
      } catch {}
    });
  },
};