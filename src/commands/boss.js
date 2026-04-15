const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const { getPlayer, updatePlayer } = require("../playerStore");
const { ITEMS, cloneItem } = require("../data/items");
const { incrementQuestCounter } = require("../utils/questProgress");
const { getCurrentIsland } = require("../data/islands");
const cardsDb = require("../data/cards");

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
    leveledUp
  };
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
    exp: Number(card.exp || 0),
    kills: Number(card.kills || 0)
  };
}

function getBossTemplate(currentIsland) {
  const fromDb = currentIsland?.bossCode
    ? cardsDb.find((card) => card.code === currentIsland.bossCode)
    : null;

  if (fromDb) {
    return {
      name: fromDb.displayName || fromDb.name,
      rarity: fromDb.rarity || "S",
      atk: Math.floor(Number(fromDb.atk || 100) * 1.35),
      hp: Math.floor(Number(fromDb.hp || 1000) * 1.6),
      maxHp: Math.floor(Number(fromDb.hp || 1000) * 1.6),
      speed: Math.floor(Number(fromDb.speed || 50) * 1.15),
      image: currentIsland.image || fromDb.image || ""
    };
  }

  return {
    name: currentIsland?.boss || "Island Boss",
    rarity: "S",
    atk: 140,
    hp: 2200,
    maxHp: 2200,
    speed: 80,
    image: currentIsland?.image || ""
  };
}

function getAliveUnits(units) {
  return units.filter((unit) => Number(unit.hp) > 0);
}

function clampHp(value) {
  return Math.max(0, Math.floor(value));
}

function performAttack(attacker, defender) {
  const rawDamage = Math.max(1, Number(attacker.atk || 0) - Math.floor(Number(defender.speed || 0) * 0.15));
  defender.hp = clampHp(Number(defender.hp || 0) - rawDamage);
  return rawDamage;
}

function renderHpBar(hp, maxHp, size = 12) {
  const current = Math.max(0, Number(hp || 0));
  const max = Math.max(1, Number(maxHp || 1));
  const filled = Math.round((current / max) * size);
  const safeFilled = Math.max(0, Math.min(size, filled));
  return `${"█".repeat(safeFilled)}${"░".repeat(size - safeFilled)} ${current}/${max}`;
}

function buildBossEmbed(playerName, island, playerTeam, boss, logs, ended) {
  const teamLines = playerTeam.map((unit) => {
    const status = unit.hp > 0 ? "🟢" : "🔴";
    return `${status} **${unit.slot}. ${unit.name}** [${unit.rarity}] • LV \`${unit.level}\`\n${renderHpBar(unit.hp, unit.maxHp)}`;
  });

  const recentLogs = logs.slice(-6);

  return new EmbedBuilder()
    .setColor(ended ? 0x2ecc71 : 0xe74c3c)
    .setTitle(`👑 ${playerName}'s Boss Battle`)
    .setDescription(
      [
        `**Island:** \`${island.name}\``,
        `**Boss:** \`${boss.name}\` [${boss.rarity}]`,
        `**ATK:** \`${boss.atk}\` • **SPD:** \`${boss.speed}\``,
        renderHpBar(boss.hp, boss.maxHp),
        "",
        "## Your Team",
        ...teamLines,
        "",
        "## Battle Log",
        ...(recentLogs.length ? recentLogs : ["Choose a card to attack the island boss."])
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
    const currentIsland = getCurrentIsland(player);
    const clearedBosses = Array.isArray(player?.story?.clearedIslandBosses)
      ? player.story.clearedIslandBosses
      : [];

    if (clearedBosses.includes(currentIsland.code)) {
      return message.reply(`You already cleared the boss of \`${currentIsland.name}\`. Use \`op sail\` to continue.`);
    }

    const cards = Array.isArray(player.cards) ? player.cards : [];
    const teamSlots = Array.isArray(player?.team?.slots) ? player.team.slots : [null, null, null];

    const teamCards = teamSlots
      .map((instanceId, index) => {
        if (!instanceId) return null;
        const found = cards.find((card) => card.instanceId === instanceId && card.cardRole !== "boost");
        return found ? toBattleUnit(found, index) : null;
      })
      .filter(Boolean);

    if (teamCards.length < 3) {
      return message.reply("You need a full battle team of 3 cards to challenge the island boss.");
    }

    const playerTeam = [...teamCards].sort((a, b) => a.slot - b.slot);
    const boss = getBossTemplate(currentIsland);
    const logs = [];
    let ended = false;

    const reply = await message.reply({
      embeds: [buildBossEmbed(player.username, currentIsland, playerTeam, boss, logs, ended)],
      components: buildButtons(playerTeam, ended)
    });

    const collector = reply.createMessageComponentCollector({
      time: 10 * 60 * 1000
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the command user can control this boss battle.",
          ephemeral: true
        });
      }

      if (ended) {
        return interaction.reply({
          content: "This boss battle has already ended.",
          ephemeral: true
        });
      }

      if (interaction.customId === "boss_run") {
        ended = true;

        let updatedDailyState = incrementQuestCounter(player, "bossFights", 1);

        const updatedCards = [...cards].map((card) => {
          const unit = playerTeam.find((entry) => entry.instanceId === card.instanceId);
          if (!unit) return card;

          const nextCard = applyExpToCard(
            {
              ...card,
              kills: Number(unit.kills || 0),
              level: Number(card.level || 1),
              exp: getCardExp(card)
            },
            15
          );

          return {
            ...nextCard,
            kills: Number(unit.kills || 0)
          };
        });

        updatePlayer(message.author.id, {
          cards: updatedCards,
          quests: {
            ...(player.quests || {}),
            dailyState: updatedDailyState
          }
        });

        logs.push("🏃 You ran away from the boss battle.");

        await interaction.update({
          embeds: [buildBossEmbed(player.username, currentIsland, playerTeam, boss, logs, true)],
          components: buildButtons(playerTeam, true)
        });

        collector.stop("run");
        return;
      }

      const index = Number(interaction.customId.replace("boss_attack_", ""));
      const attacker = playerTeam[index];

      if (!attacker || attacker.hp <= 0) {
        return interaction.reply({
          content: "That card cannot attack right now.",
          ephemeral: true
        });
      }

      const damage = performAttack(attacker, boss);
      logs.push(`⚔️ ${attacker.name} dealt **${damage}** damage to ${boss.name}.`);

      if (boss.hp <= 0) {
        ended = true;
        attacker.kills += 1;

        let updatedDailyState = incrementQuestCounter(player, "bossFights", 1);
        updatedDailyState = incrementQuestCounter(
          { ...player, quests: { ...(player.quests || {}), dailyState: updatedDailyState } },
          "bossesDefeated",
          1
        );

        const reward = {
          berries: 12000,
          gems: 30,
          boxes: [cloneItem(ITEMS.rareResourceBox, 1)]
        };

        let updatedBoxes = [...(player.boxes || [])];
        reward.boxes.forEach((item) => {
          updatedBoxes = addOrIncrease(updatedBoxes, item);
        });

        const updatedCards = [...cards].map((card) => {
          const unit = playerTeam.find((entry) => entry.instanceId === card.instanceId);
          if (!unit) return card;

          const gainedExp = unit.hp > 0 ? 45 + unit.kills * 10 : 30 + unit.kills * 10;
          const nextCard = applyExpToCard(
            {
              ...card,
              kills: Number(unit.kills || 0),
              level: Number(card.level || 1),
              exp: getCardExp(card)
            },
            gainedExp
          );

          return {
            ...nextCard,
            kills: Number(unit.kills || 0)
          };
        });

        const updatedCleared = [...clearedBosses, currentIsland.code];

        updatePlayer(message.author.id, {
          cards: updatedCards,
          boxes: updatedBoxes,
          berries: Number(player.berries || 0) + reward.berries,
          gems: Number(player.gems || 0) + reward.gems,
          story: {
            ...(player.story || {}),
            clearedIslandBosses: updatedCleared
          },
          quests: {
            ...(player.quests || {}),
            dailyState: updatedDailyState
          }
        });

        logs.push(`👑 ${boss.name} was defeated!`);
        logs.push(`🍇 +${reward.berries.toLocaleString("en-US")} berries`);
        logs.push(`💎 +${reward.gems} gems`);
        logs.push(`📦 Rare Resource Box x1`);
        logs.push(`🗺️ ${currentIsland.name} boss route is now cleared. You can use \`op sail\`.`);

        await interaction.update({
          embeds: [buildBossEmbed(player.username, currentIsland, playerTeam, boss, logs, true)],
          components: buildButtons(playerTeam, true)
        });

        collector.stop("win");
        return;
      }

      const alivePlayers = getAliveUnits(playerTeam);
      const bossTarget = alivePlayers.sort((a, b) => a.slot - b.slot)[0];

      if (bossTarget) {
        const bossDamage = performAttack(boss, bossTarget);
        logs.push(`🩸 ${boss.name} dealt **${bossDamage}** damage to ${bossTarget.name}.`);

        if (bossTarget.hp <= 0) {
          logs.push(`☠️ ${bossTarget.name} was defeated.`);
        }
      }

      if (!getAliveUnits(playerTeam).length) {
        ended = true;

        let updatedDailyState = incrementQuestCounter(player, "bossFights", 1);

        const updatedCards = [...cards].map((card) => {
          const unit = playerTeam.find((entry) => entry.instanceId === card.instanceId);
          if (!unit) return card;

          const nextCard = applyExpToCard(
            {
              ...card,
              kills: Number(unit.kills || 0),
              level: Number(card.level || 1),
              exp: getCardExp(card)
            },
            20 + unit.kills * 5
          );

          return {
            ...nextCard,
            kills: Number(unit.kills || 0)
          };
        });

        updatePlayer(message.author.id, {
          cards: updatedCards,
          quests: {
            ...(player.quests || {}),
            dailyState: updatedDailyState
          }
        });

        logs.push("💀 You lost the boss battle.");

        await interaction.update({
          embeds: [buildBossEmbed(player.username, currentIsland, playerTeam, boss, logs, true)],
          components: buildButtons(playerTeam, true)
        });

        collector.stop("lose");
        return;
      }

      await interaction.update({
        embeds: [buildBossEmbed(player.username, currentIsland, playerTeam, boss, logs, false)],
        components: buildButtons(playerTeam, false)
      });
    });

    collector.on("end", async (reason) => {
      if (reason === "time") {
        try {
          logs.push("⌛ Boss battle expired.");
          await reply.edit({
            embeds: [buildBossEmbed(player.username, currentIsland, playerTeam, boss, logs, true)],
            components: buildButtons(playerTeam, true)
          });
        } catch (error) {
          // ignore
        }
      }
    });
  }
};