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
      .map((w) => `${w.name}${Number(w.upgradeLevel || 0) > 0 ? ` +${w.upgradeLevel}` : ""}`)
      .join(", ");
  }
  return card?.equippedWeapon || "None";
}

function toBattleUnit(card, slotIndex) {
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
  };
}

function getBossTemplate(currentIsland) {
  const fromDb = currentIsland?.bossCode
    ? hydrateCard(cardsDb.find((card) => card.code === currentIsland.bossCode))
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
      name: fromDb.displayName || fromDb.name,
      rarity: fromDb.currentTier || fromDb.rarity || "S",
      atk: Math.floor(baseAtk * atkMul),
      hp: Math.floor(baseHp * hpMul),
      maxHp: Math.floor(baseHp * hpMul),
      speed: Math.floor(baseSpeed * spdMul),
      image: currentIsland.image || fromDb.image || "",
    };
  }

  const fallbackAtk = 180 + shipTier * 45 + islandOrder * 8;
  const fallbackHp = 3200 + shipTier * 900 + islandOrder * 180;
  const fallbackSpeed = 90 + shipTier * 8 + Math.floor(islandOrder * 0.8);

  return {
    name: currentIsland?.boss || "Island Boss",
    rarity: shipTier >= 4 ? "UR" : "S",
    atk: fallbackAtk,
    hp: fallbackHp,
    maxHp: fallbackHp,
    speed: fallbackSpeed,
    image: currentIsland?.image || "",
  };
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
  const rawDamage = Math.max(
    1,
    Number(attacker.atk || 0) - Math.floor(Number(defender.speed || 0) * 0.15)
  );
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
    return [
      `**${unit.slot}. ${unit.name}** [${unit.rarity}] • LV \`${unit.level}\``,
      `↪ Weapon: ${unit.equippedWeapon}`,
      `↪ Fruit: ${unit.equippedDevilFruit}`,
      renderHpBar(unit.hp, unit.maxHp),
    ].join("\n");
  });

  const recentLogs = logs.slice(-6);

  return new EmbedBuilder()
    .setColor(ended ? 0x2ecc71 : 0xe74c3c)
    .setTitle(`👹 ${playerName}'s Boss Battle`)
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

function formatRemaining(ms) {
  const safeMs = Math.max(0, Number(ms || 0));
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

module.exports = {
  name: "boss",
  aliases: ["islandboss"],
  async execute(message) {
    const player = getPlayer(message.author.id, message.author.username);
    const bossCooldownUntil = Number(player?.cooldowns?.boss || 0);

    if (bossCooldownUntil > Date.now()) {
      return message.reply(
        `You must wait **${formatRemaining(bossCooldownUntil - Date.now())}** before using \`op boss\` again.`
      );
    }

    const currentIsland = getCurrentIsland(player);
    const clearedBosses = Array.isArray(player?.story?.clearedIslandBosses)
      ? player.story.clearedIslandBosses
      : [];

    if (clearedBosses.includes(currentIsland.code)) {
      return message.reply(
        `You already cleared the boss of \`${currentIsland.name}\`.\nUse \`op sail\` to continue.`
      );
    }

    const cards = (Array.isArray(player.cards) ? player.cards : []).map(hydrateCard).filter(Boolean);
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

    updatePlayer(message.author.id, {
      cooldowns: {
        ...(player.cooldowns || {}),
        boss: Date.now() + BOSS_COOLDOWN_MS,
      },
    });

    const playerTeam = [...teamCards].sort((a, b) => a.slot - b.slot);
    const boss = getBossTemplate(currentIsland);
    const logs = [];
    let ended = false;

    const reply = await message.reply({
      embeds: [
        buildBossEmbed(
          player.username || message.author.username,
          currentIsland,
          playerTeam,
          boss,
          logs,
          ended
        ),
      ],
      components: buildButtons(playerTeam, ended),
    });

    const collector = reply.createMessageComponentCollector({ time: SESSION_TIMEOUT_MS });

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

        logs.push("🏳️ You ran away from the boss battle.");

        await interaction.update({
          embeds: [
            buildBossEmbed(
              player.username || message.author.username,
              currentIsland,
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
          boxes: [cloneItem(ITEMS.rareResourceBox, 1)],
        };

        let updatedBoxes = [...(player.boxes || [])];
        reward.boxes.forEach((item) => {
          updatedBoxes = addOrIncrease(updatedBoxes, item);
        });

        const updatedCards = [...(player.cards || [])].map((card) => {
          const unit = playerTeam.find((entry) => entry.instanceId === card.instanceId);
          if (!unit) return card;

          const gainedExp = unit.hp > 0 ? 45 + unit.kills * 10 : 30 + unit.kills * 10;
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

        const updatedCleared = [...clearedBosses, currentIsland.code];

        updatePlayer(message.author.id, {
          cards: updatedCards,
          boxes: updatedBoxes,
          berries: Number(player.berries || 0) + reward.berries,
          gems: Number(player.gems || 0) + reward.gems,
          story: {
            ...(player.story || {}),
            clearedIslandBosses: updatedCleared,
          },
          quests: {
            ...(player.quests || {}),
            dailyState: updatedDailyState,
          },
        });

        logs.push(`👑 ${boss.name} was defeated!`);
        logs.push(`💰 +${reward.berries.toLocaleString("en-US")} berries`);
        logs.push(`💎 +${reward.gems} gems`);
        logs.push("📦 Rare Resource Box x1");
        logs.push(`✅ ${currentIsland.name} boss route is now cleared. You can use \`op sail\`.`);

        await interaction.update({
          embeds: [
            buildBossEmbed(
              player.username || message.author.username,
              currentIsland,
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

      const retaliationTarget = attacker && attacker.hp > 0 ? attacker : getFirstAlive(playerTeam);
      if (retaliationTarget) {
        const bossDamage = performAttack(boss, retaliationTarget);
        logs.push(`👹 ${boss.name} dealt **${bossDamage}** damage to ${retaliationTarget.name}.`);
        if (retaliationTarget.hp <= 0) {
          logs.push(`☠️ ${retaliationTarget.name} was defeated.`);
        }
      }

      if (!getAliveUnits(playerTeam).length) {
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

        logs.push("💀 You lost the boss battle.");

        await interaction.update({
          embeds: [
            buildBossEmbed(
              player.username || message.author.username,
              currentIsland,
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
            playerTeam,
            boss,
            logs,
            false
          ),
        ],
        components: buildButtons(playerTeam, false),
      });
    });

    collector.on("end", async (reason) => {
      if (reason === "time") {
        try {
          logs.push("⌛ Boss battle expired.");
          await reply.edit({
            embeds: [
              buildBossEmbed(
                player.username || message.author.username,
                currentIsland,
                playerTeam,
                boss,
                logs,
                true
              ),
            ],
            components: buildButtons(playerTeam, true),
          });
        } catch (_) {}
      }
    });
  },
};