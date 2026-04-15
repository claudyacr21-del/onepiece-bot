const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { incrementQuestCounter } = require("../utils/questProgress");
const { ITEMS, cloneItem } = require("../data/items");

function addOrIncrease(list, item) {
  const arr = Array.isArray(list) ? [...list] : [];
  const index = arr.findIndex((entry) => entry.code === item.code);

  if (index !== -1) {
    arr[index] = {
      ...arr[index],
      amount: Number(arr[index].amount || 1) + Number(item.amount || 1)
    };
    return arr;
  }

  arr.push({
    ...item,
    amount: Number(item.amount || 1)
  });

  return arr;
}

function toBattleUnit(card, slotIndex) {
  return {
    slot: slotIndex + 1,
    instanceId: card.instanceId,
    name: card.displayName || card.name || "Unknown",
    rarity: card.rarity || "C",
    atk: Number(card.atk || 0),
    hp: Number(card.hp || 0),
    maxHp: Number(card.hp || 0),
    speed: Number(card.speed || 0),
    level: Number(card.level || 1),
    kills: Number(card.kills || 0),
    image: card.image || ""
  };
}

function createEnemy(name, rarity, atk, hp, speed) {
  return {
    name,
    rarity,
    atk,
    hp,
    maxHp: hp,
    speed
  };
}

function generateEnemyTeam() {
  const pool = [
    createEnemy("Marine Recruit", "C", 35, 220, 35),
    createEnemy("Pirate Raider", "C", 40, 240, 32),
    createEnemy("Bounty Hunter", "B", 55, 290, 40),
    createEnemy("CP Agent", "A", 70, 340, 52),
    createEnemy("Vice Admiral Soldier", "S", 90, 420, 60)
  ];

  const picks = [];
  for (let i = 0; i < 3; i++) {
    const enemy = pool[Math.floor(Math.random() * pool.length)];
    picks.push({
      ...enemy,
      instanceId: `enemy-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`
    });
  }

  return picks;
}

function getAliveUnits(units) {
  return units.filter((unit) => Number(unit.hp) > 0);
}

function getFirstAlive(units) {
  return units.find((unit) => Number(unit.hp) > 0) || null;
}

function clampHp(value) {
  return Math.max(0, Math.floor(value));
}

function performAttack(attacker, defender) {
  const rawDamage = Math.max(1, Number(attacker.atk || 0) - Math.floor(Number(defender.speed || 0) * 0.15));
  defender.hp = clampHp(Number(defender.hp || 0) - rawDamage);
  return rawDamage;
}

function renderHpBar(hp, maxHp, size = 10) {
  const current = Math.max(0, Number(hp || 0));
  const max = Math.max(1, Number(maxHp || 1));
  const filled = Math.round((current / max) * size);
  const safeFilled = Math.max(0, Math.min(size, filled));

  return `${"█".repeat(safeFilled)}${"░".repeat(size - safeFilled)} ${current}/${max}`;
}

function buildFightDescription(playerTeam, enemyTeam, logs, streak) {
  const playerLines = playerTeam.map((unit) => {
    const status = unit.hp > 0 ? "🟢" : "🔴";
    return `${status} **${unit.slot}. ${unit.name}** [${unit.rarity}] • ATK \`${unit.atk}\` • SPD \`${unit.speed}\`\n${renderHpBar(unit.hp, unit.maxHp)}`;
  });

  const enemyLines = enemyTeam.map((unit, index) => {
    const status = unit.hp > 0 ? "🟢" : "🔴";
    return `${status} **${index + 1}. ${unit.name}** [${unit.rarity}] • ATK \`${unit.atk}\` • SPD \`${unit.speed}\`\n${renderHpBar(unit.hp, unit.maxHp)}`;
  });

  const recentLogs = logs.slice(-6);

  return [
    `**Current Win Streak:** \`${streak}\``,
    "",
    "## Your Team",
    ...playerLines,
    "",
    "## Enemy Team",
    ...enemyLines,
    "",
    "## Battle Log",
    ...(recentLogs.length ? recentLogs : ["No actions yet. Choose your first attacker."])
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
        .setDisabled(battleEnded || !unit || unit.hp <= 0)
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

function buildFightEmbed(playerName, playerTeam, enemyTeam, logs, streak, battleEnded) {
  return new EmbedBuilder()
    .setColor(battleEnded ? 0x2ecc71 : 0xc0392b)
    .setTitle(`⚔️ ${playerName}'s Fight`)
    .setDescription(buildFightDescription(playerTeam, enemyTeam, logs, streak))
    .setFooter({ text: "One Piece Bot • Manual Fight" });
}

function calculateWinReward(streakAfterWin) {
  const reward = {
    berries: 2500,
    gems: 8,
    boxes: [],
    tickets: []
  };

  if (streakAfterWin % 10 === 0) {
    reward.berries += 5000;
    reward.gems += 15;
    reward.boxes.push(cloneItem(ITEMS.basicResourceBox, 1));
  }

  return reward;
}

module.exports = {
  name: "fight",
  aliases: ["battle"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const cards = Array.isArray(player.cards) ? player.cards : [];
    const teamSlots = Array.isArray(player?.team?.slots) ? player.team.slots : [null, null, null];

    const teamCards = teamSlots
      .map((instanceId, index) => {
        if (!instanceId) return null;
        const found = cards.find((card) => card.instanceId === instanceId && card.cardRole !== "boost");
        return found ? toBattleUnit(found, index) : null;
      })
      .filter(Boolean);

    if (teamCards.length === 0) {
      return message.reply("You do not have any battle cards in your team. Use `op add <card name>` first.");
    }

    const playerTeam = [...teamCards].sort((a, b) => a.slot - b.slot);
    const enemyTeam = generateEnemyTeam();
    const logs = [];
    let battleEnded = false;

    const currentStreak = Number(player?.stats?.winStreak || 0);

    const reply = await message.reply({
      embeds: [buildFightEmbed(player.username, playerTeam, enemyTeam, logs, currentStreak, battleEnded)],
      components: buildActionRows(playerTeam, battleEnded)
    });

    const collector = reply.createMessageComponentCollector({
      time: 10 * 60 * 1000
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the command user can control this fight.",
          ephemeral: true
        });
      }

      if (battleEnded) {
        return interaction.reply({
          content: "This fight has already ended.",
          ephemeral: true
        });
      }

      if (interaction.customId === "fight_run") {
        battleEnded = true;

        const playedDailyState = incrementQuestCounter(player, "fightsPlayed", 1);

        const updatedStats = {
          ...(player.stats || {}),
          wins: Number(player?.stats?.wins || 0),
          losses: Number(player?.stats?.losses || 0) + 1,
          winStreak: 0,
          bestWinStreak: Number(player?.stats?.bestWinStreak || 0)
        };

        updatePlayer(message.author.id, {
          stats: updatedStats,
          quests: {
            ...(player.quests || {}),
            dailyState: playedDailyState
          }
        });

        logs.push("🏃 You ran away from the fight.");

        await interaction.update({
          embeds: [buildFightEmbed(player.username, playerTeam, enemyTeam, logs, 0, true)],
          components: buildActionRows(playerTeam, true)
        });

        collector.stop("run");
        return;
      }

      if (!interaction.customId.startsWith("fight_attack_")) {
        return;
      }

      const index = Number(interaction.customId.replace("fight_attack_", ""));
      const attacker = playerTeam[index];

      if (!attacker || attacker.hp <= 0) {
        return interaction.reply({
          content: "That card cannot attack right now.",
          ephemeral: true
        });
      }

      const enemyTarget = getFirstAlive(enemyTeam);

      if (!enemyTarget) {
        return interaction.reply({
          content: "There are no enemies left.",
          ephemeral: true
        });
      }

      const playerDamage = performAttack(attacker, enemyTarget);
      logs.push(`⚔️ ${attacker.name} dealt **${playerDamage}** damage to ${enemyTarget.name}.`);

      if (enemyTarget.hp <= 0) {
        logs.push(`💥 ${enemyTarget.name} was defeated.`);
        attacker.kills += 1;
      }

      const aliveEnemies = getAliveUnits(enemyTeam);
      const alivePlayers = getAliveUnits(playerTeam);

      if (aliveEnemies.length === 0) {
        battleEnded = true;

        const streakAfterWin = currentStreak + 1;
        const reward = calculateWinReward(streakAfterWin);

        let updatedBoxes = [...(player.boxes || [])];
        reward.boxes.forEach((item) => {
          updatedBoxes = addOrIncrease(updatedBoxes, item);
        });

        const updatedCards = [...cards].map((card) => {
          const changed = playerTeam.find((unit) => unit.instanceId === card.instanceId);
          if (!changed) return card;

          return {
            ...card,
            kills: Number(changed.kills || 0)
          };
        });

        let updatedDailyState = incrementQuestCounter(player, "fightsPlayed", 1);
        updatedDailyState = incrementQuestCounter(
          { ...player, quests: { ...(player.quests || {}), dailyState: updatedDailyState } },
          "fightsWon",
          1
        );

        const updatedStats = {
          ...(player.stats || {}),
          wins: Number(player?.stats?.wins || 0) + 1,
          losses: Number(player?.stats?.losses || 0),
          winStreak: streakAfterWin,
          bestWinStreak: Math.max(Number(player?.stats?.bestWinStreak || 0), streakAfterWin)
        };

        updatePlayer(message.author.id, {
          cards: updatedCards,
          boxes: updatedBoxes,
          berries: Number(player.berries || 0) + reward.berries,
          gems: Number(player.gems || 0) + reward.gems,
          stats: updatedStats,
          quests: {
            ...(player.quests || {}),
            dailyState: updatedDailyState
          }
        });

        logs.push("🏆 You won the fight!");
        logs.push(`🍇 +${reward.berries.toLocaleString("en-US")} berries`);
        logs.push(`💎 +${reward.gems} gems`);

        if (reward.boxes.length) {
          reward.boxes.forEach((item) => logs.push(`📦 ${item.name} x${item.amount}`));
        }

        await interaction.update({
          embeds: [buildFightEmbed(player.username, playerTeam, enemyTeam, logs, streakAfterWin, true)],
          components: buildActionRows(playerTeam, true)
        });

        collector.stop("win");
        return;
      }

      const enemyAttacker = aliveEnemies.sort((a, b) => Number(b.speed || 0) - Number(a.speed || 0))[0];
      const playerTarget = alivePlayers.sort((a, b) => a.slot - b.slot)[0];

      if (enemyAttacker && playerTarget) {
        const enemyDamage = performAttack(enemyAttacker, playerTarget);
        logs.push(`🩸 ${enemyAttacker.name} dealt **${enemyDamage}** damage to ${playerTarget.name}.`);

        if (playerTarget.hp <= 0) {
          logs.push(`☠️ ${playerTarget.name} was defeated.`);
        }
      }

      const stillAlivePlayers = getAliveUnits(playerTeam);

      if (stillAlivePlayers.length === 0) {
        battleEnded = true;

        const updatedCards = [...cards].map((card) => {
          const changed = playerTeam.find((unit) => unit.instanceId === card.instanceId);
          if (!changed) return card;

          return {
            ...card,
            kills: Number(changed.kills || 0)
          };
        });

        const updatedDailyState = incrementQuestCounter(player, "fightsPlayed", 1);

        const updatedStats = {
          ...(player.stats || {}),
          wins: Number(player?.stats?.wins || 0),
          losses: Number(player?.stats?.losses || 0) + 1,
          winStreak: 0,
          bestWinStreak: Number(player?.stats?.bestWinStreak || 0)
        };

        updatePlayer(message.author.id, {
          cards: updatedCards,
          stats: updatedStats,
          quests: {
            ...(player.quests || {}),
            dailyState: updatedDailyState
          }
        });

        logs.push("💀 You lost the fight.");

        await interaction.update({
          embeds: [buildFightEmbed(player.username, playerTeam, enemyTeam, logs, 0, true)],
          components: buildActionRows(playerTeam, true)
        });

        collector.stop("lose");
        return;
      }

      await interaction.update({
        embeds: [buildFightEmbed(player.username, playerTeam, enemyTeam, logs, currentStreak, false)],
        components: buildActionRows(playerTeam, false)
      });
    });

    collector.on("end", async (reason) => {
      if (reason === "time") {
        try {
          logs.push("⌛ Fight expired.");
          await reply.edit({
            embeds: [buildFightEmbed(player.username, playerTeam, enemyTeam, logs, Number(player?.stats?.winStreak || 0), true)],
            components: buildActionRows(playerTeam, true)
          });
        } catch (error) {
          // ignore
        }
      }
    });
  }
};