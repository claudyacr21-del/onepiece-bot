const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getPlayer } = require("../playerStore");
const { hydrateCard } = require("../utils/evolution");
const { getPassiveBoostSummary } = require("../utils/passiveBoosts");
const {
  applyDamageBoost,
  formatDamageBoostedAtkRange,
} = require("../utils/combatStats");

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

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

function buildBattleUnit(card, slot, ownerTag = "player", boosts = {}) {
  const synced = hydrateCard(card);

  return {
    slot: slot + 1,
    ownerTag,
    instanceId: synced.instanceId,
    name: synced.displayName || synced.name || "Unknown",
    rarity: synced.currentTier || synced.rarity || "C",
    atk: Number(synced.atk || 0),
    hp: Number(synced.hp || 0),
    maxHp: Number(synced.hp || 0),
    speed: Number(synced.speed || 0),
    level: Number(synced.level || 1),
    power: getPower(synced),
    passiveBoostsApplied: {
    atk: Number(boosts.atk || 0),
    hp: Number(boosts.hp || 0),
    spd: Number(boosts.spd || 0),
    dmg: Number(boosts.dmg || 0),
    exp: Number(boosts.exp || 0),
  },
  };
}

function getTeamUnits(player, ownerTag = "player") {
  const boosts = getPassiveBoostSummary(player);

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

      return found ? buildBattleUnit(found, index, ownerTag, boosts) : null;
    })
    .filter(Boolean);
}

function aliveCount(units) {
  return units.filter((unit) => Number(unit.hp || 0) > 0).length;
}

function getFirstAlive(units) {
  return units.find((unit) => Number(unit.hp || 0) > 0) || null;
}

function performAttack(attacker, defender) {
  const atk = Number(attacker.atk || 0);
  const defSpeed = Number(defender.speed || 0);
  const rolledAtk = Math.floor(atk * (0.85 + Math.random() * 0.3));
  const rawDamage = Math.max(1, rolledAtk - Math.floor(defSpeed * 0.12));
  const finalDamage = applyDamageBoost(rawDamage, attacker.passiveBoostsApplied);

  defender.hp = Math.max(0, Number(defender.hp || 0) - finalDamage);
  return finalDamage;
}

function resolveSpeedOrder(playerUnit, enemyUnit) {
  const playerSpeed = Number(playerUnit?.speed || 0);
  const enemySpeed = Number(enemyUnit?.speed || 0);

  if (enemySpeed > playerSpeed) return [enemyUnit, playerUnit];
  if (playerSpeed > enemySpeed) return [playerUnit, enemyUnit];

  const playerPower = Number(playerUnit?.power || 0);
  const enemyPower = Number(enemyUnit?.power || 0);

  if (enemyPower > playerPower) return [enemyUnit, playerUnit];

  return [playerUnit, enemyUnit];
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
        `PWR \`${unit.power}\` • LV \`${unit.level}\``,
        `ATK \`${formatDamageBoostedAtkRange(unit.atk, unit.passiveBoostsApplied)}\` • SPD \`${unit.speed}\``,
        renderHpBar(unit.hp, unit.maxHp),
      ].join("\n")
    )
    .join("\n\n");
}

function getResultColor(result, ended) {
  if (!ended) return 0x5865f2;
  return result === "win" ? 0x2ecc71 : 0xe74c3c;
}

function getResultTitle(result) {
  return result === "win" ? "🏆 Challenge Victory" : "💀 Challenge Defeat";
}

function resolveResult(myTeam, enemyTeam) {
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

  return mySpeed >= enemySpeed ? "win" : "lose";
}

function buildChallengeEmbed({ player, targetPlayer, myTeam, enemyTeam, logs, result, ended }) {
  const recentLogs = logs.slice(-8);

  return new EmbedBuilder()
    .setColor(getResultColor(result, ended))
    .setTitle(ended ? getResultTitle(result) : "⚔️ Challenge Battle")
    .setDescription(
      [
        `**You:** ${player.username || "Unknown"}`,
        `**Opponent:** ${targetPlayer.username || "Unknown"}`,
        ended ? `**Result:** ${String(result || "lose").toUpperCase()}` : "**Result:** In Progress",
        "**Mode:** Friendly test match",
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
      ].join("\n")
    )
    .setFooter({
      text: ended
        ? "One Piece Bot • Challenge Result"
        : "One Piece Bot • Manual Challenge Match",
    });
}

function buildChallengeResultEmbed({ result, player, targetPlayer, logs }) {
  return new EmbedBuilder()
    .setColor(getResultColor(result, true))
    .setTitle(getResultTitle(result))
    .setDescription(
      [
        `**You:** ${player.username || "Unknown"}`,
        `**Opponent:** ${targetPlayer.username || "Unknown"}`,
        "",
        `**Result:** ${String(result || "lose").toUpperCase()}`,
        "**Mode:** Friendly test match",
        "",
        "## Final Log",
        ...(logs.length ? logs.slice(-10) : ["No final log."]),
      ].join("\n")
    )
    .setFooter({
      text: "One Piece Bot • Challenge Result",
    });
}

function buildActionRows(myTeam, ended) {
  const attackRow = new ActionRowBuilder();

  for (let i = 0; i < 3; i++) {
    const unit = myTeam[i];

    attackRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`challenge_attack_${i}`)
        .setLabel(unit ? unit.name.slice(0, 20) : `Slot ${i + 1}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(ended || !unit || Number(unit.hp || 0) <= 0)
    );
  }

  const controlRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("challenge_forfeit")
      .setLabel("Forfeit")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(ended)
  );

  return [attackRow, controlRow];
}

module.exports = {
  name: "challenge",
  aliases: ["spar"],

  async execute(message) {
    const targetUser = message.mentions.users.first();

    if (!targetUser) return message.reply("Usage: `op challenge @user`");
    if (targetUser.id === message.author.id) return message.reply("You cannot challenge yourself.");

    const player = getPlayer(message.author.id, message.author.username);
    const targetPlayer = getPlayer(targetUser.id, targetUser.username);
    const myTeam = getTeamUnits(player, "player");
    const enemyTeam = getTeamUnits(targetPlayer, "opponent");

    if (myTeam.length < 3) {
      return message.reply("You need a full team of 3 battle cards to use `op challenge`.");
    }

    if (enemyTeam.length < 3) {
      return message.reply("That user does not have a full team of 3 battle cards.");
    }

    const logs = [];
    let ended = false;
    let result = null;

    const sent = await message.reply({
      embeds: [
        buildChallengeEmbed({
          player,
          targetPlayer,
          myTeam,
          enemyTeam,
          logs,
          result,
          ended,
        }),
      ],
      components: buildActionRows(myTeam, ended),
    });

    const collector = sent.createMessageComponentCollector({
      time: SESSION_TIMEOUT_MS,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "Only the challenger can control this challenge battle.",
          ephemeral: true,
        });
      }

      if (ended) {
        return interaction.reply({
          content: "This challenge battle has already ended.",
          ephemeral: true,
        });
      }

      if (interaction.customId === "challenge_forfeit") {
        ended = true;
        result = "lose";
        logs.length = 0;
        logs.push("🏳️ You forfeited the challenge.");

        await interaction.update({
          embeds: [
            buildChallengeResultEmbed({
              result,
              player,
              targetPlayer,
              logs,
            }),
          ],
          components: [],
        });

        collector.stop("forfeit");
        return;
      }

      const index = Number(interaction.customId.replace("challenge_attack_", ""));
      const attacker = myTeam[index];

      if (!attacker || Number(attacker.hp || 0) <= 0) {
        return interaction.reply({
          content: "That card cannot attack right now.",
          ephemeral: true,
        });
      }

      const target = getFirstAlive(enemyTeam);

      if (!target) {
        return interaction.reply({
          content: "No opponent card is available to attack.",
          ephemeral: true,
        });
      }

      logs.length = 0;

      const [first, second] = resolveSpeedOrder(attacker, target);
      const firstIsPlayer = first.ownerTag !== "opponent" && first.ownerTag !== "bot";
      const firstTarget = firstIsPlayer ? target : attacker;
      const firstDamage = performAttack(first, firstTarget);

      logs.push(`⚡ ${first.name} moved first by SPD.`);
      logs.push(`⚔️ ${first.name} attacked ${firstTarget.name}.`);
      logs.push(`${firstIsPlayer ? "➡️" : "⬅️"} ${first.name} dealt **${firstDamage}** damage to ${firstTarget.name}.`);

      if (Number(firstTarget.hp || 0) <= 0) {
        logs.push(`☠️ ${firstTarget.name} was defeated and cannot counter.`);
      }

      if (aliveCount(enemyTeam) <= 0) {
        ended = true;
        result = "win";
        logs.push("🏆 You won the challenge!");

        await interaction.update({
          embeds: [
            buildChallengeResultEmbed({
              result,
              player,
              targetPlayer,
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
        logs.push("💀 You lost the challenge.");

        await interaction.update({
          embeds: [
            buildChallengeResultEmbed({
              result,
              player,
              targetPlayer,
              logs,
            }),
          ],
          components: [],
        });

        collector.stop("lose");
        return;
      }

      if (Number(second.hp || 0) > 0 && Number(firstTarget.hp || 0) > 0) {
        const secondTarget = firstIsPlayer ? attacker : target;
        const secondDamage = performAttack(second, secondTarget);

        logs.push(`💥 ${second.name} countered ${secondTarget.name}.`);
        logs.push(`${firstIsPlayer ? "⬅️" : "➡️"} ${second.name} dealt **${secondDamage}** damage to ${secondTarget.name}.`);

        if (Number(secondTarget.hp || 0) <= 0) {
          logs.push(`☠️ ${secondTarget.name} was defeated.`);
        }
      }

      if (aliveCount(enemyTeam) <= 0) {
        ended = true;
        result = "win";
        logs.push("🏆 You won the challenge!");

        await interaction.update({
          embeds: [
            buildChallengeResultEmbed({
              result,
              player,
              targetPlayer,
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
        logs.push("💀 You lost the challenge.");

        await interaction.update({
          embeds: [
            buildChallengeResultEmbed({
              result,
              player,
              targetPlayer,
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
          buildChallengeEmbed({
            player,
            targetPlayer,
            myTeam,
            enemyTeam,
            logs,
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
        result = resolveResult(myTeam, enemyTeam);
        logs.length = 0;
        logs.push("⌛ Challenge timed out. Result decided by remaining HP.");

        try {
          await sent.edit({
            embeds: [
              buildChallengeResultEmbed({
                result,
                player,
                targetPlayer,
                logs,
              }),
            ],
            components: [],
          });
        } catch {}
      }
    });
  },
};